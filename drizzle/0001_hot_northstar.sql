CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" text NOT NULL,
	"installation_id" text NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"pull_number" integer NOT NULL,
	"head_sha" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL CHECK ("status" IN ('pending', 'running', 'completed', 'failed')),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"results_summary" json,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "executions_job_id_idx" ON "executions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "executions_owner_repo_pull_idx" ON "executions" USING btree ("owner","repo","pull_number");