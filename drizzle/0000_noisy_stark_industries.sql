CREATE TABLE `signups` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`parent` text NOT NULL,
	`direction` text NOT NULL,
	`role` text NOT NULL,
	`seats` integer NOT NULL,
	`note` text NOT NULL
);
