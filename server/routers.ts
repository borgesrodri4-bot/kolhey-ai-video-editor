import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router, authorizedProcedure } from "./_core/trpc";
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
  getUserById,
  updateUserPlan,
  createInvite,
  getInviteByToken,
  incrementInviteUses,
  authorizeUser,
  isUserAuthorized,
  getAllAuthorizedUsers,
  revokeUserAuthorization,
} from "./db";
import { notifyOwner } from "./_core/notification";
import {
  sendUserNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from "./_core/userNotification";
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
  getUploadUrl: authorizedProcedure
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
  create: authorizedProcedure
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
  list: authorizedProcedure
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
  getById: authorizedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await assertProjectOwner(input.id, ctx.user.id);
      const scenes = await getScenesByProject(input.id);
      return { ...project, scenes };
    }),

  /** Inicia o pipeline de processamento (com contexto adaptativo injetado) */
  startProcessing: authorizedProcedure
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
      runVideoPipeline(input.id, project.originalVideoUrl, styleCtx, project.description ?? undefined, ctx.user.id).catch((err) => {
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
  getStatus: authorizedProcedure
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
  delete: authorizedProcedure
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
  update: authorizedProcedure
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
  regenerateImage: authorizedProcedure
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
  submitFeedback: authorizedProcedure
    .input(
      z.object({
        sceneId: z.number(),
        projectId: z.number(),
        sentiment: z.enum(["positive", "negative"]),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      const scene = await getSceneById(input.sceneId);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Cena não encontrada" });

      await logStyleFeedback({
        userId: ctx.user.id,
        projectId: input.projectId,
        sceneId: input.sceneId,
        sentiment: input.sentiment,
        illustrationPrompt: scene.illustrationPrompt ?? undefined,
        illustrationUrl: scene.illustrationUrl ?? undefined,
        comment: input.comment,
      });

      return { success: true };
    }),

  /** Reordena cenas de um projeto */
  reorder: authorizedProcedure
    .input(
      z.object({
        projectId: z.number(),
        updates: z.array(z.object({ id: z.number(), sceneOrder: z.number() })),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      await reorderScenes(input.updates);
      return { success: true };
    }),
});

// ─── Adaptive Router ───────────────────────────────────────────────────────────
const adaptiveRouter = router({
  /** Retorna o perfil de estilo completo do usuário */
  getProfile: authorizedProcedure.query(async ({ ctx }) => {
    return getFullStyleProfile(ctx.user.id);
  }),

  /** Retorna eventos de edição recentes */
  getHistory: authorizedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input, ctx }) => {
      return getRecentEditEvents(ctx.user.id, input.limit);
    }),

  /** Força uma re-análise do perfil de estilo (Admin ou debug) */
  triggerAnalysis: authorizedProcedure.mutation(async ({ ctx }) => {
    await analyzeAndUpdateProfile(ctx.user.id);
    return { success: true };
  }),
});

// ─── Admin Router ──────────────────────────────────────────────────────────────
const adminRouter = router({
  /** Estatísticas gerais da plataforma */
  getStats: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
    return getAdminStats();
  }),

  /** Lista todos os usuários */
  listUsers: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
    return getAllUsersAdmin();
  }),

  /** Lista projetos recentes de todos os usuários */
  listAllProjects: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
    return getAllProjectsAdmin();
  }),

  /** Dados para gráfico de processamento por dia */
  getChartData: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
    return getProcessingsByDay();
  }),
});

// ─── Niche Router ──────────────────────────────────────────────────────────────
const nicheRouter = router({
  /** Lista todos os templates de nicho disponíveis */
  listTemplates: authorizedProcedure.query(() => {
    return NICHE_TEMPLATES;
  }),

  /** Busca template por ID */
  getTemplate: authorizedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const template = getNicheTemplateById(input.id);
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      return template;
    }),
});

