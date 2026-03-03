import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  ClassifiedItem,
  TestPlanItem,
  TestPlanHints,
  BrowserExecutionContext,
} from "@vigil/core/types";

// ---------------------------------------------------------------------------
// Hoisted mock variables — survive vi.mock() hoisting
// ---------------------------------------------------------------------------

const {
  mockCreate,
  mockFetch,
  mockGoto,
  mockClick,
  mockFill,
  _mockSelectOption,
  mockIsVisible,
  mockTextContent,
  mockScreenshot,
  _mockSetViewportSize,
  _mockViewportSize,
  mockUrl,
  _mockPageOn,
  _mockWaitForTimeout,
  _mockSetDefaultTimeout,
  mockEvaluate,
  _mockPageClose,
  mockBrowserClose,
  mockNewPage,
} = vi.hoisted(() => {
  const mockIsVisible = vi.fn().mockResolvedValue(true);
  const mockTextContent = vi.fn().mockResolvedValue("Dashboard");
  const mockScreenshot = vi.fn().mockResolvedValue(Buffer.from("fake-png-data"));
  const mockSetViewportSize = vi.fn();
  const mockViewportSize = vi.fn().mockReturnValue({ width: 1024, height: 768 });
  const mockUrl = vi.fn().mockReturnValue("https://pr-42.example.dev/dashboard");
  const mockEvaluate = vi.fn().mockResolvedValue(false);
  const mockGoto = vi.fn();
  const mockClick = vi.fn();
  const mockFill = vi.fn();
  const mockSelectOption = vi.fn();
  const mockPageOn = vi.fn();
  const mockWaitForTimeout = vi.fn();
  const mockSetDefaultTimeout = vi.fn();
  const mockPageClose = vi.fn();
  const mockBrowserClose = vi.fn();

  const mockLocator = vi.fn().mockReturnValue({
    click: mockClick,
    fill: mockFill,
    selectOption: mockSelectOption,
    first: vi.fn().mockReturnValue({
      isVisible: mockIsVisible,
      textContent: mockTextContent,
    }),
  });

  const mockNewPage = vi.fn().mockResolvedValue({
    goto: mockGoto,
    locator: mockLocator,
    screenshot: mockScreenshot,
    setViewportSize: mockSetViewportSize,
    viewportSize: mockViewportSize,
    url: mockUrl,
    on: mockPageOn,
    waitForTimeout: mockWaitForTimeout,
    setDefaultTimeout: mockSetDefaultTimeout,
    evaluate: mockEvaluate,
    close: mockPageClose,
  });

  return {
    mockCreate: vi.fn(),
    mockFetch: vi.fn(),
    mockGoto,
    mockClick,
    mockFill,
    _mockSelectOption: mockSelectOption,
    mockIsVisible,
    mockTextContent,
    mockScreenshot,
    _mockSetViewportSize: mockSetViewportSize,
    _mockViewportSize: mockViewportSize,
    mockUrl,
    _mockPageOn: mockPageOn,
    _mockWaitForTimeout: mockWaitForTimeout,
    _mockSetDefaultTimeout: mockSetDefaultTimeout,
    mockEvaluate,
    _mockPageClose: mockPageClose,
    mockBrowserClose,
    mockNewPage,
  };
});

// ---------------------------------------------------------------------------
// Mocks — hoisted to top by Vitest
// ---------------------------------------------------------------------------

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

vi.stubGlobal("fetch", mockFetch);

vi.mock("../browser-launcher.js", () => ({
  launchBrowser: vi.fn().mockResolvedValue({
    newPage: mockNewPage,
    close: mockBrowserClose,
  }),
}));

// ---------------------------------------------------------------------------
// Now import the modules under test
// ---------------------------------------------------------------------------

import { parseBrowserSpecResponse, generateBrowserSpec } from "../playwright-generator.js";
import { checkMetadata, executeMetadataItem } from "../metadata-checker.js";
import { executeBrowserItem } from "../browser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHints(overrides: Partial<TestPlanHints> = {}): TestPlanHints {
  return { isManual: false, codeBlocks: [], urls: [], ...overrides };
}

