CREATE TABLE `application_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`vacancy_id` int NOT NULL,
	`application_id` int,
	`recipient` varchar(320),
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`approval_status` enum('draft','approved','sent','cancelled') NOT NULL DEFAULT 'draft',
	`approved_at` timestamp,
	`sent_at` timestamp,
	`gmail_message_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `application_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`vacancy_id` int NOT NULL,
	`status` enum('to_apply','applied','follow_up','interview_scheduled','offer','rejected') NOT NULL DEFAULT 'to_apply',
	`date_applied` timestamp,
	`cv_version` varchar(160),
	`contact_used` varchar(320),
	`next_follow_up_at` timestamp,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `application_user_vacancy_idx` UNIQUE(`user_id`,`vacancy_id`)
);
--> statement-breakpoint
CREATE TABLE `candidate_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`full_name` varchar(160) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`qualification` varchar(240) NOT NULL DEFAULT 'B.Pharm / M.Pharm',
	`experience_years` int NOT NULL DEFAULT 2,
	`current_role` varchar(160) NOT NULL DEFAULT 'QA / IPQA Associate',
	`skills` text NOT NULL,
	`preferred_locations` text NOT NULL,
	`cv_version` varchar(160) NOT NULL DEFAULT 'QA-OSD-v1',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_profile_user_idx` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`primary_location` varchar(255),
	`career_url` text,
	`research_note` text,
	`august_window_status` varchar(255),
	`imported_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `companies_name_idx` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `company_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`contact_type` enum('hr','careers','phone') NOT NULL,
	`contact_value` varchar(320) NOT NULL,
	`source_url` text,
	`is_publicly_verified` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_contact_unique_idx` UNIQUE(`company_id`,`contact_type`,`contact_value`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trigger_type` enum('manual','scheduled') NOT NULL,
	`status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
	`summary` text,
	`new_vacancy_count` int NOT NULL DEFAULT 0,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `monitoring_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`schedule_cron_task_uid` varchar(65),
	`cron_expression` varchar(80) NOT NULL DEFAULT '0 0 3 * * *',
	`timezone` varchar(80) NOT NULL DEFAULT 'Asia/Kolkata',
	`enabled` boolean NOT NULL DEFAULT false,
	`delivery_target` enum('owner_notification','gmail_draft','github_export') NOT NULL DEFAULT 'owner_notification',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `monitoring_schedule_user_idx` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `vacancies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`department` varchar(160),
	`location` varchar(255) NOT NULL,
	`employment_route` enum('walk_in','direct','unverified') NOT NULL DEFAULT 'unverified',
	`walk_in_date_text` varchar(255),
	`eligibility` text,
	`salary_text` varchar(500),
	`source_url` text NOT NULL,
	`status` enum('active','expired','unverified') NOT NULL DEFAULT 'unverified',
	`two_year_match` boolean NOT NULL DEFAULT false,
	`location_priority` int NOT NULL DEFAULT 0,
	`match_score` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vacancies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `application_drafts` ADD CONSTRAINT `application_drafts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `application_drafts` ADD CONSTRAINT `application_drafts_vacancy_id_vacancies_id_fk` FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `application_drafts` ADD CONSTRAINT `application_drafts_application_id_applications_id_fk` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_vacancy_id_vacancies_id_fk` FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD CONSTRAINT `candidate_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_contacts` ADD CONSTRAINT `company_contacts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monitoring_schedules` ADD CONSTRAINT `monitoring_schedules_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vacancies` ADD CONSTRAINT `vacancies_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `draft_user_status_idx` ON `application_drafts` (`user_id`,`approval_status`);--> statement-breakpoint
CREATE INDEX `draft_vacancy_idx` ON `application_drafts` (`vacancy_id`);--> statement-breakpoint
CREATE INDEX `application_user_idx` ON `applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `company_contact_company_idx` ON `company_contacts` (`company_id`);--> statement-breakpoint
CREATE INDEX `monitoring_run_started_idx` ON `monitoring_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `vacancy_company_idx` ON `vacancies` (`company_id`);--> statement-breakpoint
CREATE INDEX `vacancy_score_idx` ON `vacancies` (`match_score`);--> statement-breakpoint
CREATE INDEX `vacancy_location_idx` ON `vacancies` (`location`);