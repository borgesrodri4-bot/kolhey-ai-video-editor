import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("./db", () => {
  const project = {
    id: 1,
    userId: 1,
    title: "Test Video",
    description: "A test video",
    status: "completed",
    progress: 100,
    scenesCount: 3,
    originalVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    originalVideoKey: "youtube:dQw4w9WgXcQ",
    audioUrl: "https://s3.example.com/audio.webm",
    audioKey: "youtube-audio/abc123.webm",
    visualStyle: "flat",
    durationSeconds: 120,
    fileSizeBytes: 0,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const scene = {
    id: 1,
    projectId: 1,
    sceneOrder: 0,
    startTime: 0,
    endTime: 10,
    transcript: "Hello world",
    illustrationPrompt: "A flat design illustration",
    illustrationUrl: "https://example.com/image.png",
    illustrationStatus: "completed",
  };

  const version = {
    id: 1,
    projectId: 1,
    userId: 1,
    versionNumber: 1,
    label: "Versão 1",
    visualStyle: "flat",
    description: "First version",
    scenesSnapshot: [scene],
    scenesCount: 1,
    isActive: "yes",
    createdAt: new Date("2025-01-01"),
  };

  return {
    getDb: vi.fn().mockResolvedValue(null),
    getVideoProjectsByUserPaginated: vi.fn().mockResolvedValue({
      items: [project],
      nextCursor: undefined,
      total: 1,
      hasMore: false,
    }),
    getVideoProjectsByUser: vi.fn().mockResolvedValue([project]),
    getVideoProjectById: vi.fn().mockResolvedValue(project),
    createVideoProject: vi.fn().mockResolvedValue({ insertId: 42 }),
    deleteVideoProject: vi.fn().mockResolvedValue(undefined),
    getScenesByProject: vi.fn().mockResolvedValue([scene]),
    updateVideoScene: vi.fn().mockResolvedValue(undefined),
    getSceneById: vi.fn().mockResolvedValue(scene),
    updateVideoProject: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    createProcessingJob: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateProcessingJob: vi.fn().mockResolvedValue(undefined),
    getLatestJobByProject: vi.fn().mockResolvedValue(undefined),
    createVideoScenes: vi.fn().mockResolvedValue(undefined),
    reorderScenes: vi.fn().mockResolvedValue(undefined),
    getAllUsersAdmin: vi.fn().mockResolvedValue([]),
    getAllProjectsAdmin: vi.fn().mockResolvedValue([]),
    getAdminStats: vi.fn().mockResolvedValue({
      totalUsers: 0,
      totalProjects: 0,
      completedProjects: 0,
      failedProjects: 0,
    }),
    getProcessingsByDay: vi.fn().mockResolvedValue([]),
    // Version helpers
    createProjectVersion: vi.fn().mockResolvedValue({ insertId: 10 }),
    getProjectVersions: vi.fn().mockResolvedValue([version]),
    getProjectVersionById: vi.fn().mockResolvedValue(version),
    setActiveProjectVersion: vi.fn().mockResolvedValue(undefined),
    countProjectVersions: vi.fn().mockResolvedValue(1),
    // Plan helpers
    getUserById: vi.fn().mockResolvedValue({
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      role: "user",
      plan: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }),
    updateUserPlan: vi.fn().mockResolvedValue(undefined),
  };
});

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
  storagePut: vi.fn().mockResolvedValue({
    url: "https://cdn.example.com/file.png",
    key: "test-key",
  }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/generated.png" }),
}));

vi.mock("./_core/userNotification", () => ({
  sendUserNotification: vi.fn().mockResolvedValue(undefined),
  getUserNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  countUnreadNotifications: vi.fn().mockResolvedValue(0),
}));

