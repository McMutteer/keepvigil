const en = {
  nav: {
    product: "Product",
    docs: "Docs",
    about: "About",
    blog: "Blog",
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
      byollm: "Dashboard",
      shellAllowlist: "PR Verification",
      security: "Security",
    },
  },
  hero: {
    badge: "Built for the age of AI-assisted development",
    title: "Merge with confidence.",
    description:
      "AI agents and teammates write PRs fast. Vigil reads every claim, verifies it against the actual diff, and surfaces changes nobody mentioned. So you know exactly what you\u2019re merging.",
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
        link: "See PR #7 \u2192",
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
      "Your team merges 50 PRs a week. How many did someone actually read line by line? AI agents write code in minutes \u2014 complete with confident descriptions. \u201CAdds auth middleware.\u201D \u201CFixes the timeout bug.\u201D \u201CNo breaking changes.\u201D But who checks? Not CI \u2014 it tests if code runs, not if the PR is truthful. Not code review \u2014 your reviewer skimmed the diff in 30 seconds. The gap between what a PR claims and what the code does is the gap where bugs reach production.",
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
      "8 signals across three layers. 6 contribute to the confidence score. 2 provide additional context \u2014 risk assessment and description suggestions.",
    layers: {
      trustVerification: {
        name: "Trust Verification",
        tier: "Included",
        description:
          "Reads your PR title and description. Extracts every claim \u2014 \u2018adds auth middleware,\u2019 \u2018fixes timeout,\u2019 \u2018no breaking changes.\u2019 Verifies each one against the actual diff. Then scans for everything the description didn\u2019t mention: new dependencies, credentials, untested files.",
        signals: [
          {
            name: "Claims Verifier",
            description:
              "LLM extracts and verifies each claim from your PR body against the actual diff. Confirmed, unverified, or contradicted.",
          },
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
              "Checks if changed files have corresponding test files. Surfaces untested code before it ships.",
          },
        ],
      },
      deepAnalysis: {
        name: "Deep Analysis",
        tier: "Included",
        description:
          "Goes deeper into structural impact. Detects when a PR touches both API and frontend, compares response shapes to ensure contracts still match, and performs granular diff analysis to find the gaps between what changed and what was documented.",
        signals: [
          {
            name: "Contract Checker",
            description:
              "Detects when a PR touches both API and frontend. Compares response shapes to ensure they still match.",
          },
          {
            name: "Diff Analyzer",
            description:
              "Granular diff analysis comparing what the PR actually changed against what was documented. Finds the gaps between words and code.",
          },
        ],
      },
      developerAssist: {
        name: "Developer Assist",
        tier: "Included",
        description:
          "Provides additional context beyond the confidence score. Evaluates risk patterns across the PR and generates a description when the author didn\u2019t write one. Informational signals that help you understand the PR faster.",
        signals: [
          {
            name: "Risk Assessment",
            description:
              "Evaluates PR risk based on file patterns, change size, and structural indicators. Flags high-risk changes like auth, payments, and infrastructure.",
          },
          {
            name: "Description Generator",
            description:
              "When a PR has no description, Vigil generates one from the diff. Ensures every PR has context before review begins.",
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
        title: "Read-Only Analysis",
        description:
          "Vigil reads your diff and PR description. It never modifies your code, never clones your repo to disk, never executes commands.",
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
      dockerSandbox: "Read-Only",
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
        question: "Is Vigil free?",
        answer:
          "Yes. The Free tier includes all 8 signals \u2014 Claims Verifier, Undocumented Changes, Credential Scan, Coverage Mapper, Contract Checker, Diff Analyzer, Risk Assessment, and Description Generator. Unlimited repos. No credit card required.",
      },
      {
        question: "Does Vigil work with AI-generated PRs?",
        answer:
          "That\u2019s exactly what it\u2019s built for. Whether the PR comes from Claude Code, Cursor, Devin, or a teammate \u2014 Vigil verifies the claims against the actual diff. The faster code gets written, the more you need an independent verifier.",
      },
      {
        question: "How is Vigil different from CodeRabbit?",
        answer:
          "CodeRabbit reviews code quality \u2014 style, bugs, best practices. Vigil verifies truthfulness \u2014 does the PR actually do what it says? They\u2019re complementary. Many teams use both.",
      },
      {
        question: "What's the one-line summary on each PR?",
        answer:
          "Every Vigil comment starts with a PR at a Glance line \u2014 a compact summary showing files changed, key categories, test coverage, and estimated review time. It\u2019s designed to give you instant context before reading the full report.",
      },
      {
        question: "Can Vigil write my PR description?",
        answer:
          "When a PR has an empty or missing description, Vigil\u2019s Description Generator automatically creates one from the diff. This ensures every PR has context for reviewers, even when the author forgot to write one.",
      },
      {
        question: "Does Vigil work with private repos?",
        answer:
          "Yes. All tiers work with private repositories. Install the GitHub App and select which repos to enable.",
      },
      {
        question: "What data does Vigil access?",
        answer:
          "Vigil reads the PR title, description, and diff. No code is stored after analysis completes. Vigil never clones your repo or executes any code.",
      },
      {
        question: "Do I need to configure anything?",
        answer:
          "No. Vigil works out of the box with zero configuration. Optionally add a .vigil.yml file to customize scoring weights or signal behavior.",
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
    byollm: "Dashboard",
    security: "Security",
    documentation: "Documentation",
    github: "GitHub",
    writingTestPlans: "Getting Started",
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
      "Every plan includes all 8 signals and unlimited repos. Upgrade for inline comments, automation, and team features.",
    monthly: "Monthly",
    annual: "Annual",
    saveUpTo: "Save up to $48",
    forever: "forever",
    perMonth: "/dev/month",
    perYear: "/dev/year",
    comparePlans: "Compare plans",
    feature: "Feature",
    billingQuestions: "Billing questions",
    alreadyUsingVigil: "Already using Vigil?",
    alreadyUsingVigilDescription:
      "View your PR verification history, scores, and team metrics in the dashboard.",
    openDashboard: "Open Dashboard",
    allPlansNote:
      "All plans include all 8 signals and unlimited repos. Free tier \u2014 no credit card, no catch.",
    plans: {
      free: {
        name: "Free",
        description: "All 8 signals, zero config.",
        features: [
          "All 8 verification signals included",
          "PR at a Glance \u2014 instant PR summary",
          "Risk Assessment \u2014 flag high-risk changes",
          "Description Generator \u2014 auto-generate missing descriptions",
          "Unlimited repos and PRs",
        ],
        cta: "Install Free",
      },
      pro: {
        name: "Pro",
        description: "Inline comments and automation.",
        badge: "Recommended",
        features: [
          "Everything in Free, plus:",
          "Inline review comments on diff lines",
          "Auto-approve for high-confidence PRs",
          "Webhook notifications (Slack/Discord)",
          "Priority support",
        ],
        cta: "Start Pro Trial",
      },
      team: {
        name: "Team",
        description: "For teams managing agents at scale.",
        features: [
          "Everything in Pro, plus:",
          "Dashboard \u2014 PR history, scores, team metrics",
          "@vigil commands \u2014 explain, verify, recheck, ignore",
          "Repo memory \u2014 persistent ignore rules",
          "Custom scoring rules",
          "Dedicated support",
        ],
        cta: "Start Team Trial",
      },
    },
    faq: [
      {
        question: "How does billing work?",
        answer:
          "You're billed per developer at the start of each billing cycle \u2014 monthly or annually. All charges go through Stripe. You'll receive an invoice by email for every payment.",
      },
      {
        question: "What counts as a 'developer'?",
        answer:
          "A developer is any GitHub user who opens a PR on a repo where Vigil is installed. Bot accounts and CI users don\u2019t count. You\u2019re only billed for humans who actively use the tool.",
      },
      {
        question: "Can I cancel anytime?",
        answer:
          "Yes. Cancel from your Stripe customer portal at any time. Your plan stays active until the end of the current billing period \u2014 no partial-month charges.",
      },
      {
        question: "What happens when I cancel?",
        answer:
          "Your account reverts to the Free tier at the end of your billing period. Pro features (inline comments, auto-approve, webhooks) stop, but your repos stay connected and all 8 signals continue working.",
      },
      {
        question: "Do I get a refund?",
        answer:
          "We don't offer prorated refunds for unused time. If you cancel mid-cycle, you keep access until the period ends. If there's an issue, reach out \u2014 we'll work with you.",
      },
      {
        question: "Can I change plans?",
        answer:
          "Yes. Upgrade or downgrade anytime from your Stripe portal. Upgrades take effect immediately with prorated billing. Downgrades apply at the next billing cycle.",
      },
      {
        question: "Is there an annual discount?",
        answer:
          "Yes. Annual billing saves you two months per developer: Pro is $120/dev/year (vs. $144 monthly) and Team is $240/dev/year (vs. $288 monthly).",
      },
      {
        question: "Do I need a credit card for Free?",
        answer:
          "No. Install the GitHub App and start using Vigil immediately. No credit card, no trial expiration, no catch.",
      },
    ],
    comparisonFeatures: [
      "Claims Verifier",
      "Undocumented Changes",
      "Credential Scan",
      "Coverage Mapper",
      "Contract Checker",
      "Diff Analyzer",
      "Risk Assessment",
      "Description Generator",
      "PR at a Glance",
      "Inline review comments",
      "Auto-approve",
      "Webhook notifications",
      "@vigil commands",
      "Repo memory",
      "Custom scoring rules",
    ],
  },
  about: {
    title: "About Vigil",
    description:
      "The verification layer for AI-assisted development. Vigil ensures every PR does what it claims.",
    intro:
      "AI agents write code faster than any team can review. Claude Code, Cursor, Devin \u2014 they ship PRs in minutes, complete with confident descriptions. But who verifies that the description matches the diff? Vigil does. We read every claim, check it against the actual code changes, and surface what nobody mentioned. The verification layer between AI-generated code and your main branch.",
    whatWeDoTitle: "What we do",
    whatWeDo:
      "Vigil gives every pull request a verification report \u2014 claims checked against the diff, undocumented changes surfaced, and structural impact analyzed. Three layers of verification: Trust Verification confirms the PR does what it says and catches what the description missed. Deep Analysis detects contract violations and performs granular diff gap detection. Developer Assist evaluates risk patterns and generates descriptions when the author didn\u2019t write one. Results appear directly on the PR.",
    howWereDifferentTitle: "How we're different",
    howWereDifferent:
      "We complement code review tools, not replace them. CodeRabbit reviews code quality. GitHub Actions runs CI. Codecov measures coverage. Vigil verifies that what your PR claims matches what the code actually does. When your PR says \"adds rate limiting\" \u2014 we check the diff. When it doesn't mention a new Redis dependency \u2014 we flag it. Different job, same pull request.",
    openSourceTitle: "Open source",
    openSource:
      "Vigil is open source under the MIT License. The entire codebase \u2014 840+ tests, 8 signals, the score engine \u2014 is public on GitHub. You can self-host, audit, contribute, or fork it.",
    installOnGithub: "Install on GitHub",
    viewOnGithub: "View on GitHub",
  },
};

export type Dictionary = typeof en;
export default en;
