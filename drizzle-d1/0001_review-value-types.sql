PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_review` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_type` text NOT NULL,
	`item_slug` text NOT NULL,
	`rating` integer DEFAULT 5 NOT NULL,
	`body` text,
	`comment_status` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "review_item_type_check" CHECK("__new_review"."item_type" IN ('account', 'proxy', 'resource')),
	CONSTRAINT "review_comment_status_check" CHECK("__new_review"."comment_status" IN ('approved', 'pending', 'rejected')),
	CONSTRAINT "review_rating_range" CHECK(typeof("__new_review"."rating") = 'integer' AND "__new_review"."rating" >= 1 AND "__new_review"."rating" <= 5)
);
--> statement-breakpoint
INSERT INTO `__new_review`("id", "user_id", "item_type", "item_slug", "rating", "body", "comment_status", "created_at", "updated_at") SELECT "id", "user_id", "item_type", "item_slug", "rating", "body", "comment_status", "created_at", "updated_at" FROM `review`;--> statement-breakpoint
DROP TABLE `review`;--> statement-breakpoint
ALTER TABLE `__new_review` RENAME TO `review`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `review_user_item_unique` ON `review` (`user_id`,`item_type`,`item_slug`);--> statement-breakpoint
CREATE INDEX `review_item_idx` ON `review` (`item_type`,`item_slug`);--> statement-breakpoint
CREATE INDEX `review_item_created_idx` ON `review` (`item_type`,`item_slug`,`created_at`);--> statement-breakpoint
CREATE INDEX `review_comment_status_idx` ON `review` (`comment_status`);--> statement-breakpoint
CREATE TABLE `__new_review_item_owner` (
	`item_type` text NOT NULL,
	`item_slug` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`item_type`, `item_slug`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "review_item_owner_type_check" CHECK("__new_review_item_owner"."item_type" IN ('account', 'proxy', 'resource'))
);
--> statement-breakpoint
INSERT INTO `__new_review_item_owner`("item_type", "item_slug", "user_id", "created_at") SELECT "item_type", "item_slug", "user_id", "created_at" FROM `review_item_owner`;--> statement-breakpoint
DROP TABLE `review_item_owner`;--> statement-breakpoint
ALTER TABLE `__new_review_item_owner` RENAME TO `review_item_owner`;--> statement-breakpoint
CREATE INDEX `review_item_owner_user_idx` ON `review_item_owner` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_review_reply` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `review`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_review_reply`("id", "review_id", "user_id", "body", "created_at", "updated_at") SELECT "id", "review_id", "user_id", "body", "created_at", "updated_at" FROM `review_reply`;--> statement-breakpoint
DROP TABLE `review_reply`;--> statement-breakpoint
ALTER TABLE `__new_review_reply` RENAME TO `review_reply`;--> statement-breakpoint
CREATE UNIQUE INDEX `review_reply_review_unique` ON `review_reply` (`review_id`);--> statement-breakpoint
CREATE INDEX `review_reply_user_idx` ON `review_reply` (`user_id`);