// Run on your own server / computer:  npm install  &&  npm start
require("dotenv").config();
const app = require("./src/app");
const { init } = require("./src/db");

const PORT = Number(process.env.PORT || 3000);
init()
  .then(() => app.listen(PORT, () => console.log(`Khata Desk running on http://localhost:${PORT}`)))
  .catch((e) => { console.error("Database connection failed:", e.message); process.exit(1); });
