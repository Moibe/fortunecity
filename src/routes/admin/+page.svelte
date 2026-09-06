<script lang="ts">
  // Página de administración de usuarios (solo el dueño, id=1 -- ver
  // +page.server.ts). "Nuevo código" y "Cerrar sesión" son reversibles con un
  // tap más así que disparan directo; "Desactivar" sí pide confirmación
  // inline (misma idea que el modal de confirmar-borrado de Pagos, pero como
  // panel dentro de la fila en vez de modal flotante).
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let confirmandoDesactivar = $state<number | null>(null);
  let enviandoId = $state<number | null>(null);
  let creando = $state(false);

  let codigoInput: HTMLInputElement | undefined = $state();
  let copiado = $state(false);

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      copiado = true;
    } catch {
      codigoInput?.select();
    }
    setTimeout(() => (copiado = false), 2000);
  }

  function fmt(fecha: string | Date) {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>Usuarios · fortunecity</title>
</svelte:head>

<div class="admin">
  <h1>Usuarios</h1>
  <p class="sub">Quién puede entrar a fortunecity. No hay auto-registro — das de alta desde aquí.</p>

  {#if form?.creado}
    <div class="codigo-banner">
      <p>
        Código de acceso para <strong>{form.nombreCreado}</strong> — compártelo, no se vuelve a
        mostrar (si se pierde, usa "Nuevo código"):
      </p>
      <div class="codigo-row">
        <input
          class="codigo-valor"
          type="text"
          readonly
          value={form.codigoCreado}
          bind:this={codigoInput}
          onclick={(e) => e.currentTarget.select()}
        />
        <button type="button" class="copiar-btn" onclick={() => copiarCodigo(form?.codigoCreado ?? '')}>
          {copiado ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  {/if}

  {#if form?.error}
    <p class="error">⚠️ {form.error}</p>
  {/if}

  <div class="lista">
    {#each data.usuarios as u (u.id)}
      <div class="fila">
        <div class="fila-cabeza">
          <div class="fila-info">
            <span class="nombre">
              {u.nombre}
              {#if u.id === 1}<span class="badge admin">admin</span>{/if}
              {#if !u.activo}<span class="badge inactivo">inactivo</span>{/if}
            </span>
            <span class="meta">desde {fmt(u.creado)}</span>
          </div>

          <div class="fila-acciones">
            {#if u.id !== 1}
              {#if u.activo}
                <button
                  type="button"
                  class="accion-btn"
                  onclick={() => (confirmandoDesactivar = u.id)}
                  disabled={enviandoId === u.id}
                >
                  Desactivar
                </button>
              {:else}
                <form
                  method="POST"
                  action="?/activar"
                  use:enhance={() => {
                    enviandoId = u.id;
                    return async ({ update }) => {
                      await update();
                      enviandoId = null;
                    };
                  }}
                >
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" class="accion-btn" disabled={enviandoId === u.id}>
                    {enviandoId === u.id ? '…' : 'Reactivar'}
                  </button>
                </form>
              {/if}
            {/if}

            <form
              method="POST"
              action="?/revocar"
              use:enhance={() => {
                enviandoId = u.id;
                return async ({ update }) => {
                  await update();
                  enviandoId = null;
                };
              }}
            >
              <input type="hidden" name="id" value={u.id} />
              <button
                type="submit"
                class="accion-btn"
                title="Su sesión actual deja de servir; tiene que volver a meter su código."
                disabled={enviandoId === u.id}
              >
                {enviandoId === u.id ? '…' : 'Cerrar sesión'}
              </button>
            </form>

            <form
              method="POST"
              action="?/regenerar"
              use:enhance={() => {
                enviandoId = u.id;
                return async ({ update }) => {
                  await update();
                  enviandoId = null;
                };
              }}
            >
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="nombre" value={u.nombre} />
              <input
                type="text"
                name="codigo"
                placeholder="opcional"
                class="codigo-custom-input"
                disabled={enviandoId === u.id}
                title="Déjalo vacío para uno al azar, o escribe uno memorable"
              />
              <button type="submit" class="accion-btn" disabled={enviandoId === u.id}>
                {enviandoId === u.id ? '…' : 'Nuevo código'}
              </button>
            </form>
          </div>
        </div>

        {#if confirmandoDesactivar === u.id}
          <div class="confirmar-panel">
            <span>¿Desactivar a {u.nombre}? Ya no podrá entrar hasta que lo reactives.</span>
            <div class="confirmar-acciones">
              <button
                type="button"
                class="confirm-cancelar"
                onclick={() => (confirmandoDesactivar = null)}
                disabled={enviandoId === u.id}
              >
                Cancelar
              </button>
              <form
                method="POST"
                action="?/desactivar"
                use:enhance={() => {
                  enviandoId = u.id;
                  return async ({ update }) => {
                    await update();
                    enviandoId = null;
                    confirmandoDesactivar = null;
                  };
                }}
              >
                <input type="hidden" name="id" value={u.id} />
                <button type="submit" class="confirm-peligro" disabled={enviandoId === u.id}>
                  {enviandoId === u.id ? 'Desactivando…' : 'Desactivar'}
                </button>
              </form>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="agregar">
    <h2>Agregar usuario</h2>
    <form
      method="POST"
      action="?/crear"
      use:enhance={() => {
        creando = true;
        return async ({ update }) => {
          await update({ reset: true });
          creando = false;
        };
      }}
    >
      <input type="text" name="nombre" placeholder="Nombre" autocomplete="off" disabled={creando} />
      <input
        type="text"
        name="codigo"
        placeholder="Código (opcional)"
        autocomplete="off"
        disabled={creando}
        title="Déjalo vacío para uno al azar, o escribe uno memorable"
      />
      <button type="submit" disabled={creando}>{creando ? 'Creando…' : 'Agregar'}</button>
    </form>
    <p class="agregar-hint">
      Un código memorable es más cómodo, pero también más fácil de adivinar que uno al azar — bien
      para unas cuantas personas de confianza.
    </p>
  </div>
</div>

<style>
  .admin {
    max-width: 700px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 1rem;
    color: rgba(255, 255, 255, 0.95);
  }

  h1 {
    margin: 0 0 0.3rem;
    font-size: 1.3rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.98);
  }

  .sub {
    margin: 0 0 1.25rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.92rem;
  }

  .codigo-banner {
    background: rgba(134, 239, 172, 0.14);
    border: 1px solid rgba(134, 239, 172, 0.4);
    border-radius: 10px;
    padding: 0.9rem 1rem;
    margin-bottom: 1.2rem;
  }

  .codigo-banner p {
    margin: 0 0 0.6rem;
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.92);
  }

  .codigo-row {
    display: flex;
    gap: 0.5rem;
  }

  .codigo-valor {
    flex: 1;
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 0.85rem;
    padding: 0.5rem 0.7rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
  }

  .copiar-btn {
    padding: 0.5rem 0.9rem;
    border-radius: 8px;
    border: 1px solid rgba(134, 239, 172, 0.4);
    background: rgba(134, 239, 172, 0.16);
    color: #86efac;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .copiar-btn:hover {
    background: rgba(134, 239, 172, 0.28);
    color: #fff;
  }

  .error {
    background: rgba(239, 68, 68, 0.16);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #ff8585;
    border-radius: 10px;
    padding: 0.6rem 0.85rem;
    font-size: 0.88rem;
    margin: 0 0 1rem;
  }

  .lista {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1.8rem;
  }

  .fila {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
  }

  .fila-cabeza {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .fila-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .nombre {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 600;
    color: #fff;
  }

  .meta {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .badge {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
  }

  .badge.admin {
    color: #064e2b;
    background: #86efac;
  }

  .badge.inactivo {
    color: #ff8585;
    background: rgba(239, 68, 68, 0.16);
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .fila-acciones {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .fila-acciones form {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .accion-btn {
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.85);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .accion-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.28);
    color: #fff;
  }

  .accion-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mismo patrón visual que .confirm-cancelar/.confirm-peligro de la página
     de detalle de Pagos, aquí como panel inline en vez de modal flotante. */
  .confirmar-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.6rem;
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .confirmar-acciones {
    display: flex;
    gap: 0.5rem;
  }

  .confirm-cancelar,
  .confirm-peligro {
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .confirm-cancelar {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: transparent;
    color: rgba(255, 255, 255, 0.75);
  }

  .confirm-cancelar:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }

  .confirm-peligro {
    border: 1px solid rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.16);
    color: #ff8585;
  }

  .confirm-peligro:hover {
    background: rgba(239, 68, 68, 0.28);
    color: #fff;
  }

  .confirm-cancelar:disabled,
  .confirm-peligro:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .agregar {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    padding: 1rem;
  }

  .agregar h2 {
    margin: 0 0 0.7rem;
    font-size: 1rem;
    color: #fff;
  }

  .agregar form {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .agregar input {
    flex: 1;
    min-width: 140px;
    padding: 0.6rem 0.85rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
    font: inherit;
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .agregar input:focus {
    outline: none;
    border-color: rgba(134, 239, 172, 0.55);
  }

  .agregar button {
    padding: 0.6rem 1.1rem;
    border-radius: 8px;
    border: 1px solid rgba(134, 239, 172, 0.4);
    background: rgba(134, 239, 172, 0.14);
    color: #86efac;
    font: inherit;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .agregar button:hover:not(:disabled) {
    background: rgba(134, 239, 172, 0.24);
    color: #fff;
  }

  .agregar button:disabled,
  .agregar input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .agregar-hint {
    margin: 0.6rem 0 0;
    font-size: 0.76rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .codigo-custom-input {
    width: 92px;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
    font: inherit;
    font-size: 0.78rem;
  }

  .codigo-custom-input:focus {
    outline: none;
    border-color: rgba(134, 239, 172, 0.55);
  }

  .codigo-custom-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
