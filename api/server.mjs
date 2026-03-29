var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  json
} from "drizzle-orm/mysql-core";
var users, videoProjects, videoScenes, processingJobs, userStyleProfiles, editEvents, styleFeedback, projectVersions, userNotifications, invites, authorizedUsers;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    videoProjects = mysqlTable("video_projects", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      title: varchar("title", { length: 255 }).notNull(),
      status: mysqlEnum("status", [
        "pending",
        "uploading",
        "processing",
        "completed",
        "failed"
      ]).default("pending").notNull(),
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
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    videoScenes = mysqlTable("video_scenes", {
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
        "failed"
      ]).default("pending").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    processingJobs = mysqlTable("processing_jobs", {
      id: int("id").autoincrement().primaryKey(),
      projectId: int("projectId").notNull(),
      step: mysqlEnum("step", [
        "audio_extraction",
        "transcription",
        "scene_analysis",
        "image_generation",
        "completed"
      ]).notNull(),
      status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
      progress: int("progress").default(0).notNull(),
      errorMessage: text("errorMessage"),
      metadata: json("metadata"),
      startedAt: timestamp("startedAt"),
      completedAt: timestamp("completedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    userStyleProfiles = mysqlTable("user_style_profiles", {
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
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    editEvents = mysqlTable("edit_events", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      projectId: int("projectId").notNull(),
      sceneId: int("sceneId"),
      // Type of event
      eventType: mysqlEnum("eventType", [
        "prompt_edited",
        // User manually changed the illustration prompt
        "image_regenerated",
        // User clicked "regenerate image"
        "image_accepted",
        // User kept the generated image (thumbs up / exported)
        "image_rejected",
        // User rejected and regenerated (thumbs down)
        "scene_split",
        // User split a scene into two
        "scene_merged",
        // User merged two scenes
        "scene_deleted",
        // User deleted a scene
        "style_feedback"
        // Explicit style feedback submitted
      ]).notNull(),
      // The value before the edit (for prompt_edited)
      previousValue: text("previousValue"),
      // The value after the edit (for prompt_edited)
      newValue: text("newValue"),
      // Additional metadata (e.g. what changed, diff)
      metadata: json("metadata"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    styleFeedback = mysqlTable("style_feedback", {
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
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    projectVersions = mysqlTable("project_versions", {
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
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    userNotifications = mysqlTable("user_notifications", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      title: varchar("title", { length: 255 }).notNull(),
      message: text("message").notNull(),
      type: mysqlEnum("type", ["success", "error", "info", "warning"]).default("info").notNull(),
      // Optional reference to a project
      projectId: int("projectId"),
      // Null = unread, set to timestamp when user reads it
      readAt: timestamp("readAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    invites = mysqlTable("invites", {
      id: int("id").autoincrement().primaryKey(),
      token: varchar("token", { length: 255 }).notNull().unique(),
      createdBy: int("createdBy").notNull(),
      // Admin que gerou o convite
      maxUses: int("maxUses").default(1).notNull(),
      // Quantas vezes pode ser usado (padrão 1)
      usesCount: int("usesCount").default(0).notNull(),
      expiresAt: timestamp("expiresAt"),
      // Opcional: data de expiração
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    authorizedUsers = mysqlTable("authorized_users", {
      id: int("id").autoincrement().primaryKey(),
      email: varchar("email", { length: 320 }).notNull().unique(),
      invitedBy: int("invitedBy"),
      // Admin que autorizou
      inviteId: int("inviteId"),
      // ID do convite usado (se houver)
      status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: true,
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  authorizeUser: () => authorizeUser,
  countProjectVersions: () => countProjectVersions,
  createInvite: () => createInvite,
  createProcessingJob: () => createProcessingJob,
  createProjectVersion: () => createProjectVersion,
  createVideoProject: () => createVideoProject,
  createVideoScenes: () => createVideoScenes,
  deleteVideoProject: () => deleteVideoProject,
  getAdminStats: () => getAdminStats,
  getAllAuthorizedUsers: () => getAllAuthorizedUsers,
  getAllProjectsAdmin: () => getAllProjectsAdmin,
  getAllUsersAdmin: () => getAllUsersAdmin,
  getDb: () => getDb,
  getInviteByToken: () => getInviteByToken,
  getLatestJobByProject: () => getLatestJobByProject,
  getProcessingsByDay: () => getProcessingsByDay,
  getProjectVersionById: () => getProjectVersionById,
  getProjectVersions: () => getProjectVersions,
  getSceneById: () => getSceneById,
  getScenesByProject: () => getScenesByProject,
  getUserById: () => getUserById,
  getUserByOpenId: () => getUserByOpenId,
  getVideoProjectById: () => getVideoProjectById,
  getVideoProjectsByUser: () => getVideoProjectsByUser,
  getVideoProjectsByUserPaginated: () => getVideoProjectsByUserPaginated,
  incrementInviteUses: () => incrementInviteUses,
  isUserAuthorized: () => isUserAuthorized,
  reorderScenes: () => reorderScenes,
  revokeUserAuthorization: () => revokeUserAuthorization,
  setActiveProjectVersion: () => setActiveProjectVersion,
  updateProcessingJob: () => updateProcessingJob,
  updateUserPlan: () => updateUserPlan,
  updateVideoProject: () => updateVideoProject,
  updateVideoScene: () => updateVideoScene,
  upsertUser: () => upsertUser
});
import { eq, desc, and, sql, count, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    const value = user[field];
    if (value === void 0) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function updateUserPlan(userId, plan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ plan }).where(eq(users.id, userId));
}
async function createVideoProject(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(videoProjects).values(data);
  return result;
}
async function getVideoProjectsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videoProjects).where(eq(videoProjects.userId, userId)).orderBy(desc(videoProjects.createdAt));
}
async function getVideoProjectsByUserPaginated(userId, opts = {}) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: void 0, total: 0 };
  const limit = opts.limit ?? 20;
  const conditions = [eq(videoProjects.userId, userId)];
  if (opts.status) {
    conditions.push(eq(videoProjects.status, opts.status));
  }
  if (opts.search) {
    conditions.push(sql`LOWER(${videoProjects.title}) LIKE ${`%${opts.search.toLowerCase()}%`}`);
  }
  if (opts.cursor) {
    conditions.push(sql`${videoProjects.id} < ${opts.cursor}`);
  }
  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
  const items = await db.select().from(videoProjects).where(whereClause).orderBy(desc(videoProjects.id)).limit(limit + 1);
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : void 0;
  const countConditions = [eq(videoProjects.userId, userId)];
  if (opts.status) {
    countConditions.push(eq(videoProjects.status, opts.status));
  }
  if (opts.search) {
    countConditions.push(sql`LOWER(${videoProjects.title}) LIKE ${`%${opts.search.toLowerCase()}%`}`);
  }
  const countWhere = countConditions.length === 1 ? countConditions[0] : and(...countConditions);
  const [totalRow] = await db.select({ count: count() }).from(videoProjects).where(countWhere);
  return {
    items: pageItems,
    nextCursor,
    total: totalRow?.count ?? 0,
    hasMore
  };
}
async function getVideoProjectById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(videoProjects).where(eq(videoProjects.id, id)).limit(1);
  return result[0];
}
async function updateVideoProject(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videoProjects).set(data).where(eq(videoProjects.id, id));
}
async function deleteVideoProject(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(videoScenes).where(eq(videoScenes.projectId, id));
  await db.delete(processingJobs).where(eq(processingJobs.projectId, id));
  await db.delete(videoProjects).where(eq(videoProjects.id, id));
}
async function createVideoScenes(scenes) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (scenes.length === 0) return;
  await db.insert(videoScenes).values(scenes);
}
async function getScenesByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videoScenes).where(eq(videoScenes.projectId, projectId)).orderBy(videoScenes.sceneOrder);
}
async function updateVideoScene(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videoScenes).set(data).where(eq(videoScenes.id, id));
}
async function getSceneById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(videoScenes).where(eq(videoScenes.id, id)).limit(1);
  return result[0];
}
async function createProcessingJob(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(processingJobs).values(data);
  return result;
}
async function getLatestJobByProject(projectId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(processingJobs).where(eq(processingJobs.projectId, projectId)).orderBy(desc(processingJobs.createdAt)).limit(1);
  return result[0];
}
async function updateProcessingJob(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(processingJobs).set(data).where(eq(processingJobs.id, id));
}
async function reorderScenes(updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await Promise.all(
    updates.map(
      ({ id, sceneOrder }) => db.update(videoScenes).set({ sceneOrder }).where(eq(videoScenes.id, id))
    )
  );
}
async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalProjects: 0, totalProcessed: 0, totalFailed: 0 };
  const [userCount] = await db.select({ count: count() }).from(users);
  const [projectCount] = await db.select({ count: count() }).from(videoProjects);
  const [processedCount] = await db.select({ count: count() }).from(videoProjects).where(eq(videoProjects.status, "completed"));
  const [failedCount] = await db.select({ count: count() }).from(videoProjects).where(eq(videoProjects.status, "failed"));
  return {
    totalUsers: userCount?.count ?? 0,
    totalProjects: projectCount?.count ?? 0,
    totalProcessed: processedCount?.count ?? 0,
    totalFailed: failedCount?.count ?? 0
  };
}
async function getAllUsersAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}
async function getAllProjectsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videoProjects).orderBy(desc(videoProjects.createdAt)).limit(200);
}
async function getProcessingsByDay(days = 14) {
  const db = await getDb();
  if (!db) return [];
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - days);
  const rows = await db.select({
    day: sql`DATE(createdAt)`,
    count: count()
  }).from(videoProjects).where(gte(videoProjects.createdAt, since)).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);
  return rows;
}
async function createProjectVersion(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectVersions).values(data);
  return result;
}
async function getProjectVersions(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectVersions).where(eq(projectVersions.projectId, projectId)).orderBy(desc(projectVersions.createdAt));
}
async function getProjectVersionById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(projectVersions).where(eq(projectVersions.id, id)).limit(1);
  return result[0];
}
async function setActiveProjectVersion(projectId, versionId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectVersions).set({ isActive: "no" }).where(eq(projectVersions.projectId, projectId));
  await db.update(projectVersions).set({ isActive: "yes" }).where(eq(projectVersions.id, versionId));
}
async function countProjectVersions(projectId) {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ count: count() }).from(projectVersions).where(eq(projectVersions.projectId, projectId));
  return row?.count ?? 0;
}
async function createInvite(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(invites).values(data);
  return result;
}
async function getInviteByToken(token) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
  return result[0];
}
async function incrementInviteUses(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invites).set({ usesCount: sql`${invites.usesCount} + 1` }).where(eq(invites.id, id));
}
async function authorizeUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(authorizedUsers).values(data).onDuplicateKeyUpdate({ set: { status: "active" } });
}
async function isUserAuthorized(email) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(authorizedUsers).where(and(eq(authorizedUsers.email, email), eq(authorizedUsers.status, "active"))).limit(1);
  return result.length > 0;
}
async function getAllAuthorizedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(authorizedUsers).orderBy(desc(authorizedUsers.createdAt));
}
async function revokeUserAuthorization(email) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(authorizedUsers).set({ status: "revoked" }).where(eq(authorizedUsers.email, email));
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    init_schema();
    init_env();
    _db = null;
  }
});

