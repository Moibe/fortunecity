<script lang="ts">
  import { enhance } from '$app/forms';
  import { Paperclip, Eye, Calendar, Pencil, Check, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { untrack } from 'svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Data URI de la evidencia que se está mostrando en el modal (null = cerrado).
  let evidenciaAbierta = $state<string | null>(null);

  // Input de archivo con una foto elegida esperando confirmación para
  // reemplazar la evidencia que ya tenía ese pago (null = sin confirmación pendiente).
  let inputEsperandoConfirmacion = $state<HTMLInputElement | null>(null);
  function cancelarReemplazo() {
    if (inputEsperandoConfirmacion) inputEsperandoConfirmacion.value = '';
    inputEsperandoConfirmacion = null;
  }
  function confirmarReemplazo() {
    inputEsperandoConfirmacion?.form?.requestSubmit();
    inputEsperandoConfirmacion = null;
  }

  // El input type=date apenas se monta (justo cuando se activa el modo
  // edición, con el clic en el calendario) abre el selector nativo de una vez,
  // para no necesitar un segundo clic sobre el input.
  function autoAbrirCalendario(node: HTMLInputElement) {
    try {
      node.showPicker?.();
    } catch {
      // Si el navegador lo rechaza (p. ej. sin "user activation"), no pasa
      // nada: el usuario lo abre con un clic normal sobre el input.
    }
  }

  function hoyInput(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let nuevaFecha = $state(hoyInput());
  let nuevaCantidad = $state('');
  let evidenciaInput: HTMLInputElement | undefined = $state();
  let evidenciaAdjunta = $state(false);

  // Edición en línea de fecha/monto de un pago ya registrado (null = ninguno).
  let editandoFechaId = $state<number | null>(null);
  let editandoCantidadId = $state<number | null>(null);
  let fechaEditada = $state('');
  let cantidadEditada = $state('');

  const fmt = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });

  const totalPagado = $derived(data.pagos.reduce((s, p) => s + p.cantidad, 0));

  // Al navegar a otro deudor (flechas), esta misma instancia de componente se
  // reutiliza -SvelteKit no la remonta solo porque cambió el [id]-, así que
  // limpiamos a mano el estado transitorio de UI que quedaría apuntando al
  // deudor/pago anterior (mismo patrón que en la página de Distribución al
  // cambiar de quincena).
  let deudaIdCargada = untrack(() => data.deuda.id);
  $effect(() => {
    if (data.deuda.id === deudaIdCargada) return;
    deudaIdCargada = data.deuda.id;
    evidenciaAbierta = null;
    inputEsperandoConfirmacion = null;
    nuevaFecha = hoyInput();
    nuevaCantidad = '';
    evidenciaAdjunta = false;
    editandoFechaId = null;
    editandoCantidadId = null;
    fechaEditada = '';
    cantidadEditada = '';
  });
</script>

