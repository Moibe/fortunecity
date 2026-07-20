<script lang="ts">
  // Barra superior "de vidrio" con tilt 3D al pasar el mouse. Muestra el brand
  // (ícono 💵); la navegación por secciones vive en el sidebar izquierdo. En
  // móvil aparece un botón hamburguesa que abre/cierra ese sidebar.
  let { onMenu }: { onMenu?: () => void } = $props();

  let tiltX = $state(0);
  let tiltY = $state(0);

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 1.2;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }
  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
  class="topnav"
  style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
  onmousemove={handleMove}
  onmouseleave={handleLeave}
>
  <button type="button" class="menu-btn" onclick={onMenu} aria-label="Abrir menú">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  </button>
  <a href="/" class="brand" aria-label="Inicio">
    <span class="brand-ico" aria-hidden="true">💵</span>
  </a>
</header>

<style>
  .topnav {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: var(--topnav-height, 64px);
    padding: 0 1.25rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
    z-index: 9;
  }

  /* Botón hamburguesa: oculto en escritorio, visible solo en móvil. */
  .menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    margin-right: 0.4rem;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .menu-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: rgba(255, 255, 255, 0.98);
    text-decoration: none;
    border-radius: 8px;
    padding: 0.25rem 0.4rem;
    transition: background 0.18s ease;
  }
  .brand:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .brand-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    font-size: 1.5rem;
    line-height: 1;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.28));
  }

  /* En pantallas chicas apretamos el padding y mostramos la hamburguesa. */
  @media (max-width: 680px) {
    .topnav {
      padding: 0 0.6rem;
    }
    .brand {
      gap: 0;
      padding: 0.25rem;
    }
    .menu-btn {
      display: inline-flex;
    }
  }
  @media (max-width: 360px) {
    .topnav {
      padding: 0 0.4rem;
    }
  }
</style>