// server/_core/userNotification.ts
var userNotification_exports = {};
__export(userNotification_exports, {
  countUnreadNotifications: () => countUnreadNotifications,
  getUserNotifications: () => getUserNotifications,
  markAllNotificationsRead: () => markAllNotificationsRead,
  markNotificationRead: () => markNotificationRead,
  sendUserNotification: () => sendUserNotification
});
import { eq as eq2, desc as desc2, and as and2, isNull } from "drizzle-orm";
async function sendUserNotification(userId, payload) {
  const db = await getDb();
  if (!db) {
    console.warn("[UserNotification] Database not available, skipping notification");
    return;
  }
  await db.insert(userNotifications).values({
    userId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    projectId: payload.projectId ?? null,
    readAt: null
  });
}
async function getUserNotifications(userId, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userNotifications).where(eq2(userNotifications.userId, userId)).orderBy(desc2(userNotifications.createdAt)).limit(limit);
}
async function markNotificationRead(id, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(userNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and2(eq2(userNotifications.id, id), eq2(userNotifications.userId, userId)));
}
async function markAllNotificationsRead(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(userNotifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and2(eq2(userNotifications.userId, userId), isNull(userNotifications.readAt)));
}
async function countUnreadNotifications(userId) {
  const db = await getDb();
  if (!db) return 0;
  const { count: count2 } = await import("drizzle-orm");
  const [row] = await db.select({ count: count2() }).from(userNotifications).where(and2(eq2(userNotifications.userId, userId), isNull(userNotifications.readAt)));
  return row?.count ?? 0;
}
var init_userNotification = __esm({
  "server/_core/userNotification.ts"() {
    init_db();
    init_schema();
  }
});

