import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getVideoProjectsByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      title: "Test Video",
      status: "pending",
      progress: 0,
      scenesCount: 0,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-01-01"),
    },
  ]),
  getVideoProjectById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Test Video",
    status: "pending",
    progress: 0,
    scenesCount: 0,
    originalVideoUrl: "https://example.com/video.mp4",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  }),
  createVideoProject: vi.fn().mockResolvedValue({ insertId: 42 }),
  deleteVideoProject: vi.fn().mockResolvedValue(undefined),
  getScenesByProject: vi.fn().mockResolvedValue([
    {
      id: 1,
      projectId: 1,
      sceneOrder: 0,
      startTime: 0,
      endTime: 10,
      transcript: "Hello world",
      illustrationPrompt: "A flat design illustration",
      illustrationUrl: "https://example.com/image.png",
      illustrationStatus: "completed",
    },
  ]),
  updateVideoScene: vi.fn().mockResolvedValue(undefined),
  getSceneById: vi.fn().mockResolvedValue({
    id: 1,
    projectId: 1,
    illustrationPrompt: "A flat design illustration",
    illustrationStatus: "pending",
  }),
  updateVideoProject: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  createProcessingJob: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateProcessingJob: vi.fn().mockResolvedValue(undefined),
  getLatestJobByProject: vi.fn().mockResolvedValue(undefined),
  createVideoScenes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./adaptiveEngine", () => ({
  logEditEvent: vi.fn().mockResolvedValue(undefined),
  logStyleFeedback: vi.fn().mockResolvedValue(undefined),
  analyzeAndUpdateProfile: vi.fn().mockResolvedValue(undefined),
  getStyleContext: vi.fn().mockResolvedValue({
    sceneAnalysisContext: "",
    imageStyleSuffix: "",
    styleSummary: "No profile yet",
    confidenceScore: 0,
    isReliable: false,
  }),
  getFullStyleProfile: vi.fn().mockResolvedValue(null),
  getRecentEditEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock("./pipeline", () => ({
  runVideoPipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/file.png", key: "test-key" }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/generated.png" }),
}));

// ─── Context factory ───────────────────────────────────────────────────────────
function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("videos.list", () => {
  it("returns list of projects for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.videos.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ title: "Test Video", status: "pending" });
  });
});

describe("videos.create", () => {
  it("creates a project and returns the new id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.videos.create({
      title: "My New Video",
      videoKey: "videos/user1/abc123.mp4",
      videoUrl: "https://cdn.example.com/videos/user1/abc123.mp4",
      fileSizeBytes: 1024 * 1024 * 50,
    });
    expect(result).toHaveProperty("id", 42);
  });
});

describe("videos.getById", () => {
  it("returns project with scenes", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.videos.getById({ id: 1 });
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("scenes");
    expect(Array.isArray(result.scenes)).toBe(true);
  });
});

describe("videos.startProcessing", () => {
  it("starts pipeline and returns started: true", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.videos.startProcessing({ id: 1 });
    expect(result.started).toBe(true);
    expect(result.adaptiveProfile).toBeDefined();
    expect(result.adaptiveProfile.isActive).toBe(false);
  });
});

describe("scenes.exportJson", () => {
  it("returns valid Remotion-compatible JSON structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.scenes.exportJson({ projectId: 1 });

    expect(result).toHaveProperty("project");
    expect(result).toHaveProperty("scenes");
    expect(result).toHaveProperty("remotionConfig");
    expect(result.remotionConfig).toMatchObject({ fps: 30, width: 1080, height: 1920 });
    expect(Array.isArray(result.scenes)).toBe(true);

    const scene = result.scenes[0];
    expect(scene).toHaveProperty("startTime");
    expect(scene).toHaveProperty("endTime");
    expect(scene).toHaveProperty("transcript");
    expect(scene).toHaveProperty("illustrationUrl");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const clearedCookies: string[] = [];
    ctx.res.clearCookie = (name: string) => { clearedCookies.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
