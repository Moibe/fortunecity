<script lang="ts">
  // Barra lateral "de vidrio" con el mismo tilt 3D que la superior.
  // - Escritorio: se repliega/expande con el chevron; empuja el contenido
  //   (publica su ancho real en la variable CSS --sidebar-width).
  // - Móvil: se vuelve un cajón (drawer) superpuesto que NO empuja el contenido;
  //   se abre con la hamburguesa del TopNav y se cierra con el fondo o un enlace.
  //   Su visibilidad en móvil la maneja `mobileOpen` (que arranca cerrado) + CSS,
  //   para no parpadear al cargar.
  import { page } from '$app/state';

  let {
    collapsed = false,
    mobileOpen = false,
    isMobile = false,
    toggleCollapsed,
    closeMobile
  }: {
    collapsed?: boolean;
    mobileOpen?: boolean;
    isMobile?: boolean;
    toggleCollapsed: () => void;
    closeMobile: () => void;
  } = $props();

  let tiltX = $state(0);
  let tiltY = $state(0);
  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--sidebar-width',
        collapsed ? '0px' : `${sidebarWidth}px`
      );
    }
  });

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
  function handleCollapseClick(e: MouseEvent) {
    e.stopPropagation();
    tiltX = 0;
    tiltY = 0;
    toggleCollapsed();
  }
</script>

<!-- Fondo oscuro para cerrar el cajón en móvil (oculto en escritorio vía CSS). -->
<button
  type="button"
  class="sidebar-backdrop"
  class:open={mobileOpen}
  onclick={closeMobile}
  aria-label="Cerrar menú"
  tabindex={mobileOpen ? 0 : -1}
></button>

<aside
  class="sidebar"
  class:collapsed
  class:open={mobileOpen}
  style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
  bind:clientWidth={sidebarWidth}
  onmousemove={handleMove}
  onmouseleave={handleLeave}
>
  <nav>
    <a
      href="/"
      class="nav-item"
      aria-current={page.url.pathname === '/' ? 'page' : undefined}
      onclick={() => {
        if (isMobile) closeMobile();
      }}
    >
      <span class="nav-ico" aria-hidden="true"></span>
      <span>Distribución</span>
    </a>
  </nav>

  <div class="sidebar-footer">
    <button type="button" class="collapse-btn" onclick={handleCollapseClick} aria-label="Replegar barra">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
    </button>
  </div>
</aside>

{#if collapsed}
  <button type="button" class="reveal-handle" onclick={toggleCollapsed} aria-label="Mostrar barra">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: calc(2rem + var(--topnav-height, 64px));
    left: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
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
  }
  /* Escritorio replegado: la barra desaparece y aparece el chevron. */
  @media (min-width: 681px) {
    .sidebar.collapsed {
      display: none;
    }
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  nav::-webkit-scrollbar {
    display: none;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.95rem;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .nav-ico {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    flex-shrink: 0;
    background: rgba(134, 239, 172, 0.55);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  .nav-item:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.16);
  }
  .nav-item[aria-current='page'] {
    color: #fff;
    background: rgba(21, 128, 61, 0.22);
    border-color: rgba(34, 197, 94, 0.45);
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.18) inset;
  }
  .nav-item[aria-current='page'] .nav-ico {
    background: #86efac;
  }
  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .collapse-btn,
  .reveal-handle {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .collapse-btn:hover,
  .reveal-handle:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
  }
  .reveal-handle {
    position: fixed;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.55rem 0.45rem;
    border-radius: 12px;
    border: 1px solid #fff;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 10;
  }

  /* Backdrop: solo existe en móvil (en escritorio nunca se ve). */
  .sidebar-backdrop {
    display: none;
  }

  /* ── Móvil: la barra deja de empujar el contenido y se vuelve un cajón que
     se superpone. Arranca fuera de pantalla; `.open` lo desliza a la vista. ─ */
  @media (max-width: 680px) {
    .sidebar {
      z-index: 30;
      min-width: 0;
      width: min(78vw, 300px);
      max-width: none;
      /* El !important vence al transform inline del tilt (que en móvil no aplica). */
      transform: translateX(calc(-100% - 1.5rem)) !important;
      transition: transform 0.24s ease-out;
    }
    .sidebar.open {
      transform: translateX(0) !important;
    }
    /* En móvil el repliegue de escritorio no aplica: se usa hamburguesa + backdrop. */
    .reveal-handle,
    .sidebar-footer {
      display: none;
    }
    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      border: none;
      padding: 0;
      margin: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.24s ease-out;
      z-index: 25;
    }
    .sidebar-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
  }
</style>
