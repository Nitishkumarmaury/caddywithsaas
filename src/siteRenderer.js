function renderSiteHtml(site, host) {
  const title = site.title || `${site.name}'s site`;
  const body = site.body || "This is your site. Update it in the editor.";
  const color = site.color || "#1f2937";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { --accent: ${color}; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        color: #0f172a;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      }
      .shell {
        max-width: 800px;
        margin: 12vh auto;
        padding: 32px;
        background: #ffffff;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.15);
        border-top: 6px solid var(--accent);
      }
      .host {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 12px;
      }
      h1 { margin: 0 0 12px; font-size: 36px; }
      p { font-size: 18px; line-height: 1.6; margin: 0; }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="host">${escapeHtml(host)}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = { renderSiteHtml };
