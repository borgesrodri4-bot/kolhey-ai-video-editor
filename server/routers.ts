import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import {
  createVideoProject,
  getVideoProjectsByUser,
  getVideoProjectById,
  updateVideoProject,
  deleteVideoProject,
  getScenesByProject,
  updateVideoScene,
  getSceneById,
} from "./db";
import { runVideoPipeline } from "./pipeline";
import { generateImage } from "./_core/imageGeneration";
import { nanoid } from "nanoid";

// ─── Helper: verificar ownership ──────────────────────────────────────────────
async function assertProjectOwner(projectId: number, userId: number) {
  const project = await getVideoProjectById(projectId);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
  if (project.userId !== userId)
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
  return project;
}

// ─── Videos Router ─────────────────────────────────────────────────────────────
const videosRouter = router({
  /** Gera URL presigned para upload direto ao S3 */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        fileSizeBytes: z.number().max(500 * 1024 * 1024, "Arquivo máximo: 500MB"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Gerar chave única no S3
      const ext = input.filename.split(".").pop() ?? "mp4";
      const key = `videos/${ctx.user.id}/${nanoid(16)}.${ext}`;

      // Usar storagePut com buffer vazio para obter a URL base
      // O upload real será feito pelo frontend diretamente via URL presigned
      // Aqui retornamos a chave para o frontend usar
      return { key, uploadEndpoint: `/api/upload-video?key=${encodeURIComponent(key)}` };
    }),

  /** Cria projeto após upload concluído */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        videoKey: z.string(),
        videoUrl: z.string().url(),
        fileSizeBytes: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await createVideoProject({
        userId: ctx.user.id,
        title: input.title,
        status: "pending",
        originalVideoUrl: input.videoUrl,
        originalVideoKey: input.videoKey,
        fileSizeBytes: input.fileSizeBytes,
        progress: 0,
      });
      const insertId = (result as { insertId: number }).insertId;
      return { id: insertId };
    }),

  /** Lista projetos do usuário */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getVideoProjectsByUser(ctx.user.id);
  }),

  /** Busca projeto por ID com suas cenas */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.id, ctx.user.id);
      const scenes = await getScenesByProject(input.id);
      return { ...project, scenes };
    }),

  /** Inicia o pipeline de processamento */
  startProcessing: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.id, ctx.user.id);

      if (project.status === "processing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Projeto já está sendo processado" });
      }
      if (!project.originalVideoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Vídeo não encontrado" });
      }

      // Iniciar pipeline de forma assíncrona (não aguardar)
      runVideoPipeline(input.id, project.originalVideoUrl).catch((err) => {
        console.error(`[Router] Pipeline failed for project ${input.id}:`, err);
      });

      return { started: true };
    }),

  /** Polling de status do processamento */
  getStatus: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.id, ctx.user.id);
      return {
        status: project.status,
        progress: project.progress,
        currentStep: project.currentStep,
        errorMessage: project.errorMessage,
        scenesCount: project.scenesCount,
      };
    }),

  /** Deleta projeto e arquivos */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.id, ctx.user.id);
      await deleteVideoProject(input.id);
      return { deleted: true };
    }),
});

// ─── Scenes Router ─────────────────────────────────────────────────────────────
const scenesRouter = router({
  /** Atualiza prompt ou texto de uma cena */
  update: protectedProcedure
    .input(
      z.object({
        sceneId: z.number(),
        projectId: z.number(),
        transcript: z.string().optional(),
        illustrationPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const updateData: Record<string, string> = {};
      if (input.transcript !== undefined) updateData.transcript = input.transcript;
      if (input.illustrationPrompt !== undefined)
        updateData.illustrationPrompt = input.illustrationPrompt;
      await updateVideoScene(input.sceneId, updateData);
      return { updated: true };
    }),

  /** Regenera a ilustração de uma cena */
  regenerateImage: protectedProcedure
    .input(z.object({ sceneId: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const scene = await getSceneById(input.sceneId);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Cena não encontrada" });
      if (!scene.illustrationPrompt)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cena sem prompt de ilustração" });

      await updateVideoScene(input.sceneId, { illustrationStatus: "generating" });

      try {
        const result = await generateImage({
          prompt: `${scene.illustrationPrompt}. Flat design illustration, vibrant colors, modern minimalist style, high quality, no text.`,
        });

        if (!result.url) throw new Error("Image generation returned no URL");

        const imageResponse = await fetch(result.url);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const key = `scenes/${input.sceneId}-${nanoid(8)}.png`;
        const { url } = await storagePut(key, imageBuffer, "image/png");

        await updateVideoScene(input.sceneId, {
          illustrationUrl: url,
          illustrationKey: key,
          illustrationStatus: "completed",
        });

        return { url };
      } catch (err) {
        await updateVideoScene(input.sceneId, { illustrationStatus: "failed" });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao gerar ilustração",
        });
      }
    }),

  /** Exporta cenas em JSON compatível com Remotion */
  exportJson: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.projectId, ctx.user.id);
      const scenes = await getScenesByProject(input.projectId);

      return {
        project: {
          id: project.id,
          title: project.title,
          durationSeconds: project.durationSeconds,
          originalVideoUrl: project.originalVideoUrl,
        },
        scenes: scenes.map((scene) => ({
          id: scene.id,
          order: scene.sceneOrder,
          startTime: scene.startTime,
          endTime: scene.endTime,
          duration: scene.endTime - scene.startTime,
          transcript: scene.transcript,
          illustrationPrompt: scene.illustrationPrompt,
          illustrationUrl: scene.illustrationUrl,
        })),
        remotionConfig: {
          fps: 30,
          width: 1080,
          height: 1920,
          durationInFrames: Math.round((project.durationSeconds ?? 60) * 30),
        },
      };
    }),
});

// ─── App Router ────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  videos: videosRouter,
  scenes: scenesRouter,
});

export type AppRouter = typeof appRouter;
