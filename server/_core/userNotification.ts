/**
 * User Notification System
 * Stores in-app notifications for users in the database.
 * Notifications are fetched by the frontend via polling or on-demand.
 */

import { getDb } from "../db";
import { userNotifications } from "../../drizzle/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

export interface UserNotificationPayload {
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  projectId?: number;
}

/**
 * Sends an in-app notification to a specific user.
 * Stores in the `user_notifications` table.
 */
export async function sendUserNotification(
  userId: number,
  payload: UserNotificationPayload
): Promise<void> {
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
    readAt: null,
  });
}

/**
 * Fetches unread notifications for a user (most recent first, max 20).
 */
export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);
}

/**
 * Marks a notification as read.
 */
export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
}

/**
 * Counts unread notifications for a user.
 */
export async function countUnreadNotifications(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { count } = await import("drizzle-orm");
  const [row] = await db
    .select({ count: count() })
    .from(userNotifications)
    .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt)));
  return row?.count ?? 0;
}
