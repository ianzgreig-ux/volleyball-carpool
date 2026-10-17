CREATE TABLE `changes` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`direction` text NOT NULL,
	`previous` text NOT NULL,
	`next` text NOT NULL,
	`changed_at` text NOT NULL
);
