/**
 * Vercel-compatible Express app export.
 * This file creates the Express app without starting the server,
 * so it can be used as a serverless function handler.
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerSupabaseAuthRoutes } from "./supabaseAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { storagePut } from "../storage";
import path from "path";
import fs from "fs";

export function createApp() {
  const app = express();

  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Servir arquivos de upload locais (/tmp na Vercel, /uploads localmente)
  const uploadsDir = process.env.VERCEL
    ? path.join("/tmp", "uploads")
    : path.join(process.cwd(), "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/api/files", express.static(uploadsDir));

  // OAuth legado (Manus)
  registerOAuthRoutes(app);

  // Supabase Google OAuth
  registerSupabaseAuthRoutes(app);

  // Upload de vídeo
  const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
  app.post("/api/upload-video", express.raw({ type: "*/*", limit: "520mb" }), async (req, res) => {
    try {
      const key = req.query.key as string;
      if (!key) { res.status(400).json({ error: "Missing key parameter" }); return; }
      const contentType = (req.headers["content-type"] as string) ?? "video/mp4";
      const buffer = req.body as Buffer;
      if (!buffer || buffer.length === 0) { res.status(400).json({ error: "Empty file body" }); return; }

      if (buffer.length > MAX_VIDEO_SIZE_BYTES) {
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
        res.status(413).json({
          error: `Arquivo muito grande (${sizeMB} MB). O limite máximo é 500 MB.`,
          code: "FILE_TOO_LARGE",
          maxSizeMB: 500,
          fileSizeMB: parseFloat(sizeMB),
        });
        return;
      }

      const isVideoKey = key.match(/\.(mp4|mov|avi|webm|mpeg|mpg)$/i);
      if (!isVideoKey) {
        res.status(400).json({ error: "Formato de arquivo não suportado.", code: "INVALID_FORMAT" });
        return;
      }

      const { url } = await storagePut(key, buffer, contentType);
      res.json({ url, key, sizeMB: parseFloat((buffer.length / (1024 * 1024)).toFixed(1)) });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Servir frontend estático em produção
  const distPath = path.join(process.cwd(), "dist", "public");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

export default createApp();
