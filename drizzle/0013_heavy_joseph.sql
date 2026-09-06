CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`codigo_acceso` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`creado` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_codigo_acceso_unique` ON `usuarios` (`codigo_acceso`);