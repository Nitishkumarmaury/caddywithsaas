const dns = require("dns").promises;
const { normalizeHostname } = require("./validators");

async function verifyTxtRecord(hostname, expectedToken) {
  const normalizedHost = normalizeHostname(hostname);
  const token = String(expectedToken || "").trim();
  if (!normalizedHost || !token) return false;

  const txtHost = `_verify.${normalizedHost}`;
  let records;
  try {
    records = await dns.resolveTxt(txtHost);
  } catch (err) {
    return false;
  }

  for (const entry of records) {
    const value = entry.join("").trim();
    if (value === token) {
      return true;
    }
  }

  return false;
}

module.exports = {
  verifyTxtRecord
};