// server/_core/app.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/oauth.ts
init_db();
import { COOKIE_NAME as COOKIE_NAME2, ONE_YEAR_MS as ONE_YEAR_MS2 } from "@shared/const";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/sdk.ts
init_db();
init_env();
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS2
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME2, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS2 });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/supabaseAuth.ts
init_db();
import { createClient } from "@supabase/supabase-js";
import { COOKIE_NAME as COOKIE_NAME3, ONE_YEAR_MS as ONE_YEAR_MS3 } from "@shared/const";
var supabaseUrl = process.env.SUPABASE_URL ?? "https://fxxijiaisxmfhchgbiul.supabase.co";
var supabaseKey = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";
var supabase = createClient(supabaseUrl, supabaseKey);
function registerSupabaseAuthRoutes(app) {
  app.get("/api/auth/login", async (req, res) => {
    try {
      const redirectTo = `${req.protocol}://${req.get("host")}/api/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });
      if (error || !data?.url) {
        console.error("[Supabase Auth] Error generating OAuth URL:", error);
        res.status(500).json({ error: "Failed to generate login URL" });
        return;
      }
      res.redirect(302, data.url);
    } catch (err) {
      console.error("[Supabase Auth] Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app.get("/api/auth/callback", async (req, res) => {
    const code = req.query.code;
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
      const name = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? email ?? "Usu\xE1rio";
      await upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS3
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME3, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS3 });
      res.redirect(302, "/dashboard");
    } catch (err) {
      console.error("[Supabase Auth] Callback error:", err);
      res.redirect(302, "/?error=callback_failed");
    }
  });
  app.get("/api/auth/logout", async (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME3, cookieOptions);
    res.redirect(302, "/");
  });
}

// server/routers.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { COOKIE_NAME as COOKIE_NAME4 } from "@shared/const";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
init_db();
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var authorizedProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    if (ctx.user.role === "admin") {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }
    const authorized = await isUserAuthorized(ctx.user.email);
    if (!authorized) {
      throw new TRPCError2({
        code: "FORBIDDEN",
        message: "Acesso restrito. Voc\xEA precisa de um convite para acessar esta plataforma."
      });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/storage.ts
import fs from "fs/promises";
import path from "path";
var UPLOADS_DIR = path.join(process.cwd(), "uploads");
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  await ensureUploadsDir();
  const key = normalizeKey(relKey);
  const filePath = path.join(UPLOADS_DIR, key);
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });
  if (typeof data === "string") {
    await fs.writeFile(filePath, data, "utf-8");
  } else {
    await fs.writeFile(filePath, Buffer.from(data));
  }
  const url = `/api/files/${key}`;
  return { key, url };
}

// server/routers.ts
init_db();
init_userNotification();

// shared/nicheTemplates.ts
var NICHE_TEMPLATES = [
  {
    id: "educational",
    label: "Aula Educacional",
    description: "Conte\xFAdo did\xE1tico, explica\xE7\xF5es de conceitos, tutoriais",
    contextPrompt: "Este \xE9 um v\xEDdeo educacional. Priorize ilustra\xE7\xF5es que expliquem visualmente os conceitos apresentados. Use diagramas, infogr\xE1ficos e representa\xE7\xF5es claras. As cenas devem refor\xE7ar o aprendizado com imagens did\xE1ticas e acess\xEDveis.",
    suggestedStyle: "flat",
    icon: "\u{1F4DA}"
  },
  {
    id: "sales",
    label: "Pitch de Vendas",
    description: "Apresenta\xE7\xE3o de produto, proposta de valor, convers\xE3o",
    contextPrompt: "Este \xE9 um v\xEDdeo de vendas. As ilustra\xE7\xF5es devem transmitir confian\xE7a, profissionalismo e o valor do produto/servi\xE7o. Use imagens que mostrem benef\xEDcios, resultados e transforma\xE7\xF5es. Foco em elementos visuais persuasivos e modernos.",
    suggestedStyle: "photorealistic",
    icon: "\u{1F4BC}"
  },
  {
    id: "motivational",
    label: "Conte\xFAdo Motivacional",
    description: "Inspira\xE7\xE3o, supera\xE7\xE3o, desenvolvimento pessoal",
    contextPrompt: "Este \xE9 um v\xEDdeo motivacional. As ilustra\xE7\xF5es devem ser inspiradoras, energ\xE9ticas e emocionalmente impactantes. Use met\xE1foras visuais de crescimento, supera\xE7\xE3o e conquista. Cores vibrantes e composi\xE7\xF5es din\xE2micas.",
    suggestedStyle: "watercolor",
    icon: "\u{1F525}"
  },
  {
    id: "tutorial",
    label: "Tutorial / How-to",
    description: "Passo a passo, instru\xE7\xF5es, demonstra\xE7\xF5es pr\xE1ticas",
    contextPrompt: "Este \xE9 um v\xEDdeo tutorial com instru\xE7\xF5es passo a passo. As ilustra\xE7\xF5es devem mostrar claramente cada etapa do processo. Use setas, numera\xE7\xE3o visual, antes/depois e representa\xE7\xF5es de a\xE7\xF5es espec\xEDficas. Clareza e objetividade s\xE3o essenciais.",
    suggestedStyle: "flat",
    icon: "\u{1F6E0}\uFE0F"
  },
  {
    id: "storytelling",
    label: "Storytelling / Narrativa",
    description: "Hist\xF3rias, casos reais, jornada do cliente",
    contextPrompt: "Este \xE9 um v\xEDdeo narrativo com storytelling. As ilustra\xE7\xF5es devem criar uma atmosfera imersiva que apoie a hist\xF3ria sendo contada. Use personagens expressivos, cen\xE1rios detalhados e composi\xE7\xF5es cinematogr\xE1ficas que evoquem emo\xE7\xE3o.",
    suggestedStyle: "cartoon",
    icon: "\u{1F4D6}"
  },
  {
    id: "product_demo",
    label: "Demonstra\xE7\xE3o de Produto",
    description: "Features, funcionalidades, casos de uso do produto",
    contextPrompt: "Este \xE9 um v\xEDdeo de demonstra\xE7\xE3o de produto. As ilustra\xE7\xF5es devem mostrar o produto em uso, destacar funcionalidades e benef\xEDcios espec\xEDficos. Use mockups, interfaces, e representa\xE7\xF5es realistas do produto em contexto de uso.",
    suggestedStyle: "photorealistic",
    icon: "\u{1F4F1}"
  },
  {
    id: "kolhey",
    label: "Estilo Kolhey",
    description: "Identidade visual Kolhey: org\xE2nico, vibrante, aut\xEAntico",
    contextPrompt: "Este v\xEDdeo deve seguir a identidade visual Kolhey: ilustra\xE7\xF5es org\xE2nicas com tra\xE7os expressivos, paleta vibrante com tons terrosos e laranja, elementos da natureza brasileira, sensa\xE7\xE3o de autenticidade e crescimento sustent\xE1vel.",
    suggestedStyle: "kolhey",
    icon: "\u{1F33F}"
  }
];
function getNicheTemplateById(id) {
  return NICHE_TEMPLATES.find((t2) => t2.id === id);
}

// server/youtubeExtractor.ts
import ytdl from "@distube/ytdl-core";
import { nanoid } from "nanoid";
function isValidYouTubeUrl(url) {
  return ytdl.validateURL(url);
}
async function getYouTubeVideoInfo(url) {
  if (!ytdl.validateURL(url)) {
    throw new Error("URL do YouTube inv\xE1lida");
  }
  const info = await ytdl.getInfo(url);
  const videoDetails = info.videoDetails;
  return {
    title: videoDetails.title,
    duration: parseInt(videoDetails.lengthSeconds, 10),
    thumbnailUrl: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url ?? "",
    videoId: videoDetails.videoId
  };
}
async function extractYouTubeAudio(url) {
  if (!ytdl.validateURL(url)) {
    throw new Error("URL do YouTube inv\xE1lida");
  }
  const info = await ytdl.getInfo(url);
  const videoDetails = info.videoDetails;
  const durationSeconds = parseInt(videoDetails.lengthSeconds, 10);
  if (durationSeconds > 900) {
    throw new Error(
      "V\xEDdeo muito longo. O limite \xE9 de 15 minutos para v\xEDdeos do YouTube."
    );
  }
  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: "audioonly"
  });
  if (!audioFormat) {
    throw new Error("Nenhum formato de \xE1udio dispon\xEDvel para este v\xEDdeo");
  }
  const audioStream = ytdl.downloadFromInfo(info, { format: audioFormat });
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on("data", (chunk) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });
  const audioBuffer = Buffer.concat(chunks);
  const fileSizeBytes = audioBuffer.length;
  const key = `youtube-audio/${nanoid(12)}.webm`;
  const { url: audioUrl } = await storagePut(key, audioBuffer, "audio/webm");
  return {
    title: videoDetails.title,
    duration: durationSeconds,
    thumbnailUrl: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url ?? "",
    audioUrl,
    audioKey: key,
    fileSizeBytes
  };
}

// server/_core/voiceTranscription.ts
init_env();
async function transcribeAudio(options) {
  try {
    if (!ENV.forgeApiUrl) {
      return {
        error: "Voice transcription service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL is not set"
      };
    }
    if (!ENV.forgeApiKey) {
      return {
        error: "Voice transcription service authentication is missing",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_KEY is not set"
      };
    }
    let audioBuffer;
    let mimeType;
    try {
      const response2 = await fetch(options.audioUrl);
      if (!response2.ok) {
        return {
          error: "Failed to download audio file",
          code: "INVALID_FORMAT",
          details: `HTTP ${response2.status}: ${response2.statusText}`
        };
      }
      audioBuffer = Buffer.from(await response2.arrayBuffer());
      mimeType = response2.headers.get("content-type") || "audio/mpeg";
      const sizeMB = audioBuffer.length / (1024 * 1024);
      if (sizeMB > 16) {
        return {
          error: "Audio file exceeds maximum size limit",
          code: "FILE_TOO_LARGE",
          details: `File size is ${sizeMB.toFixed(2)}MB, maximum allowed is 16MB`
        };
      }
    } catch (error) {
      return {
        error: "Failed to fetch audio file",
        code: "SERVICE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      };
    }
    const formData = new FormData();
    const filename = `audio.${getFileExtension(mimeType)}`;
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append("file", audioBlob, filename);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    const prompt = options.prompt || (options.language ? `Transcribe the user's voice to text, the user's working language is ${getLanguageName(options.language)}` : "Transcribe the user's voice to text");
    formData.append("prompt", prompt);
    const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const fullUrl = new URL(
      "v1/audio/transcriptions",
      baseUrl
    ).toString();
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "Accept-Encoding": "identity"
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "Transcription service request failed",
        code: "TRANSCRIPTION_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      };
    }
    const whisperResponse = await response.json();
    if (!whisperResponse.text || typeof whisperResponse.text !== "string") {
      return {
        error: "Invalid transcription response",
        code: "SERVICE_ERROR",
        details: "Transcription service returned an invalid response format"
      };
    }
    return whisperResponse;
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
}
function getFileExtension(mimeType) {
  const mimeToExt = {
    "audio/webm": "webm",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a"
  };
  return mimeToExt[mimeType] || "audio";
}
function getLanguageName(langCode) {
  const langMap = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish"
  };
  return langMap[langCode] || langCode;
}

// server/_core/imageGeneration.ts
init_env();
import { storagePut as storagePut2 } from "server/storage";
async function generateImage(options) {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || []
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }
  const result = await response.json();
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");
  const { url } = await storagePut2(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url
  };
}

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const payload = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  payload.max_tokens = 32768;
  payload.thinking = {
    "budget_tokens": 128
  };
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/pipeline.ts
init_db();
import { nanoid as nanoid2 } from "nanoid";

// server/adaptiveEngine.ts
init_db();
init_schema();
import { eq as eq3, desc as desc3, and as and3 } from "drizzle-orm";
async function logEditEvent(payload) {
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
      metadata: payload.metadata ?? null
    });
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to log edit event:", err);
  }
}
async function logStyleFeedback(params) {
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
      comment: params.comment ?? null
    });
    await logEditEvent({
      userId: params.userId,
      projectId: params.projectId,
      sceneId: params.sceneId,
      eventType: params.sentiment === "positive" ? "image_accepted" : "image_rejected",
      metadata: { sentiment: params.sentiment, comment: params.comment }
    });
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to log style feedback:", err);
  }
}
async function analyzeAndUpdateProfile(userId) {
  const db = await getDb();
  if (!db) return;
  console.log(`[AdaptiveEngine] Analyzing style profile for user ${userId}...`);
  try {
    const events = await db.select().from(editEvents).where(eq3(editEvents.userId, userId)).orderBy(desc3(editEvents.createdAt)).limit(200);
    const feedback = await db.select().from(styleFeedback).where(eq3(styleFeedback.userId, userId)).orderBy(desc3(styleFeedback.createdAt)).limit(100);
    const projects = await db.select().from(videoProjects).where(and3(eq3(videoProjects.userId, userId), eq3(videoProjects.status, "completed"))).limit(20);
    const projectsAnalyzed = projects.length;
    if (projectsAnalyzed === 0 && events.length < 3) {
      console.log(`[AdaptiveEngine] Not enough data for user ${userId}, skipping.`);
      return;
    }
    const promptEdits = events.filter((e) => e.eventType === "prompt_edited");
    const regenerations = events.filter((e) => e.eventType === "image_regenerated");
    const acceptances = events.filter((e) => e.eventType === "image_accepted");
    const rejections = events.filter((e) => e.eventType === "image_rejected");
    const positivePrompts = feedback.filter((f) => f.sentiment === "positive" && f.illustrationPrompt).map((f) => f.illustrationPrompt).slice(0, 20);
    const negativePrompts = feedback.filter((f) => f.sentiment === "negative" && f.illustrationPrompt).map((f) => f.illustrationPrompt).slice(0, 10);
    let avgSceneDuration = null;
    let avgScenesPerMin = null;
    if (projects.length > 0) {
      const sceneCounts = projects.filter((p) => p.scenesCount > 0 && p.durationSeconds && p.durationSeconds > 0).map((p) => ({
        scenesPerMin: p.scenesCount / p.durationSeconds * 60,
        avgDuration: p.durationSeconds / p.scenesCount
      }));
      if (sceneCounts.length > 0) {
        avgScenesPerMin = sceneCounts.reduce((s, x) => s + x.scenesPerMin, 0) / sceneCounts.length;
        avgSceneDuration = sceneCounts.reduce((s, x) => s + x.avgDuration, 0) / sceneCounts.length;
      }
    }
    const editedPrompts = promptEdits.filter((e) => e.newValue).map((e) => e.newValue).slice(0, 30);
    const analysisData = {
      projectsAnalyzed,
      totalEdits: events.length,
      promptEditsCount: promptEdits.length,
      regenerationsCount: regenerations.length,
      acceptanceRate: acceptances.length + rejections.length > 0 ? Math.round(
        acceptances.length / (acceptances.length + rejections.length) * 100
      ) : null,
      positivePromptExamples: positivePrompts.slice(0, 10),
      negativePromptExamples: negativePrompts.slice(0, 5),
      userEditedPromptExamples: editedPrompts.slice(0, 15),
      avgSceneDurationSeconds: avgSceneDuration,
      avgScenesPerMinute: avgScenesPerMin
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
}`
        },
        {
          role: "user",
          content: `Analyze this user's editing behavior and extract their style profile:

${JSON.stringify(analysisData, null, 2)}`
        }
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
                  preferMinimalistStyle: { type: "boolean" }
                },
                required: ["preferShortScenes", "preferDetailedPrompts", "preferMinimalistStyle"],
                additionalProperties: false
              },
              styleSummary: { type: "string" },
              sceneAnalysisInstructions: { type: "string" },
              imagePromptSuffix: { type: "string" }
            },
            required: [
              "preferredVisualStyle",
              "topThemes",
              "imageStyleModifiers",
              "sceneSplitPreferences",
              "styleSummary",
              "sceneAnalysisInstructions",
              "imagePromptSuffix"
            ],
            additionalProperties: false
          }
        }
      }
    });
    const rawContent = llmResponse?.choices?.[0]?.message?.content;
    if (!rawContent) {
      console.error("[AdaptiveEngine] LLM returned empty response");
      return;
    }
    const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent));
    const confidenceScore = Math.min(
      100,
      Math.round(
        projectsAnalyzed * 15 + promptEdits.length * 3 + feedback.length * 5 + regenerations.length * 2
      )
    );
    const existing = await db.select({ id: userStyleProfiles.id }).from(userStyleProfiles).where(eq3(userStyleProfiles.userId, userId)).limit(1);
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
      lastUpdatedAt: /* @__PURE__ */ new Date()
    };
    if (existing.length > 0) {
      await db.update(userStyleProfiles).set(profileData).where(eq3(userStyleProfiles.userId, userId));
    } else {
      await db.insert(userStyleProfiles).values(profileData);
    }
    console.log(
      `[AdaptiveEngine] Profile updated for user ${userId} \u2014 confidence: ${confidenceScore}%`
    );
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to analyze/update profile:", err);
  }
}
async function getStyleContext(userId) {
  const db = await getDb();
  const defaultContext = {
    sceneAnalysisContext: "",
    imageStyleSuffix: "",
    styleSummary: "No style profile yet. Processing with default settings.",
    confidenceScore: 0,
    isReliable: false
  };
  if (!db) return defaultContext;
  try {
    const profiles = await db.select().from(userStyleProfiles).where(eq3(userStyleProfiles.userId, userId)).limit(1);
    if (profiles.length === 0) return defaultContext;
    const profile = profiles[0];
    const isReliable = profile.confidenceScore >= 20;
    const imageModifiers = Array.isArray(profile.imageStyleModifiers) ? profile.imageStyleModifiers.join(", ") : "";
    const sceneInstructions = profile.preferredVisualStyle ? `This user prefers: ${profile.preferredVisualStyle}. ` + (profile.avgSceneDurationSeconds ? `Aim for scenes of ~${Math.round(profile.avgSceneDurationSeconds)}s each. ` : "") : "";
    return {
      sceneAnalysisContext: isReliable ? sceneInstructions : "",
      imageStyleSuffix: isReliable && imageModifiers ? `, ${imageModifiers}` : "",
      styleSummary: profile.styleSummary ?? defaultContext.styleSummary,
      confidenceScore: profile.confidenceScore,
      isReliable
    };
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to get style context:", err);
    return defaultContext;
  }
}
async function getFullStyleProfile(userId) {
  const db = await getDb();
  if (!db) return null;
  try {
    const profiles = await db.select().from(userStyleProfiles).where(eq3(userStyleProfiles.userId, userId)).limit(1);
    return profiles.length > 0 ? profiles[0] : null;
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to get full profile:", err);
    return null;
  }
}
async function getRecentEditEvents(userId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(editEvents).where(eq3(editEvents.userId, userId)).orderBy(desc3(editEvents.createdAt)).limit(limit);
  } catch (err) {
    console.error("[AdaptiveEngine] Failed to get edit events:", err);
    return [];
  }
}