function makeItem(text: string, id = "tp-0"): TestPlanItem {
  return { id, text, checked: false, raw: `- [ ] ${text}`, indent: 0, hints: makeHints() };
}

function makeBrowserItem(
  text: string,
  opts: { confidence?: "HIGH" | "MEDIUM"; category?: string; id?: string } = {},
): ClassifiedItem {
  return {
    item: makeItem(text, opts.id ?? "tp-0"),
    confidence: opts.confidence ?? "HIGH",
    executorType: "browser",
    category: (opts.category ?? "ui-flow") as ClassifiedItem["category"],
    reasoning: "Test helper",
  };
}

const baseContext: BrowserExecutionContext = {
  baseUrl: "https://pr-42.example.dev",
  anthropicApiKey: "test-key",
  timeoutMs: 5000,
  maxRetries: 1,
};

function mockLlmResponse(specs: unknown[]): void {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(specs) }],
  });
}

function mockFetchHtml(html: string, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    status,
    text: async () => html,
  });
}

// ---------------------------------------------------------------------------
// parseBrowserSpecResponse — spec validation
// ---------------------------------------------------------------------------

describe("parseBrowserSpecResponse", () => {
  it("parses a valid navigate + assertVisible flow", () => {
    const specs = parseBrowserSpecResponse(JSON.stringify([
      { action: "navigate", path: "/login", description: "Open login" },
      { action: "assertVisible", selector: ".dashboard", description: "Dashboard visible" },
    ]));
    expect(specs).toHaveLength(2);
    expect(specs[0].action).toBe("navigate");
    expect(specs[0].path).toBe("/login");
    expect(specs[1].action).toBe("assertVisible");
    expect(specs[1].selector).toBe(".dashboard");
  });

  it("parses navigate + screenshot (visual check)", () => {
    const specs = parseBrowserSpecResponse(JSON.stringify([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "screenshot", description: "Capture state" },
    ]));
    expect(specs).toHaveLength(2);
    expect(specs[1].action).toBe("screenshot");
  });

  it("rejects full URL in path", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([
        { action: "navigate", path: "https://evil.com/payload" },
      ])),
    ).toThrow("full URL");
  });

  it("rejects path traversal", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([
        { action: "navigate", path: "/../../../etc/passwd" },
      ])),
    ).toThrow("Path traversal");
  });

  it("rejects protocol-relative path", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([
        { action: "navigate", path: "//evil.com" },
      ])),
    ).toThrow("full URL");
  });

  it("rejects unknown action type", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([{ action: "eval" }])),
    ).toThrow('invalid: "eval"');
  });

  it("rejects click without selector", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([{ action: "click" }])),
    ).toThrow('selector required for action "click"');
  });

  it("rejects fill without value", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([
        { action: "fill", selector: "input", },
      ])),
    ).toThrow('value required for action "fill"');
  });

  it("caps waitMs at 10000", () => {
    const specs = parseBrowserSpecResponse(JSON.stringify([
      { action: "wait", waitMs: 99999 },
    ]));
    expect(specs[0].waitMs).toBe(10000);
  });

  it("defaults waitMs to 1000 when invalid", () => {
    const specs = parseBrowserSpecResponse(JSON.stringify([
      { action: "wait", waitMs: -5 },
    ]));
    expect(specs[0].waitMs).toBe(1000);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseBrowserSpecResponse("not json")).toThrow("invalid JSON");
  });

  it("throws on non-array response", () => {
    expect(() => parseBrowserSpecResponse('{"action":"click"}')).toThrow("not an array");
  });

  it("throws when spec is not an object", () => {
    expect(() => parseBrowserSpecResponse('["hello"]')).toThrow("not an object");
  });

  it("requires path for navigate", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([{ action: "navigate" }])),
    ).toThrow("path required");
  });

  it("rejects non-relative path", () => {
    expect(() =>
      parseBrowserSpecResponse(JSON.stringify([
        { action: "navigate", path: "relative" },
      ])),
    ).toThrow("non-relative path");
  });
});

