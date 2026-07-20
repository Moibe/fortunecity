<script lang="ts">
  // Tailwind v4 + tokens de shadcn. El gradiente glass de :global(body) de abajo GANA:
  // los estilos :global de Svelte van sin @layer, así que pisan el @layer base de Tailwind.
  import '../app.css';
  import type { Snippet } from 'svelte';
  import favicon from '$lib/assets/favicon.svg';
  import TopNav from '$lib/TopNav.svelte';
  import Sidebar from '$lib/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();
  let collapsed = $state(false); // repliegue de escritorio (empuja el contenido)
  let mobileOpen = $state(false); // cajón abierto en móvil (superpuesto). Arranca cerrado.
  let isMobile = $state(false);

  // Detecta móvil para ramificar el comportamiento de la hamburguesa. Al cruzar
  // el breakpoint cerramos el cajón y reseteamos el repliegue de escritorio.
  $effect(() => {
    const mq = window.matchMedia('(max-width: 680px)');
    const apply = () => {
      isMobile = mq.matches;
      mobileOpen = false;
      if (mq.matches) collapsed = false;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  });

  // View Transitions cuando el browser las soporta para animar el repliegue.
  function withTransition(fn: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
    } else {
      fn();
    }
  }
  function toggleCollapsed() {
    withTransition(() => {
      collapsed = !collapsed;
    });
  }
  // La hamburguesa del TopNav: en móvil abre/cierra el cajón; en escritorio
  // repliega/expande la barra.
  function toggleSidebar() {
    if (isMobile) {
      mobileOpen = !mobileOpen;
    } else {
      toggleCollapsed();
    }
  }
  function closeMobile() {
    mobileOpen = false;
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<TopNav onMenu={toggleSidebar} />
<Sidebar {collapsed} {mobileOpen} {isMobile} {toggleCollapsed} {closeMobile} />
<main class={collapsed ? 'collapsed' : ''}>
  <div class="work-scroll">
    {@render children()}
  </div>
</main>

<style>
  :global(:root) {
    --topnav-height: 64px;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  :global(body) {
    min-height: 100vh;
    background: linear-gradient(135deg, #16a34a 0%, #064e2b 100%);
    background-attachment: fixed;
    color: rgba(255, 255, 255, 0.95);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  :global(*) {
    scrollbar-width: auto;
    scrollbar-color: rgba(255, 255, 255, 0.55) rgba(255, 255, 255, 0.1);
  }
  :global(::-webkit-scrollbar) {
    width: 14px;
    height: 14px;
  }
  :global(::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.07);
    border-radius: 999px;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.55);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.78);
    background-clip: padding-box;
  }

  main {
    position: fixed;
    top: calc(2rem + var(--topnav-height));
    right: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    transition: left 0.22s ease-out;
    left: calc(var(--sidebar-width, 240px) + 2rem);
  }
  main.collapsed {
    left: 2rem;
  }

  /* En móvil el sidebar es un cajón superpuesto: el contenido siempre va a lo
     ancho, sin importar si el cajón está abierto o cerrado. */
  @media (max-width: 680px) {
    main,
    main.collapsed {
      left: 1rem;
      right: 1rem;
    }
  }

  .work-scroll {
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    right: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 16px;
  }
</style>
