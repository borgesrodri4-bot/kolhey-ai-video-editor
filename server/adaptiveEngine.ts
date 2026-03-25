/**
 * Adaptive Learning Engine
 *
 * This module analyzes the user's editing history and feedback to build
 * a personalized style profile. The profile is then injected into the
 * AI pipeline (Claude scene analysis + DALL-E image generation) so that
 * every new project is progressively more aligned with the user's preferences.
 *
 * Learning loop:
 *   1. User edits prompts / gives feedback → events logged in `edit_events` + `style_feedback`
 *   2. After each project completes → `analyzeAndUpdateProfile()` runs
 *   3. On next project → `getStyleContext()` injects learned preferences into prompts
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  editEvents,
  styleFeedback,
  userStyleProfiles,
  videoScenes,
  videoProjects,
  type UserStyleProfile,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StyleContext {
  /** Ready-to-inject string for Claude scene analysis prompts */
  sceneAnalysisContext: string;
  /** Ready-to-inject string for DALL-E / image generation prompts */
  imageStyleSuffix: string;
  /** Human-readable summary of the learned style */
  styleSummary: string;
  /** 0–100 confidence that the profile is reliable */
  confidenceScore: number;
  /** Whether the profile has enough data to be useful */
  isReliable: boolean;
}

export interface EditEventPayload {
  userId: number;
  projectId: number;
  sceneId?: number;
  eventType:
    | "prompt_edited"
    | "image_regenerated"
    | "image_accepted"
    | "image_rejected"
    | "scene_split"
    | "scene_merged"
    | "scene_deleted"
    | "style_feedback";
  previousValue?: string;
  newValue?: string;
  metadata?: Record<string, unknown>;
}

// ─── Event Logging ─────────────────────────────────────────────────────────────

/**
 * Log a user interaction event. Called automatically from tRPC procedures
 * whenever the user modifies scenes, prompts, or gives feedback.
 */
export async function logEditEvent(payload: EditEventPayload): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(editEvents).values({
      userId: payload.userId,
      projectId: payload.projectId,
      sceneId: payload.sceneId ?? null,
      eventType: payload.eventType,
      previousValue: payload.previousValue ?? null,
      newValue: payload.newValue ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to log edit event:", err);
  }
}

/**
 * Log explicit thumbs up/down feedback on an illustration.
 */
export async function logStyleFeedback(params: {
  userId: number;
  sceneId: number;
  projectId: number;
  sentiment: "positive" | "negative";
  illustrationPrompt?: string;
  illustrationUrl?: string;
  comment?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(styleFeedback).values({
      userId: params.userId,
      sceneId: params.sceneId,
      projectId: params.projectId,
      sentiment: params.sentiment,
      illustrationPrompt: params.illustrationPrompt ?? null,
      illustrationUrl: params.illustrationUrl ?? null,
      comment: params.comment ?? null,
    });

    // Also log as an edit event for unified history
    await logEditEvent({
      userId: params.userId,
      projectId: params.projectId,
      sceneId: params.sceneId,
      eventType: params.sentiment === "positive" ? "image_accepted" : "image_rejected",
      metadata: { sentiment: params.sentiment, comment: params.comment },
    });
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to log style feedback:", err);
  }
}

// ─── Profile Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze all editing history for a user and update their style profile.
 * Called automatically after each project completes processing.
 * Uses LLM to synthesize patterns into a coherent style description.
 */
