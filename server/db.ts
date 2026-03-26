import { eq, desc, and, sql, count, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  videoProjects,
  videoScenes,
  processingJobs,
  InsertVideoProject,
  InsertVideoScene,
  InsertProcessingJob,
  VideoProject,
  VideoScene,
  projectVersions,
  InsertProjectVersion,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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

// ─── Users ─────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserPlan(
  userId: number,
  plan: "free" | "pro" | "enterprise"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ plan }).where(eq(users.id, userId));
}

// ─── Video Projects ────────────────────────────────────────────────────────────
export async function createVideoProject(data: InsertVideoProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(videoProjects).values(data);
  return result;
}

export async function getVideoProjectsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(videoProjects)
    .where(eq(videoProjects.userId, userId))
    .orderBy(desc(videoProjects.createdAt));
}

export async function getVideoProjectsByUserPaginated(
  userId: number,
  opts: {
    cursor?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}
) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: undefined, total: 0 };

  const limit = opts.limit ?? 20;

  // Build WHERE conditions
  const conditions = [eq(videoProjects.userId, userId)];
  if (opts.status) {
    conditions.push(eq(videoProjects.status, opts.status as "pending" | "uploading" | "processing" | "completed" | "failed"));
  }
  if (opts.search) {
    conditions.push(sql`LOWER(${videoProjects.title}) LIKE ${`%${opts.search.toLowerCase()}%`}`);
  }
  if (opts.cursor) {
    // Cursor-based: fetch items created before the cursor item
    conditions.push(sql`${videoProjects.id} < ${opts.cursor}`);
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  // Fetch limit+1 to detect if there's a next page
  const items = await db
    .select()
    .from(videoProjects)
    .where(whereClause)
    .orderBy(desc(videoProjects.id))
    .limit(limit + 1);

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id : undefined;

  // Get total count (without cursor for accurate count)
  const countConditions = [eq(videoProjects.userId, userId)];
  if (opts.status) {
    countConditions.push(eq(videoProjects.status, opts.status as "pending" | "uploading" | "processing" | "completed" | "failed"));
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
    hasMore,
  };
}

export async function getVideoProjectById(id: number): Promise<VideoProject | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(videoProjects).where(eq(videoProjects.id, id)).limit(1);
  return result[0];
}

export async function updateVideoProject(
  id: number,
  data: Partial<InsertVideoProject>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videoProjects).set(data).where(eq(videoProjects.id, id));
}

export async function deleteVideoProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(videoScenes).where(eq(videoScenes.projectId, id));
  await db.delete(processingJobs).where(eq(processingJobs.projectId, id));
  await db.delete(videoProjects).where(eq(videoProjects.id, id));
}

// ─── Video Scenes ──────────────────────────────────────────────────────────────
export async function createVideoScenes(scenes: InsertVideoScene[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (scenes.length === 0) return;
  await db.insert(videoScenes).values(scenes);
}

export async function getScenesByProject(projectId: number): Promise<VideoScene[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(videoScenes)
    .where(eq(videoScenes.projectId, projectId))
    .orderBy(videoScenes.sceneOrder);
}

export async function updateVideoScene(
  id: number,
  data: Partial<InsertVideoScene>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videoScenes).set(data).where(eq(videoScenes.id, id));
}

export async function getSceneById(id: number): Promise<VideoScene | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(videoScenes).where(eq(videoScenes.id, id)).limit(1);
  return result[0];
}

// ─── Processing Jobs ───────────────────────────────────────────────────────────
export async function createProcessingJob(data: InsertProcessingJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(processingJobs).values(data);
  return result;
}

export async function getLatestJobByProject(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.projectId, projectId))
    .orderBy(desc(processingJobs.createdAt))
    .limit(1);
  return result[0];
}

export async function updateProcessingJob(
  id: number,
  data: Partial<InsertProcessingJob>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(processingJobs).set(data).where(eq(processingJobs.id, id));
}

// ─── Reorder Scenes ────────────────────────────────────────────────────────────
export async function reorderScenes(updates: { id: number; sceneOrder: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await Promise.all(
    updates.map(({ id, sceneOrder }) =>
      db.update(videoScenes).set({ sceneOrder }).where(eq(videoScenes.id, id))
    )
  );
}

// ─── Admin Queries ─────────────────────────────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalProjects: 0, totalProcessed: 0, totalFailed: 0 };

  const [userCount] = await db.select({ count: count() }).from(users);
  const [projectCount] = await db.select({ count: count() }).from(videoProjects);
  const [processedCount] = await db
    .select({ count: count() })
    .from(videoProjects)
    .where(eq(videoProjects.status, "completed"));
  const [failedCount] = await db
    .select({ count: count() })
    .from(videoProjects)
    .where(eq(videoProjects.status, "failed"));

  return {
    totalUsers: userCount?.count ?? 0,
    totalProjects: projectCount?.count ?? 0,
    totalProcessed: processedCount?.count ?? 0,
    totalFailed: failedCount?.count ?? 0,
  };
}

export async function getAllUsersAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getAllProjectsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videoProjects).orderBy(desc(videoProjects.createdAt)).limit(200);
}

export async function getProcessingsByDay(days = 14) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await db
    .select({
      day: sql<string>`DATE(createdAt)`,
      count: count(),
    })
    .from(videoProjects)
    .where(gte(videoProjects.createdAt, since))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);
  return rows;
}

// ─── Project Versions ──────────────────────────────────────────────────────────

export async function createProjectVersion(data: InsertProjectVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectVersions).values(data);
  return result;
}

export async function getProjectVersions(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId))
    .orderBy(desc(projectVersions.createdAt));
}

export async function getProjectVersionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectVersions).where(eq(projectVersions.id, id)).limit(1);
  return result[0];
}

export async function setActiveProjectVersion(projectId: number, versionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deactivate all versions for this project
  await db
    .update(projectVersions)
    .set({ isActive: "no" })
    .where(eq(projectVersions.projectId, projectId));
  // Activate the selected version
  await db
    .update(projectVersions)
    .set({ isActive: "yes" })
    .where(eq(projectVersions.id, versionId));
}

export async function countProjectVersions(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ count: count() })
    .from(projectVersions)
    .where(eq(projectVersions.projectId, projectId));
  return row?.count ?? 0;
}
