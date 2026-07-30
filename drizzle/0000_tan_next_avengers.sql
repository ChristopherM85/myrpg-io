CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent` text NOT NULL,
	`status` text NOT NULL,
	`item_id` text,
	`planned_cost_cents` integer DEFAULT 0 NOT NULL,
	`actual_cost_cents` integer DEFAULT 0 NOT NULL,
	`output_json` text,
	`stopped_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `approved_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`body` text NOT NULL,
	`pinned` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_url` text NOT NULL,
	`confidence` integer NOT NULL,
	`fact_checked_at` text,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE TABLE `budget_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_limit_cents` integer DEFAULT 800 NOT NULL,
	`per_job_limit_cents` integer DEFAULT 125 NOT NULL,
	`live_agents_enabled` integer DEFAULT false NOT NULL,
	`emergency_stop` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`platforms` text NOT NULL,
	`business_model` text NOT NULL,
	`combat` text NOT NULL,
	`setting` text NOT NULL,
	`focus` text NOT NULL,
	`release_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_slug_unique` ON `games` (`slug`);--> statement-breakpoint
CREATE TABLE `review_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`decision` text NOT NULL,
	`decided_by` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_domain_unique` ON `sources` (`domain`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);