// server/pipeline.ts
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, maxAttempts = 3, delayMs = 2e3) {
  let lastError;
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
async function transcribeVideo(audioUrl) {
  const result = await withRetry(
    () => transcribeAudio({ audioUrl, language: "pt" })
  );
  if ("error" in result) {
    throw new Error(`Transcription failed: ${result.error} - ${result.details ?? ""}`);
  }
  if (!result.segments || result.segments.length === 0) {
    return [{ start: 0, end: 60, text: result.text }];
  }
  return result.segments.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim()
  }));
}
async function analyzeAndGenerateScenes(segments, styleCtx, projectDescription) {
  const adaptiveInstructions = styleCtx?.isReliable && styleCtx.sceneAnalysisContext ? `

Perfil de estilo do usu\xE1rio (aplique estas prefer\xEAncias):
${styleCtx.sceneAnalysisContext}` : "";
  const descriptionContext = projectDescription?.trim() ? `

Contexto do projeto fornecido pelo usu\xE1rio: "${projectDescription.trim()}"
Use este contexto para criar prompts de ilustra\xE7\xE3o mais precisos e alinhados ao objetivo do v\xEDdeo.` : "";
  const systemPrompt = `Voc\xEA \xE9 um diretor de arte e editor de v\xEDdeo especialista em conte\xFAdo digital.
Sua tarefa \xE9 analisar a transcri\xE7\xE3o de um v\xEDdeo (lista de legendas numeradas) e agrup\xE1-la em cenas l\xF3gicas.

REGRAS DE OURO DE SINCRONIZA\xC7\xC3O:
1. N\xC3O tente calcular o tempo em segundos (ex: 2.3s). 
2. Use APENAS o "index" da legenda para marcar o in\xEDcio de cada cena.
3. Categorize o v\xEDdeo em 1 de 7 formatos: compara\xE7\xE3o, revela\xE7\xE3o, sequ\xEAncia, autoridade direta, demonstra\xE7\xE3o, tutorial, storytelling.
4. Escolha 1 de 11 componentes de cena: impacto, whatsapp, comparativo, numero_animado, rosto_ilustracao, lista, grafico, mapa, codigo, depoimento, call_to_action.

DIRETRIZES VISUAIS:
- Crie prompts de imagem altamente descritivos em ingl\xEAs para ilustra\xE7\xF5es flat design.
- O prompt deve descrever visualmente o conceito falado, n\xE3o o texto literal.
- Use estilo: flat design, cores vibrantes, moderno, minimalista.
- Defina uma paleta de cores baseada no tema.${adaptiveInstructions}${descriptionContext}

Formato de sa\xEDda (JSON estrito):
[
  {
    "legenda_index_inicio": 0,
    "formato": "compara\xE7\xE3o",
    "componente": "comparativo",
    "texto_falado": "texto original agrupado da cena",
    "prompt_ilustracao": "Detailed flat design illustration of... vibrant colors, modern style",
    "paleta_cores": ["#HEX1", "#HEX2"]
  }
]`;
  const simplifiedSegments = segments.map((s, i) => ({ index: i, text: s.text }));
  const userMessage = `Lista de legendas numeradas:
${JSON.stringify(simplifiedSegments, null, 2)}`;
  const response = await withRetry(
    () => invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
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
                paleta_cores: { type: "array", items: { type: "string" } }
              },
              required: ["legenda_index_inicio", "formato", "componente", "texto_falado", "prompt_ilustracao", "paleta_cores"],
              additionalProperties: false
            }
          }
        }
      }
    })
  );
  const rawContent = response.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("LLM returned empty response");
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("Failed to parse LLM response as JSON");
  }
}
async function generateSceneIllustration(sceneId, prompt, styleCtx) {
  const styleSuffix = styleCtx?.isReliable && styleCtx.imageStyleSuffix ? styleCtx.imageStyleSuffix : "";
  const result = await withRetry(
    () => generateImage({
      prompt: `${prompt}. Flat design illustration, vibrant colors, modern minimalist style, high quality, no text${styleSuffix}.`
    })
  );
  if (!result.url) throw new Error("Image generation returned no URL");
  const imageResponse = await fetch(result.url);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const key = `scenes/${sceneId}-${nanoid2(8)}.png`;
  const { url } = await storagePut(key, imageBuffer, "image/png");
  return { url, key };
}
async function runVideoPipeline(projectId, audioUrl, styleCtx, projectDescription, userId) {
  let jobId;
  try {
    const jobResult = await createProcessingJob({
      projectId,
      step: "transcription",
      status: "running",
      progress: 0,
      startedAt: /* @__PURE__ */ new Date()
    });
    jobId = jobResult.insertId;
    await updateVideoProject(projectId, {
      status: "processing",
      progress: 10,
      currentStep: "Transcrevendo \xE1udio..."
    });
    const segments = await transcribeVideo(audioUrl);
    await updateVideoProject(projectId, { progress: 35, currentStep: "Analisando conte\xFAdo..." });
    if (jobId) await updateProcessingJob(jobId, { step: "scene_analysis", progress: 35 });
    const scenes = await analyzeAndGenerateScenes(segments, styleCtx, projectDescription);
    await createVideoScenes(
      scenes.map((scene, idx) => ({
        projectId,
        sceneOrder: idx,
        startTime: scene.tempo_inicio,
        endTime: scene.tempo_fim,
        transcript: scene.texto_falado,
        illustrationPrompt: scene.prompt_ilustracao,
        illustrationStatus: "pending"
      }))
    );
    await updateVideoProject(projectId, {
      progress: 50,
      currentStep: "Gerando ilustra\xE7\xF5es...",
      scenesCount: scenes.length
    });
    if (jobId) await updateProcessingJob(jobId, { step: "image_generation", progress: 50 });
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
          illustrationStatus: "completed"
        });
      } catch (err) {
        console.error(`[Pipeline] Failed to generate image for scene ${scene.id}:`, err);
        await updateVideoScene(scene.id, { illustrationStatus: "failed" });
      }
      const progress = 50 + Math.round((i + 1) / totalScenes * 45);
      await updateVideoProject(projectId, {
        progress,
        currentStep: `Gerando ilustra\xE7\xE3o ${i + 1}/${totalScenes}...`
      });
    }
    await updateVideoProject(projectId, {
      status: "completed",
      progress: 100,
      currentStep: "Conclu\xEDdo"
    });
    if (jobId) {
      await updateProcessingJob(jobId, {
        step: "completed",
        status: "completed",
        progress: 100,
        completedAt: /* @__PURE__ */ new Date()
      });
    }
    await notifyOwner({
      title: "\u2705 V\xEDdeo processado com sucesso",
      content: `O projeto #${projectId} foi processado com sucesso. ${totalScenes} cenas geradas.`
    });
    if (userId) {
      try {
        const { getUserById: getUserById2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { sendUserNotification: sendUserNotification3 } = await Promise.resolve().then(() => (init_userNotification(), userNotification_exports));
        const user = await getUserById2(userId);
        if (user) {
          await sendUserNotification3(userId, {
            title: "\u2705 Processamento conclu\xEDdo!",
            message: `Seu projeto #${projectId} foi processado com sucesso. ${totalScenes} cenas geradas. Clique para visualizar.`,
            type: "success",
            projectId
          });
        }
      } catch (notifyErr) {
        console.warn("[Pipeline] Could not send user notification:", notifyErr);
      }
    }
    try {
      const project = await getVideoProjectById(projectId);
      if (project?.userId) {
        analyzeAndUpdateProfile(project.userId).catch(
          (err) => console.error("[Pipeline] Adaptive profile update failed:", err)
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
      currentStep: "Falhou"
    });
    if (jobId) {
      await updateProcessingJob(jobId, {
        status: "failed",
        errorMessage,
        completedAt: /* @__PURE__ */ new Date()
      });
    }
    await notifyOwner({
      title: "\u274C Falha no processamento de v\xEDdeo",
      content: `O projeto #${projectId} falhou: ${errorMessage}`
    });
    if (userId) {
      try {
        const { sendUserNotification: sendUserNotification3 } = await Promise.resolve().then(() => (init_userNotification(), userNotification_exports));
        await sendUserNotification3(userId, {
          title: "\u274C Processamento falhou",
          message: `O projeto #${projectId} encontrou um erro: ${errorMessage.slice(0, 120)}`,
          type: "error",
          projectId
        });
      } catch (notifyErr) {
        console.warn("[Pipeline] Could not send failure notification:", notifyErr);
      }
    }
    throw error;
  }
}

