import { randomBytes } from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

// El dueño: id=1 por construcción (el primer usuario creado, vía el script
// de seed) -- misma regla que en el proyecto de nutrición, sin columna de rol.
const ADMIN_ID = 1;

function generarCodigo(): string {
	return randomBytes(8).toString('base64url');
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.usuario?.id !== ADMIN_ID) redirect(307, '/');

	const lista = await db.query.usuarios.findMany({
		orderBy: (u, { asc }) => [asc(u.id)]
	});
	return {
		usuarios: lista.map((u) => ({
			id: u.id,
			nombre: u.nombre,
			activo: u.activo,
			creado: u.creado
		}))
	};
};

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		if (locals.usuario?.id !== ADMIN_ID) redirect(307, '/');
		const datos = await request.formData();
		const nombre = String(datos.get('nombre') ?? '').trim();
		if (!nombre) return fail(400, { error: 'Escribe un nombre.' });
		// Código opcional: si el admin escribió uno (para que sea memorable), se
		// usa tal cual; si lo dejó vacío, se genera uno aleatorio.
		const codigo = String(datos.get('codigo') ?? '').trim() || generarCodigo();

		try {
			db.insert(usuarios).values({ nombre, codigoAcceso: codigo }).run();
		} catch {
			return fail(409, { error: 'Ese código de acceso ya está en uso.' });
		}
		return { creado: true, nombreCreado: nombre, codigoCreado: codigo };
	},

	activar: async ({ request, locals }) => {
		if (locals.usuario?.id !== ADMIN_ID) redirect(307, '/');
		const id = Number((await request.formData()).get('id'));
		db.update(usuarios).set({ activo: true }).where(eq(usuarios.id, id)).run();
	},

	desactivar: async ({ request, locals }) => {
		if (locals.usuario?.id !== ADMIN_ID) redirect(307, '/');
		const id = Number((await request.formData()).get('id'));
		// Desactivar al propio admin (id=1) se rechaza -- nadie más podría
		// reactivarlo (es el único admin que existe).
		if (id === ADMIN_ID) return fail(409, { error: 'No puedes desactivar al administrador.' });
		db.update(usuarios).set({ activo: false }).where(eq(usuarios.id, id)).run();
	},

	regenerar: async ({ request, locals }) => {
		if (locals.usuario?.id !== ADMIN_ID) redirect(307, '/');
		const datos = await request.formData();
		const id = Number(datos.get('id'));
		const nombre = String(datos.get('nombre') ?? '');
		const codigo = String(datos.get('codigo') ?? '').trim() || generarCodigo();

		try {
			db.update(usuarios).set({ codigoAcceso: codigo }).where(eq(usuarios.id, id)).run();
		} catch {
			return fail(409, { error: 'Ese código de acceso ya está en uso.' });
		}
		return { creado: true, nombreCreado: nombre, codigoCreado: codigo };
	},

	revocar: async ({ request, locals }) => {
		if (locals.usuario?.id !== ADMIN_ID) redirect(307, '/');
		const id = Number((await request.formData()).get('id'));
		const actual = await db.query.usuarios.findFirst({ where: eq(usuarios.id, id) });
		if (!actual) return fail(404, { error: 'No existe ese usuario.' });
		db
			.update(usuarios)
			.set({ tokenVersion: actual.tokenVersion + 1 })
			.where(eq(usuarios.id, id))
			.run();
		return { revocado: true };
	}
};
