const path = require("path");
const crypto = require("crypto");
const express = require("express");
const prisma = require("./db");
const { port, baseDomain, askSecret } = require("./config");
const { isValidHandle, normalizeHostname, isValidHexColor } = require("./validators");
const { verifyTxtRecord } = require("./dns");
const { renderSiteHtml } = require("./siteRenderer");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/assets", express.static(path.join(__dirname, "..", "public")));

function getHost(req) {
  const forwarded = req.headers["x-forwarded-host"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.headers.host || "";
  return normalizeHostname(raw);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "success.html"));
});

app.get("/app/sites/:handle/edit", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "edit.html"));
});

app.get("/app/sites/:handle/domains", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "domains.html"));
});

app.get("/api/config", (req, res) => {
  res.json({ baseDomain });
});

app.post("/api/sites", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const handle = String(req.body.handle || "").trim();

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (!handle || !isValidHandle(handle)) {
    return res
      .status(400)
      .json({ error: "Handle must be lowercase letters, numbers, or hyphens." });
  }
  if (handle === "www") {
    return res.status(400).json({ error: "Handle 'www' is reserved." });
  }

  try {
    const site = await prisma.site.create({
      data: {
        name,
        handle,
        title: `${name}'s site`,
        body: "This is your site. Update it in the editor.",
        color: "#1f2937"
      }
    });

    res.status(201).json({ site });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "That handle is taken." });
    }
    return res.status(500).json({ error: "Unable to create site." });
  }
});

app.get("/api/sites/:handle", async (req, res) => {
  const handle = String(req.params.handle || "");
  const site = await prisma.site.findUnique({
    where: { handle },
    include: { domains: true }
  });

  if (!site) {
    return res.status(404).json({ error: "Site not found." });
  }

  res.json({ site });
});

app.post("/api/sites/:handle", async (req, res) => {
  const handle = String(req.params.handle || "");
  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();
  const color = String(req.body.color || "").trim();

  if (color && !isValidHexColor(color)) {
    return res.status(400).json({ error: "Color must be a hex value like #1f2937." });
  }

  try {
    const site = await prisma.site.update({
      where: { handle },
      data: {
        title: title || null,
        body: body || null,
        color: color || null
      }
    });

    res.json({ site });
  } catch (err) {
    res.status(404).json({ error: "Site not found." });
  }
});

app.get("/api/sites/:handle/domains", async (req, res) => {
  const handle = String(req.params.handle || "");
  const site = await prisma.site.findUnique({
    where: { handle },
    include: { domains: true }
  });

  if (!site) {
    return res.status(404).json({ error: "Site not found." });
  }

  res.json({ domains: site.domains });
});

app.post("/api/sites/:handle/domains", async (req, res) => {
  const handle = String(req.params.handle || "");
  const hostname = normalizeHostname(req.body.hostname || "");

  if (!hostname) {
    return res.status(400).json({ error: "Domain is required." });
  }
  if (!hostname.startsWith("www.")) {
    return res.status(400).json({
      error: "For the demo, only www subdomains are supported (e.g. www.client.com)."
    });
  }

  const site = await prisma.site.findUnique({ where: { handle } });
  if (!site) {
    return res.status(404).json({ error: "Site not found." });
  }

  try {
    const verificationToken = crypto.randomBytes(16).toString("hex");
    const domain = await prisma.domain.create({
      data: {
        siteId: site.id,
        hostname,
        status: "pending",
        verificationToken
      }
    });

    res.status(201).json({ domain });
  } catch (err) {
    res.status(409).json({ error: "That domain is already in use." });
  }
});

app.post("/api/sites/:handle/domains/:domainId/verify", async (req, res) => {
  const handle = String(req.params.handle || "");
  const domainId = Number(req.params.domainId);
  const site = await prisma.site.findUnique({ where: { handle } });

  if (!site) {
    return res.status(404).json({ error: "Site not found." });
  }

  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain || domain.siteId !== site.id) {
    return res.status(404).json({ error: "Domain not found." });
  }

  const ok = await verifyTxtRecord(domain.hostname, domain.verificationToken);

  if (!ok) {
    return res.status(400).json({
      error: `TXT not verified. Ensure _verify.${domain.hostname} has the correct token.`
    });
  }

  const updated = await prisma.domain.update({
    where: { id: domainId },
    data: { status: "active", verifiedAt: new Date() }
  });

  res.json({ domain: updated });
});

app.get("/caddy/ask", async (req, res) => {
  const token = String(req.query.token || req.query.secret || "");
  const headerToken = String(req.headers["x-ask-secret"] || "");
  if (askSecret && token !== askSecret && headerToken !== askSecret) {
    return res.status(403).send("forbidden");
  }

  const hostname = normalizeHostname(req.query.domain || "");
  if (!hostname) {
    return res.status(403).send("forbidden");
  }

  const domain = await prisma.domain.findFirst({
    where: { hostname, status: "active" }
  });

  if (!domain) {
    return res.status(403).send("forbidden");
  }

  res.status(200).send("ok");
});

app.get("*", async (req, res) => {
  const host = getHost(req);

  if (!host || !baseDomain) {
    return res.status(404).send("Not found");
  }

  const baseRoot = normalizeHostname(baseDomain);
  if (host === baseRoot || host === `www.${baseRoot}`) {
    return res.status(404).send("Not found");
  }

  let site = null;
  if (host.endsWith(`.${baseRoot}`)) {
    const handle = host.slice(0, -(baseRoot.length + 1));
    if (handle && handle !== "www") {
      site = await prisma.site.findUnique({ where: { handle } });
    }
  }

  if (!site) {
    const domain = await prisma.domain.findFirst({
      where: { hostname: host, status: "active" },
      include: { site: true }
    });
    site = domain ? domain.site : null;
  }

  if (!site) {
    return res.status(404).send("Not found");
  }

  res.send(renderSiteHtml(site, host));
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
