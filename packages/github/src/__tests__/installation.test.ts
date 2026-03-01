import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleInstallationCreated,
  handleInstallationDeleted,
  setDatabase,
} from "../webhooks/installation.js";

// Create a mock DB that tracks calls
function createMockDb() {
  const mockSet = vi.fn().mockReturnThis();
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  // Wire up the chain: update().set().where()
  mockSet.mockReturnValue({ where: mockWhere });

  return {
    insert: mockInsert,
    update: mockUpdate,
    _mocks: { mockInsert, mockValues, mockOnConflictDoUpdate, mockUpdate, mockSet, mockWhere },
  };
}

function makeCreatedContext(overrides: { installationId?: number; login?: string; type?: string } = {}) {
  const { installationId = 99999, login = "testorg", type = "Organization" } = overrides;
  return {
    payload: {
      action: "created",
      installation: {
        id: installationId,
        account: { login, type },
      },
    },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as Parameters<typeof handleInstallationCreated>[0];
}

function makeDeletedContext(installationId = 99999) {
  return {
    payload: {
      action: "deleted",
      installation: { id: installationId },
    },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as Parameters<typeof handleInstallationDeleted>[0];
}

describe("installation handlers", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    setDatabase(mockDb as unknown as Parameters<typeof setDatabase>[0]);
  });

  describe("handleInstallationCreated", () => {
    it("inserts a new installation into the database", async () => {
      const context = makeCreatedContext();
      await handleInstallationCreated(context);

      expect(mockDb._mocks.mockInsert).toHaveBeenCalled();
      expect(mockDb._mocks.mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          githubInstallationId: "99999",
          accountLogin: "testorg",
          accountType: "organization",
          active: true,
        }),
      );
      expect(mockDb._mocks.mockOnConflictDoUpdate).toHaveBeenCalled();
      expect(context.log.info).toHaveBeenCalled();
    });

    it("throws when database is not set", async () => {
      setDatabase(null as unknown as Parameters<typeof setDatabase>[0]);
      const context = makeCreatedContext();

      await expect(handleInstallationCreated(context)).rejects.toThrow("Database not initialized");
      expect(mockDb._mocks.mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("handleInstallationDeleted", () => {
    it("marks the installation as inactive", async () => {
      const context = makeDeletedContext(99999);
      await handleInstallationDeleted(context);

      expect(mockDb._mocks.mockUpdate).toHaveBeenCalled();
      expect(mockDb._mocks.mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ active: false }),
      );
      expect(context.log.info).toHaveBeenCalled();
    });

    it("throws when database is not set", async () => {
      setDatabase(null as unknown as Parameters<typeof setDatabase>[0]);
      const context = makeDeletedContext();

      await expect(handleInstallationDeleted(context)).rejects.toThrow("Database not initialized");
    });
  });
});
