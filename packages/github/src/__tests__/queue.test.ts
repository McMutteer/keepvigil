import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock BullMQ before importing queue module
const mockAdd = vi.hoisted(() => vi.fn());
const mockClose = vi.hoisted(() => vi.fn());
const mockGetJobCounts = vi.hoisted(() => vi.fn());

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = mockAdd;
    close = mockClose;
    getJobCounts = mockGetJobCounts;
  },
}));

import { initQueue, enqueueVerification, getQueue, closeQueue } from "../services/queue.js";

describe("queue", () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockClose.mockReset();
    mockGetJobCounts.mockReset();
  });

  afterEach(async () => {
    // Reset queue state between tests
    await closeQueue();
  });

  describe("initQueue", () => {
    it("creates a queue on first call", async () => {
      await initQueue("redis://localhost:6379");
      expect(getQueue()).not.toBeNull();
    });

    it("returns the same queue on subsequent calls", async () => {
      await initQueue("redis://localhost:6379");
      const q1 = getQueue();
      await initQueue("redis://localhost:6379");
      const q2 = getQueue();
      expect(q1).toBe(q2);
    });

    it("throws on invalid Redis URL", async () => {
      await expect(initQueue("not-a-url")).rejects.toThrow();
    });
  });

  describe("enqueueVerification", () => {
    const baseJob = {
      owner: "org",
      repo: "repo",
      pullNumber: 1,
      headSha: "abc123",
      checkRunId: 42,
      prTitle: "Test PR",
      prBody: "Body",
      prAuthor: "dev",
      installationId: "12345",
    };

    it("throws if queue not initialized", async () => {
      await expect(enqueueVerification(baseJob as any)).rejects.toThrow("Queue not initialized");
    });

    it("enqueues a job with dedup ID", async () => {
      await initQueue("redis://localhost:6379");
      mockAdd.mockResolvedValueOnce({ id: "job-1" });

      const id = await enqueueVerification(baseJob as any);

      expect(id).toBe("job-1");
      expect(mockAdd).toHaveBeenCalledWith("verify", baseJob, {
        jobId: "12345-org-repo-1",
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 200,
      });
    });

    it("truncates oversized PR bodies", async () => {
      await initQueue("redis://localhost:6379");
      mockAdd.mockResolvedValueOnce({ id: "job-2" });

      const longBody = "x".repeat(60_000);
      await enqueueVerification({ ...baseJob, prBody: longBody } as any);

      const passedJob = mockAdd.mock.calls[0][1];
      expect(passedJob.prBody.length).toBe(50_000);
    });

    it("does not truncate bodies under limit", async () => {
      await initQueue("redis://localhost:6379");
      mockAdd.mockResolvedValueOnce({ id: "job-3" });

      const shortBody = "x".repeat(1000);
      await enqueueVerification({ ...baseJob, prBody: shortBody } as any);

      const passedJob = mockAdd.mock.calls[0][1];
      expect(passedJob.prBody.length).toBe(1000);
    });

    it("generates deterministic job IDs for deduplication", async () => {
      await initQueue("redis://localhost:6379");
      mockAdd.mockResolvedValue({ id: "job-4" });

      await enqueueVerification(baseJob as any);
      await enqueueVerification(baseJob as any);

      const id1 = mockAdd.mock.calls[0][2].jobId;
      const id2 = mockAdd.mock.calls[1][2].jobId;
      expect(id1).toBe(id2);
      expect(id1).toBe("12345-org-repo-1");
    });

    it("returns 'unknown' when job.id is undefined", async () => {
      await initQueue("redis://localhost:6379");
      mockAdd.mockResolvedValueOnce({ id: undefined });

      const id = await enqueueVerification(baseJob as any);
      expect(id).toBe("unknown");
    });
  });

  describe("getQueue", () => {
    it("returns null before init", () => {
      expect(getQueue()).toBeNull();
    });

    it("returns queue after init", async () => {
      await initQueue("redis://localhost:6379");
      expect(getQueue()).not.toBeNull();
    });
  });

  describe("closeQueue", () => {
    it("closes and nulls the queue", async () => {
      await initQueue("redis://localhost:6379");
      mockClose.mockResolvedValueOnce(undefined);
      await closeQueue();
      expect(getQueue()).toBeNull();
      expect(mockClose).toHaveBeenCalledOnce();
    });

    it("is safe to call when not initialized", async () => {
      await closeQueue(); // should not throw
    });
  });
});
