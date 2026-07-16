CREATE TABLE `quincenas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`fecha` integer NOT NULL,
	`creado` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `renglones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quincena_id` integer NOT NULL,
	`nombre` text DEFAULT '' NOT NULL,
	`monto` real DEFAULT 0 NOT NULL,
	`deuda_id` integer,
	FOREIGN KEY (`quincena_id`) REFERENCES `quincenas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deuda_id`) REFERENCES `deudas`(`id`) ON UPDATE no action ON DELETE set null
);
