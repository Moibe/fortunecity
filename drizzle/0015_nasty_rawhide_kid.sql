CREATE TABLE `renglones_frecuentes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text DEFAULT '' NOT NULL,
	`monto` real DEFAULT 0 NOT NULL,
	`creado` integer NOT NULL
);
