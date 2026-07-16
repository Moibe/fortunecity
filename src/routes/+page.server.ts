import { db } from '$lib/server/db';
import { quincenas, renglones, entradas, tiposPreset, entradasPreset } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Carga la quincena más reciente con sus renglones/entradas, y los catálogos
// de Tipos y de nombres de Entrada.
export const load: PageServerLoad = async () => {
	const quincena = await db.query.quincenas.findFirst({
		orderBy: (q, { desc }) => [desc(q.id)],
		with: { renglones: true, entradas: true }
	});
	const tipos = await db.query.tiposPreset.findMany({
		orderBy: (t, { asc }) => [asc(t.nombre)]
	});
	const nombresEntrada = await db.query.entradasPreset.findMany({
		orderBy: (e, { asc }) => [asc(e.nombre)]
	});
	return {
		quincena: quincena ?? null,
		tiposPreset: tipos.map((t) => ({ nombre: t.nombre, icono: t.icono })),
		entradaNombresPreset: nombresEntrada.map((e) => e.nombre)
	};
};

type PayloadRenglon = {
	nombre: string;
	tipo: string;
	monto: number;
	notas: string;
	pagado: boolean;
	deudaId: number | null;
};
type Payload = {
	id: number | null;
	entradas: { nombre: string; monto: number }[];
	remanenteAnterior: number;
	anio: number;
	mes: number;
	corte: number;
	renglones: PayloadRenglon[];
};

export const actions: Actions = {
	guardar: async ({ request }) => {
		const form = await request.formData();
		const raw = form.get('payload');
		if (typeof raw !== 'string') return fail(400, { error: 'payload faltante' });

		let data: Payload;
		try {
			data = JSON.parse(raw);
		} catch {
			return fail(400, { error: 'payload inválido' });
		}

		const entradaRows = (data.entradas ?? []).map((e) => ({
			nombre: (e.nombre ?? '').trim(),
			monto: Number(e.monto) || 0
		}));
		const total = entradaRows.reduce((s, e) => s + e.monto, 0);
		const remanenteAnterior = Number(data.remanenteAnterior) || 0;
		const mes = Math.min(12, Math.max(1, Number(data.mes) || 1));
		const corte = Number(data.corte) === 30 ? 30 : 15; // solo 15 o 30 son válidos
		const anio = Number(data.anio) || new Date().getFullYear();

		// Solo renglones con algo capturado (nombre o monto).
		const rows = (data.renglones ?? [])
			.map((r) => ({
				nombre: (r.nombre ?? '').trim(),
				tipo: (r.tipo ?? '').trim(),
				monto: Number(r.monto) || 0,
				notas: (r.notas ?? '').trim(),
				pagado: Boolean(r.pagado),
				deudaId: r.deudaId ?? null
			}))
			.filter((r) => r.nombre !== '' || r.tipo !== '' || r.monto !== 0 || r.notas !== '');

		// Todo en una transacción: upsert quincena + reemplazo de sus renglones.
		const savedId = db.transaction((tx) => {
			let qId = data.id;
			if (qId) {
				tx.update(quincenas)
					.set({ total, remanenteAnterior, anio, mes, corte })
					.where(eq(quincenas.id, qId))
					.run();
				tx.delete(renglones).where(eq(renglones.quincenaId, qId)).run();
				tx.delete(entradas).where(eq(entradas.quincenaId, qId)).run();
			} else {
				const res = tx.insert(quincenas).values({ total, remanenteAnterior, anio, mes, corte }).run();
				qId = Number(res.lastInsertRowid);
			}
			if (rows.length > 0) {
				tx.insert(renglones)
					.values(rows.map((r) => ({ ...r, quincenaId: qId as number })))
					.run();
			}
			if (entradaRows.length > 0) {
				tx.insert(entradas)
					.values(entradaRows.map((e) => ({ ...e, quincenaId: qId as number })))
					.run();
			}
			return qId as number;
		});

		return { success: true, id: savedId };
	},

	// Agrega un Tipo nuevo al catálogo, o le completa el ícono a uno que ya
	// existe pero no tenía (la estrellita / selector de ícono en la UI).
	agregarTipo: async ({ request }) => {
		const form = await request.formData();
		const nombre = String(form.get('nombre') ?? '').trim();
		const iconoRaw = form.get('icono');
		const icono = typeof iconoRaw === 'string' && iconoRaw.trim() !== '' ? iconoRaw.trim() : null;
		if (!nombre) return fail(400, { error: 'nombre vacío' });

		const existentes = await db.query.tiposPreset.findMany();
		const existente = existentes.find((t) => t.nombre.toLowerCase() === nombre.toLowerCase());
		if (existente) {
			if (icono) db.update(tiposPreset).set({ icono }).where(eq(tiposPreset.id, existente.id)).run();
		} else {
			db.insert(tiposPreset).values({ nombre, icono }).run();
		}

		return { success: true, nombre, icono };
	},

	// Agrega un nombre de Entrada nuevo al catálogo (la estrellita del combobox).
	agregarNombreEntrada: async ({ request }) => {
		const form = await request.formData();
		const nombre = String(form.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'nombre vacío' });

		const existentes = await db.query.entradasPreset.findMany();
		const yaExiste = existentes.some((e) => e.nombre.toLowerCase() === nombre.toLowerCase());
		if (!yaExiste) {
			db.insert(entradasPreset).values({ nombre }).run();
		}

		return { success: true, nombre };
	},

	// Borra un Tipo del catálogo (no afecta a los renglones que ya lo usan:
	// `tipo` es texto libre, no una referencia a tiposPreset).
	borrarTipo: async ({ request }) => {
		const form = await request.formData();
		const nombre = String(form.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'nombre vacío' });

		const existentes = await db.query.tiposPreset.findMany();
		const existente = existentes.find((t) => t.nombre.toLowerCase() === nombre.toLowerCase());
		if (existente) {
			db.delete(tiposPreset).where(eq(tiposPreset.id, existente.id)).run();
		}

		return { success: true, nombre };
	},

	// Borra un nombre de Entrada del catálogo (no afecta a las entradas ya guardadas).
	borrarNombreEntrada: async ({ request }) => {
		const form = await request.formData();
		const nombre = String(form.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'nombre vacío' });

		const existentes = await db.query.entradasPreset.findMany();
		const existente = existentes.find((e) => e.nombre.toLowerCase() === nombre.toLowerCase());
		if (existente) {
			db.delete(entradasPreset).where(eq(entradasPreset.id, existente.id)).run();
		}

		return { success: true, nombre };
	}
};
