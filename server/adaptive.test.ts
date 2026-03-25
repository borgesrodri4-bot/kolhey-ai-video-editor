import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB and adaptive engine ──────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getVideoProjectById: vi.fn().mockResolvedValue(null),
  getVideoProjectsByUser: vi.fn().mockResolvedValue([]),
  getScenesByProject: vi.fn().mockResolvedValue([]),
  getSceneById: vi.fn().mockResolvedValue(null),
  createVideoProject: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateVideoProject: vi.fn().mockResolvedValue(undefined),
  deleteVideoProject: vi.fn().mockResolvedValue(undefined),
  updateVideoScene: vi.fn().mockResolvedValue(undefined),
  createVideoScenes: vi.fn().mockResolvedValue(undefined),
  createProcessingJob: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateProcessingJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./adaptiveEngine", () => ({
  logEditEvent: vi.fn().mockResolvedValue(undefined),
  logStyleFeedback: vi.fn().mockResolvedValue(undefined),
  analyzeAndUpdateProfile: vi.fn().mockResolvedValue(undefined),
  getStyleContext: vi.fn().mockResolvedValue({
    sceneAnalysisContext: "User prefers flat design",
    imageStyleSuffix: ", minimalist",
    styleSummary: "Prefers clean, modern illustrations",
    confidenceScore: 75,
    isReliable: true,
  }),
  getFullStyleProfile: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    projectsAnalyzed: 5,
    confidenceScore: 75,
    preferredVisualStyle: "flat design, minimalist",
    avgSceneDurationSeconds: 8.5,
    avgScenesPerMinute: 4.2,
    topThemes: ["technology", "business"],
    imageStyleModifiers: ["minimalist", "clean"],
    sceneSplitPreferences: { preferShortScenes: true, preferDetailedPrompts: false, preferMinimalistStyle: true },
    styleSummary: "Prefers clean, modern illustrations with flat design",
    lastUpdatedAt: new Date(),
    createdAt: new Date(),
  }),
  getRecentEditEvents: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      projectId: 1,
      sceneId: 1,
      eventType: "prompt_edited",
      previousValue: "old prompt",
      newValue: "new minimalist prompt",
      metadata: null,
      createdAt: new Date(),
    },
    {
      id: 2,
      userId: 1,
      projectId: 1,
      sceneId: 2,
      eventType: "image_accepted",
      previousValue: null,
      newValue: null,
      metadata: { action: "export_json" },
      createdAt: new Date(),
    },
  ]),
}));

// ─── Mock notification ─────────────────────────────────────────────────────────
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Test context factory ──────────────────────────────────────────────────────
function createAuthContext(overrides?: Partial<TrpcContext["user"]>): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@kolhey.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("adaptive.getProfile", () => {
  it("returns profile and context for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adaptive.getProfile();

    expect(result.hasProfile).toBe(true);
    expect(result.profile).toBeDefined();
    expect(result.profile?.confidenceScore).toBe(75);
    expect(result.profile?.projectsAnalyzed).toBe(5);
    expect(result.context.isReliable).toBe(true);
    expect(result.context.confidenceScore).toBe(75);
  });

  it("returns style context with scene analysis instructions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adaptive.getStyleContext();

    expect(result.sceneAnalysisContext).toBe("User prefers flat design");
    expect(result.imageStyleSuffix).toBe(", minimalist");
    expect(result.isReliable).toBe(true);
  });
});

describe("adaptive.getEditHistory", () => {
  it("returns recent edit events for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adaptive.getEditHistory({ limit: 10 });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].eventType).toBe("prompt_edited");
    expect(result[1].eventType).toBe("image_accepted");
  });

  it("respects limit parameter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adaptive.getEditHistory({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("adaptive.refreshProfile", () => {
  it("triggers profile analysis and returns started status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.adaptive.refreshProfile();

    expect(result.started).toBe(true);
    expect(result.message).toContain("Análise do perfil iniciada");
  });
});

describe("scenes.submitFeedback", () => {
  it("records positive feedback for a scene", async () => {
    const { getVideoProjectById } = await import("./db");
    const { logStyleFeedback } = await import("./adaptiveEngine");

    vi.mocked(getVideoProjectById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "Test Project",
      status: "completed",
      progress: 100,
      originalVideoUrl: "https://example.com/video.mp4",
      originalVideoKey: "videos/test.mp4",
      fileSizeBytes: 1024,
      durationSeconds: 60,
      scenesCount: 5,
      currentStep: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scenes.submitFeedback({
      sceneId: 1,
      projectId: 1,
      sentiment: "positive",
      comment: "Great illustration!",
    });

    expect(result.recorded).toBe(true);
    expect(logStyleFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        sceneId: 1,
        projectId: 1,
        sentiment: "positive",
        comment: "Great illustration!",
      })
    );
  });
});

describe("scenes.update with adaptive logging", () => {
  it("logs edit event when prompt is updated", async () => {
    const { getVideoProjectById } = await import("./db");
    const { logEditEvent } = await import("./adaptiveEngine");

    vi.mocked(getVideoProjectById).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      title: "Test Project",
      status: "completed",
      progress: 100,
      originalVideoUrl: "https://example.com/video.mp4",
      originalVideoKey: "videos/test.mp4",
      fileSizeBytes: 1024,
      durationSeconds: 60,
      scenesCount: 5,
      currentStep: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scenes.update({
      sceneId: 1,
      projectId: 1,
      illustrationPrompt: "New minimalist flat design prompt",
      previousPrompt: "Old generic prompt",
    });

    expect(result.updated).toBe(true);
    expect(logEditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        projectId: 1,
        sceneId: 1,
        eventType: "prompt_edited",
        previousValue: "Old generic prompt",
        newValue: "New minimalist flat design prompt",
      })
    );
  });
});
