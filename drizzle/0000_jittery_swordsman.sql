CREATE TABLE `deudas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`monto` real NOT NULL,
	`creado` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pagos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deuda_id` integer NOT NULL,
	`fecha` integer NOT NULL,
	`cantidad` real NOT NULL,
	`recibo` text,
	FOREIGN KEY (`deuda_id`) REFERENCES `deudas`(`id`) ON UPDATE no action ON DELETE cascade
);
