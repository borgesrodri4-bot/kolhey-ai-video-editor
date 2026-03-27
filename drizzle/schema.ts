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
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
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
  // Optional description/context provided by user at upload time
  description: text("description"),
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

// ─── Project Versions (Histórico de Versões) ──────────────────────────────────
// Each time a user re-processes a project with different settings, a new version is created
export const projectVersions = mysqlTable("project_versions", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  // Version number (1, 2, 3...)
  versionNumber: int("versionNumber").notNull(),
  // Label chosen by user (e.g. "Versão flat design", "Versão aquarela")
  label: varchar("label", { length: 255 }),
  // Visual style used in this version
  visualStyle: varchar("visualStyle", { length: 64 }),
  // Description/context used in this version
  description: text("description"),
  // Snapshot of scenes at the time of this version (JSON)
  scenesSnapshot: json("scenesSnapshot"),
  // Number of scenes in this version
  scenesCount: int("scenesCount").default(0).notNull(),
  // Whether this is the currently active version
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectVersion = typeof projectVersions.$inferSelect;
export type InsertProjectVersion = typeof projectVersions.$inferInsert;

// ─── User Notifications (In-App) ────────────────────────────────────────────────────────────────────────────
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["success", "error", "info", "warning"]).default("info").notNull(),
  // Optional reference to a project
  projectId: int("projectId"),
  // Null = unread, set to timestamp when user reads it
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

// ─── Invites (Sistema de Convites) ─────────────────────────────────────────────
export const invites = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdBy: int("createdBy").notNull(), // Admin que gerou o convite
  maxUses: int("maxUses").default(1).notNull(), // Quantas vezes pode ser usado (padrão 1)
  usesCount: int("usesCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt"), // Opcional: data de expiração
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

// ─── Authorized Users (Whitelist de Acesso Permanente) ─────────────────────────
export const authorizedUsers = mysqlTable("authorized_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  invitedBy: int("invitedBy"), // Admin que autorizou
  inviteId: int("inviteId"), // ID do convite usado (se houver)
  status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AuthorizedUser = typeof authorizedUsers.$inferSelect;
export type InsertAuthorizedUser = typeof authorizedUsers.$inferInsert;
