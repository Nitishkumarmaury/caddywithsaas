const path = require("path");
require("dotenv").config();

const baseDomain = (process.env.BASE_DOMAIN || process.env.MYDOMAIN || "")
  .trim()
  .toLowerCase();

module.exports = {
  port: Number(process.env.PORT || 3000),
  baseDomain,
  databaseUrl:
    process.env.DATABASE_URL ||
    `file:${path.join(__dirname, "..", "prisma", "dev.db")}`,
  askSecret: (process.env.ASK_SECRET || "").trim()
};
