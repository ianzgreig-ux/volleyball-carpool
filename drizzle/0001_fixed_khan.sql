CREATE TABLE `assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`direction` text NOT NULL,
	`family` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `families` (
	`id` integer PRIMARY KEY NOT NULL,
	`child` text NOT NULL,
	`parent` text NOT NULL
);
