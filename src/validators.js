const HANDLE_RE = /^[a-z0-9-]+$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isValidHandle(handle) {
  return HANDLE_RE.test(handle);
}

function normalizeHostname(hostname) {
  if (!hostname) return "";
  const lower = hostname.toLowerCase().trim();
  const withoutProtocol = lower.replace(/^https?:\/\//, "");
  const noPort = withoutProtocol.split(":")[0];
  return noPort.replace(/\.$/, "");
}

function isValidHexColor(color) {
  return HEX_COLOR_RE.test(color || "");
}

module.exports = {
  isValidHandle,
  normalizeHostname,
  isValidHexColor
};
