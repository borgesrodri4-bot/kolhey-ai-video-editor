// Vercel serverless entry point (ESM - package.json has "type": "module")
// The server.cjs bundle is CommonJS, we use createRequire to load it
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = require("./server.cjs");
export default app.default || app;
