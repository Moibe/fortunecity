import { db } from '$lib/server/db';
import { deudas } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Lista de deudas (un cuadrito por cada una). Por ahora el monto no se
// captura desde la UI (siempre se guarda en 0 al crear); se agregará después.
export const load: PageServerLoad = async () => {
	const lista = await db.query.deudas.findMany({
		orderBy: (d, { asc }) => [asc(d.nombre)]
	});
	return {
		deudas: lista.map((d) => ({ id: d.id, nombre: d.nombre, monto: d.monto }))
	};
};

export const actions: Actions = {
	agregarDeuda: async ({ request }) => {
		const form = await request.formData();
		const nombre = String(form.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'nombre vacío' });

		const res = db.insert(deudas).values({ nombre, monto: 0 }).run();
		return { success: true, id: Number(res.lastInsertRowid), nombre };
	}
};