// server/routers.ts
import { nanoid as nanoid3 } from "nanoid";
async function assertProjectOwner(projectId, userId) {
  const project = await getVideoProjectById(projectId);
  if (!project) throw new TRPCError3({ code: "NOT_FOUND", message: "Projeto n\xE3o encontrado" });
  if (project.userId !== userId)
    throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
  return project;
}
var videosRouter = router({
  /** Gera URL presigned para upload direto ao S3 */
  getUploadUrl: authorizedProcedure.input(
    z2.object({
      filename: z2.string(),
      contentType: z2.string(),
      fileSizeBytes: z2.number().max(500 * 1024 * 1024, "Arquivo m\xE1ximo: 500MB")
    })
  ).mutation(async ({ input, ctx }) => {
    const ext = input.filename.split(".").pop() ?? "mp4";
    const key = `videos/${ctx.user.id}/${nanoid3(16)}.${ext}`;
    return { key, uploadEndpoint: `/api/upload-video?key=${encodeURIComponent(key)}` };
  }),
  /** Cria projeto após upload concluído */
  create: authorizedProcedure.input(
    z2.object({
      title: z2.string().min(1).max(255),
      description: z2.string().max(1e3).optional(),
      videoKey: z2.string(),
      videoUrl: z2.string().url(),
      fileSizeBytes: z2.number(),
      visualStyle: z2.string().optional().default("auto")
    })
  ).mutation(async ({ input, ctx }) => {
    const result = await createVideoProject({
      userId: ctx.user.id,
      title: input.title,
      description: input.description,
      status: "pending",
      originalVideoUrl: input.videoUrl,
      originalVideoKey: input.videoKey,
      fileSizeBytes: input.fileSizeBytes,
      visualStyle: input.visualStyle,
      progress: 0
    });
    const insertId = result.insertId;
    return { id: insertId };
  }),
  /** Lista projetos do usuário com paginação cursor-based */
  list: authorizedProcedure.input(
    z2.object({
      cursor: z2.number().optional(),
      // ID do último item da página anterior
      limit: z2.number().min(1).max(50).default(20),
      status: z2.enum(["all", "pending", "processing", "completed", "failed"]).default("all"),
      search: z2.string().optional()
    })
  ).query(async ({ input, ctx }) => {
    return getVideoProjectsByUserPaginated(ctx.user.id, {
      cursor: input.cursor,
      limit: input.limit,
      status: input.status === "all" ? void 0 : input.status,
      search: input.search
    });
  }),
  /** Busca projeto por ID com suas cenas */
  getById: authorizedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input, ctx }) => {
    const project = await assertProjectOwner(input.id, ctx.user.id);
    const scenes = await getScenesByProject(input.id);
    return { ...project, scenes };
  }),
  /** Inicia o pipeline de processamento (com contexto adaptativo injetado) */
  startProcessing: authorizedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
    const project = await assertProjectOwner(input.id, ctx.user.id);
    if (project.status === "processing") {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Projeto j\xE1 est\xE1 sendo processado" });
    }
    if (!project.originalVideoUrl) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "V\xEDdeo n\xE3o encontrado" });
    }
    const styleCtx = await getStyleContext(ctx.user.id);
    runVideoPipeline(input.id, project.originalVideoUrl, styleCtx, project.description ?? void 0, ctx.user.id).catch((err) => {
      console.error(`[Router] Pipeline failed for project ${input.id}:`, err);
    });
    return {
      started: true,
      adaptiveProfile: {
        isActive: styleCtx.isReliable,
        confidenceScore: styleCtx.confidenceScore,
        message: styleCtx.isReliable ? `Perfil de estilo aplicado (${styleCtx.confidenceScore}% de confian\xE7a)` : "Processando com configura\xE7\xF5es padr\xE3o. Continue editando para personalizar."
      }
    };
  }),
  /** Polling de status do processamento */
  getStatus: authorizedProcedure.input(z2.object({ id: z2.number() })).query(async ({ input, ctx }) => {
    const project = await assertProjectOwner(input.id, ctx.user.id);
    return {
      status: project.status,
      progress: project.progress,
      currentStep: project.currentStep,
      errorMessage: project.errorMessage,
      scenesCount: project.scenesCount
    };
  }),
  /** Deleta projeto e arquivos */
  delete: authorizedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.id, ctx.user.id);
    await deleteVideoProject(input.id);
    return { deleted: true };
  })
});
var scenesRouter = router({
  /** Atualiza prompt ou texto de uma cena — registra evento adaptativo */
  update: authorizedProcedure.input(
    z2.object({
      sceneId: z2.number(),
      projectId: z2.number(),
      transcript: z2.string().optional(),
      illustrationPrompt: z2.string().optional(),
      previousPrompt: z2.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    const updateData = {};
    if (input.transcript !== void 0) updateData.transcript = input.transcript;
    if (input.illustrationPrompt !== void 0)
      updateData.illustrationPrompt = input.illustrationPrompt;
    await updateVideoScene(input.sceneId, updateData);
    if (input.illustrationPrompt !== void 0) {
      await logEditEvent({
        userId: ctx.user.id,
        projectId: input.projectId,
        sceneId: input.sceneId,
        eventType: "prompt_edited",
        previousValue: input.previousPrompt,
        newValue: input.illustrationPrompt,
        metadata: { field: "illustrationPrompt" }
      });
    }
    return { updated: true };
  }),
  /** Regenera a ilustração de uma cena — registra evento adaptativo */
  regenerateImage: authorizedProcedure.input(z2.object({ sceneId: z2.number(), projectId: z2.number() })).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    const scene = await getSceneById(input.sceneId);
    if (!scene) throw new TRPCError3({ code: "NOT_FOUND", message: "Cena n\xE3o encontrada" });
    if (!scene.illustrationPrompt)
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Cena sem prompt de ilustra\xE7\xE3o" });
    await logEditEvent({
      userId: ctx.user.id,
      projectId: input.projectId,
      sceneId: input.sceneId,
      eventType: "image_regenerated",
      metadata: { prompt: scene.illustrationPrompt }
    });
    const styleCtx = await getStyleContext(ctx.user.id);
    const enhancedPrompt = `${scene.illustrationPrompt}. Flat design illustration, vibrant colors, modern minimalist style, high quality, no text${styleCtx.imageStyleSuffix}.`;
    await updateVideoScene(input.sceneId, { illustrationStatus: "generating" });
    try {
      const result = await generateImage({ prompt: enhancedPrompt });
      if (!result.url) throw new Error("Image generation returned no URL");
      const imageResponse = await fetch(result.url);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const key = `scenes/${input.sceneId}-${nanoid3(8)}.png`;
      const { url } = await storagePut(key, imageBuffer, "image/png");
      await updateVideoScene(input.sceneId, {
        illustrationUrl: url,
        illustrationKey: key,
        illustrationStatus: "completed"
      });
      return { url };
    } catch (err) {
      await updateVideoScene(input.sceneId, { illustrationStatus: "failed" });
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "Falha ao gerar ilustra\xE7\xE3o"
      });
    }
  }),
  /** Feedback de estilo (👍/👎) em uma ilustração */
  submitFeedback: authorizedProcedure.input(
    z2.object({
      sceneId: z2.number(),
      projectId: z2.number(),
      sentiment: z2.enum(["positive", "negative"]),
      comment: z2.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    const scene = await getSceneById(input.sceneId);
    if (!scene) throw new TRPCError3({ code: "NOT_FOUND", message: "Cena n\xE3o encontrada" });
    await logStyleFeedback({
      userId: ctx.user.id,
      projectId: input.projectId,
      sceneId: input.sceneId,
      sentiment: input.sentiment,
      illustrationPrompt: scene.illustrationPrompt ?? void 0,
      illustrationUrl: scene.illustrationUrl ?? void 0,
      comment: input.comment
    });
    return { success: true };
  }),
  /** Reordena cenas de um projeto */
  reorder: authorizedProcedure.input(
    z2.object({
      projectId: z2.number(),
      updates: z2.array(z2.object({ id: z2.number(), sceneOrder: z2.number() }))
    })
  ).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    await reorderScenes(input.updates);
    return { success: true };
  })
});
var adaptiveRouter = router({
  /** Retorna o perfil de estilo completo do usuário */
  getProfile: authorizedProcedure.query(async ({ ctx }) => {
    return getFullStyleProfile(ctx.user.id);
  }),
  /** Retorna eventos de edição recentes */
  getHistory: authorizedProcedure.input(z2.object({ limit: z2.number().min(1).max(100).default(20) })).query(async ({ input, ctx }) => {
    return getRecentEditEvents(ctx.user.id, input.limit);
  }),
  /** Força uma re-análise do perfil de estilo (Admin ou debug) */
  triggerAnalysis: authorizedProcedure.mutation(async ({ ctx }) => {
    await analyzeAndUpdateProfile(ctx.user.id);
    return { success: true };
  })
});
var adminRouter = router({
  /** Estatísticas gerais da plataforma */
  getStats: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    return getAdminStats();
  }),
  /** Lista todos os usuários */
  listUsers: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    return getAllUsersAdmin();
  }),
  /** Lista projetos recentes de todos os usuários */
  listAllProjects: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    return getAllProjectsAdmin();
  }),
  /** Dados para gráfico de processamento por dia */
  getChartData: authorizedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin")
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    return getProcessingsByDay();
  })
});
var nicheRouter = router({
  /** Lista todos os templates de nicho disponíveis */
  listTemplates: authorizedProcedure.query(() => {
    return NICHE_TEMPLATES;
  }),
  /** Busca template por ID */
  getTemplate: authorizedProcedure.input(z2.object({ id: z2.string() })).query(({ input }) => {
    const template = getNicheTemplateById(input.id);
    if (!template) throw new TRPCError3({ code: "NOT_FOUND", message: "Template n\xE3o encontrado" });
    return template;
  })
});
var youtubeRouter = router({
  /** Valida URL e busca informações básicas do vídeo */
  getInfo: authorizedProcedure.input(z2.object({ url: z2.string().url() })).query(async ({ input }) => {
    if (!isValidYouTubeUrl(input.url)) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "URL do YouTube inv\xE1lida" });
    }
    try {
      return await getYouTubeVideoInfo(input.url);
    } catch (err) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao buscar v\xEDdeo" });
    }
  }),
  /** Cria projeto a partir de vídeo do YouTube */
  createFromUrl: authorizedProcedure.input(
    z2.object({
      youtubeUrl: z2.string().url(),
      title: z2.string().optional(),
      description: z2.string().max(1e3).optional(),
      visualStyle: z2.string().optional().default("auto")
    })
  ).mutation(async ({ input, ctx }) => {
    const user = await getUserById(ctx.user.id);
    const plan = user?.plan ?? "free";
    const info = await getYouTubeVideoInfo(input.youtubeUrl);
    const limit = PLAN_YOUTUBE_LIMITS[plan];
    if (info.duration > limit) {
      const durationMin = Math.ceil(info.duration / 60);
      const limitMin = Math.floor(limit / 60);
      throw new TRPCError3({
        code: "FORBIDDEN",
        message: `V\xEDdeo muito longo (${durationMin}min). Seu plano ${PLAN_LABELS[plan]} permite at\xE9 ${limitMin} minutos. Fa\xE7a upgrade para processar v\xEDdeos mais longos.`
      });
    }
    let audioInfo;
    try {
      audioInfo = await extractYouTubeAudio(input.youtubeUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao extrair \xE1udio do YouTube";
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: msg });
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
      progress: 0
    });
    const insertId = result.insertId;
    return { id: insertId, title: input.title || audioInfo.title };
  })
});
var versionsRouter = router({
  /** Lista todas as versões de um projeto */
  list: authorizedProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    return getProjectVersions(input.projectId);
  }),
  /** Salva snapshot da versão atual como histórico */
  saveSnapshot: authorizedProcedure.input(
    z2.object({
      projectId: z2.number(),
      label: z2.string().max(255).optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const project = await assertProjectOwner(input.projectId, ctx.user.id);
    const scenes = await getScenesByProject(input.projectId);
    const versionCount = await countProjectVersions(input.projectId);
    const result = await createProjectVersion({
      projectId: input.projectId,
      userId: ctx.user.id,
      versionNumber: versionCount + 1,
      label: input.label ?? `Vers\xE3o ${versionCount + 1}`,
      visualStyle: project.visualStyle ?? "auto",
      description: project.description ?? void 0,
      scenesSnapshot: scenes,
      scenesCount: scenes.length,
      isActive: "yes"
    });
    const versionId = result.insertId;
    await setActiveProjectVersion(input.projectId, versionId);
    return { versionId, versionNumber: versionCount + 1 };
  }),
  /** Define uma versão como ativa */
  setActive: authorizedProcedure.input(z2.object({ projectId: z2.number(), versionId: z2.number() })).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    await setActiveProjectVersion(input.projectId, input.versionId);
    return { activated: true };
  }),
  /** Restaura cenas de uma versão anterior */
  restore: authorizedProcedure.input(z2.object({ projectId: z2.number(), versionId: z2.number() })).mutation(async ({ input, ctx }) => {
    await assertProjectOwner(input.projectId, ctx.user.id);
    const version = await getProjectVersionById(input.versionId);
    if (!version) throw new TRPCError3({ code: "NOT_FOUND", message: "Vers\xE3o n\xE3o encontrada" });
    if (version.projectId !== input.projectId)
      throw new TRPCError3({ code: "FORBIDDEN", message: "Vers\xE3o n\xE3o pertence a este projeto" });
    const snapshot = version.scenesSnapshot;
    if (snapshot && Array.isArray(snapshot)) {
      await Promise.all(
        snapshot.map(
          (scene) => updateVideoScene(scene.id, {
            illustrationPrompt: scene.illustrationPrompt,
            illustrationUrl: scene.illustrationUrl,
            illustrationKey: scene.illustrationKey,
            illustrationStatus: scene.illustrationStatus,
            transcript: scene.transcript,
            sceneOrder: scene.sceneOrder
          })
        )
      );
    }
    await setActiveProjectVersion(input.projectId, input.versionId);
    return { restored: true, scenesRestored: snapshot?.length ?? 0 };
  }),
  /** Inicia reprocessamento do projeto com novas configurações */
  reprocess: authorizedProcedure.input(
    z2.object({
      projectId: z2.number(),
      visualStyle: z2.string().optional(),
      description: z2.string().max(1e3).optional(),
      label: z2.string().max(255).optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const project = await assertProjectOwner(input.projectId, ctx.user.id);
    if (project.status === "processing") {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Projeto j\xE1 est\xE1 sendo processado" });
    }
    if (!project.originalVideoUrl) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "V\xEDdeo n\xE3o encontrado" });
    }
    const scenes = await getScenesByProject(input.projectId);
    if (scenes.length > 0) {
      const versionCount = await countProjectVersions(input.projectId);
      const vResult = await createProjectVersion({
        projectId: input.projectId,
        userId: ctx.user.id,
        versionNumber: versionCount + 1,
        label: input.label ?? `Vers\xE3o ${versionCount + 1} - ${project.visualStyle ?? "auto"}`,
        visualStyle: project.visualStyle ?? "auto",
        description: project.description ?? void 0,
        scenesSnapshot: scenes,
        scenesCount: scenes.length,
        isActive: "no"
      });
      console.log(`[Versions] Saved version ${versionCount + 1} before reprocessing project ${input.projectId}`);
    }
    const updateData = {};
    if (input.visualStyle) updateData.visualStyle = input.visualStyle;
    if (input.description !== void 0) updateData.description = input.description;
    if (Object.keys(updateData).length > 0) {
      await updateVideoProject(input.projectId, updateData);
    }
    const styleCtx = await getStyleContext(ctx.user.id);
    const finalDescription = input.description ?? project.description ?? void 0;
    runVideoPipeline(input.projectId, project.originalVideoUrl, styleCtx, finalDescription, ctx.user.id).catch((err) => {
      console.error(`[Router] Reprocess pipeline failed for project ${input.projectId}:`, err);
    });
    return { started: true };
  })
});
var notificationsRouter = router({
  /** Lista notificações do usuário autenticado */
  list: authorizedProcedure.input(z2.object({ limit: z2.number().min(1).max(50).optional() })).query(async ({ input, ctx }) => {
    return getUserNotifications(ctx.user.id, input.limit ?? 20);
  }),
  /** Conta notificações não lidas */
  countUnread: authorizedProcedure.query(async ({ ctx }) => {
    const count2 = await countUnreadNotifications(ctx.user.id);
    return { count: count2 };
  }),
  /** Marca uma notificação como lida */
  markRead: authorizedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
    await markNotificationRead(input.id, ctx.user.id);
    return { success: true };
  }),
  /** Marca todas as notificações como lidas */
  markAllRead: authorizedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  })
});
var PLAN_YOUTUBE_LIMITS = {
  free: 15 * 60,
  // 15 minutes
  pro: 30 * 60,
  // 30 minutes
  enterprise: 60 * 60
  // 60 minutes
};
var PLAN_LABELS = {
  free: "Gratuito",
  pro: "Pro",
  enterprise: "Enterprise"
};
var planRouter = router({
  /** Retorna o plano atual do usuário autenticado */
  getCurrent: authorizedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    const plan = user?.plan ?? "free";
    return {
      plan,
      label: PLAN_LABELS[plan],
      youtubeLimitSeconds: PLAN_YOUTUBE_LIMITS[plan],
      youtubeLimitMinutes: Math.floor(PLAN_YOUTUBE_LIMITS[plan] / 60)
    };
  }),
  /** Admin: atualiza o plano de um usuário */
  setUserPlan: protectedProcedure.input(
    z2.object({
      userId: z2.number(),
      plan: z2.enum(["free", "pro", "enterprise"])
    })
  ).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores podem alterar planos" });
    }
    await updateUserPlan(input.userId, input.plan);
    return { updated: true };
  })
});
var invitesRouter = router({
  /** Gera um novo token de convite (Apenas Admin) */
  create: protectedProcedure.input(z2.object({ maxUses: z2.number().min(1).default(1) })).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Apenas administradores podem gerar convites" });
    }
    const token = `kolhey-inv-${nanoid3(10)}`;
    await createInvite({
      token,
      createdBy: ctx.user.id,
      maxUses: input.maxUses
    });
    return { token };
  }),
  /** Valida um token e autoriza o usuário logado permanentemente */
  redeem: protectedProcedure.input(z2.object({ token: z2.string() })).mutation(async ({ input, ctx }) => {
    const invite = await getInviteByToken(input.token);
    if (!invite) {
      throw new TRPCError3({ code: "NOT_FOUND", message: "Convite inv\xE1lido" });
    }
    if (invite.usesCount >= invite.maxUses) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Este convite j\xE1 atingiu o limite de usos" });
    }
    if (invite.expiresAt && invite.expiresAt < /* @__PURE__ */ new Date()) {
      throw new TRPCError3({ code: "BAD_REQUEST", message: "Este convite expirou" });
    }
    await authorizeUser({
      email: ctx.user.email,
      invitedBy: invite.createdBy,
      inviteId: invite.id
    });
    await incrementInviteUses(invite.id);
    return { success: true };
  }),
  /** Lista todos os usuários autorizados (Apenas Admin) */
  listAuthorized: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    return getAllAuthorizedUsers();
  }),
  /** Revoga acesso de um usuário (Apenas Admin) */
  revoke: protectedProcedure.input(z2.object({ email: z2.string().email() })).mutation(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "Acesso negado" });
    }
    await revokeUserAuthorization(input.email);
    return { success: true };
  }),
  /** Verifica se o usuário atual está autorizado */
  checkStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { authorized: true };
    const authorized = await isUserAuthorized(ctx.user.email);
    return { authorized };
  })
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME4, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
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
  invites: invitesRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/app.ts
