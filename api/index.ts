import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerSupabaseAuthRoutes } from "../server/_core/supabaseAuth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Servir arquivos de upload locais (usando /tmp na Vercel)
const uploadsDir = path.join("/tmp", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/api/files", express.static(uploadsDir));

// tRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// OAuth legado (Manus)
registerOAuthRoutes(app);

// Supabase Google OAuth (novo)
registerSupabaseAuthRoutes(app);

// Servir frontend estático em produção
const distPath = path.join(process.cwd(), "dist", "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;