export async function analyzeAndUpdateProfile(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  console.log(`[AdaptiveEngine] Analyzing style profile for user ${userId}...`);

  try {
    // 1. Gather all edit events for this user
    const events = await db
      .select()
      .from(editEvents)
      .where(eq(editEvents.userId, userId))
      .orderBy(desc(editEvents.createdAt))
      .limit(200);

    // 2. Gather all style feedback
    const feedback = await db
      .select()
      .from(styleFeedback)
      .where(eq(styleFeedback.userId, userId))
      .orderBy(desc(styleFeedback.createdAt))
      .limit(100);

    // 3. Gather completed projects with their scenes for duration analysis
    const projects = await db
      .select()
      .from(videoProjects)
      .where(and(eq(videoProjects.userId, userId), eq(videoProjects.status, "completed")))
      .limit(20);

    const projectsAnalyzed = projects.length;

    if (projectsAnalyzed === 0 && events.length < 3) {
      console.log(`[AdaptiveEngine] Not enough data for user ${userId}, skipping.`);
      return;
    }

    // 4. Compute quantitative metrics
    const promptEdits = events.filter((e) => e.eventType === "prompt_edited");
    const regenerations = events.filter((e) => e.eventType === "image_regenerated");
    const acceptances = events.filter((e) => e.eventType === "image_accepted");
    const rejections = events.filter((e) => e.eventType === "image_rejected");

    const positivePrompts = feedback
      .filter((f) => f.sentiment === "positive" && f.illustrationPrompt)
      .map((f) => f.illustrationPrompt!)
      .slice(0, 20);

    const negativePrompts = feedback
      .filter((f) => f.sentiment === "negative" && f.illustrationPrompt)
      .map((f) => f.illustrationPrompt!)
      .slice(0, 10);

    // Compute scene duration averages from projects
    let avgSceneDuration: number | null = null;
    let avgScenesPerMin: number | null = null;

    if (projects.length > 0) {
      const sceneCounts = projects
        .filter((p) => p.scenesCount > 0 && p.durationSeconds && p.durationSeconds > 0)
        .map((p) => ({
          scenesPerMin: (p.scenesCount / p.durationSeconds!) * 60,
          avgDuration: p.durationSeconds! / p.scenesCount,
        }));

      if (sceneCounts.length > 0) {
        avgScenesPerMin =
          sceneCounts.reduce((s, x) => s + x.scenesPerMin, 0) / sceneCounts.length;
        avgSceneDuration =
          sceneCounts.reduce((s, x) => s + x.avgDuration, 0) / sceneCounts.length;
      }
    }

    // 5. Extract edited prompts to find style patterns
    const editedPrompts = promptEdits
      .filter((e) => e.newValue)
      .map((e) => e.newValue!)
      .slice(0, 30);

    // 6. Use LLM to synthesize a style profile from all gathered data
    const analysisData = {
      projectsAnalyzed,
      totalEdits: events.length,
      promptEditsCount: promptEdits.length,
      regenerationsCount: regenerations.length,
      acceptanceRate:
        acceptances.length + rejections.length > 0
          ? Math.round(
              (acceptances.length / (acceptances.length + rejections.length)) * 100
            )
          : null,
      positivePromptExamples: positivePrompts.slice(0, 10),
      negativePromptExamples: negativePrompts.slice(0, 5),
      userEditedPromptExamples: editedPrompts.slice(0, 15),
      avgSceneDurationSeconds: avgSceneDuration,
      avgScenesPerMinute: avgScenesPerMin,
    };

    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an AI style analyst. Analyze a video editor's behavior data and extract their editing style preferences. Return a JSON object with these exact fields:
{
  "preferredVisualStyle": "string describing visual style preferences (max 100 chars)",
  "topThemes": ["array", "of", "up to 8 theme keywords"],
  "imageStyleModifiers": ["array", "of", "up to 6 DALL-E style modifiers"],
  "sceneSplitPreferences": {
    "preferShortScenes": boolean,
    "preferDetailedPrompts": boolean,
    "preferMinimalistStyle": boolean
  },
  "styleSummary": "2-3 sentence human-readable summary of this user's editing style",
  "sceneAnalysisInstructions": "1-2 sentences of specific instructions for Claude when analyzing this user's videos",
  "imagePromptSuffix": "concise style suffix to append to every DALL-E prompt for this user (max 60 chars)"
}`,
        },
        {
          role: "user",
          content: `Analyze this user's editing behavior and extract their style profile:\n\n${JSON.stringify(analysisData, null, 2)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "style_profile",
          strict: true,
          schema: {
            type: "object",
            properties: {
              preferredVisualStyle: { type: "string" },
              topThemes: { type: "array", items: { type: "string" } },
              imageStyleModifiers: { type: "array", items: { type: "string" } },
              sceneSplitPreferences: {
                type: "object",
                properties: {
                  preferShortScenes: { type: "boolean" },
                  preferDetailedPrompts: { type: "boolean" },
                  preferMinimalistStyle: { type: "boolean" },
                },
                required: ["preferShortScenes", "preferDetailedPrompts", "preferMinimalistStyle"],
                additionalProperties: false,
              },
              styleSummary: { type: "string" },
              sceneAnalysisInstructions: { type: "string" },
              imagePromptSuffix: { type: "string" },
            },
            required: [
              "preferredVisualStyle",
              "topThemes",
              "imageStyleModifiers",
              "sceneSplitPreferences",
              "styleSummary",
              "sceneAnalysisInstructions",
              "imagePromptSuffix",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = llmResponse?.choices?.[0]?.message?.content;
    if (!rawContent) {
      console.error("[AdaptiveEngine] LLM returned empty response");
      return;
    }

    const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent));

    // 7. Compute confidence score (0–100)
    // More data = higher confidence
    const confidenceScore = Math.min(
      100,
      Math.round(
        (projectsAnalyzed * 15) +
        (promptEdits.length * 3) +
        (feedback.length * 5) +
        (regenerations.length * 2)
      )
    );

    // 8. Upsert the style profile
    const existing = await db
      .select({ id: userStyleProfiles.id })
      .from(userStyleProfiles)
      .where(eq(userStyleProfiles.userId, userId))
      .limit(1);

    const profileData = {
      userId,
      projectsAnalyzed,
      confidenceScore,
      preferredVisualStyle: parsed.preferredVisualStyle,
      avgSceneDurationSeconds: avgSceneDuration,
      avgScenesPerMinute: avgScenesPerMin,
      topThemes: parsed.topThemes,
      imageStyleModifiers: parsed.imageStyleModifiers,
      sceneSplitPreferences: parsed.sceneSplitPreferences,
      styleSummary: parsed.styleSummary,
      lastUpdatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(userStyleProfiles)
        .set(profileData)
        .where(eq(userStyleProfiles.userId, userId));
    } else {
      await db.insert(userStyleProfiles).values(profileData);
    }

    console.log(
      `[AdaptiveEngine] Profile updated for user ${userId} — confidence: ${confidenceScore}%`
    );
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to analyze/update profile:", err);
  }
}

