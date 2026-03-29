import { createClient } from "@supabase/supabase-js";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const supabaseUrl = process.env.SUPABASE_URL ?? "https://fxxijiaisxmfhchgbiul.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export function registerSupabaseAuthRoutes(app: Express) {
  // ─── Login com Google via Supabase OAuth ──────────────────────────────────
  app.get("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const redirectTo = `${req.protocol}://${req.get("host")}/api/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error || !data?.url) {
        console.error("[Supabase Auth] Error generating OAuth URL:", error);
        res.redirect(302, "/?error=google_not_configured");
        return;
      }

      res.redirect(302, data.url);
    } catch (err) {
      console.error("[Supabase Auth] Login error:", err);
      res.redirect(302, "/?error=login_failed");
    }
  });

  // ─── Login por email/senha ────────────────────────────────────────────────
  app.post("/api/auth/email-login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios" });
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.user) {
        res.status(401).json({ error: "Email ou senha incorretos" });
        return;
      }
      const supabaseUser = data.user;
      const openId = supabaseUser.id;
      const userEmail = supabaseUser.email ?? null;
      const name = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? userEmail ?? "Usuário";

      await db.upsertUser({
        openId,
        name,
        email: userEmail,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true, name, email: userEmail });
    } catch (err) {
      console.error("[Supabase Auth] Email login error:", err);
      res.status(500).json({ error: "Falha no login" });
    }
  });

  // ─── Cadastro por email/senha ─────────────────────────────────────────────
  app.post("/api/auth/email-signup", async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios" });
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name ?? email.split("@")[0] },
        },
      });
      if (error || !data?.user) {
        res.status(400).json({ error: error?.message ?? "Erro ao criar conta" });
        return;
      }
      const supabaseUser = data.user;
      const openId = supabaseUser.id;
      const userEmail = supabaseUser.email ?? null;
      const userName = name ?? supabaseUser.user_metadata?.full_name ?? userEmail ?? "Usuário";

      await db.upsertUser({
        openId,
        name: userName,
        email: userEmail,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userName,
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true, name: userName, email: userEmail });
    } catch (err) {
      console.error("[Supabase Auth] Email signup error:", err);
      res.status(500).json({ error: "Falha ao criar conta" });
    }
  });

  // Callback do OAuth do Google via Supabase
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;

    if (!code) {
      res.redirect(302, "/?error=missing_code");
      return;
    }

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data?.user) {
        console.error("[Supabase Auth] Code exchange error:", error);
        res.redirect(302, "/?error=auth_failed");
        return;
      }

      const supabaseUser = data.user;
      const openId = supabaseUser.id;
      const email = supabaseUser.email ?? null;
      const name = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? email ?? "Usuário";

      // Upsert do usuário no banco de dados local
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Criar sessão JWT local
      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/dashboard");
    } catch (err) {
      console.error("[Supabase Auth] Callback error:", err);
      res.redirect(302, "/?error=callback_failed");
    }
  });

  // Rota de logout
  app.get("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.redirect(302, "/");
  });
}
