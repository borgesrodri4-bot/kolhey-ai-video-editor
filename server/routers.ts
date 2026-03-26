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
  getVideoProjectsByUserPaginated,
  getVideoProjectById,
  updateVideoProject,
  deleteVideoProject,
  getScenesByProject,
  updateVideoScene,
  getSceneById,
  reorderScenes,
  getAdminStats,
  getAllUsersAdmin,
  getAllProjectsAdmin,
  getProcessingsByDay,
  createProjectVersion,
  getProjectVersions,
  getProjectVersionById,
  setActiveProjectVersion,
  countProjectVersions,
} from "./db";
import { NICHE_TEMPLATES, getNicheTemplateById } from "../shared/nicheTemplates";
import { isValidYouTubeUrl, getYouTubeVideoInfo, extractYouTubeAudio } from "./youtubeExtractor";
import { runVideoPipeline } from "./pipeline";
import { generateImage } from "./_core/imageGeneration";
import { nanoid } from "nanoid";
import {
  logEditEvent,
  logStyleFeedback,
  analyzeAndUpdateProfile,
  getStyleContext,
  getFullStyleProfile,
  getRecentEditEvents,
} from "./adaptiveEngine";

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
      const ext = input.filename.split(".").pop() ?? "mp4";
      const key = `videos/${ctx.user.id}/${nanoid(16)}.${ext}`;
      return { key, uploadEndpoint: `/api/upload-video?key=${encodeURIComponent(key)}` };
    }),

  /** Cria projeto após upload concluído */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        videoKey: z.string(),
        videoUrl: z.string().url(),
        fileSizeBytes: z.number(),
        visualStyle: z.string().optional().default("auto"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await createVideoProject({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        status: "pending",
        originalVideoUrl: input.videoUrl,
        originalVideoKey: input.videoKey,
        fileSizeBytes: input.fileSizeBytes,
        visualStyle: input.visualStyle,
        progress: 0,
      });
      const insertId = (result as { insertId: number }).insertId;
      return { id: insertId };
    }),

  /** Lista projetos do usuário com paginação cursor-based */
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.number().optional(), // ID do último item da página anterior
        limit: z.number().min(1).max(50).default(20),
        status: z.enum(["all", "pending", "processing", "completed", "failed"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return getVideoProjectsByUserPaginated(ctx.user.id, {
        cursor: input.cursor,
        limit: input.limit,
        status: input.status === "all" ? undefined : input.status,
        search: input.search,
      });
    }),

  /** Busca projeto por ID com suas cenas */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.id, ctx.user.id);
      const scenes = await getScenesByProject(input.id);
      return { ...project, scenes };
    }),

  /** Inicia o pipeline de processamento (com contexto adaptativo injetado) */
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

      // Get style context to inject into pipeline
      const styleCtx = await getStyleContext(ctx.user.id);

      // Start pipeline asynchronously with style context and project description
      runVideoPipeline(input.id, project.originalVideoUrl, styleCtx, project.description ?? undefined).catch((err) => {
        console.error(`[Router] Pipeline failed for project ${input.id}:`, err);
      });

      return {
        started: true,
        adaptiveProfile: {
          isActive: styleCtx.isReliable,
          confidenceScore: styleCtx.confidenceScore,
          message: styleCtx.isReliable
            ? `Perfil de estilo aplicado (${styleCtx.confidenceScore}% de confiança)`
            : "Processando com configurações padrão. Continue editando para personalizar.",
        },
      };
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
  /** Atualiza prompt ou texto de uma cena — registra evento adaptativo */
  update: protectedProcedure
    .input(
      z.object({
        sceneId: z.number(),
        projectId: z.number(),
        transcript: z.string().optional(),
        illustrationPrompt: z.string().optional(),
        previousPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const updateData: Record<string, string> = {};
      if (input.transcript !== undefined) updateData.transcript = input.transcript;
      if (input.illustrationPrompt !== undefined)
        updateData.illustrationPrompt = input.illustrationPrompt;
      await updateVideoScene(input.sceneId, updateData);

      // Log edit event for adaptive learning
      if (input.illustrationPrompt !== undefined) {
        await logEditEvent({
          userId: ctx.user.id,
          projectId: input.projectId,
          sceneId: input.sceneId,
          eventType: "prompt_edited",
          previousValue: input.previousPrompt,
          newValue: input.illustrationPrompt,
          metadata: { field: "illustrationPrompt" },
        });
      }

      return { updated: true };
    }),

  /** Regenera a ilustração de uma cena — registra evento adaptativo */
  regenerateImage: protectedProcedure
    .input(z.object({ sceneId: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const scene = await getSceneById(input.sceneId);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Cena não encontrada" });
      if (!scene.illustrationPrompt)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cena sem prompt de ilustração" });

      // Log regeneration event
      await logEditEvent({
        userId: ctx.user.id,
        projectId: input.projectId,
        sceneId: input.sceneId,
        eventType: "image_regenerated",
        metadata: { prompt: scene.illustrationPrompt },
      });

      // Get style context to enhance the prompt
      const styleCtx = await getStyleContext(ctx.user.id);
      const enhancedPrompt = `${scene.illustrationPrompt}. Flat design illustration, vibrant colors, modern minimalist style, high quality, no text${styleCtx.imageStyleSuffix}.`;

      await updateVideoScene(input.sceneId, { illustrationStatus: "generating" });

      try {
        const result = await generateImage({ prompt: enhancedPrompt });
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

  /** Feedback de estilo (👍/👎) em uma ilustração */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        sceneId: z.number(),
        projectId: z.number(),
        sentiment: z.enum(["positive", "negative"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.projectId, ctx.user.id);
      const scene = await getSceneById(input.sceneId);

      await logStyleFeedback({
        userId: ctx.user.id,
        sceneId: input.sceneId,
        projectId: input.projectId,
        sentiment: input.sentiment,
        illustrationPrompt: scene?.illustrationPrompt ?? undefined,
        illustrationUrl: scene?.illustrationUrl ?? undefined,
        comment: input.comment,
      });

      return { recorded: true };
    }),

  /** Reordena cenas via drag-and-drop */
  reorder: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        order: z.array(z.object({ id: z.number(), sceneOrder: z.number() })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      await reorderScenes(input.order);
      await logEditEvent({
        userId: ctx.user.id,
        projectId: input.projectId,
        eventType: "prompt_edited",
        metadata: { action: "reorder_scenes", count: input.order.length },
      });
      return { reordered: true };
    }),

  /** Exporta cenas em JSON compatível com Remotion — registra aceitação */
  exportJson: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.projectId, ctx.user.id);
      const scenes = await getScenesByProject(input.projectId);

      // Log that user accepted/exported all scenes (positive signal for adaptive learning)
      await logEditEvent({
        userId: ctx.user.id,
        projectId: input.projectId,
        eventType: "image_accepted",
        metadata: { action: "export_json", scenesCount: scenes.length },
      });

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

// ─── Adaptive Style Router ─────────────────────────────────────────────────────
const adaptiveRouter = router({
  /** Retorna o perfil de estilo aprendido do usuário */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getFullStyleProfile(ctx.user.id);
    const styleCtx = await getStyleContext(ctx.user.id);
    return {
      profile,
      context: styleCtx,
      hasProfile: profile !== null,
    };
  }),

  /** Histórico de edições do usuário */
  getEditHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ input, ctx }) => {
      return getRecentEditEvents(ctx.user.id, input.limit);
    }),

  /** Dispara manualmente a análise e atualização do perfil */
  refreshProfile: protectedProcedure.mutation(async ({ ctx }) => {
    // Run analysis asynchronously
    analyzeAndUpdateProfile(ctx.user.id).catch((err) => {
      console.error(`[Router] Profile analysis failed for user ${ctx.user.id}:`, err);
    });
    return { started: true, message: "Análise do perfil iniciada. Isso pode levar alguns segundos." };
  }),

  /** Retorna o contexto de estilo atual (para debug/preview) */
  getStyleContext: protectedProcedure.query(async ({ ctx }) => {
    return getStyleContext(ctx.user.id);
  }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  return next({ ctx });
});