vi.mock("./youtubeExtractor", () => ({
  isValidYouTubeUrl: vi.fn().mockReturnValue(true),
  getYouTubeVideoInfo: vi.fn().mockResolvedValue({
    title: "Rick Astley - Never Gonna Give You Up",
    duration: 213,
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    videoId: "dQw4w9WgXcQ",
  }),
  extractYouTubeAudio: vi.fn().mockResolvedValue({
    title: "Rick Astley - Never Gonna Give You Up",
    duration: 213,
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    audioUrl: "https://s3.example.com/youtube-audio/abc123.webm",
    audioKey: "youtube-audio/abc123.webm",
    fileSizeBytes: 1024 * 1024 * 5,
  }),
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

// ─── Niche Templates Tests ─────────────────────────────────────────────────────
describe("niche.list", () => {
  it("returns all niche templates", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.niche.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("each template has required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.niche.list();
    for (const template of result) {
      expect(template).toHaveProperty("id");
      expect(template).toHaveProperty("label");
      expect(template).toHaveProperty("contextPrompt");
      expect(template).toHaveProperty("suggestedStyle");
      expect(template).toHaveProperty("icon");
    }
  });

  it("includes educational and sales templates", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.niche.list();
    const ids = result.map((t) => t.id);
    expect(ids).toContain("educational");
    expect(ids).toContain("sales");
    expect(ids).toContain("motivational");
  });
});

describe("niche.getById", () => {
  it("returns a specific template by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.niche.getById({ id: "educational" });
    expect(result.id).toBe("educational");
    expect(result.label).toBe("Aula Educacional");
  });

  it("throws NOT_FOUND for invalid id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.niche.getById({ id: "nonexistent" })).rejects.toThrow();
  });
});

// ─── YouTube Tests ─────────────────────────────────────────────────────────────
describe("youtube.getInfo", () => {
  it("returns video metadata for valid YouTube URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.youtube.getInfo({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result).toHaveProperty("videoId", "dQw4w9WgXcQ");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("durationSeconds");
    expect(result).toHaveProperty("thumbnailUrl");
    expect(result.valid).toBe(true);
  });

  it("throws BAD_REQUEST for invalid URL", async () => {
    // Override mock to return false for invalid URL
    const { isValidYouTubeUrl } = await import("./youtubeExtractor");
    vi.mocked(isValidYouTubeUrl).mockReturnValueOnce(false);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.youtube.getInfo({ url: "https://not-youtube.com/video" })
    ).rejects.toThrow();
  });
});

describe("youtube.createProject", () => {
  it("creates a project from YouTube URL and returns id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.youtube.createProject({
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "YouTube Test Project",
      visualStyle: "flat",
    });
    expect(result).toHaveProperty("id", 42);
  });

  it("creates project with description", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.youtube.createProject({
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "YouTube with Description",
      description: "Educational content about AI",
      visualStyle: "watercolor",
    });
    expect(result).toHaveProperty("id");
  });
});

// ─── Versions Tests ────────────────────────────────────────────────────────────
describe("versions.list", () => {
  it("returns versions for a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.versions.list({ projectId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("versionNumber");
    expect(result[0]).toHaveProperty("visualStyle");
    expect(result[0]).toHaveProperty("scenesCount");
  });
});

describe("versions.saveSnapshot", () => {
  it("saves current state as a version snapshot", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.versions.saveSnapshot({
      projectId: 1,
      label: "Minha versão flat",
    });
    expect(result).toHaveProperty("versionId");
    expect(result).toHaveProperty("versionNumber");
  });
});

describe("versions.setActive", () => {
  it("sets a version as active", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.versions.setActive({ projectId: 1, versionId: 1 });
    expect(result.activated).toBe(true);
  });
});

describe("versions.restore", () => {
  it("restores scenes from a version snapshot", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.versions.restore({ projectId: 1, versionId: 1 });
    expect(result.restored).toBe(true);
    expect(result).toHaveProperty("scenesRestored");
  });
});

describe("versions.reprocess", () => {
  it("saves current version and starts reprocessing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.versions.reprocess({
      projectId: 1,
      visualStyle: "watercolor",
      description: "New context for reprocessing",
      label: "Versão antes do reprocessamento",
    });
    expect(result.started).toBe(true);
  });
});

// ─── Notifications Tests ───────────────────────────────────────────────────────
describe("notifications.list", () => {
  it("returns notifications for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts limit parameter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notifications.countUnread", () => {
  it("returns unread count for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.countUnread();
    expect(result).toHaveProperty("count");
    expect(typeof result.count).toBe("number");
  });
});

describe("notifications.markRead", () => {
  it("marks a notification as read", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markRead({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("notifications.markAllRead", () => {
  it("marks all notifications as read", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllRead();
    expect(result.success).toBe(true);
  });
});

// ─── Plan Tests ────────────────────────────────────────────────────────────────
describe("plan.getCurrent", () => {
  it("returns the current user plan and limits", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.plan.getCurrent();
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("youtubeDurationLimitSeconds");
    expect(result).toHaveProperty("youtubeDurationLimitMinutes");
    expect(["free", "pro", "enterprise"]).toContain(result.plan);
  });

  it("free plan has 15 minute YouTube limit", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.plan.getCurrent();
    // Default is free
    expect(result.youtubeDurationLimitMinutes).toBe(15);
  });
});
