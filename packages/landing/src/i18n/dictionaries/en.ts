const en = {
  nav: {
    product: "Product",
    docs: "Docs",
    about: "About",
    dashboard: "Dashboard",
    installOnGithub: "Install on GitHub",
    documentation: "Documentation",
    productLinks: {
      signalsOverview: "Signals Overview",
      howItWorks: "How It Works",
      pricing: "Pricing",
      changelog: "Changelog",
    },
    docsLinks: {
      gettingStarted: "Getting Started",
      configuration: "Configuration",
      byollm: "BYOLLM",
      shellAllowlist: "Shell Allowlist",
      security: "Security",
    },
  },
  hero: {
    badge: "Every PR gets verified. Every claim gets checked.",
    title: "Verifies that your PR does what it says\u00a0it\u00a0does",
    description:
      "Install the GitHub App. Open a PR. Vigil reads your title and description, verifies each claim against the actual diff, and surfaces changes you didn't mention \u2014 so reviewers know exactly what's real.",
    installOnGithub: "Install on GitHub",
    viewOnGithub: "View on GitHub",
    zeroConfig: "\u2713 Zero config",
    noCreditCard: "\u2713 No credit card",
    thirtySecondInstall: "\u2713 30-second install",
    seeRealPr: "See how Vigil verifies a real PR \u2192",
    skipToContent: "Skip to content",
  },
  scoreCard: {
    confidenceScore: "Vigil Confidence Score",
    safeToMerge: "Safe to merge",
  },
  statsBar: {
    verificationLayers: "Verification Layers",
    signalsPerPr: "Signals per PR",
    setupTime: "Setup Time",
    configRequired: "Config Required",
  },
  socialProof: {
    cards: [
      {
        title: "See every line of code",
        description:
          "Vigil is open source. Read the code, audit the logic, verify the claims.",
        link: "Browse on GitHub \u2192",
      },
      {
        title: "Read a real PR review",
        description:
          "See exactly what Vigil posts on a pull request. No mock-ups, no demos.",
        link: "See PR #47 \u2192",
      },
      {
        title: "Check our uptime",
        description:
          "Vigil runs on dedicated infrastructure. Check the health endpoint anytime.",
        link: "View status \u2192",
      },
    ],
    tagline:
      "We don't have a wall of logos yet. We have something better: radical transparency.",
  },
  problem: {
    title1: "Your PR says one thing.",
    title2: "The code says another.",
    description:
      'AI agents write PRs with confident descriptions \u2014 "adds auth middleware," "fixes the timeout bug," "no breaking changes." But who actually checks? The PR says it adds auth \u2014 did it? The PR says no breaking changes \u2014 are there any? The gap between what a PR claims and what the code actually does grows with every merge.',
  },
  howItWorks: {
    title: "How it works",
    steps: [
      {
        title: "Install",
        description:
          "Add Vigil to your GitHub repos in one click. No code changes, no CI config, no setup.",
      },
      {
        title: "Push a PR",
        description:
          "Open a pull request. Any PR \u2014 from AI agents, teammates, or yourself. No test plan needed.",
      },
      {
        title: "Get your score",
        description:
          "Vigil verifies claims, surfaces undocumented changes, and analyzes impact. Results appear directly on the PR.",
      },
    ],
  },
  signals: {
    title: "Three layers. Full verification.",
    subtitle:
      "Vigil reads your PR description, verifies every claim against the actual diff, and surfaces what you missed.",
    scoreNote:
      "10 signals across three layers contribute to the verification score. 7 are free \u2014 the core value. 3 unlock with Pro for deeper analysis.",
    layers: {
      claimsVerification: {
        name: "Claims Verification",
        tier: "Free",
        description:
          "Reads your PR title and description. Extracts every claim \u2014 'adds auth middleware,' 'fixes timeout,' 'no breaking changes.' Verifies each one against the actual diff. Confirmed, unverified, or contradicted.",
        signals: [
          {
            name: "Claims Verifier",
            description:
              "LLM extracts and verifies each claim from your PR body against the actual diff. Confirmed, unverified, or contradicted.",
          },
          {
            name: "Plan Augmentor",
            description:
              "Automatically generates 3-5 verification items your test plan missed \u2014 logic checks, contracts, edge cases \u2014 then verifies each one.",
          },
          {
            name: "CI Bridge",
            description:
              "Maps test plan items to your GitHub Actions results. If CI already verified it, Vigil knows.",
          },
        ],
      },
      undocumentedChanges: {
        name: "Undocumented Changes",
        tier: "Free",
        description:
          "Reads the full diff. Finds significant changes you didn't mention \u2014 new dependencies, environment variables, schema changes, API modifications. The things reviewers need to know but the PR description doesn't surface.",
        signals: [
          {
            name: "Undocumented Changes",
            description:
              "LLM scans the full diff for significant changes not mentioned in the PR description. New deps, env vars, schema changes.",
          },
          {
            name: "Credential Scan",
            description:
              "Scans the diff for hardcoded secrets, API keys, and passwords. Catches what code review misses.",
          },
          {
            name: "Coverage Mapper",
            description:
              "Checks if changed files have corresponding test files. Files referenced by the test plan count as covered.",
          },
          {
            name: "Test Execution",
            description:
              "Runs shell commands from the test plan in a sandboxed Docker container. Real verification, not just static analysis.",
          },
        ],
      },
      impactAnalysis: {
        name: "Impact Analysis",
        tier: "Pro",
        description:
          "Goes deeper. LLM-powered deep analysis \u2014 comparing actual changes against test plan promises, finding untested areas, and verifying API/frontend contracts still match.",
        signals: [
          {
            name: "Diff vs Claims",
            description:
              "LLM compares what the PR actually changed against what the test plan promises. Finds the gaps between words and code.",
          },
          {
            name: "Gap Analysis",
            description:
              "LLM identifies areas of the code that changed but aren't covered by any test plan item. The unknown unknowns.",
          },
          {
            name: "Contract Checker",
            description:
              "Detects when a PR touches both API and frontend. Compares response shapes to ensure they still match.",
          },
        ],
      },
    },
  },
  evidence: {
    badge: "Example verification result",
    title: "This appears on every PR.",
    subtitle:
      "No dashboard. No separate tool. The results live where you already work \u2014 right on the pull request.",
    tabs: {
      reviewNeeded: "Review needed",
      credentialLeak: "Credential leak",
    },
    reviewRecommended: "Review recommended",
    doNotMerge: "Do not merge",
    claims: "Claims",
    undocumentedChanges: "Undocumented Changes",
    impact: "Impact",
    seeRealResult: "See a real result on GitHub \u2192",
  },
  securityTrust: {
    title: "Your code stays safe.",
    subtitle:
      "Security isn't an afterthought. Vigil was built from the ground up to keep your code and secrets protected.",
    cards: [
      {
        icon: "\ud83d\udd12",
        title: "Sandboxed Execution",
        description:
          "All commands run in Docker containers with --network none. No internet access, no host access, no secrets exposed.",
      },
      {
        icon: "\ud83d\udee1\ufe0f",
        title: "No Data Retention",
        description:
          "Vigil reads your PR, runs the analysis, posts the results, and forgets. No code is stored on our servers.",
      },
      {
        icon: "\ud83d\udd10",
        title: "Fork PR Protection",
        description:
          "Fork PRs read configuration from your default branch, not from the fork. Untrusted contributors can\u2019t inject malicious config.",
      },
    ],
    badges: {
      dockerSandbox: "Docker Sandbox",
      noDataRetention: "No Data Retention",
      mitLicensed: "MIT Licensed",
      euServers: "EU Servers",
    },
    securityDocsLink: "Read our security docs \u2192",
    openSourceMit: "Open source under MIT",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        question: "Is Vigil free for open source?",
        answer:
          "Yes. The Free tier includes Claims Verification, Undocumented Change Detection, credential scanning, and coverage mapping \u2014 unlimited PRs, unlimited repos. No credit card required.",
      },
      {
        question: "Does Vigil work with private repos?",
        answer:
          "Yes. Both Free and Pro tiers work with private repositories. Install the GitHub App and select which repos to enable.",
      },
      {
        question: "What data does Vigil access?",
        answer:
          "Vigil reads the PR title, description, and diff. Optionally clones the repo for deeper file analysis. No code is stored after analysis completes.",
      },
      {
        question: "Do I need to configure anything?",
        answer:
          "No. Vigil works out of the box with zero configuration. Optionally add a .vigil.yml file to customize timeouts, shell commands, or enable Pro signals.",
      },
      {
        question: "What does BYOLLM mean?",
        answer:
          "Bring Your Own LLM. Pro signals use AI to analyze your code. You provide your own API key (OpenAI, Groq, or Ollama), so you control the cost and data flow.",
      },
      {
        question: "How much does the LLM cost per PR?",
        answer:
          "Typically less than $0.01 per PR. Vigil makes 2\u20134 LLM calls per analysis using fast models like Groq\u2019s llama-3.3-70b.",
      },
      {
        question: "Can Vigil block merges?",
        answer:
          "Vigil posts a GitHub Check Run. You can configure branch protection rules to require Vigil\u2019s check to pass before merging. Scores below 50 result in a \u2018failure\u2019 check.",
      },
      {
        question: "Is Vigil only for GitHub?",
        answer:
          "Currently GitHub only. GitLab and Bitbucket are being considered for the future.",
      },
    ],
  },
  ctaFooter: {
    title: "Merge with confidence.",
    subtitle:
      "Install Vigil in 30 seconds. Free forever. No credit card required.",
    installOnGithub: "Install on GitHub",
    footerProduct: "Product",
    footerResources: "Resources",
    footerLegal: "Legal",
    signals: "Signals",
    pricing: "Pricing",
    byollm: "BYOLLM",
    security: "Security",
    documentation: "Documentation",
    github: "GitHub",
    writingTestPlans: "Writing Test Plans",
    about: "About",
    changelog: "Changelog",
    status: "Status",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    copyright: "\u00a9 2026 Vigil. Open source under MIT.",
  },
  pricing: {
    title: "Start free. Scale when you're ready.",
    subtitle:
      "Every plan includes unlimited repos and unlimited PRs. Upgrade for deeper analysis.",
    monthly: "Monthly",
    annual: "Annual",
    saveUpTo: "Save up to $98",
    forever: "forever",
    perMonth: "/month",
    perYear: "/year",
    comparePlans: "Compare plans",
    feature: "Feature",
    billingQuestions: "Billing questions",
    alreadyUsingVigil: "Already using Vigil?",
    alreadyUsingVigilDescription:
      "View your PR verification history, scores, and team metrics in the dashboard.",
    openDashboard: "Open Dashboard",
    allPlansNote:
      "All plans include unlimited PRs. BYOLLM means you control LLM costs \u2014 typically < $0.01 per PR.",
    plans: {
      free: {
        name: "Free",
        description: "Immediate value, zero config.",
        features: [
          "CI Bridge \u2014 verify GitHub Actions results",
          "Credential Scan \u2014 catch hardcoded secrets",
          "Coverage Mapper \u2014 find untested files",
          "Test Execution \u2014 sandbox verification",
          "Assertion Verifier \u2014 file content checks",
          "Plan Augmentor \u2014 auto-generate missing checks",
          "Unlimited public repos",
          "10 PRs/hour, 50 PRs/day",
        ],
        cta: "Install Free",
      },
      pro: {
        name: "Pro",
        description: "Full verification with impact analysis.",
        badge: "Recommended",
        features: [
          "Everything in Free, plus:",
          "Diff vs Claims \u2014 LLM gap detection",
          "Gap Analysis \u2014 find untested changes",
          "Contract Checker \u2014 API/frontend compatibility",
          "BYOLLM \u2014 use your own API key",
          "Webhook notifications (Slack/Discord)",
          "50 PRs/hour, 500 PRs/day",
          "Priority support",
        ],
        cta: "Start Pro Trial",
      },
      team: {
        name: "Team",
        description: "For teams managing agents at scale.",
        features: [
          "Everything in Pro, plus:",
          "Shared dashboard",
          "Custom scoring rules",
          "SSO / SAML",
          "Org-wide configuration",
          "200 PRs/hour, 2000 PRs/day",
          "Dedicated support",
        ],
        cta: "Start Team Trial",
      },
    },
    faq: [
      {
        question: "How does billing work?",
        answer:
          "You're billed at the start of each billing cycle \u2014 monthly or annually. All charges go through Stripe. You'll receive an invoice by email for every payment.",
      },
      {
        question: "Can I cancel anytime?",
        answer:
          "Yes. Cancel from your Stripe customer portal at any time. Your plan stays active until the end of the current billing period \u2014 no partial-month charges.",
      },
      {
        question: "What happens when I cancel?",
        answer:
          "Your account reverts to the Free tier at the end of your billing period. Pro-only signals (Diff, Gap, Contract Checker) stop running, but your repos stay connected and Free signals continue working.",
      },
      {
        question: "Do I get a refund?",
        answer:
          "We don't offer prorated refunds for unused time. If you cancel mid-cycle, you keep access until the period ends. If there's an issue, reach out \u2014 we'll work with you.",
      },
      {
        question: "How does BYOLLM billing work?",
        answer:
          "Vigil doesn't charge for LLM usage \u2014 you bring your own API key (OpenAI, Groq, or Ollama). LLM costs are typically less than $0.01 per PR using fast models like Groq's llama-3.3-70b.",
      },
      {
        question: "Can I change plans?",
        answer:
          "Yes. Upgrade or downgrade anytime from your Stripe portal. Upgrades take effect immediately with prorated billing. Downgrades apply at the next billing cycle.",
      },
      {
        question: "Is there an annual discount?",
        answer:
          "Yes. Annual billing saves you two months: Pro is $190/year (vs. $228 monthly) and Team is $490/year (vs. $588 monthly).",
      },
      {
        question: "Do I need a credit card for Free?",
        answer:
          "No. Install the GitHub App and start using Vigil immediately. No credit card, no trial expiration, no catch.",
      },
    ],
    comparisonFeatures: [
      "CI Bridge",
      "Credential Scan",
      "Test Execution",
      "Coverage Mapper",
      "Assertion Verifier",
      "Plan Augmentor",
      "Diff vs Claims",
      "Gap Analysis",
      "Contract Checker",
      "BYOLLM",
      "Webhook notifications",
      "Custom scoring rules",
      "SSO / SAML",
      "Org-wide config",
      "PRs per hour",
      "PRs per day",
    ],
  },
  about: {
    title: "About Vigil",
    description:
      "Vigil verifies that pull requests do what they claim. The silent verifier for any PR.",
    intro:
      "AI agents and developers write PRs with confident descriptions. But nobody checks if the description matches the code. Vigil does. We read the PR description, extract every claim, verify each one against the actual diff, and surface changes the author didn't mention.",
    whatWeDoTitle: "What we do",
    whatWeDo:
      "Vigil gives every pull request a verification report \u2014 claims checked against the diff, undocumented changes surfaced, and impact analyzed. Three layers of verification: Claims Verification confirms the PR does what it says. Undocumented Change Detection finds what the description missed. Impact Analysis catches breaking changes, coverage gaps, and contract violations. Results appear directly on the PR.",
    howWereDifferentTitle: "How we're different",
    howWereDifferent:
      "We don't review code (that's CodeRabbit). We don't run CI (that's GitHub Actions). We don't measure coverage (that's Codecov). We verify that what your PR claims matches what the code actually does. When your PR says \"adds rate limiting\" \u2014 we check the diff. When it doesn't mention a new Redis dependency \u2014 we flag it.",
    openSourceTitle: "Open source",
    openSource:
      "Vigil is open source under the MIT License. The entire codebase \u2014 990+ tests, 9 signals, the score engine \u2014 is public on GitHub. You can self-host, audit, contribute, or fork it.",
    installOnGithub: "Install on GitHub",
    viewOnGithub: "View on GitHub",
  },
};

export type Dictionary = typeof en;
export default en;
