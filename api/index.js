// Vercel serverless entry point (CommonJS)
const app = require("./server.cjs");
module.exports = app.default || app;