import path2 from "path";
import fs2 from "fs";
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const uploadsDir = process.env.VERCEL ? path2.join("/tmp", "uploads") : path2.join(process.cwd(), "uploads");
  if (!fs2.existsSync(uploadsDir)) {
    fs2.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/api/files", express.static(uploadsDir));
  registerOAuthRoutes(app);
  registerSupabaseAuthRoutes(app);
  const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
  app.post("/api/upload-video", express.raw({ type: "*/*", limit: "520mb" }), async (req, res) => {
    try {
      const key = req.query.key;
      if (!key) {
        res.status(400).json({ error: "Missing key parameter" });
        return;
      }
      const contentType = req.headers["content-type"] ?? "video/mp4";
      const buffer = req.body;
      if (!buffer || buffer.length === 0) {
        res.status(400).json({ error: "Empty file body" });
        return;
      }
      if (buffer.length > MAX_VIDEO_SIZE_BYTES) {
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
        res.status(413).json({
          error: `Arquivo muito grande (${sizeMB} MB). O limite m\xE1ximo \xE9 500 MB.`,
          code: "FILE_TOO_LARGE",
          maxSizeMB: 500,
          fileSizeMB: parseFloat(sizeMB)
        });
        return;
      }
      const isVideoKey = key.match(/\.(mp4|mov|avi|webm|mpeg|mpg)$/i);
      if (!isVideoKey) {
        res.status(400).json({ error: "Formato de arquivo n\xE3o suportado.", code: "INVALID_FORMAT" });
        return;
      }
      const { url } = await storagePut(key, buffer, contentType);
      res.json({ url, key, sizeMB: parseFloat((buffer.length / (1024 * 1024)).toFixed(1)) });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  const distPath = path2.join(process.cwd(), "dist", "public");
  if (fs2.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  return app;
}
var app_default = createApp();
export {
  createApp,
  app_default as default
};
