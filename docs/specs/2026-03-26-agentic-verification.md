# Agentic Verification — From Single-Shot LLM to Iterative Agent

> **Status:** Spec / Design Doc
> **Author:** Sotero + Claude
> **Date:** 2026-03-26
> **Priority:** P0 — this is the next major architecture evolution

---

## Problem Statement

Today, each LLM signal makes **one call** — we send the PR diff + description and ask the LLM to analyze everything in a single pass. The LLM is blind to:

1. **Files outside the diff** — can't read imports, type definitions, or related modules
2. **Previous commits on the branch** — marks claims as "unverified" when the work is in earlier commits
3. **Repository context** — doesn't know the project structure, conventions, or what's normal
4. **Cross-file contracts** — guesses about API/frontend compatibility instead of reading both files

This produces false positives (admin-miia #8 contract checker), false negatives (mia_dash_mini #384 claims verifier), and generic analysis that lacks the depth of a real reviewer.

### Evidence from production (146 PRs analyzed)

| Issue | Example | Root cause |
|-------|---------|-----------|
| Claims marked "unverified" for work in earlier commits | mia_dash_mini #384, #379 | Agent can't see branch history |
| Contract false positives on destructuring | admin-miia #8 | Agent can't read the actual consumer file |
| Undocumented changes noise | keepvigil #113 (version bump flagged) | No repo context to judge significance |
| Claims verifier too literal | keepvigil #108 ("every comment" claim) | Can't check if there's only one comment path |

---

## Solution: Agentic Verification Pipeline

Replace the single LLM call per signal with an **iterative agent loop** that can request information, verify hypotheses, and build evidence before producing a verdict.

### Architecture Overview

```
CURRENT (single-shot):
  diff + description → LLM call → JSON → Signal

PROPOSED (agentic):
  diff + description → Agent loop:
    1. Read diff, extract claims/concerns
    2. For each claim, decide: can I verify from diff alone?
       YES → verify and move on
       NO  → use tools to gather evidence:
             - read_file(path) → fetch file from repo
             - list_directory(path) → explore repo structure
             - get_branch_commits() → see all commits on this branch
             - search_code(query) → find implementations
    3. With evidence, produce confident verdict
    4. → Signal (same output format as today)
```

### Key Constraint: Output Compatibility

The agent MUST produce the same `Signal` output that today's single-shot signals produce. This means:
- Same `SignalDetail[]` format
- Same scoring (0-100)
- Same `passed` boolean
- Everything downstream (comment-builder, score-engine, reporter) stays unchanged

The agent is a drop-in replacement for the signal function, not a pipeline rewrite.

---

## Phase 1: Claims Verifier Agent

The claims verifier is the highest-impact signal to convert (weight 30, most false positives).

### Current Implementation

**File:** `packages/github/src/services/claims-verifier.ts`

```typescript
export async function verifyClaims(options: ClaimsVerifierOptions): Promise<Signal> {
  // 1. Send diff + description to LLM in one call
  // 2. LLM returns JSON: { claims: [{ text, verdict, evidence }] }
  // 3. Score = 100 - (unverified * 15) - (contradicted * 40)
  // 4. Return Signal
}
```

**Interface consumed:**
```typescript
interface ClaimsVerifierOptions {
  prTitle: string;
  prBody: string;
  diff: string;
  llm: LLMClient;
}
```

**LLM client interface (what's available today):**
```typescript
interface LLMClient {
  chat(params: {
    system: string;
    user: string;
    timeoutMs?: number;
    reasoningEffort?: ReasoningEffort;
  }): Promise<string>;
  readonly model: string;
  readonly provider: string;
}
```

### Proposed Implementation

**Same file, same function signature.** The agent loop happens INSIDE `verifyClaims`.

```typescript
export async function verifyClaims(options: ClaimsVerifierOptions): Promise<Signal> {
  const { prTitle, prBody, diff, llm, octokit, owner, repo, headSha } = options;

  // Step 1: Extract claims (single LLM call, same as today)
  const claims = await extractClaims(llm, prTitle, prBody);

  // Step 2: For each claim, attempt verification with tools
  for (const claim of claims) {
    // First try: verify from diff alone
    const quickVerdict = await verifyFromDiff(llm, claim, diff);

    if (quickVerdict.confident) {
      claim.verdict = quickVerdict.verdict;
      claim.evidence = quickVerdict.evidence;
      continue;
    }

    // Not confident → use tools to gather evidence
    const evidence = await gatherEvidence(llm, claim, {
      readFile: (path) => fetchFileContent(octokit, owner, repo, headSha, path),
      listDir: (path) => fetchDirectoryListing(octokit, owner, repo, headSha, path),
      getBranchCommits: () => fetchBranchCommits(octokit, owner, repo, headSha),
      searchCode: (query) => searchRepoCode(octokit, owner, repo, query),
    });

    claim.verdict = evidence.verdict;
    claim.evidence = evidence.explanation;
  }

  // Step 3: Score (same formula as today)
  return buildSignal(claims);
}
```

### New Options Required

The function signature needs to expand to include GitHub API access:

```typescript
interface ClaimsVerifierOptions {
  prTitle: string;
  prBody: string;
  diff: string;
  llm: LLMClient;
  // NEW — for agentic tools
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  headSha: string;
}
```

**Pipeline change** (in `pipeline.ts`):
```typescript
// BEFORE
verifyClaims({ prTitle, prBody, diff: diff!, llm })

// AFTER
verifyClaims({ prTitle, prBody, diff: diff!, llm, octokit, owner, repo, headSha })
```

### Tools the Agent Can Use

Each tool is a thin wrapper around the GitHub API (Octokit). The agent decides which tools to call based on what it needs to verify.

#### 1. `read_file(path: string): Promise<string>`

Fetch a file's content from the repo at the PR's head SHA.

```typescript
async function fetchFileContent(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  sha: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner, repo, path, ref: sha,
    });
    if ('content' in data && data.encoding === 'base64') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null; // File not found
  }
}
```

**Use cases:**
- Verify "Add rate limiting" → read the rate limiter file to confirm implementation
- Check contract compatibility → read both producer and consumer files
- Verify type definitions → read the types.ts that's imported but not in the diff

**Limits:** Max 5 file reads per claim, max 10KB per file (truncate).

#### 2. `list_directory(path: string): Promise<string[]>`

List files in a directory to understand project structure.

```typescript
async function fetchDirectoryListing(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  sha: string,
  path: string,
): Promise<string[]> {
  // Uses the existing fetchRepoFileList or getTree API
  // Filter to files under the given path
}
```

**Use cases:**
- "Add test files" → check if test directory exists and what's in it
- Understand monorepo structure → which packages exist

**Limits:** Max 3 directory listings per verification run.

#### 3. `get_branch_commits(): Promise<Commit[]>`

Fetch the commit history for the PR's branch to find work done in earlier commits.

```typescript
async function fetchBranchCommits(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  headSha: string,
): Promise<Array<{ sha: string; message: string; date: string }>> {
  const { data } = await octokit.rest.repos.listCommits({
    owner, repo, sha: headSha, per_page: 20,
  });
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author?.date ?? "",
  }));
}
```

**Use cases:**
- Claim "redesign tickets" not in diff → check if earlier commit on branch touched ticket files
- Understand scope of work across multiple pushes

**Limits:** Max 20 commits, called at most once per run.

#### 4. `search_code(query: string): Promise<SearchResult[]>`

Search the repo for code patterns.

```typescript
async function searchRepoCode(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  query: string,
): Promise<Array<{ path: string; matches: string[] }>> {
  const { data } = await octokit.rest.search.code({
    q: `${query} repo:${owner}/${repo}`,
    per_page: 5,
  });
  return data.items.map((item) => ({
    path: item.path,
    matches: (item.text_matches ?? []).map((m) => m.fragment ?? ""),
  }));
}
```

**Use cases:**
- Verify "uses Redis for caching" → search for `ioredis` or `redis` imports
- Check if a function exists → search for function name

**Limits:** Max 3 searches per run. GitHub code search has rate limits.

### Agent Loop Implementation

The agent doesn't use OpenAI's function calling / tool_use API. Instead, it uses a simpler **structured reasoning loop**:

```typescript
async function gatherEvidence(
  llm: LLMClient,
  claim: ExtractedClaim,
  tools: AgentTools,
): Promise<{ verdict: ClaimVerdict; explanation: string }> {

  // Ask LLM: "What do you need to verify this claim?"
  const plan = await llm.chat({
    system: EVIDENCE_PLANNING_PROMPT,
    user: `Claim: "${claim.text}"\nDiff summary: ${claim.diffContext}`,
  });

  // Parse the plan (LLM returns JSON with tool calls)
  const actions = parsePlan(plan); // [{ tool: "read_file", args: { path: "src/auth.ts" } }, ...]

  // Execute tools (capped at MAX_TOOL_CALLS)
  const evidence: string[] = [];
  for (const action of actions.slice(0, MAX_TOOL_CALLS)) {
    const result = await executeAction(action, tools);
    evidence.push(`[${action.tool}(${JSON.stringify(action.args)})] → ${truncate(result, 2000)}`);
  }

  // Final verdict with all evidence
  const verdict = await llm.chat({
    system: VERDICT_PROMPT,
    user: `Claim: "${claim.text}"\nEvidence gathered:\n${evidence.join("\n\n")}`,
  });

  return parseVerdict(verdict);
}
```

**Why not function calling?** Two reasons:
1. Groq (our fallback) has limited function calling support
2. A structured two-step approach (plan → execute → verdict) is more predictable and debuggable than letting the LLM call tools autonomously

### Cost Analysis

| Approach | LLM calls per PR | Estimated cost |
|----------|------------------|----------------|
| Current (single-shot) | 3-5 calls | ~$0.003-0.005 |
| Agentic (claims only) | 5-10 calls | ~$0.008-0.015 |
| Agentic (all signals) | 10-20 calls | ~$0.015-0.030 |

At ~$0.01-0.03 per PR, this is still negligible. A team doing 50 PRs/day would cost ~$0.50-1.50/day.

### Latency Budget

| Phase | Current | Agentic |
|-------|---------|---------|
| Claims extraction | ~3s | ~3s (same) |
| Quick verification | — | ~3s (new, fast) |
| Evidence gathering | — | ~5-10s (tool calls + LLM) |
| Final verdict | — | ~3s (new) |
| **Total claims** | **~5s** | **~12-18s** |
| Other signals | ~15s | ~15s (unchanged) |
| **Pipeline total** | **~30-60s** | **~45-90s** |

With the progressive comment (PROD-001), the user sees the placeholder immediately. The extra 15-30s is invisible.

---

## Phase 2: Contract Checker Agent

After claims verifier is proven, convert contract checker:

- Instead of guessing from the diff, **read both files** (producer and consumer)
- Compare actual type definitions, response shapes, and field names
- Much higher confidence, near-zero false positives

**New tools needed:** Same as Phase 1 (read_file is the key one).

---

## Phase 3: Undocumented Changes Agent

- Read `.vigil.yml`, README, and CLAUDE.md to understand what's "normal" for this repo
- Check if an "undocumented" change is actually documented in the repo's conventions
- Use branch commits to understand the full scope of work

---

## Implementation Plan

### Step 1: Add GitHub API tools to pipeline context

**Files:** `packages/github/src/services/pipeline.ts`, new `packages/github/src/services/agent-tools.ts`

Create the tool functions (read_file, list_dir, get_commits, search_code) as standalone async functions that take Octokit + repo context. These are pure utility functions, not signal-specific.

### Step 2: Expand ClaimsVerifierOptions

**File:** `packages/github/src/services/claims-verifier.ts`

Add `octokit`, `owner`, `repo`, `headSha` to the options interface. The pipeline already has all of these.

### Step 3: Implement the two-phase verification loop

**File:** `packages/github/src/services/claims-verifier.ts`

1. Phase A: Extract claims + quick verification from diff (same as today, keeps the fast path)
2. Phase B: For low-confidence claims, run the evidence gathering loop

The "fast path" ensures that simple PRs (clear diff, obvious claims) don't pay the latency cost of tool calls.

### Step 4: Update pipeline to pass new context

**File:** `packages/github/src/services/pipeline.ts`

Pass `octokit`, `owner`, `repo`, `headSha` to `verifyClaims()`. Minimal change.

### Step 5: Tests

**New test file:** `packages/github/src/__tests__/agent-tools.test.ts`
**Updated:** `packages/github/src/__tests__/claims-verifier.test.ts`

Test the agent tools with mocked Octokit responses. Test the two-phase loop with various scenarios:
- Claim verifiable from diff alone → no tools called
- Claim not in diff → tools called, evidence gathered
- Tool failure → graceful degradation to diff-only verdict

### Step 6: Apply same pattern to Contract Checker

Once claims verifier is proven, repeat Steps 2-5 for contract checker.

---

## LLM Prompts (Draft)

### EVIDENCE_PLANNING_PROMPT

```
You are verifying a PR claim. You have the diff but need more context.

Given the claim and diff summary, decide what additional information you need.
Return a JSON array of tool calls:

Available tools:
- read_file(path): Read a file from the repo. Use when you need to see imports, types, or implementation details.
- get_branch_commits(): Get the last 20 commits on this branch. Use when the claim might be in an earlier commit.
- search_code(query): Search the repo for a code pattern. Use when you need to find where something is defined.

Rules:
- Use at most 3 tool calls
- Only call tools when the diff alone is insufficient
- If you can verify from the diff, return an empty array []

Return ONLY valid JSON: [{ "tool": "read_file", "args": { "path": "src/auth.ts" } }]
```

### VERDICT_PROMPT

```
You are a PR claim verifier. Given the claim and evidence gathered from the repository, determine if the claim is true.

Verdicts:
- "verified": The evidence confirms the claim
- "unverified": The evidence neither confirms nor contradicts (genuinely uncertain)
- "contradicted": The evidence shows the claim is false

Be generous with "verified" — if the evidence reasonably supports the claim, verify it.

Return ONLY valid JSON: { "verdict": "verified", "evidence": "Brief explanation" }
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| GitHub API rate limits from tool calls | Cap at 10 API calls per PR. Use conditional requests (304) where possible |
| Increased LLM cost | Fast path skips tools for simple claims. Monitor via admin panel |
| Increased latency | Progressive comment (PROD-001) masks the wait. Fast path keeps simple PRs fast |
| Tool call failures | Each tool returns null on failure. Agent degrades to diff-only verdict |
| LLM loops (keeps requesting tools) | Hard cap at MAX_TOOL_CALLS (5). Timeout per claim (30s) |
| Groq fallback doesn't support tools | We don't use LLM tool_use API — we use structured prompts that work with any provider |

---

## Success Metrics

After deploying Phase 1, measure against the same 146 PRs:

| Metric | Current | Target |
|--------|---------|--------|
| Claims false negatives (marked unverified when correct) | ~15% | < 3% |
| Contract checker false positives | ~20% | < 5% |
| Average score accuracy (compared to human review) | ~80% | > 95% |
| LLM cost per PR | ~$0.005 | < $0.02 |
| Pipeline latency (p95) | ~60s | < 90s |

---

## File Inventory

| File | Status | What changes |
|------|--------|-------------|
| `packages/github/src/services/agent-tools.ts` | NEW | Tool functions (read_file, list_dir, get_commits, search_code) |
| `packages/github/src/services/claims-verifier.ts` | MODIFY | Two-phase verification with tool support |
| `packages/github/src/services/pipeline.ts` | MODIFY | Pass octokit/owner/repo/headSha to claims verifier |
| `packages/core/src/types.ts` | MODIFY | Add AgentTools interface |
| `packages/github/src/__tests__/agent-tools.test.ts` | NEW | Tool function tests |
| `packages/github/src/__tests__/claims-verifier.test.ts` | MODIFY | Test two-phase loop |
| `packages/github/src/services/contract-checker.ts` | MODIFY (Phase 2) | Add tool support |
| `packages/github/src/services/undocumented-changes.ts` | MODIFY (Phase 3) | Add tool support |
