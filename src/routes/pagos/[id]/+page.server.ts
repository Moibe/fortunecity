import { db } from '$lib/server/db';
import { pagos } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// "YYYY-MM-DD" (de <input type="date">) -> Date, fijo a medianoche UTC (no hora
// local del server): son fechas de calendario puras, ver la nota en la página
// de Distribución (+page.server.ts) sobre por qué esto evita que el día se corra.
function parseFecha(v: string | null | undefined): Date {
	if (!v) return new Date();
	const d = new Date(`${v}T00:00:00Z`);
	return Number.isNaN(d.getTime()) ? new Date() : d;
}

// Date (UTC) -> "DD/MM/AAAA" para mostrar. Se lee en UTC por la misma razón:
// evita que la fecha se corra un día si el server y el navegador no comparten
// zona horaria.
function formatoFecha(d: Date): string {
	const day = String(d.getUTCDate()).padStart(2, '0');
	const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
	const anio = d.getUTCFullYear();
	return `${day}/${mes}/${anio}`;
}

const MAX_EVIDENCIA_BYTES = 8 * 1024 * 1024; // 8MB, alcanza sobrado para una foto de recibo

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(404, 'Deuda no encontrada');

	const deuda = await db.query.deudas.findFirst({
		where: (d, { eq }) => eq(d.id, id),
		with: { pagos: true }
	});
	if (!deuda) error(404, 'Deuda no encontrada');

	const listaPagos = [...deuda.pagos]
		.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
		.map((p) => ({ id: p.id, cantidad: p.cantidad, fechaTexto: formatoFecha(p.fecha), evidencia: p.recibo }));

	return {
		deuda: { id: deuda.id, nombre: deuda.nombre, monto: deuda.monto },
		pagos: listaPagos
	};
};

export const actions: Actions = {
	agregarPago: async ({ request, params }) => {
		const deudaId = Number(params.id);
		if (!Number.isInteger(deudaId)) return fail(400, { error: 'deuda inválida' });

		const form = await request.formData();
		const cantidad = Number(form.get('cantidad')) || 0;
		const fecha = parseFecha(String(form.get('fecha') ?? ''));
		if (cantidad <= 0) return fail(400, { error: 'cantidad inválida' });

		// Evidencia (foto del recibo): opcional. Se guarda como data URI directo
		// en la columna `recibo` (texto) - nada de archivos en disco que haya
		// que hacer sobrevivir a cada deploy del droplet.
		const archivo = form.get('evidencia');
		let evidencia: string | null = null;
		if (archivo instanceof File && archivo.size > 0) {
			if (archivo.size > MAX_EVIDENCIA_BYTES) {
				return fail(400, { error: 'La evidencia pesa demasiado (máx 8MB)' });
			}
			const base64 = Buffer.from(await archivo.arrayBuffer()).toString('base64');
			evidencia = `data:${archivo.type};base64,${base64}`;
		}

		db.insert(pagos).values({ deudaId, cantidad, fecha, recibo: evidencia }).run();
		return { success: true };
	},

	borrarPago: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'id inválido' });

		db.delete(pagos).where(eq(pagos.id, id)).run();
		return { success: true };
	}
};
