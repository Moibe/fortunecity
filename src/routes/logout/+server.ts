import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/sesion';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(307, '/login');
};
