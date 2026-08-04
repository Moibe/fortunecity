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

// Date (UTC) -> "YYYY-MM-DD" para el <input type="date"> al editar (mismo UTC
// que formatoFecha, por la misma razón).
function fechaAInput(d: Date): string {
	const y = d.getUTCFullYear();
	const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${mes}-${day}`;
}

const MAX_EVIDENCIA_BYTES = 8 * 1024 * 1024; // 8MB, alcanza sobrado para una foto de recibo

// Lee un <input type="file"> del formulario y lo convierte a data URI base64
// -sin archivos en disco que haya que hacer sobrevivir a cada deploy del
// droplet-. `valor: null` significa "no se adjuntó nada" (no es un error).
async function leerEvidencia(
	archivo: FormDataEntryValue | null
): Promise<{ ok: true; valor: string | null } | { ok: false; error: string }> {
	if (!(archivo instanceof File) || archivo.size === 0) return { ok: true, valor: null };
	if (archivo.size > MAX_EVIDENCIA_BYTES) return { ok: false, error: 'La evidencia pesa demasiado (máx 8MB)' };
	const base64 = Buffer.from(await archivo.arrayBuffer()).toString('base64');
	return { ok: true, valor: `data:${archivo.type};base64,${base64}` };
}

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
		.map((p) => ({
			id: p.id,
			cantidad: p.cantidad,
			fechaTexto: formatoFecha(p.fecha),
			fechaISO: fechaAInput(p.fecha),
			evidencia: p.recibo
		}));

	// Navegación en loop entre deudores, mismo orden (alfabético) que la lista
	// de /pagos. Con una sola deuda, anterior/siguiente quedan en null (no hay
	// a dónde ir).
	const todasLasDeudas = await db.query.deudas.findMany({
		columns: { id: true },
		orderBy: (d, { asc }) => [asc(d.nombre)]
	});
	const idx = todasLasDeudas.findIndex((d) => d.id === id);
	const hayMasDeUna = todasLasDeudas.length > 1 && idx !== -1;
	const anteriorId = hayMasDeUna
		? todasLasDeudas[(idx - 1 + todasLasDeudas.length) % todasLasDeudas.length].id
		: null;
	const siguienteId = hayMasDeUna ? todasLasDeudas[(idx + 1) % todasLasDeudas.length].id : null;

	return {
		deuda: { id: deuda.id, nombre: deuda.nombre, monto: deuda.monto },
		pagos: listaPagos,
		anteriorId,
		siguienteId
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

		// Evidencia (foto del recibo): opcional al crear el pago.
		const resultado = await leerEvidencia(form.get('evidencia'));
		if (!resultado.ok) return fail(400, { error: resultado.error });

		db.insert(pagos).values({ deudaId, cantidad, fecha, recibo: resultado.valor }).run();
		return { success: true };
	},

	borrarPago: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'id inválido' });

		db.delete(pagos).where(eq(pagos.id, id)).run();
		return { success: true };
	},

	// Edita la fecha y/o la cantidad de un pago ya registrado.
	editarPago: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'id inválido' });

		const cantidad = Number(form.get('cantidad')) || 0;
		if (cantidad <= 0) return fail(400, { error: 'cantidad inválida' });
		const fecha = parseFecha(String(form.get('fecha') ?? ''));

		db.update(pagos).set({ cantidad, fecha }).where(eq(pagos.id, id)).run();
		return { success: true };
	},

	// Agrega (o reemplaza) la evidencia de un pago que ya existía sin una.
	agregarEvidencia: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) return fail(400, { error: 'id inválido' });

		const resultado = await leerEvidencia(form.get('evidencia'));
		if (!resultado.ok) return fail(400, { error: resultado.error });
		if (!resultado.valor) return fail(400, { error: 'evidencia vacía' });

		db.update(pagos).set({ recibo: resultado.valor }).where(eq(pagos.id, id)).run();
		return { success: true };
	}
};
