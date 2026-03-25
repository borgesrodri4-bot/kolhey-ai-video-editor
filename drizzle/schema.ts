import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Video Projects ────────────────────────────────────────────────────────────
export const videoProjects = mysqlTable("video_projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "uploading",
    "processing",
    "completed",
    "failed",
  ])
    .default("pending")
    .notNull(),
  // S3 metadata only — no file bytes in DB
  originalVideoUrl: text("originalVideoUrl"),
  originalVideoKey: varchar("originalVideoKey", { length: 512 }),
  audioUrl: text("audioUrl"),
  audioKey: varchar("audioKey", { length: 512 }),
  fileSizeBytes: int("fileSizeBytes"),
  durationSeconds: float("durationSeconds"),
  // Processing progress (0–100)
  progress: int("progress").default(0).notNull(),
  currentStep: varchar("currentStep", { length: 128 }),
  errorMessage: text("errorMessage"),
  scenesCount: int("scenesCount").default(0).notNull(),
  // Visual style chosen by user at upload time
  visualStyle: varchar("visualStyle", { length: 64 }).default("auto"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoProject = typeof videoProjects.$inferSelect;
export type InsertVideoProject = typeof videoProjects.$inferInsert;

// ─── Video Scenes ──────────────────────────────────────────────────────────────
export const videoScenes = mysqlTable("video_scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneOrder: int("sceneOrder").notNull(),
  startTime: float("startTime").notNull(),
  endTime: float("endTime").notNull(),
  transcript: text("transcript").notNull(),
  illustrationPrompt: text("illustrationPrompt"),
  // S3 metadata only
  illustrationUrl: text("illustrationUrl"),
  illustrationKey: varchar("illustrationKey", { length: 512 }),
  illustrationStatus: mysqlEnum("illustrationStatus", [
    "pending",
    "generating",
    "completed",
    "failed",
  ])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VideoScene = typeof videoScenes.$inferSelect;
export type InsertVideoScene = typeof videoScenes.$inferInsert;

// ─── Processing Jobs ───────────────────────────────────────────────────────────
export const processingJobs = mysqlTable("processing_jobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  step: mysqlEnum("step", [
    "audio_extraction",
    "transcription",
    "scene_analysis",
    "image_generation",
    "completed",
  ]).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"])
    .default("pending")
    .notNull(),
  progress: int("progress").default(0).notNull(),
  errorMessage: text("errorMessage"),
  metadata: json("metadata"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type InsertProcessingJob = typeof processingJobs.$inferInsert;

// ─── User Style Profile (Adaptive Learning) ───────────────────────────────────
// Stores the learned style preferences for each user, updated after each project
export const userStyleProfiles = mysqlTable("user_style_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Number of projects analyzed to build this profile
  projectsAnalyzed: int("projectsAnalyzed").default(0).notNull(),
  // Confidence score 0-100: how reliable the learned profile is
  confidenceScore: int("confidenceScore").default(0).notNull(),
  // Preferred visual style keywords (e.g. "flat design, minimalist, warm tones")
  preferredVisualStyle: text("preferredVisualStyle"),
  // Preferred scene duration range in seconds
  avgSceneDurationSeconds: float("avgSceneDurationSeconds"),
  // Typical number of scenes per minute of video
  avgScenesPerMinute: float("avgScenesPerMinute"),
  // JSON: top keywords/themes the user tends to keep or emphasize
  topThemes: json("topThemes"),
  // JSON: style modifiers injected into image prompts (e.g. ["cinematic", "high contrast"])
  imageStyleModifiers: json("imageStyleModifiers"),
  // JSON: scene split preferences (e.g. {"splitOnSilence": true, "minSceneDuration": 5})
  sceneSplitPreferences: json("sceneSplitPreferences"),
  // Raw summary generated by LLM describing the user's editing style
  styleSummary: text("styleSummary"),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserStyleProfile = typeof userStyleProfiles.$inferSelect;
export type InsertUserStyleProfile = typeof userStyleProfiles.$inferInsert;

// ─── Edit Events (User Interaction Log) ───────────────────────────────────────
// Every time a user edits a scene prompt, regenerates an image, or gives feedback
export const editEvents = mysqlTable("edit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"),
  // Type of event
  eventType: mysqlEnum("eventType", [
    "prompt_edited",       // User manually changed the illustration prompt
    "image_regenerated",   // User clicked "regenerate image"
    "image_accepted",      // User kept the generated image (thumbs up / exported)
    "image_rejected",      // User rejected and regenerated (thumbs down)
    "scene_split",         // User split a scene into two
    "scene_merged",        // User merged two scenes
    "scene_deleted",       // User deleted a scene
    "style_feedback",      // Explicit style feedback submitted
  ]).notNull(),
  // The value before the edit (for prompt_edited)
  previousValue: text("previousValue"),
  // The value after the edit (for prompt_edited)
  newValue: text("newValue"),
  // Additional metadata (e.g. what changed, diff)
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditEvent = typeof editEvents.$inferSelect;
export type InsertEditEvent = typeof editEvents.$inferInsert;

// ─── Style Feedback ────────────────────────────────────────────────────────────
// Explicit thumbs up/down feedback on generated illustrations
export const styleFeedback = mysqlTable("style_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sceneId: int("sceneId").notNull(),
  projectId: int("projectId").notNull(),
  // positive = user liked the illustration, negative = disliked
  sentiment: mysqlEnum("sentiment", ["positive", "negative"]).notNull(),
  // The prompt that generated this illustration
  illustrationPrompt: text("illustrationPrompt"),
  // The URL of the illustration being rated
  illustrationUrl: text("illustrationUrl"),
  // Optional free-text comment
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StyleFeedback = typeof styleFeedback.$inferSelect;
export type InsertStyleFeedback = typeof styleFeedback.$inferInsert;
