ALTER TABLE `payments` ADD `source_type` text NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `products` ADD `category_id` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `origin_type` text NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `products` ADD `is_placeholder` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `products`
SET `category_id` = (
  SELECT `p`.`category_id`
  FROM `payments` `p`
  WHERE `p`.`id` = `products`.`payment_id`
)
WHERE `category_id` IS NULL;--> statement-breakpoint
UPDATE `payments`
SET `source_type` = 'receipt'
WHERE `receipt_photo_link` IS NOT NULL
  AND trim(`receipt_photo_link`) <> '';--> statement-breakpoint
UPDATE `products`
SET `origin_type` = 'receipt'
WHERE EXISTS (
  SELECT 1
  FROM `payments` `p`
  WHERE `p`.`id` = `products`.`payment_id`
    AND `p`.`receipt_photo_link` IS NOT NULL
    AND trim(`p`.`receipt_photo_link`) <> ''
);--> statement-breakpoint
CREATE INDEX `payments_user_timed_idx` ON `payments` (`user_id`,`timed_at`);--> statement-breakpoint
CREATE INDEX `products_payment_idx` ON `products` (`payment_id`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_category_payment_idx` ON `products` (`category_id`,`payment_id`);
