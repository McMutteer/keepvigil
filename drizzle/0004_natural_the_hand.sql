CREATE TABLE "repo_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"rule_type" varchar(50) DEFAULT 'ignore' NOT NULL,
	"pattern" text NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "repo_rules_owner_repo_idx" ON "repo_rules" USING btree ("owner","repo");