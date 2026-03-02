/**
 * System prompt and few-shot examples for the Claude Haiku classifier.
 *
 * The LLM receives a batch of test plan items that the rule-based
 * pass could not classify and must return structured JSON.
 */

export const CLASSIFIER_SYSTEM_PROMPT = `You are a test plan item classifier for a CI/CD system called Vigil.

You receive test plan items extracted from pull request descriptions. For each item, determine:

1. **category** — What kind of verification this item requires:
   - "build" — Compile, lint, or run a test suite
   - "api" — Make HTTP requests and verify responses
   - "ui-flow" — Interact with a UI (click, navigate, fill forms, verify elements)
   - "visual" — Check visual appearance (layout, animations, loading states)
   - "metadata" — Verify HTML meta tags, SEO, headers, or static page properties
   - "manual" — Requires human judgment or external action
   - "vague" — Too ambiguous to classify with confidence

2. **confidence** — How confident are you in this classification:
   - "DETERMINISTIC" — Unambiguous, can be fully automated with a script
   - "HIGH" — Clear intent, automatable with the right executor
   - "MEDIUM" — Likely automatable but may need interpretation
   - "LOW" — Ambiguous or unclear how to automate
   - "SKIP" — Should not be automated (manual, out of scope)

3. **executorType** — Which executor should handle this:
   - "shell" — Run shell commands (build, lint, test suites)
   - "api" — Make HTTP requests (REST endpoints, status codes)
   - "browser" — Browser automation (navigation, clicks, visual checks)
   - "none" — Cannot or should not be automated

4. **reasoning** — Brief explanation (1 sentence) of why you chose this classification.

Respond with a JSON array. Each element corresponds to the input item at the same index.`;

export interface FewShotExample {
  text: string;
  category: string;
  confidence: string;
  executorType: string;
  reasoning: string;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    text: "Run npm run build",
    category: "build",
    confidence: "DETERMINISTIC",
    executorType: "shell",
    reasoning: "Direct shell command to run a build script",
  },
  {
    text: "POST /api/users returns 201",
    category: "api",
    confidence: "HIGH",
    executorType: "api",
    reasoning: "HTTP endpoint test with expected status code",
  },
  {
    text: "Click login, verify dashboard loads",
    category: "ui-flow",
    confidence: "HIGH",
    executorType: "browser",
    reasoning: "User interaction flow requiring browser automation",
  },
  {
    text: "Skeleton loading animation appears before content loads",
    category: "visual",
    confidence: "MEDIUM",
    executorType: "browser",
    reasoning: "Visual/timing check that requires observing rendering behavior",
  },
  {
    text: "Verify OG meta tags are present on the homepage",
    category: "metadata",
    confidence: "HIGH",
    executorType: "browser",
    reasoning: "HTML metadata inspection on a rendered page",
  },
  {
    text: "Verify it works correctly",
    category: "vague",
    confidence: "LOW",
    executorType: "none",
    reasoning: "No specific action or expected outcome defined",
  },
  {
    text: "Ask client for approval before deploying",
    category: "manual",
    confidence: "SKIP",
    executorType: "none",
    reasoning: "Requires human communication outside the system",
  },
  {
    text: "Navigate to /settings and verify dark mode toggle works",
    category: "ui-flow",
    confidence: "HIGH",
    executorType: "browser",
    reasoning: "Browser navigation and UI interaction with verifiable outcome",
  },
];

/**
 * Build the full user message for a batch of items.
 * Includes few-shot examples followed by the actual items to classify.
 */
export function buildUserPrompt(itemTexts: string[]): string {
  const examplesBlock = FEW_SHOT_EXAMPLES.map(
    (ex) =>
      `Input: "${ex.text}"\nOutput: ${JSON.stringify({ category: ex.category, confidence: ex.confidence, executorType: ex.executorType, reasoning: ex.reasoning })}`,
  ).join("\n\n");

  const itemsBlock = itemTexts
    .map((text, i) => `${i + 1}. "${text}"`)
    .join("\n");

  return `Here are examples of correct classifications:

${examplesBlock}

---

Now classify these items. Return a JSON array with one object per item, in the same order:

${itemsBlock}`;
}