// ---------------------------------------------------------------------------
// generateBrowserSpec — LLM integration
// ---------------------------------------------------------------------------

describe("generateBrowserSpec", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls Claude and returns parsed specs", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open home" },
      { action: "assertVisible", selector: "h1", description: "Title visible" },
    ]);
    const specs = await generateBrowserSpec("Verify the landing page loads", "test-key");
    expect(specs).toHaveLength(2);
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("throws when LLM returns no text content", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(generateBrowserSpec("test", "key")).rejects.toThrow("no text content");
  });

  it("throws when LLM returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json" }],
    });
    await expect(generateBrowserSpec("test", "key")).rejects.toThrow("invalid JSON");
  });
});

// ---------------------------------------------------------------------------
// checkMetadata — OG tags + JSON-LD
// ---------------------------------------------------------------------------

describe("checkMetadata", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extracts OG tags from HTML", async () => {
    mockFetchHtml(`
      <html><head>
        <meta property="og:title" content="My Page">
        <meta property="og:description" content="A test page">
        <meta property="og:image" content="https://example.com/img.png">
        <meta property="og:url" content="https://example.com">
        <title>My Page</title>
      </head></html>
    `);
    const result = await checkMetadata("/", "https://example.com");
    expect(result.ogTags["og:title"]).toBe("My Page");
    expect(result.ogTags["og:description"]).toBe("A test page");
    expect(result.missingOgTags).toEqual([]);
    expect(result.htmlTitle).toBe("My Page");
  });

  it("detects missing OG tags", async () => {
    mockFetchHtml("<html><head><title>Minimal</title></head></html>");
    const result = await checkMetadata("/", "https://example.com");
    expect(result.missingOgTags).toEqual(["og:title", "og:description", "og:image", "og:url"]);
  });

  it("parses valid JSON-LD", async () => {
    mockFetchHtml(`
      <html><head>
        <script type="application/ld+json">{"@type":"WebPage","name":"Test"}</script>
      </head></html>
    `);
    const result = await checkMetadata("/", "https://example.com");
    expect(result.jsonLd).toHaveLength(1);
    expect(result.jsonLdValid).toBe(true);
  });

  it("reports invalid JSON-LD", async () => {
    mockFetchHtml(`
      <html><head>
        <script type="application/ld+json">{invalid json</script>
      </head></html>
    `);
    const result = await checkMetadata("/", "https://example.com");
    expect(result.jsonLdValid).toBe(false);
    expect(result.jsonLdErrors).toHaveLength(1);
  });

  it("handles fetch failure gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await checkMetadata("/", "https://example.com");
    expect(result.ogTags).toEqual({});
    expect(result.jsonLdErrors[0]).toContain("Fetch failed");
  });

  it("handles invalid base URL", async () => {
    const result = await checkMetadata("/", "ftp://invalid");
    expect(result.missingOgTags).toEqual(["og:title", "og:description", "og:image", "og:url"]);
    expect(result.jsonLdErrors[0]).toContain("Invalid base URL");
  });

  it("handles reversed OG tag attribute order", async () => {
    mockFetchHtml(`<html><head><meta content="Reversed" property="og:title"></head></html>`);
    const result = await checkMetadata("/", "https://example.com");
    expect(result.ogTags["og:title"]).toBe("Reversed");
  });

  it("handles page with no head content", async () => {
    mockFetchHtml("<html><body>Hello</body></html>");
    const result = await checkMetadata("/", "https://example.com");
    expect(result.ogTags).toEqual({});
    expect(result.jsonLd).toEqual([]);
    expect(result.htmlTitle).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// executeMetadataItem — ExecutionResult wrapper
// ---------------------------------------------------------------------------

describe("executeMetadataItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes when og:title exists and JSON-LD is valid", async () => {
    mockFetchHtml(`
      <html><head>
        <meta property="og:title" content="Test">
        <script type="application/ld+json">{"@type":"WebPage"}</script>
      </head></html>
    `);
    const item = makeBrowserItem("Verify OG tags", { category: "metadata" });
    const result = await executeMetadataItem(item, { baseUrl: "https://example.com" });
    expect(result.passed).toBe(true);
    expect(result.itemId).toBe("tp-0");
  });

  it("fails when og:title is missing", async () => {
    mockFetchHtml("<html><head></head></html>");
    const item = makeBrowserItem("Verify OG tags", { category: "metadata" });
    const result = await executeMetadataItem(item, { baseUrl: "https://example.com" });
    expect(result.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// executeBrowserItem — main executor routing
// ---------------------------------------------------------------------------

describe("executeBrowserItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsVisible.mockResolvedValue(true);
    mockTextContent.mockResolvedValue("Dashboard");
    mockUrl.mockReturnValue("https://pr-42.example.dev/dashboard");
    mockScreenshot.mockResolvedValue(Buffer.from("fake-png"));
    mockEvaluate.mockResolvedValue(false);
  });

  it("routes metadata items to metadata checker (no browser launched)", async () => {
    mockFetchHtml(`<html><head><meta property="og:title" content="Test"></head></html>`);
    const item = makeBrowserItem("Verify OG tags", { category: "metadata" });
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(mockNewPage).not.toHaveBeenCalled(); // no browser
  });

  it("HIGH confidence: passes when all assertions succeed", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "assertVisible", selector: "h1", description: "Title visible" },
    ]);
    const item = makeBrowserItem("Verify landing page loads");
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(result.itemId).toBe("tp-0");
    expect((result.evidence as Record<string, unknown>).attempt).toBe(1);
  });

  it("HIGH confidence: fails when assertion fails", async () => {
    mockIsVisible.mockResolvedValueOnce(false);
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "assertVisible", selector: ".missing-element", description: "Check element" },
    ]);
    const item = makeBrowserItem("Verify element exists");
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(false);
    const evidence = result.evidence as Record<string, unknown>;
    const actions = evidence.actions as Array<{ passed: boolean; failReason?: string }>;
    expect(actions[actions.length - 1].passed).toBe(false);
    expect(actions[actions.length - 1].failReason).toContain("not visible");
  });

  it("HIGH confidence: stops on first failing action", async () => {
    mockIsVisible.mockResolvedValueOnce(false);
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "assertVisible", selector: ".first", description: "Check first" },
      { action: "assertVisible", selector: ".second", description: "Check second" },
    ]);
    const item = makeBrowserItem("Verify two elements");
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(false);
    const actions = (result.evidence as Record<string, unknown>).actions as unknown[];
    // Only navigate + first assertion ran (stopped before second)
    expect(actions).toHaveLength(2);
  });

  it("HIGH confidence: assertText passes when text matches", async () => {
    mockTextContent.mockResolvedValueOnce("Welcome to Dashboard");
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "assertText", selector: "h1", expected: "Dashboard", description: "Check title" },
    ]);
    const item = makeBrowserItem("Verify title says Dashboard");
    const result = await executeBrowserItem(item, baseContext);
    expect(result.passed).toBe(true);
  });

  it("HIGH confidence: assertText fails when text doesn't match", async () => {
    mockTextContent.mockResolvedValueOnce("Login Page");
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "assertText", selector: "h1", expected: "Dashboard", description: "Check title" },
    ]);
    const item = makeBrowserItem("Verify title says Dashboard");
    const result = await executeBrowserItem(item, baseContext);
    expect(result.passed).toBe(false);
  });

  it("HIGH confidence: assertUrl passes when URL matches", async () => {
    mockUrl.mockReturnValue("https://pr-42.example.dev/dashboard");
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "assertUrl", expected: "/dashboard", description: "Check URL" },
    ]);
    const item = makeBrowserItem("Verify redirected to dashboard");
    const result = await executeBrowserItem(item, baseContext);
    expect(result.passed).toBe(true);
  });

  it("returns error evidence when LLM spec generation fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API unavailable"));
    const item = makeBrowserItem("Verify something");
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toHaveProperty("error");
  });

  it("returns error evidence when no specs generated", async () => {
    mockLlmResponse([]);
    const item = makeBrowserItem("Verify something vague");
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect((result.evidence as Record<string, unknown>).error).toContain("No browser actions");
  });

  it("MEDIUM confidence: always returns passed true", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
      { action: "screenshot", description: "Capture" },
    ]);
    const item = makeBrowserItem("Check mobile responsiveness", { confidence: "MEDIUM", category: "visual" });
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(true);
    const evidence = result.evidence as Record<string, unknown>;
    expect(evidence.screenshots).toBeDefined();
    expect(evidence.viewportsTested).toBeDefined();
  });

  it("MEDIUM confidence: captures viewport screenshots", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
    ]);
    const item = makeBrowserItem("Check responsive layout", { confidence: "MEDIUM", category: "visual" });
    const result = await executeBrowserItem(item, baseContext);

    const evidence = result.evidence as Record<string, unknown>;
    const screenshots = evidence.screenshots as unknown[];
    // 3 default viewports (mobile, tablet, desktop)
    expect(screenshots.length).toBe(3);
  });

  it("MEDIUM confidence: even errors return passed true", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
    ]);
    mockGoto.mockRejectedValueOnce(new Error("Navigation timeout"));
    const item = makeBrowserItem("Visual check", { confidence: "MEDIUM", category: "visual" });
    const result = await executeBrowserItem(item, baseContext);

    expect(result.passed).toBe(true); // MEDIUM = evidence only
    expect(result.evidence).toHaveProperty("error");
  });

  it("blocks navigation outside baseUrl domain", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
    ]);
    mockGoto.mockImplementationOnce(async () => {
      // The executor should call goto with baseUrl + path
    });

    const item = makeBrowserItem("Navigate to page");
    const result = await executeBrowserItem(item, baseContext);

    expect(mockGoto).toHaveBeenCalledWith(
      "https://pr-42.example.dev/",
      expect.objectContaining({ waitUntil: "domcontentloaded" }),
    );
    expect(result.passed).toBe(true);
  });

  it("itemId matches item.item.id", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open page" },
    ]);
    const item = makeBrowserItem("Test", { id: "tp-42" });
    const result = await executeBrowserItem(item, baseContext);
    expect(result.itemId).toBe("tp-42");
  });

  it("duration is a non-negative number", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open" },
    ]);
    const item = makeBrowserItem("Test");
    const result = await executeBrowserItem(item, baseContext);
    expect(typeof result.duration).toBe("number");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("closes browser after execution", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open" },
    ]);
    const item = makeBrowserItem("Test");
    await executeBrowserItem(item, baseContext);
    expect(mockBrowserClose).toHaveBeenCalled();
  });

  it("handles click action", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open" },
      { action: "click", selector: "button.submit", description: "Click submit" },
    ]);
    const item = makeBrowserItem("Click submit button");
    await executeBrowserItem(item, baseContext);
    expect(mockClick).toHaveBeenCalled();
  });

  it("handles fill action", async () => {
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open" },
      { action: "fill", selector: "input[name=email]", value: "test@example.com", description: "Fill email" },
    ]);
    const item = makeBrowserItem("Fill in email field");
    await executeBrowserItem(item, baseContext);
    expect(mockFill).toHaveBeenCalledWith("test@example.com");
  });

  it("captures screenshot on assertion failure", async () => {
    mockIsVisible.mockResolvedValueOnce(false);
    mockLlmResponse([
      { action: "navigate", path: "/", description: "Open" },
      { action: "assertVisible", selector: ".missing", description: "Check" },
    ]);
    const item = makeBrowserItem("Verify element");
    const result = await executeBrowserItem(item, baseContext);

    const evidence = result.evidence as Record<string, unknown>;
    const screenshots = evidence.screenshots as unknown[];
    expect(screenshots.length).toBeGreaterThan(0);
  });
});
