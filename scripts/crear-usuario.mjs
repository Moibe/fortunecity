// Da de alta un usuario directo en la DB (no hay auto-registro). Uso:
//   node --env-file=.env scripts/crear-usuario.mjs "<nombre>" [codigo]
// Si no se da código, se genera uno aleatorio y se imprime -- es la única vez
// que se muestra (no se guarda hasheado, pero tampoco se vuelve a exponer
// desde la UI de /admin más que al crear/regenerar).
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';

const url = process.env.DATABASE_URL ?? './local.db';
const nombre = process.argv[2];
if (!nombre) {
	console.error('Uso: node --env-file=.env scripts/crear-usuario.mjs "<nombre>" [codigo]');
	process.exit(1);
}
const codigo = process.argv[3] || randomBytes(8).toString('base64url');

const sqlite = new Database(url);
try {
	// `creado` no tiene DEFAULT a nivel SQL (Drizzle lo pone en JS al insertar
	// vía su query builder) -- como este script inserta con SQL crudo, hay que
	// pasarlo a mano. Mismo formato que el resto del schema: unix segundos.
	const creado = Math.floor(Date.now() / 1000);
	const info = sqlite
		.prepare('INSERT INTO usuarios (nombre, codigo_acceso, creado) VALUES (?, ?, ?)')
		.run(nombre, codigo, creado);
	console.log(`Usuario creado: id=${info.lastInsertRowid} nombre=${nombre}`);
	console.log(`Código de acceso: ${codigo}`);
} finally {
	sqlite.close();
}
