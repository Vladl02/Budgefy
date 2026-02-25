ALTER TABLE `categories` RENAME COLUMN "month" TO "month_start";--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);