CREATE TABLE `entradas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quincena_id` integer NOT NULL,
	`monto` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`quincena_id`) REFERENCES `quincenas`(`id`) ON UPDATE no action ON DELETE cascade
);
