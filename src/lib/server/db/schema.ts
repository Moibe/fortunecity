import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ── Deuda ──────────────────────────────────────────────────────────────────
// A quién le debo y cuánto. Iremos agregando más campos después.
export const deudas = sqliteTable('deudas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(), // a quién le debo
	monto: real('monto').notNull(), // cantidad que debo
	creado: integer('creado', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ── Pago ───────────────────────────────────────────────────────────────────
// Cada Deuda tiene muchos Pagos. `recibo` guardará (después) la ruta/URL de la
// imagen del recibo; por ahora es opcional.
export const pagos = sqliteTable('pagos', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	deudaId: integer('deuda_id')
		.notNull()
		.references(() => deudas.id, { onDelete: 'cascade' }), // si borras la deuda, se borran sus pagos
	fecha: integer('fecha', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	cantidad: real('cantidad').notNull(),
	recibo: text('recibo') // ruta/URL de la imagen del recibo (pendiente)
});

// ── Quincena ─────────────────────────────────────────────────────────────────
// Lo que recibí en una quincena y cómo lo distribuí (Qnc Dist). Se identifica por
// mes + corte (15 = primera quincena, 30 = segunda, aunque el mes tenga 28-31 días)
// + año, para poder comparar la misma quincena a través de los años más adelante.
// Los defaults literales de abajo nunca se usan en la práctica: la app siempre
// manda mes/corte/año explícitos; son solo el valor que exige el ALTER de SQLite.
export const quincenas = sqliteTable('quincenas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	anio: integer('anio').notNull().default(2026),
	mes: integer('mes').notNull().default(1), // 1-12
	corte: integer('corte').notNull().default(15), // 15 o 30
	total: real('total').notNull().default(0), // lo que recibí
	remanenteAnterior: real('remanente_anterior').notNull().default(0), // lo que ya tenía en la cuenta antes de que cayera
	fecha: integer('fecha', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	creado: integer('creado', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ── Entrada ────────────────────────────────────────────────────────────────
// Cada Quincena puede tener varias entradas de dinero (por si hubo más de un
// ingreso: quincena base, bono, etc.). `quincenas.total` guarda la suma, ya
// calculada, para no tener que sumar en cada consulta.
export const entradas = sqliteTable('entradas', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	quincenaId: integer('quincena_id')
		.notNull()
		.references(() => quincenas.id, { onDelete: 'cascade' }),
	nombre: text('nombre').notNull().default(''), // ej. "Salario", "Bono" — opcional
	monto: real('monto').notNull().default(0)
});

// ── Renglón de distribución ──────────────────────────────────────────────────
// Cada Quincena tiene muchos renglones (en qué proyecto va cuánto). Si el renglón
// es un pago de deuda, `deudaId` apunta a la Deuda correspondiente (opcional).
export const renglones = sqliteTable('renglones', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	quincenaId: integer('quincena_id')
		.notNull()
		.references(() => quincenas.id, { onDelete: 'cascade' }),
	nombre: text('nombre').notNull().default(''), // proyecto / concepto
	tipo: text('tipo').notNull().default(''), // categoría del gasto — abierto por ahora, se acumulará para estadísticas
	monto: real('monto').notNull().default(0),
	notas: text('notas').notNull().default(''), // texto libre, opcional
	pagado: integer('pagado', { mode: 'boolean' }).notNull().default(false),
	deudaId: integer('deuda_id').references(() => deudas.id, { onDelete: 'set null' }) // si es pago de deuda
});

// ── Catálogo de Tipos ─────────────────────────────────────────────────────────
// Presets del dropdown de "Tipo" en Qnc Dist. Empieza con lo que capture el
// usuario vía la estrellita (agregar al catálogo); no se borra desde la app.
export const tiposPreset = sqliteTable('tipos_preset', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	icono: text('icono'), // key de un set curado de íconos (lucide), ej. 'banknote'. Opcional.
	creado: integer('creado', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ── Catálogo de nombres de Entrada ────────────────────────────────────────────
// Presets del dropdown de "nombre" en cada Entrada de Qnc Dist (ej. "Salario",
// "Principal", "Bono"). Mismo mecanismo que tiposPreset, pero sin ícono.
export const entradasPreset = sqliteTable('entradas_preset', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	creado: integer('creado', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// ── Relaciones (query API de Drizzle) ────────────────────────────────────────
export const deudasRelations = relations(deudas, ({ many }) => ({
	pagos: many(pagos)
}));

export const pagosRelations = relations(pagos, ({ one }) => ({
	deuda: one(deudas, {
		fields: [pagos.deudaId],
		references: [deudas.id]
	})
}));

export const quincenasRelations = relations(quincenas, ({ many }) => ({
	renglones: many(renglones),
	entradas: many(entradas)
}));

export const entradasRelations = relations(entradas, ({ one }) => ({
	quincena: one(quincenas, {
		fields: [entradas.quincenaId],
		references: [quincenas.id]
	})
}));

export const renglonesRelations = relations(renglones, ({ one }) => ({
	quincena: one(quincenas, {
		fields: [renglones.quincenaId],
		references: [quincenas.id]
	}),
	deuda: one(deudas, {
		fields: [renglones.deudaId],
		references: [deudas.id]
	})
}));

// ── Tipos inferidos (úsalos en tu código server) ────────────────────────────
export type Deuda = typeof deudas.$inferSelect;
export type NuevaDeuda = typeof deudas.$inferInsert;
export type Pago = typeof pagos.$inferSelect;
export type NuevoPago = typeof pagos.$inferInsert;
export type Quincena = typeof quincenas.$inferSelect;
export type NuevaQuincena = typeof quincenas.$inferInsert;
export type Renglon = typeof renglones.$inferSelect;
export type NuevoRenglon = typeof renglones.$inferInsert;
export type TipoPreset = typeof tiposPreset.$inferSelect;
export type NuevoTipoPreset = typeof tiposPreset.$inferInsert;
export type Entrada = typeof entradas.$inferSelect;
export type NuevaEntrada = typeof entradas.$inferInsert;
export type EntradaPreset = typeof entradasPreset.$inferSelect;
export type NuevaEntradaPreset = typeof entradasPreset.$inferInsert;