// ─── YouTube Router ────────────────────────────────────────────────────────────
const youtubeRouter = router({
  /** Valida URL e busca informações básicas do vídeo */
  getInfo: authorizedProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      if (!isValidYouTubeUrl(input.url)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL do YouTube inválida" });
      }
      try {
        return await getYouTubeVideoInfo(input.url);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao buscar vídeo" });
      }
    }),

  /** Cria projeto a partir de vídeo do YouTube */
  createFromUrl: authorizedProcedure
    .input(
      z.object({
        youtubeUrl: z.string().url(),
        title: z.string().optional(),
        description: z.string().max(1000).optional(),
        visualStyle: z.string().optional().default("auto"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await getUserById(ctx.user.id);
      const plan = (user?.plan ?? "free") as "free" | "pro" | "enterprise";

      // Check video duration against plan limits
      const info = await getYouTubeVideoInfo(input.youtubeUrl);
      const limit = PLAN_YOUTUBE_LIMITS[plan];

      if (info.duration > limit) {
        const durationMin = Math.ceil(info.duration / 60);
        const limitMin = Math.floor(limit / 60);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Vídeo muito longo (${durationMin}min). Seu plano ${PLAN_LABELS[plan]} permite até ${limitMin} minutos. Faça upgrade para processar vídeos mais longos.`,
        });
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
  list: authorizedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      return getProjectVersions(input.projectId);
    }),

  /** Salva snapshot da versão atual como histórico */
  saveSnapshot: authorizedProcedure
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
  setActive: authorizedProcedure
    .input(z.object({ projectId: z.number(), versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);
      await setActiveProjectVersion(input.projectId, input.versionId);
      return { activated: true };
    }),

  /** Restaura cenas de uma versão anterior */
  restore: authorizedProcedure
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
  reprocess: authorizedProcedure
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
      runVideoPipeline(input.projectId, project.originalVideoUrl, styleCtx, finalDescription, ctx.user.id).catch((err) => {
        console.error(`[Router] Reprocess pipeline failed for project ${input.projectId}:`, err);
      });

      return { started: true };
    }),
});

// ─── Notifications Router ────────────────────────────────────────────────────────────────────────────
const notificationsRouter = router({
  /** Lista notificações do usuário autenticado */
  list: authorizedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }))
    .query(async ({ input, ctx }) => {
      return getUserNotifications(ctx.user.id, input.limit ?? 20);
    }),

  /** Conta notificações não lidas */
  countUnread: authorizedProcedure.query(async ({ ctx }) => {
    const count = await countUnreadNotifications(ctx.user.id);
    return { count };
  }),

  /** Marca uma notificação como lida */
  markRead: authorizedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),

  /** Marca todas as notificações como lidas */
  markAllRead: authorizedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

// ─── Plan limits per plan ────────────────────────────────────────────────────────────────────────────
export const PLAN_YOUTUBE_LIMITS: Record<"free" | "pro" | "enterprise", number> = {
  free: 15 * 60,       // 15 minutes
  pro: 30 * 60,        // 30 minutes
  enterprise: 60 * 60, // 60 minutes
};

export const PLAN_LABELS: Record<"free" | "pro" | "enterprise", string> = {
  free: "Gratuito",
  pro: "Pro",
  enterprise: "Enterprise",
};

// ─── Plan Router ────────────────────────────────────────────────────────────────────────────
const planRouter = router({
  /** Retorna o plano atual do usuário autenticado */
  getCurrent: authorizedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    const plan = (user?.plan ?? "free") as "free" | "pro" | "enterprise";
    return {
      plan,
      label: PLAN_LABELS[plan],
      youtubeLimitSeconds: PLAN_YOUTUBE_LIMITS[plan],
      youtubeLimitMinutes: Math.floor(PLAN_YOUTUBE_LIMITS[plan] / 60),
    };
  }),

  /** Admin: atualiza o plano de um usuário */
  setUserPlan: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        plan: z.enum(["free", "pro", "enterprise"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem alterar planos" });
      }
      await updateUserPlan(input.userId, input.plan);
      return { updated: true };
    }),
});

// ─── Invites Router ────────────────────────────────────────────────────────────
const invitesRouter = router({
  /** Gera um novo token de convite (Apenas Admin) */
  create: protectedProcedure
    .input(z.object({ maxUses: z.number().min(1).default(1) }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem gerar convites" });
      }
      const token = `kolhey-inv-${nanoid(10)}`;
      await createInvite({
        token,
        createdBy: ctx.user.id,
        maxUses: input.maxUses,
      });
      return { token };
    }),

  /** Valida um token e autoriza o usuário logado permanentemente */
  redeem: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const invite = await getInviteByToken(input.token);
      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido" });
      }
      if (invite.usesCount >= invite.maxUses) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite já atingiu o limite de usos" });
      }
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });
      }

      // Autorizar o usuário permanentemente
      await authorizeUser({
        email: ctx.user.email!,
        invitedBy: invite.createdBy,
        inviteId: invite.id,
      });

      // Incrementar uso do convite
      await incrementInviteUses(invite.id);

      return { success: true };
    }),

  /** Lista todos os usuários autorizados (Apenas Admin) */
  listAuthorized: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    return getAllAuthorizedUsers();
  }),

  /** Revoga acesso de um usuário (Apenas Admin) */
  revoke: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      await revokeUserAuthorization(input.email);
      return { success: true };
    }),

  /** Verifica se o usuário atual está autorizado */
  checkStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { authorized: true };
    const authorized = await isUserAuthorized(ctx.user.email!);
    return { authorized };
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
  plan: planRouter,
  notifications: notificationsRouter,
  invites: invitesRouter,
});

export type AppRouter = typeof appRouter;
