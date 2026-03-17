import { describe, it, expect, vi } from "vitest";
import { checkPlan, isPro, upsertSubscription } from "../services/subscription.js";
import type { Plan } from "../services/subscription.js";

// Mock @vigil/core
vi.mock("@vigil/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock database helpers
// ---------------------------------------------------------------------------

function createMockDb(rows: Array<Record<string, unknown>> = []) {
  const mockLimit = vi.fn().mockResolvedValue(rows);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    } as any,
    mocks: {
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      insert: mockInsert,
      values: mockValues,
      onConflictDoUpdate: mockOnConflictDoUpdate,
    },
  };
}

// ---------------------------------------------------------------------------
// isPro
// ---------------------------------------------------------------------------

describe("isPro", () => {
  it("returns true for pro plan", () => {
    expect(isPro("pro")).toBe(true);
  });

  it("returns true for team plan", () => {
    expect(isPro("team")).toBe(true);
  });

  it("returns false for free plan", () => {
    expect(isPro("free")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkPlan
// ---------------------------------------------------------------------------

describe("checkPlan", () => {
  it("returns 'free' when no subscription exists", async () => {
    const { db } = createMockDb([]);
    const plan = await checkPlan(db, 12345);
    expect(plan).toBe("free");
  });

  it("returns 'free' when subscription status is not active", async () => {
    const { db } = createMockDb([{ installationId: 1, plan: "pro", status: "canceled" }]);
    const plan = await checkPlan(db, 1);
    expect(plan).toBe("free");
  });

  it("returns 'pro' when subscription is active with pro plan", async () => {
    const { db } = createMockDb([{ installationId: 1, plan: "pro", status: "active" }]);
    const plan = await checkPlan(db, 1);
    expect(plan).toBe("pro");
  });

  it("returns 'team' when subscription is active with team plan", async () => {
    const { db } = createMockDb([{ installationId: 1, plan: "team", status: "active" }]);
    const plan = await checkPlan(db, 1);
    expect(plan).toBe("team");
  });

  it("returns 'free' when plan column has an invalid value", async () => {
    const { db } = createMockDb([{ installationId: 1, plan: "enterprise", status: "active" }]);
    const plan = await checkPlan(db, 1);
    expect(plan).toBe("free");
  });

  it("returns 'free' when plan is null", async () => {
    const { db } = createMockDb([{ installationId: 1, plan: null, status: "active" }]);
    const plan = await checkPlan(db, 1);
    expect(plan).toBe("free");
  });

  it("returns 'free' when plan is undefined", async () => {
    const { db } = createMockDb([{ installationId: 1, plan: undefined, status: "active" }]);
    const plan = await checkPlan(db, 1);
    expect(plan).toBe("free");
  });
});

// ---------------------------------------------------------------------------
// upsertSubscription
// ---------------------------------------------------------------------------

describe("upsertSubscription", () => {
  it("calls insert with correct values", async () => {
    const { db, mocks } = createMockDb();

    await upsertSubscription(db, {
      installationId: 42,
      accountLogin: "McMutteer",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_456",
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date("2026-02-01"),
    });

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: 42,
        accountLogin: "McMutteer",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_456",
        plan: "pro",
        status: "active",
      }),
    );
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("defaults stripeSubscriptionId to null when not provided", async () => {
    const { db, mocks } = createMockDb();

    await upsertSubscription(db, {
      installationId: 42,
      accountLogin: "McMutteer",
      stripeCustomerId: "cus_123",
      plan: "pro",
      status: "active",
    });

    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      }),
    );
  });

  it("defaults currentPeriodEnd to null when not provided", async () => {
    const { db, mocks } = createMockDb();

    await upsertSubscription(db, {
      installationId: 42,
      accountLogin: "McMutteer",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_789",
      plan: "team",
      status: "active",
    });

    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPeriodEnd: null,
      }),
    );
  });
});
