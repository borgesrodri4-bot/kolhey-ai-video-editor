import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ── Rota de upload de vídeo (recebe binário e salva no S3) ──────────────────
  const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
  app.post("/api/upload-video", express.raw({ type: "*/*", limit: "520mb" }), async (req, res) => {
    try {
      const key = req.query.key as string;
      if (!key) { res.status(400).json({ error: "Missing key parameter" }); return; }
      const contentType = (req.headers["content-type"] as string) ?? "video/mp4";
      const buffer = req.body as Buffer;
      if (!buffer || buffer.length === 0) { res.status(400).json({ error: "Empty file body" }); return; }

      // Validate file size on server side
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

      // Validate that it's a video file
      const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"];
      const isVideoKey = key.match(/\.(mp4|mov|avi|webm|mpeg|mpg)$/i);
      if (!isVideoKey) {
        res.status(400).json({ error: "Formato de arquivo não suportado. Use MP4, MOV, AVI ou WebM.", code: "INVALID_FORMAT" });
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
