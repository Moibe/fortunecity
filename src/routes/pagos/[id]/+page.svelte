<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function hoyInput(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let nuevaFecha = $state(hoyInput());
  let nuevaCantidad = $state('');

  const fmt = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });

  const totalPagado = $derived(data.pagos.reduce((s, p) => s + p.cantidad, 0));
</script>

<div class="deuda-detalle">
  <a class="volver" href="/pagos">← Pagos</a>
  <h1>{data.deuda.nombre}</h1>

  <div class="total-pagado">Total pagado: <b>{fmt.format(totalPagado)}</b></div>

  <form
    class="nuevo-pago"
    method="POST"
    action="?/agregarPago"
    use:enhance={() => {
      return async ({ result, update }) => {
        await update();
        if (result.type === 'success') {
          nuevaCantidad = '';
          nuevaFecha = hoyInput();
        }
      };
    }}
  >
    <input class="np-fecha" type="date" name="fecha" bind:value={nuevaFecha} />
    <div class="np-monto">
      <span class="cur">$</span>
      <input type="text" inputmode="decimal" name="cantidad" placeholder="0.00" bind:value={nuevaCantidad} />
    </div>
    <button type="submit" class="np-add">+ Agregar pago</button>
  </form>

  <ul class="pagos-lista">
    {#each data.pagos as p (p.id)}
      <li>
        <span class="pago-fecha">{p.fechaTexto}</span>
        <span class="pago-cantidad">{fmt.format(p.cantidad)}</span>
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

<style>
  .deuda-detalle {
    max-width: 700px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 1rem;
    color: rgba(255, 255, 255, 0.95);
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
    grid-template-columns: 140px 1fr auto;
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

  .pagos-lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .pagos-lista li {
    display: grid;
    grid-template-columns: 1fr auto 28px;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
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
</style>