{#if data.anteriorId !== null}
  <a class="deudor-nav deudor-nav-prev" href="/pagos/{data.anteriorId}" aria-label="Deudor anterior" title="Deudor anterior">
    <ChevronLeft size={20} />
  </a>
{/if}
{#if data.siguienteId !== null}
  <a class="deudor-nav deudor-nav-next" href="/pagos/{data.siguienteId}" aria-label="Siguiente deudor" title="Siguiente deudor">
    <ChevronRight size={20} />
  </a>
{/if}

<div class="deuda-detalle">
  <a class="volver" href="/pagos">← Pagos</a>
  <h1>{data.deuda.nombre}</h1>

  <div class="total-pagado">Total pagado: <b>{fmt.format(totalPagado)}</b></div>

  <form
    class="nuevo-pago"
    method="POST"
    action="?/agregarPago"
    enctype="multipart/form-data"
    use:enhance={() => {
      return async ({ result, update }) => {
        await update();
        if (result.type === 'success') {
          nuevaCantidad = '';
          nuevaFecha = hoyInput();
          evidenciaAdjunta = false;
          if (evidenciaInput) evidenciaInput.value = '';
        }
      };
    }}
  >
    <input class="np-fecha" type="date" name="fecha" bind:value={nuevaFecha} />
    <div class="np-monto">
      <span class="cur">$</span>
      <input type="text" inputmode="decimal" name="cantidad" placeholder="0.00" bind:value={nuevaCantidad} />
    </div>
    <label class="np-evidencia" class:adjunta={evidenciaAdjunta} title="Evidencia (foto del recibo)">
      <input
        bind:this={evidenciaInput}
        type="file"
        name="evidencia"
        accept="image/*"
        hidden
        onchange={(e) => (evidenciaAdjunta = !!e.currentTarget.files?.[0])}
      />
      <Paperclip size={14} />
      <span class="np-evidencia-texto">Evidencia</span>
    </label>
    <button type="submit" class="np-add">+ Agregar pago</button>
  </form>

  <ul class="pagos-lista">
    {#each data.pagos as p (p.id)}
      <li>
        <div class="pago-fecha-grupo">
          {#if editandoFechaId === p.id}
            <form
              method="POST"
              action="?/editarPago"
              use:enhance={() => {
                return async ({ result, update }) => {
                  await update();
                  if (result.type === 'success') editandoFechaId = null;
                };
              }}
            >
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="cantidad" value={p.cantidad} />
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="pago-fecha-input"
                type="date"
                name="fecha"
                bind:value={fechaEditada}
                autofocus
                use:autoAbrirCalendario
              />
              <button type="submit" class="pago-edit-confirmar" aria-label="Guardar fecha" title="Guardar fecha">
                <Check size={13} />
              </button>
            </form>
          {:else}
            <span class="pago-fecha">{p.fechaTexto}</span>
            <button
              type="button"
              class="pago-edit-btn"
              onclick={() => {
                editandoFechaId = p.id;
                fechaEditada = p.fechaISO;
              }}
              aria-label="Editar fecha"
              title="Editar fecha"
            >
              <Calendar size={13} />
            </button>
          {/if}
        </div>
        <div class="pago-evidencias">
          <form method="POST" action="?/agregarEvidencia" enctype="multipart/form-data" use:enhance>
            <input type="hidden" name="id" value={p.id} />
            <label class="pago-evidencia pago-evidencia-add" title={p.evidencia ? 'Cambiar evidencia' : 'Agregar evidencia'}>
              <input
                type="file"
                name="evidencia"
                accept="image/*"
                hidden
                onchange={(e) => {
                  if (p.evidencia) {
                    inputEsperandoConfirmacion = e.currentTarget;
                    return;
                  }
                  e.currentTarget.form?.requestSubmit();
                }}
              />
              <Paperclip size={13} />
            </label>
          </form>
          {#if editandoCantidadId !== p.id}
            <button
              type="button"
              class="pago-edit-btn"
              onclick={() => {
                editandoCantidadId = p.id;
                cantidadEditada = String(p.cantidad);
              }}
              aria-label="Editar monto"
              title="Editar monto"
            >
              <Pencil size={13} />
            </button>
          {/if}
        </div>
        <div class="pago-cantidad-grupo">
          {#if editandoCantidadId === p.id}
            <form
              method="POST"
              action="?/editarPago"
              use:enhance={() => {
                return async ({ result, update }) => {
                  await update();
                  if (result.type === 'success') editandoCantidadId = null;
                };
              }}
            >
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="fecha" value={p.fechaISO} />
              <span class="cur">$</span>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="pago-cantidad-input"
                type="text"
                inputmode="decimal"
                name="cantidad"
                bind:value={cantidadEditada}
                autofocus
              />
              <button type="submit" class="pago-edit-confirmar" aria-label="Guardar monto" title="Guardar monto">
                <Check size={13} />
              </button>
            </form>
          {:else}
            <span class="pago-cantidad">{fmt.format(p.cantidad)}</span>
          {/if}
        </div>
        {#if p.evidencia}
          {@const src = p.evidencia}
          <button
            type="button"
            class="pago-evidencia"
            onclick={() => (evidenciaAbierta = src)}
            aria-label="Ver evidencia"
            title="Ver evidencia"
          >
            <Eye size={14} />
          </button>
        {/if}
        <form method="POST" action="?/borrarPago" use:enhance>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" class="del" aria-label="Borrar pago" title="Borrar pago">×</button>
        </form>
      </li>
    {/each}
    {#if data.pagos.length === 0}
      <li class="empty">Todavía no hay pagos registrados.</li>
    {/if}
  </ul>
</div>

{#if evidenciaAbierta}
  <button
    type="button"
    class="evidencia-backdrop"
    onclick={() => (evidenciaAbierta = null)}
    aria-label="Cerrar evidencia"
  ></button>
  <div class="evidencia-modal">
    <button
      type="button"
      class="evidencia-modal-close"
      onclick={() => (evidenciaAbierta = null)}
      aria-label="Cerrar"
    >
      ×
    </button>
    <img src={evidenciaAbierta} alt="Evidencia del pago" />
  </div>
{/if}

{#if inputEsperandoConfirmacion}
  <button type="button" class="confirm-backdrop" onclick={cancelarReemplazo} aria-label="Cancelar"></button>
  <div class="confirm-modal" role="alertdialog" aria-modal="true" aria-label="Confirmar reemplazo de evidencia">
    <p>¿Reemplazar la evidencia que ya tiene este pago?</p>
    <div class="confirm-botones">
      <button type="button" class="confirm-cancelar" onclick={cancelarReemplazo}>Cancelar</button>
      <button type="button" class="confirm-reemplazar" onclick={confirmarReemplazo}>Reemplazar</button>
    </div>
  </div>
{/if}

<style>
  .deuda-detalle {
    max-width: 700px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 1rem;
    color: rgba(255, 255, 255, 0.95);
  }

  /* ── Navegación en loop entre deudores (flechas fijas a los lados) ──────── */
  .deudor-nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid rgba(255, 255, 255, 0.22);
    color: rgba(255, 255, 255, 0.85);
    text-decoration: none;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .deudor-nav:hover {
    background: rgba(134, 239, 172, 0.16);
    border-color: rgba(134, 239, 172, 0.4);
    color: #fff;
  }
  .deudor-nav-prev {
    left: calc(var(--sidebar-width, 240px) + 2.5rem);
  }
  .deudor-nav-next {
    right: 1.5rem;
  }
  @media (max-width: 680px), (max-height: 500px) {
    .deudor-nav {
      width: 36px;
      height: 36px;
    }
    .deudor-nav-prev {
      left: 0.5rem;
    }
    .deudor-nav-next {
      right: 0.5rem;
    }
  }
  .volver {
    display: inline-block;
    margin-bottom: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 0.85rem;
    transition: color 0.15s ease;
  }
  .volver:hover {
    color: #fff;
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.3rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.98);
  }
  .total-pagado {
    margin-bottom: 1.25rem;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
  }
  .total-pagado b {
    color: #86efac;
    font-variant-numeric: tabular-nums;
  }

  .nuevo-pago {
    display: grid;
    grid-template-columns: 140px 1fr auto auto;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .np-fecha {
    color-scheme: dark;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    font-size: 0.85rem;
    color: #fff;
    box-sizing: border-box;
  }
  .np-monto {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.35rem 0.55rem;
  }
  .np-monto .cur {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
  .np-monto input {
    width: 100%;
    background: transparent;
    border: none;
    color: #fff;
    font: inherit;
    font-weight: 600;
    outline: none;
  }
  .np-add {
    padding: 0 1rem;
    border-radius: 8px;
    border: 1px solid rgba(134, 239, 172, 0.4);
    background: rgba(134, 239, 172, 0.14);
    color: #86efac;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .np-add:hover {
    background: rgba(134, 239, 172, 0.24);
    color: #fff;
  }
  .np-evidencia {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 140px;
    flex-shrink: 0;
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.22);
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    padding: 0 0.7rem;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }
  .np-evidencia:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
  .np-evidencia.adjunta {
    border-style: solid;
    border-color: rgba(134, 239, 172, 0.5);
    color: #86efac;
  }
  .np-evidencia-texto {
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pagos-lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pagos-lista li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
  }
  .pago-fecha-grupo {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }
  .pago-fecha-grupo form,
  .pago-cantidad-grupo form {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .pago-cantidad-grupo {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }
  .pago-edit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .pago-edit-btn:hover {
    color: #86efac;
  }
  .pago-fecha-input {
    color-scheme: dark;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    padding: 0.2rem 0.4rem;
    font-size: 0.85rem;
    color: #fff;
  }
  .pago-cantidad-grupo .cur {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
  .pago-cantidad-input {
    width: 90px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    padding: 0.2rem 0.4rem;
    color: #fff;
    font: inherit;
    font-weight: 600;
    text-align: right;
  }
  .pago-edit-confirmar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border: 1px solid rgba(134, 239, 172, 0.4);
    border-radius: 6px;
    background: rgba(134, 239, 172, 0.14);
    color: #86efac;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pago-edit-confirmar:hover {
    background: rgba(134, 239, 172, 0.24);
    color: #fff;
  }
  .pago-evidencias {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .pago-evidencia {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.6);
    opacity: 0.7;
    transition: opacity 0.15s ease, color 0.15s ease;
  }
  button.pago-evidencia {
    cursor: pointer;
  }
  button.pago-evidencia:hover {
    opacity: 1;
    color: #86efac;
  }
  .pago-evidencia-add {
    border: 1px dashed rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    cursor: pointer;
  }
  .pago-evidencia-add:hover {
    opacity: 1;
    color: #fff;
    border-color: rgba(134, 239, 172, 0.5);
  }
  .pago-fecha {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
  }
  .pago-cantidad {
    color: #fff;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .pagos-lista .del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: rgba(255, 255, 255, 0.35);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pagos-lista .del:hover {
    background: rgba(239, 68, 68, 0.16);
    color: #ff8585;
  }
  .empty {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    padding: 0.5rem 0.6rem;
  }

  /* ── Modal de evidencia (ver la foto sin salir de la página) ────────────── */
  .evidencia-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: none;
    padding: 0;
    margin: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    cursor: pointer;
  }
  .evidencia-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 41;
    max-width: min(90vw, 560px);
    max-height: 85vh;
    display: flex;
  }
  .evidencia-modal img {
    max-width: 100%;
    max-height: 85vh;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    object-fit: contain;
  }
  .evidencia-modal-close {
    position: absolute;
    top: -14px;
    right: -14px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: #0d3a1f;
    color: #fff;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .evidencia-modal-close:hover {
    background: rgba(239, 68, 68, 0.35);
  }

  /* ── Modal de confirmación (reemplazar evidencia) ───────────────────────── */
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    border: none;
    padding: 0;
    margin: 0;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    cursor: pointer;
  }
  .confirm-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: min(90vw, 340px);
    box-sizing: border-box;
    padding: 1.25rem;
    background: #0d3a1f;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    color: #fff;
  }
  .confirm-modal p {
    margin: 0 0 1.1rem;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.9);
  }
  .confirm-botones {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }
  .confirm-cancelar,
  .confirm-reemplazar {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font: inherit;
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
  .confirm-reemplazar {
    border: 1px solid rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.16);
    color: #ff8585;
  }
  .confirm-reemplazar:hover {
    background: rgba(239, 68, 68, 0.28);
    color: #fff;
  }
</style>
