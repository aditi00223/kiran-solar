require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Kiran API running on http://localhost:${PORT}`);
});

//it's the entry point and only file that starts the server
//nodemon runs node src/index.js : npm run dev, the env loads, the app loads, and the server starts listening 