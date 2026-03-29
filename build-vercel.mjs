/**
 * Script de build para a Vercel.
 * Compila o servidor Express em um único bundle JS sem dependências de TypeScript.
 */
import { build } from "esbuild";
import { execSync } from "child_process";
import fs from "fs";

// 1. Build do frontend (Vite)
console.log("📦 Building frontend...");
execSync("npx vite build", { stdio: "inherit" });

// 2. Build do servidor Express para a pasta api/
console.log("🔧 Building server bundle for Vercel...");
await build({
  entryPoints: ["server/_core/app.ts"],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outfile: "api/server.mjs",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "warning",
  // Ignorar erros de tipo TypeScript - apenas transpilar
  tsconfigRaw: {
    compilerOptions: {
      strict: false,
      skipLibCheck: true,
    }
  }
});

console.log("✅ Vercel build complete!");