const adminRouter = router({
  getStats: adminProcedure.query(async () => getAdminStats()),
  getUsers: adminProcedure.query(async () => getAllUsersAdmin()),
  getProjects: adminProcedure.query(async () => getAllProjectsAdmin()),
  getProcessingsByDay: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(14) }))
    .query(async ({ input }) => getProcessingsByDay(input.days)),
});
// ─── Niche Templates Router ────────────────────────────────────────────────────────────────────────────
const nicheRouter = router({
  /** Lista todos os templates de nicho disponíveis */
  list: publicProcedure.query(() => NICHE_TEMPLATES),

  /** Retorna um template específico por ID */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const template = getNicheTemplateById(input.id);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      return template;
    }),
});

// ─── YouTube Router ────────────────────────────────────────────────────────────────────────────
const youtubeRouter = router({
  /** Valida e extrai metadados de uma URL do YouTube */
  getInfo: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      if (!isValidYouTubeUrl(input.url)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL do YouTube inválida. Use o formato: https://www.youtube.com/watch?v=... ou https://youtu.be/..." });
      }
      try {
        const info = await getYouTubeVideoInfo(input.url);
        return {
          videoId: info.videoId,
          title: info.title,
          durationSeconds: info.duration,
          thumbnailUrl: info.thumbnailUrl,
          youtubeUrl: input.url,
          valid: true,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
    }),

  /** Cria projeto a partir de URL do YouTube e extrai áudio automaticamente */
  createProject: protectedProcedure
    .input(
      z.object({
        youtubeUrl: z.string().url(),
        title: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        visualStyle: z.string().optional().default("auto"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isValidYouTubeUrl(input.youtubeUrl)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL do YouTube inválida" });
      }

      // Extract audio from YouTube and upload to S3
      let audioInfo;
      try {
        audioInfo = await extractYouTubeAudio(input.youtubeUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Falha ao extrair áudio do YouTube";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }

      const result = await createVideoProject({
        userId: ctx.user.id,
        title: input.title || audioInfo.title,
        description: input.description,
        status: "pending",
        originalVideoUrl: input.youtubeUrl,
        originalVideoKey: `youtube:${input.youtubeUrl}`,
        audioUrl: audioInfo.audioUrl,
        audioKey: audioInfo.audioKey,
        fileSizeBytes: audioInfo.fileSizeBytes,
        durationSeconds: audioInfo.duration,
        visualStyle: input.visualStyle,
        progress: 0,
      });
      const insertId = (result as { insertId: number }).insertId;
      return { id: insertId, title: input.title || audioInfo.title };
    }),
});

// ─── Versions Router ────────────────────────────────────────────────────────────────────────────
const versionsRouter = router({
  /** Lista todas as versões de um projeto */
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      return getProjectVersions(input.projectId);
    }),

  /** Salva snapshot da versão atual como histórico */
  saveSnapshot: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        label: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.projectId, ctx.user.id);
      const scenes = await getScenesByProject(input.projectId);
      const versionCount = await countProjectVersions(input.projectId);

      const result = await createProjectVersion({
        projectId: input.projectId,
        userId: ctx.user.id,
        versionNumber: versionCount + 1,
        label: input.label ?? `Versão ${versionCount + 1}`,
        visualStyle: project.visualStyle ?? "auto",
        description: project.description ?? undefined,
        scenesSnapshot: scenes as unknown as Record<string, unknown>[],
        scenesCount: scenes.length,
        isActive: "yes",
      });

      // Deactivate other versions
      const versionId = (result as { insertId: number }).insertId;
      await setActiveProjectVersion(input.projectId, versionId);

      return { versionId, versionNumber: versionCount + 1 };
    }),

  /** Define uma versão como ativa */
  setActive: protectedProcedure
    .input(z.object({ projectId: z.number(), versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      await setActiveProjectVersion(input.projectId, input.versionId);
      return { activated: true };
    }),

  /** Restaura cenas de uma versão anterior */
  restore: protectedProcedure
    .input(z.object({ projectId: z.number(), versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const version = await getProjectVersionById(input.versionId);
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada" });
      if (version.projectId !== input.projectId)
        throw new TRPCError({ code: "FORBIDDEN", message: "Versão não pertence a este projeto" });

      // Restore scenes from snapshot
      const snapshot = version.scenesSnapshot as Array<{
        id: number;
        illustrationPrompt?: string;
        illustrationUrl?: string;
        illustrationKey?: string;
        illustrationStatus?: "pending" | "generating" | "completed" | "failed";
        transcript?: string;
        sceneOrder?: number;
      }> | null;
      if (snapshot && Array.isArray(snapshot)) {
        await Promise.all(
          snapshot.map((scene) =>
            updateVideoScene(scene.id, {
              illustrationPrompt: scene.illustrationPrompt,
              illustrationUrl: scene.illustrationUrl,
              illustrationKey: scene.illustrationKey,
              illustrationStatus: scene.illustrationStatus,
              transcript: scene.transcript,
              sceneOrder: scene.sceneOrder,
            })
          )
        );
      }

      await setActiveProjectVersion(input.projectId, input.versionId);
      return { restored: true, scenesRestored: snapshot?.length ?? 0 };
    }),

  /** Inicia reprocessamento do projeto com novas configurações */
  reprocess: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        visualStyle: z.string().optional(),
        description: z.string().max(1000).optional(),
        label: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.projectId, ctx.user.id);

      if (project.status === "processing") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Projeto já está sendo processado" });
      }
      if (!project.originalVideoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Vídeo não encontrado" });
      }

      // Save current state as a version before reprocessing
      const scenes = await getScenesByProject(input.projectId);
      if (scenes.length > 0) {
        const versionCount = await countProjectVersions(input.projectId);
        const vResult = await createProjectVersion({
          projectId: input.projectId,
          userId: ctx.user.id,
          versionNumber: versionCount + 1,
          label: input.label ?? `Versão ${versionCount + 1} - ${project.visualStyle ?? "auto"}`,
          visualStyle: project.visualStyle ?? "auto",
          description: project.description ?? undefined,
          scenesSnapshot: scenes as unknown as Record<string, unknown>[],
          scenesCount: scenes.length,
          isActive: "no",
        });
        console.log(`[Versions] Saved version ${versionCount + 1} before reprocessing project ${input.projectId}`);
      }

      // Update project settings if provided
      const updateData: Partial<typeof project> = {};
      if (input.visualStyle) updateData.visualStyle = input.visualStyle;
      if (input.description !== undefined) updateData.description = input.description;
      if (Object.keys(updateData).length > 0) {
        await updateVideoProject(input.projectId, updateData);
      }

      // Get style context and restart pipeline
      const styleCtx = await getStyleContext(ctx.user.id);
      const finalDescription = input.description ?? project.description ?? undefined;
      runVideoPipeline(input.projectId, project.originalVideoUrl, styleCtx, finalDescription).catch((err) => {
        console.error(`[Router] Reprocess pipeline failed for project ${input.projectId}:`, err);
      });

      return { started: true };
    }),
});

// ─── App Router ────────────────────────────────────────────────────────────────────────────
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
  adaptive: adaptiveRouter,
  admin: adminRouter,
  niche: nicheRouter,
  youtube: youtubeRouter,
  versions: versionsRouter,
});

export type AppRouter = typeof appRouter;
