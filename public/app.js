async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function getHandleFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[2] || "";
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

function setError(message) {
  const el = document.getElementById("form-error");
  if (el) {
    el.textContent = message;
  }
}

async function loadConfig() {
  return fetchJson("/api/config");
}

async function initIndex() {
  const form = document.getElementById("create-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");
    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      handle: formData.get("handle")
    };

    try {
      const { site } = await fetchJson("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      window.location.href = `/success?handle=${encodeURIComponent(site.handle)}`;
    } catch (err) {
      setError(err.message);
    }
  });
}

async function initSuccess() {
  const subdomainEl = document.getElementById("subdomain");
  if (!subdomainEl) return;
  const handle = getQueryParam("handle");
  const config = await loadConfig();

  const host = `${handle}.${config.baseDomain}`;
  subdomainEl.textContent = host;
  subdomainEl.href = `https://${host}`;

  document.getElementById("edit-link").href = `/app/sites/${handle}/edit`;
  document.getElementById("domain-link").href = `/app/sites/${handle}/domains`;
}

async function initEdit() {
  const form = document.getElementById("edit-form");
  if (!form) return;
  const handle = getHandleFromPath();

  const { site } = await fetchJson(`/api/sites/${handle}`);
  form.elements.title.value = site.title || "";
  form.elements.body.value = site.body || "";
  form.elements.color.value = site.color || "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      title: form.elements.title.value,
      body: form.elements.body.value,
      color: form.elements.color.value
    };

    try {
      await fetchJson(`/api/sites/${handle}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      setError(err.message);
    }
  });

  document.getElementById("back-link").href = `/success?handle=${handle}`;
}

function buildDnsSteps() {
  const list = document.getElementById("dns-steps");
  if (!list) return;
  list.innerHTML = "";
  const steps = [
    "Add a TXT record with name _verify.your-domain and the token shown below.",
    "Wait for DNS to propagate (often a few minutes).",
    "Click Verify once the record is live."
  ];

  steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    list.appendChild(li);
  });
}

async function renderDomains(handle) {
  const list = document.getElementById("domain-list");
  if (!list) return;

  const { domains } = await fetchJson(`/api/sites/${handle}/domains`);
  list.innerHTML = "";

  if (!domains.length) {
    const empty = document.createElement("li");
    empty.textContent = "No domains yet.";
    list.appendChild(empty);
    return;
  }

  domains.forEach((domain) => {
    const item = document.createElement("li");
    item.className = "domain-item";

    const info = document.createElement("div");
    info.className = "domain-info";

    const label = document.createElement("span");
    label.textContent = `${domain.hostname} (${domain.status})`;

    const details = document.createElement("div");
    details.className = "domain-details";
    if (domain.verificationToken && domain.status !== "active") {
      details.textContent = `TXT _verify.${domain.hostname} = ${domain.verificationToken}`;
    }

    info.appendChild(label);
    if (details.textContent) {
      info.appendChild(details);
    }

    const button = document.createElement("button");
    button.textContent = "Verify";
    button.disabled = domain.status === "active";
    button.addEventListener("click", async () => {
      try {
        await fetchJson(`/api/sites/${handle}/domains/${domain.id}/verify`, {
          method: "POST"
        });
        await renderDomains(handle);
      } catch (err) {
        setError(err.message);
      }
    });

    item.appendChild(info);
    item.appendChild(button);
    list.appendChild(item);
  });
}

async function initDomains() {
  const form = document.getElementById("domain-form");
  if (!form) return;
  const handle = getHandleFromPath();
  await loadConfig();
  buildDnsSteps();
  await renderDomains(handle);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      hostname: form.elements.hostname.value
    };

    try {
      await fetchJson(`/api/sites/${handle}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      form.reset();
      await renderDomains(handle);
    } catch (err) {
      setError(err.message);
    }
  });

  document.getElementById("back-link").href = `/success?handle=${handle}`;
}

initIndex();
initSuccess();
initEdit();
initDomains();
