CREATE TABLE `shop_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`category_name` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`is_archived` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shop_presets_user_category_name_unique` ON `shop_presets` (`user_id`,`category_name`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `shop_presets_user_category_recency_idx` ON `shop_presets` (`user_id`,`category_name`,`last_used_at`);--> statement-breakpoint
CREATE TABLE `subcategory_presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`category_name` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`is_archived` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subcategory_presets_user_category_name_unique` ON `subcategory_presets` (`user_id`,`category_name`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `subcategory_presets_user_category_recency_idx` ON `subcategory_presets` (`user_id`,`category_name`,`last_used_at`);