// ─── Style Context Injection ───────────────────────────────────────────────────

/**
 * Get the style context for a user to inject into AI prompts.
 * Returns sensible defaults if no profile exists yet.
 */
export async function getStyleContext(userId: number): Promise<StyleContext> {
  const db = await getDb();

  const defaultContext: StyleContext = {
    sceneAnalysisContext: "",
    imageStyleSuffix: "",
    styleSummary: "No style profile yet. Processing with default settings.",
    confidenceScore: 0,
    isReliable: false,
  };

  if (!db) return defaultContext;

  try {
    const profiles = await db
      .select()
      .from(userStyleProfiles)
      .where(eq(userStyleProfiles.userId, userId))
      .limit(1);

    if (profiles.length === 0) return defaultContext;

    const profile = profiles[0] as UserStyleProfile;

    // Only inject style context if confidence is high enough
    const isReliable = profile.confidenceScore >= 20;

    const imageModifiers = Array.isArray(profile.imageStyleModifiers)
      ? (profile.imageStyleModifiers as string[]).join(", ")
      : "";

    const sceneInstructions = profile.preferredVisualStyle
      ? `This user prefers: ${profile.preferredVisualStyle}. ` +
        (profile.avgSceneDurationSeconds
          ? `Aim for scenes of ~${Math.round(profile.avgSceneDurationSeconds)}s each. `
          : "")
      : "";

    return {
      sceneAnalysisContext: isReliable ? sceneInstructions : "",
      imageStyleSuffix: isReliable && imageModifiers ? `, ${imageModifiers}` : "",
      styleSummary: profile.styleSummary ?? defaultContext.styleSummary,
      confidenceScore: profile.confidenceScore,
      isReliable,
    };
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to get style context:", err);
    return defaultContext;
  }
}

/**
 * Get the full style profile for a user (used in the UI).
 */
export async function getFullStyleProfile(userId: number): Promise<UserStyleProfile | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const profiles = await db
      .select()
      .from(userStyleProfiles)
      .where(eq(userStyleProfiles.userId, userId))
      .limit(1);

    return profiles.length > 0 ? (profiles[0] as UserStyleProfile) : null;
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to get full profile:", err);
    return null;
  }
}

/**
 * Get recent edit events for a user (used in the UI history panel).
 */
export async function getRecentEditEvents(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(editEvents)
      .where(eq(editEvents.userId, userId))
      .orderBy(desc(editEvents.createdAt))
      .limit(limit);
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to get edit events:", err);
    return [];
  }
}
