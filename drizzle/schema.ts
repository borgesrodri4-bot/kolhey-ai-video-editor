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
