import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, verificarSesion } from '$lib/server/sesion';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { usuarios } from '$lib/server/db/schema';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Assets construidos por SvelteKit (JS/CSS/imágenes importadas) — sin
	// esto, /login mismo no podría cargar su propio bundle (quedaría
	// atrapado detrás del guard de abajo antes de poder mostrarse).
	if (pathname.startsWith('/_app/')) {
		return resolve(event);
	}

	const valor = event.cookies.get(SESSION_COOKIE);
	const sesion = valor ? verificarSesion(valor) : null;

	// La firma solo prueba que la cookie no fue alterada, no que la cuenta
	// siga viva -- por eso se revisa contra la DB en cada request: si el
	// admin desactivó al usuario o subió su tokenVersion (revocar sesión),
	// la cookie deja de servir de inmediato aunque la firma sea válida.
	let usuario = null;
	if (sesion) {
		const fila = await db.query.usuarios.findFirst({
			where: eq(usuarios.id, sesion.id),
			columns: { activo: true, tokenVersion: true }
		});
		if (fila && fila.activo && fila.tokenVersion === sesion.tokenVersion) {
			usuario = sesion;
		}
	}
	event.locals.usuario = usuario;

	if (!usuario && pathname !== '/login') {
		redirect(307, '/login');
	}
	if (usuario && pathname === '/login') {
		redirect(307, '/');
	}

	return resolve(event);
};
