CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" text NOT NULL,
	"installation_id" text NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"pull_number" integer NOT NULL,
	"signal_id" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"estimated_cost_usd" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "llm_usage_installation_id_idx" ON "llm_usage" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "llm_usage_created_at_idx" ON "llm_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_usage_owner_repo_idx" ON "llm_usage" USING btree ("owner","repo");--> statement-breakpoint
