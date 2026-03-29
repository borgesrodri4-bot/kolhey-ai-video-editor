/**
 * Script de build para a Vercel.
 * Compila o servidor Express em um único bundle JS completamente autocontido.
 */
import { build } from "esbuild";
import { execSync } from "child_process";
import fs from "fs";

// 1. Build do frontend (Vite)
console.log("📦 Building frontend...");
execSync("npx vite build", { stdio: "inherit" });

// 2. Build do servidor Express - bundle COMPLETO (sem packages: external)
// para que a Vercel não precise do node_modules
console.log("🔧 Building self-contained server bundle for Vercel...");
await build({
  entryPoints: ["server/_core/app.ts"],
  platform: "node",
  // NÃO usar packages: "external" - incluir tudo no bundle
  bundle: true,
  format: "cjs",
  outfile: "api/server.cjs",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "warning",
  // Resolver aliases de path do tsconfig
  alias: {
    "@shared": new URL("./shared", import.meta.url).pathname,
  },
  tsconfigRaw: {
    compilerOptions: {
      strict: false,
      skipLibCheck: true,
      moduleResolution: "bundler",
      target: "ES2020",
    }
  },
  // Apenas módulos nativos do Node.js ficam externos
  external: [
    "fs", "path", "os", "crypto", "http", "https", "net", "stream",
    "url", "util", "events", "buffer", "child_process", "worker_threads",
    "zlib", "tls", "dns", "readline", "assert", "module",
    // ffmpeg e remotion são nativos/binários - não podem ser bundled
    "fluent-ffmpeg", "@remotion/renderer", "remotion",
    // sharp também é nativo
    "sharp",
  ],
});

console.log("✅ Vercel build complete!");
console.log("📁 Bundle size:", Math.round(fs.statSync("api/server.cjs").size / 1024), "KB");
