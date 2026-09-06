CREATE TABLE `entradas_frecuentes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`monto` real DEFAULT 0 NOT NULL,
	`creado` integer NOT NULL
);
