import { eq, desc, and } from "drizzle-orm";
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
