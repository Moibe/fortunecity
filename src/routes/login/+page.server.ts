import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { usuarios } from '$lib/server/db/schema';
import { firmarSesion, SESSION_COOKIE } from '$lib/server/sesion';
import { dev } from '$app/environment';
import type { Actions } from './$types';

// La redirección "ya tienes sesión, no muestres /login" vive en
// hooks.server.ts (una sola fuente de verdad) -- acá solo el canje del
// código de acceso.
export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const datos = await request.formData();
		const codigo = String(datos.get('codigo') ?? '').trim();
		if (!codigo) {
			return fail(400, { error: 'Escribe tu código de acceso.' });
		}

		const usuario = await db.query.usuarios.findFirst({
			where: eq(usuarios.codigoAcceso, codigo)
		});

		if (!usuario || !usuario.activo) {
			return fail(401, { error: 'Código de acceso inválido.' });
		}

		cookies.set(
			SESSION_COOKIE,
			firmarSesion({ id: usuario.id, nombre: usuario.nombre, tokenVersion: usuario.tokenVersion }),
			{
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 365 // 1 año -- app personal para gente conocida
			}
		);
		redirect(307, '/');
	}
};
