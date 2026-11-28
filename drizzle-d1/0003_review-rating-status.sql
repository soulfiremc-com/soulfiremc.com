ALTER TABLE `review` ADD `rating_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
CREATE INDEX `review_rating_status_idx` ON `review` (`rating_status`);