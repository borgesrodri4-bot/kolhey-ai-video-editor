/**
 * Pipeline de processamento de vídeo
 * Orquestra: transcrição → análise Claude → geração de imagens
 * Roda de forma assíncrona e atualiza o progresso no banco de dados.
 */

import { transcribeAudio } from "./_core/voiceTranscription";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import {
  updateVideoProject,
  createVideoScenes,
  getScenesByProject,
  updateVideoScene,
  updateProcessingJob,
  createProcessingJob,
  getVideoProjectById,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";
import type { StyleContext } from "./adaptiveEngine";
import { analyzeAndUpdateProfile } from "./adaptiveEngine";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface SceneData {
  tempo_inicio: number;
  tempo_fim: number;
  texto_falado: string;
  prompt_ilustracao: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 2000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[Pipeline] Attempt ${attempt}/${maxAttempts} failed:`, err);
      if (attempt < maxAttempts) await sleep(delayMs * attempt);
    }
  }
  throw lastError;
}

// ─── Step 1: Transcrição ───────────────────────────────────────────────────────
async function transcribeVideo(audioUrl: string): Promise<TranscriptSegment[]> {
  const result = await withRetry(() =>
    transcribeAudio({ audioUrl, language: "pt" })
  );

  // Verificar se houve erro na transcrição
  if ("error" in result) {
    throw new Error(`Transcription failed: ${result.error} - ${result.details ?? ""}`);
  }

  if (!result.segments || result.segments.length === 0) {
    // Fallback: criar um único segmento com o texto completo
    return [{ start: 0, end: 60, text: result.text }];
  }

  return result.segments.map((seg: { start: number; end: number; text: string }) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));
}

// ─── Step 2: Análise Claude → Cenas + Prompts ─────────────────────────────────
async function analyzeAndGenerateScenes(
  segments: TranscriptSegment[],
  styleCtx?: StyleContext,
  projectDescription?: string
): Promise<SceneData[]> {
  // Inject adaptive style context if available
  const adaptiveInstructions = styleCtx?.isReliable && styleCtx.sceneAnalysisContext
    ? `\n\nPerfil de estilo do usuário (aplique estas preferências):\n${styleCtx.sceneAnalysisContext}`
    : "";

  // Inject project description context if provided
  const descriptionContext = projectDescription?.trim()
    ? `\n\nContexto do projeto fornecido pelo usuário: "${projectDescription.trim()}"\nUse este contexto para criar prompts de ilustração mais precisos e alinhados ao objetivo do vídeo.`
    : "";

  const systemPrompt = `Você é um diretor de arte e editor de vídeo especialista em conteúdo digital.
Sua tarefa é analisar a transcrição de um vídeo (lista de legendas numeradas) e agrupá-la em cenas lógicas.

REGRAS DE OURO DE SINCRONIZAÇÃO:
1. NÃO tente calcular o tempo em segundos (ex: 2.3s). 
2. Use APENAS o "index" da legenda para marcar o início de cada cena.
3. Categorize o vídeo em 1 de 7 formatos: comparação, revelação, sequência, autoridade direta, demonstração, tutorial, storytelling.
4. Escolha 1 de 11 componentes de cena: impacto, whatsapp, comparativo, numero_animado, rosto_ilustracao, lista, grafico, mapa, codigo, depoimento, call_to_action.

DIRETRIZES VISUAIS:
- Crie prompts de imagem altamente descritivos em inglês para ilustrações flat design.
- O prompt deve descrever visualmente o conceito falado, não o texto literal.
- Use estilo: flat design, cores vibrantes, moderno, minimalista.
- Defina uma paleta de cores baseada no tema.${adaptiveInstructions}${descriptionContext}

Formato de saída (JSON estrito):
[
  {
    "legenda_index_inicio": 0,
    "formato": "comparação",
    "componente": "comparativo",
    "texto_falado": "texto original agrupado da cena",
    "prompt_ilustracao": "Detailed flat design illustration of... vibrant colors, modern style",
    "paleta_cores": ["#HEX1", "#HEX2"]
  }
]`;

  // Enviar apenas os textos e índices para a IA, sem os tempos originais para evitar confusão
  const simplifiedSegments = segments.map((s, i) => ({ index: i, text: s.text }));
  const userMessage = `Lista de legendas numeradas:\n${JSON.stringify(simplifiedSegments, null, 2)}`;

  const response = await withRetry(() =>
    invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "video_scenes",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                legenda_index_inicio: { type: "number" },
                formato: { type: "string" },
                componente: { type: "string" },
                texto_falado: { type: "string" },
                prompt_ilustracao: { type: "string" },
                paleta_cores: { type: "array", items: { type: "string" } },
              },
              required: ["legenda_index_inicio", "formato", "componente", "texto_falado", "prompt_ilustracao", "paleta_cores"],
              additionalProperties: false,
            },
          },
        },
      },
    })
  );

  const rawContent = response.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("LLM returned empty response");
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

  try {
    return JSON.parse(content) as SceneData[];
  } catch {
    // Tentar extrair JSON do texto
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as SceneData[];
    throw new Error("Failed to parse LLM response as JSON");
  }
}

// ─── Step 3: Geração de Imagens ────────────────────────────────────────────────
async function generateSceneIllustration(
  sceneId: number,
  prompt: string,
  styleCtx?: StyleContext
): Promise<{ url: string; key: string }> {
  // Inject adaptive image style suffix if available
  const styleSuffix = styleCtx?.isReliable && styleCtx.imageStyleSuffix
    ? styleCtx.imageStyleSuffix
    : "";

  const result = await withRetry(() =>
    generateImage({
      prompt: `${prompt}. Flat design illustration, vibrant colors, modern minimalist style, high quality, no text${styleSuffix}.`,
    })
  );

  if (!result.url) throw new Error("Image generation returned no URL");

  // Fazer download da imagem e salvar no S3
  const imageResponse = await fetch(result.url);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const key = `scenes/${sceneId}-${nanoid(8)}.png`;

  const { url } = await storagePut(key, imageBuffer, "image/png");
  return { url, key };
}

// ─── Orquestrador Principal ────────────────────────────────────────────────────
export async function runVideoPipeline(
  projectId: number,
  audioUrl: string,
  styleCtx?: StyleContext,
  projectDescription?: string,
  userId?: number
) {
  let jobId: number | undefined;

  try {
    // Criar job de processamento
    const jobResult = await createProcessingJob({
      projectId,
      step: "transcription",
      status: "running",
      progress: 0,
      startedAt: new Date(),
    });
    jobId = (jobResult as { insertId: number }).insertId;

    // ── Etapa 1: Transcrição ──────────────────────────────────────────────────
    await updateVideoProject(projectId, {
      status: "processing",
      progress: 10,
      currentStep: "Transcrevendo áudio...",
    });

    const segments = await transcribeVideo(audioUrl);

    await updateVideoProject(projectId, { progress: 35, currentStep: "Analisando conteúdo..." });
    if (jobId) await updateProcessingJob(jobId, { step: "scene_analysis", progress: 35 });

    // ── Etapa 2: Análise e Geração de Cenas ───────────────────────────────────
    const scenes = await analyzeAndGenerateScenes(segments, styleCtx, projectDescription);

    // Salvar cenas no banco
    await createVideoScenes(
      scenes.map((scene, idx) => ({
        projectId,
        sceneOrder: idx,
        startTime: scene.tempo_inicio,
        endTime: scene.tempo_fim,
        transcript: scene.texto_falado,
        illustrationPrompt: scene.prompt_ilustracao,
        illustrationStatus: "pending" as const,
      }))
    );

    await updateVideoProject(projectId, {
      progress: 50,
      currentStep: "Gerando ilustrações...",
      scenesCount: scenes.length,
    });
    if (jobId) await updateProcessingJob(jobId, { step: "image_generation", progress: 50 });

    // ── Etapa 3: Geração de Imagens ───────────────────────────────────────────
    const savedScenes = await getScenesByProject(projectId);
    const totalScenes = savedScenes.length;

    for (let i = 0; i < savedScenes.length; i++) {
      const scene = savedScenes[i];
      if (!scene.illustrationPrompt) continue;

      await updateVideoScene(scene.id, { illustrationStatus: "generating" });

      try {
        const { url, key } = await generateSceneIllustration(
          scene.id,
          scene.illustrationPrompt,
          styleCtx
        );
        await updateVideoScene(scene.id, {
          illustrationUrl: url,
          illustrationKey: key,
          illustrationStatus: "completed",
        });
      } catch (err) {
        console.error(`[Pipeline] Failed to generate image for scene ${scene.id}:`, err);
        await updateVideoScene(scene.id, { illustrationStatus: "failed" });
      }

      const progress = 50 + Math.round(((i + 1) / totalScenes) * 45);
      await updateVideoProject(projectId, {
        progress,
        currentStep: `Gerando ilustração ${i + 1}/${totalScenes}...`,
      });
    }

    // ── Concluído ─────────────────────────────────────────────────────────────
    await updateVideoProject(projectId, {
      status: "completed",
      progress: 100,
      currentStep: "Concluído",
    });

    if (jobId) {
      await updateProcessingJob(jobId, {
        step: "completed",
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      });
    }

    // Notificar owner
    await notifyOwner({
      title: "✅ Vídeo processado com sucesso",
      content: `O projeto #${projectId} foi processado com sucesso. ${totalScenes} cenas geradas.`,
    });

    // Notificar usuário via sistema de notificações in-app
    if (userId) {
      try {
        const { getUserById } = await import("./db");
        const { sendUserNotification } = await import("./_core/userNotification");
        const user = await getUserById(userId);
        if (user) {
          await sendUserNotification(userId, {
            title: "✅ Processamento concluído!",
            message: `Seu projeto #${projectId} foi processado com sucesso. ${totalScenes} cenas geradas. Clique para visualizar.`,
            type: "success",
            projectId,
          });
        }
      } catch (notifyErr) {
        console.warn("[Pipeline] Could not send user notification:", notifyErr);
      }
    }

    // Trigger adaptive profile update asynchronously (non-blocking)
    try {
      const project = await getVideoProjectById(projectId);
      if (project?.userId) {
        analyzeAndUpdateProfile(project.userId).catch((err) =>
          console.error("[Pipeline] Adaptive profile update failed:", err)
        );
      }
    } catch (err) {
      console.error("[Pipeline] Could not trigger adaptive profile update:", err);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline] Fatal error for project ${projectId}:`, error);

    await updateVideoProject(projectId, {
      status: "failed",
      errorMessage,
      currentStep: "Falhou",
    });

    if (jobId) {
      await updateProcessingJob(jobId, {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
      });
    }

    // Notificar owner sobre falha
    await notifyOwner({
      title: "❌ Falha no processamento de vídeo",
      content: `O projeto #${projectId} falhou: ${errorMessage}`,
    });

    // Notificar usuário sobre falha
    if (userId) {
      try {
        const { sendUserNotification } = await import("./_core/userNotification");
        await sendUserNotification(userId, {
          title: "❌ Processamento falhou",
          message: `O projeto #${projectId} encontrou um erro: ${errorMessage.slice(0, 120)}`,
          type: "error",
          projectId,
        });
      } catch (notifyErr) {
        console.warn("[Pipeline] Could not send failure notification:", notifyErr);
      }
    }

    throw error;
  }
}
