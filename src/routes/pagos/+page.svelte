<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let agregando = $state(false);
  let nuevoNombre = $state('');
</script>

<div class="pagos">
  <h1>Pagos</h1>
  <p class="sub">A quién le debo y qué le he pagado.</p>

  <div class="deudas-grid">
    {#each data.deudas as d (d.id)}
      <a class="deuda-card" href="/pagos/{d.id}">
        <span class="deuda-nombre">{d.nombre}</span>
      </a>
    {/each}

    {#if agregando}
      <form
        class="deuda-card deuda-card-nueva"
        method="POST"
        action="?/agregarDeuda"
        use:enhance={() => {
          return async ({ result, update }) => {
            await update();
            if (result.type === 'success') {
              nuevoNombre = '';
              agregando = false;
            }
          };
        }}
      >
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="deuda-nombre-input"
          name="nombre"
          type="text"
          placeholder="Nombre"
          autocomplete="off"
          autofocus
          bind:value={nuevoNombre}
          onblur={() => {
            if (!nuevoNombre.trim()) agregando = false;
          }}
        />
      </form>
    {:else}
      <button type="button" class="deuda-card deuda-card-add" onclick={() => (agregando = true)}>
        + Nueva deuda
      </button>
    {/if}

    {#if data.deudas.length === 0 && !agregando}
      <p class="empty">Agrega tu primera deuda con el cuadrito de "+ Nueva deuda".</p>
    {/if}
  </div>
</div>

<style>
  .pagos {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 1rem;
    color: rgba(255, 255, 255, 0.95);
  }
  h1 {
    margin: 0 0 0.25rem;
    font-size: 1.3rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.98);
  }
  .sub {
    margin: 0 0 1.5rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }
  .deudas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 1rem;
  }
  .deuda-card {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1rem;
    box-sizing: border-box;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #fff;
    text-decoration: none;
    font-weight: 600;
    font-size: 1.05rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  }
  a.deuda-card:hover {
    background: rgba(134, 239, 172, 0.14);
    border-color: rgba(134, 239, 172, 0.4);
    transform: translateY(-2px);
  }
  .deuda-nombre {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .deuda-card-add {
    border-style: dashed;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font: inherit;
    font-weight: 600;
  }
  .deuda-card-add:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.04);
  }
  .deuda-card-nueva {
    background: rgba(0, 0, 0, 0.18);
    border-style: dashed;
    border-color: rgba(134, 239, 172, 0.4);
    padding: 1rem 0.6rem;
  }
  .deuda-nombre-input {
    width: 100%;
    background: transparent;
    border: none;
    color: #fff;
    font: inherit;
    font-weight: 600;
    text-align: center;
    outline: none;
  }
  .empty {
    grid-column: 1 / -1;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
</style>
