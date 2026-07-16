<script lang="ts">
  // Qnc Dist — distribuidor de quincena.
  // Anotas el total recibido, capturas en qué proyectos gastarlo, y la dona de la
  // derecha muestra cuánto se ha asignado por proyecto y cuánto te queda (restante).
  // Por ahora es todo en memoria (client-side); el guardado en base va en el long term.

  // Paleta categórica VALIDADA (dataviz) para el fondo verde translúcido:
  // pasa banda de luminosidad, piso de croma, separación CVD y piso de visión normal.
  const PALETTE = ['#3987e5', '#d55181', '#c98500', '#9085e9', '#e66767', '#2ba3c4'];
  const RESTANTE_COLOR = 'rgba(255, 255, 255, 0.22)';
  const OVER_COLOR = '#ff6b6b'; // status critical: te pasaste

  const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // ── Formateo de miles en vivo para inputs de dinero ──────────────────────────
  // type="number" nativo no permite mostrar comas mientras se escribe, así que
  // estos campos son type="text" y esta acción se encarga de: sanear lo tecleado
  // (solo dígitos + un punto decimal), avisar el valor numérico limpio, insertar
  // las comas de miles, y reubicar el cursor contando dígitos (no comas) para
  // que no "salte" al reformatear.
  function limpiarNumero(v: string) {
    let s = v.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const primerPunto = s.indexOf('.');
    if (primerPunto !== -1) s = s.slice(0, primerPunto + 1) + s.slice(primerPunto + 1).replace(/\./g, '');
    return s;
  }
  function formatearMiles(raw: string) {
    if (raw === '' || raw === '.') return raw;
    const [intPart, decPart] = raw.split('.');
    const conComas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== undefined ? `${conComas}.${decPart}` : conComas;
  }
  function miles(node: HTMLInputElement, params: { get: () => number; set: (v: number) => void }) {
    function digitosAntes(value: string, pos: number) {
      let n = 0;
      for (let i = 0; i < pos; i++) if (/[0-9.]/.test(value[i])) n++;
      return n;
    }
    function posParaDigitos(value: string, objetivo: number) {
      let n = 0;
      for (let i = 0; i < value.length; i++) {
        if (n === objetivo) return i;
        if (/[0-9.]/.test(value[i])) n++;
      }
      return value.length;
    }
    function onInput() {
      const pos = node.selectionStart ?? node.value.length;
      const antes = digitosAntes(node.value, pos);
      const raw = limpiarNumero(node.value);
      const numero = raw === '' || raw === '.' ? 0 : parseFloat(raw);
      params.set(Number.isFinite(numero) ? numero : 0);
      const formateado = raw === '' ? '' : formatearMiles(raw);
      node.value = formateado;
      const nuevaPos = posParaDigitos(formateado, antes);
      node.setSelectionRange(nuevaPos, nuevaPos);
    }
    node.value = formatearMiles(String(params.get() ?? 0));
    node.addEventListener('input', onInput);
    return {
      destroy() {
        node.removeEventListener('input', onInput);
      }
    };
  }

  import {
    Banknote,
    NotepadText,
    Star,
    Repeat,
    CreditCard,
    Wallet,
    HandCoins,
    Landmark,
    ShoppingCart,
    Utensils,
    House,
    Car,
    Zap,
    Smartphone,
    Tag,
    Circle,
    CircleCheckBig,
    Pencil,
    Check
  } from '@lucide/svelte';
  import { deserialize } from '$app/forms';
  import { untrack } from 'svelte';
  import type { PageData } from './$types';

  // Set curado de íconos para el catálogo de Tipos (se elige uno al agregar
  // un tipo, o al completárselo a uno que ya existe pero no tenía).
  const ICONOS_DISPONIBLES = [
    { key: 'banknote', Icono: Banknote, label: 'Efectivo' },
    { key: 'repeat', Icono: Repeat, label: 'Recurrente' },
    { key: 'credit-card', Icono: CreditCard, label: 'Tarjeta' },
    { key: 'wallet', Icono: Wallet, label: 'Billetera' },
    { key: 'hand-coins', Icono: HandCoins, label: 'Deuda' },
    { key: 'landmark', Icono: Landmark, label: 'Banco' },
    { key: 'shopping-cart', Icono: ShoppingCart, label: 'Compras' },
    { key: 'utensils', Icono: Utensils, label: 'Comida' },
    { key: 'house', Icono: House, label: 'Renta' },
    { key: 'car', Icono: Car, label: 'Transporte' },
    { key: 'zap', Icono: Zap, label: 'Servicios' },
    { key: 'smartphone', Icono: Smartphone, label: 'Celular' },
    { key: 'tag', Icono: Tag, label: 'General' }
  ];
  const ICONOS_MAP: Record<string, typeof Banknote> = Object.fromEntries(
    ICONOS_DISPONIBLES.map((i) => [i.key, i.Icono])
  );

  type Gasto = {
    id: number;
    nombre: string;
    tipo: string;
    monto: number;
    notas: string;
    pagado: boolean;
    deudaId: number | null;
  };
  type TipoPresetItem = { nombre: string; icono: string | null };
  type EntradaItem = { id: number; nombre: string; monto: number };

  let { data }: { data: PageData } = $props();

  // Catálogo de Tipos (dropdown propio, con el estilo del sitio): el campo
  // sigue siendo texto libre; esto solo ofrece sugerencias rápidas. Se carga
  // de la base y crece cuando el usuario agrega/completa un ícono.
  let tiposPresetList = $state<TipoPresetItem[]>(untrack(() => data.tiposPreset ?? []));

  function buscarPreset(valor: string) {
    const v = valor.trim().toLowerCase();
    return tiposPresetList.find((t) => t.nombre.toLowerCase() === v) ?? null;
  }
  function estaEnCatalogo(valor: string) {
    return buscarPreset(valor) !== null;
  }
  // true si hace falta ofrecer el selector de ícono: o el tipo aún no está en
  // el catálogo, o ya está pero todavía no tiene ícono asignado.
  function necesitaIcono(valor: string) {
    const nombre = valor.trim();
    if (!nombre) return false;
    const existente = buscarPreset(nombre);
    return !existente || !existente.icono;
  }
  function iconoComponentePara(nombreTipo: string) {
    const existente = buscarPreset(nombreTipo);
    if (!existente?.icono) return null;
    return ICONOS_MAP[existente.icono] ?? null;
  }

  // id del renglón cuyo dropdown de Tipo está abierto (null = ninguno).
  // Siempre muestra todos los presets (no filtra por lo ya escrito): es un
  // selector rápido, no una búsqueda — así se puede reabrir y cambiar el tipo
  // aunque el campo ya tenga un valor que no coincida con ningún preset.
  let openTipoFor = $state<number | null>(null);
  function sugerenciasTipo() {
    return tiposPresetList;
  }
  function elegirTipo(g: Gasto, valor: string) {
    g.tipo = valor;
    openTipoFor = null;
  }

  // id del renglón cuyo selector de ícono está abierto (null = ninguno).
  let iconoPickerFor = $state<number | null>(null);
  let guardandoTipoNuevo = $state<string | null>(null); // valor en vuelo, evita doble-clic
  async function elegirIconoTipo(valor: string, icono: string | null) {
    const nombre = valor.trim();
    if (!nombre || guardandoTipoNuevo === nombre) return;
    guardandoTipoNuevo = nombre;
    try {
      const body = new FormData();
      body.set('nombre', nombre);
      if (icono) body.set('icono', icono);
      const response = await fetch('?/agregarTipo', { method: 'POST', body });
      const result = deserialize(await response.text());
      if (result.type === 'success') {
        const existente = buscarPreset(nombre);
        if (existente) {
          if (icono) existente.icono = icono;
        } else {
          tiposPresetList.push({ nombre, icono });
          tiposPresetList.sort((a, b) => a.nombre.localeCompare(b.nombre));
        }
      }
    } catch (e) {
      console.error('No se pudo guardar el ícono del tipo', e);
    } finally {
      guardandoTipoNuevo = null;
      iconoPickerFor = null;
    }
  }

  // Borra un Tipo del catálogo (no afecta a los renglones que ya lo usan).
  async function borrarTipoDelCatalogo(nombre: string) {
    try {
      const body = new FormData();
      body.set('nombre', nombre);
      const response = await fetch('?/borrarTipo', { method: 'POST', body });
      const result = deserialize(await response.text());
      if (result.type === 'success') {
        tiposPresetList = tiposPresetList.filter((t) => t.nombre.toLowerCase() !== nombre.toLowerCase());
      }
    } catch (e) {
      console.error('No se pudo borrar el tipo del catálogo', e);
    }
  }

  // Catálogo de nombres de Entrada (mismo mecanismo que Tipos, sin ícono):
  // dropdown propio + estrellita para agregar uno nuevo, permanente en la base.
  let entradaPresetList = $state<string[]>(untrack(() => data.entradaNombresPreset ?? []));
  function estaEnCatalogoEntrada(valor: string) {
    const v = valor.trim().toLowerCase();
    return entradaPresetList.some((n) => n.toLowerCase() === v);
  }
  // id de la entrada cuyo dropdown de nombre está abierto (null = ninguno).
  let openEntradaDropdownFor = $state<number | null>(null);
  let guardandoNombreEntrada = $state<string | null>(null); // valor en vuelo, evita doble-clic
  async function agregarNombreEntradaAlCatalogo(valor: string) {
    const nombre = valor.trim();
    if (!nombre || estaEnCatalogoEntrada(nombre) || guardandoNombreEntrada === nombre) return;
    guardandoNombreEntrada = nombre;
    try {
      const body = new FormData();
      body.set('nombre', nombre);
      const response = await fetch('?/agregarNombreEntrada', { method: 'POST', body });
      const result = deserialize(await response.text());
      if (result.type === 'success' && !estaEnCatalogoEntrada(nombre)) {
        entradaPresetList.push(nombre);
        entradaPresetList.sort((a, b) => a.localeCompare(b));
      }
    } catch (e) {
      console.error('No se pudo agregar el nombre de entrada al catálogo', e);
    } finally {
      guardandoNombreEntrada = null;
    }
  }

  // Borra un nombre de Entrada del catálogo (no afecta a las entradas ya guardadas).
  async function borrarNombreEntradaDelCatalogo(nombre: string) {
    try {
      const body = new FormData();
      body.set('nombre', nombre);
      const response = await fetch('?/borrarNombreEntrada', { method: 'POST', body });
      const result = deserialize(await response.text());
      if (result.type === 'success') {
        entradaPresetList = entradaPresetList.filter((n) => n.toLowerCase() !== nombre.toLowerCase());
      }
    } catch (e) {
      console.error('No se pudo borrar el nombre de entrada del catálogo', e);
    }
  }

  // id del renglón cuyo panel de Notas está desplegado (null = ninguno, replegadas por default).
  let openNotasFor = $state<number | null>(null);

  // id de la entrada cuyo nombre se está editando (null = ninguna, fijo con lapicito por default).
  let editandoNombreFor = $state<number | null>(null);

  // ── Estado, inicializado UNA vez desde la quincena cargada (si hay) ──────────
  // untrack: leemos `data` solo para el valor inicial, no queremos reactividad aquí.
  const inicial = untrack(() => {
    const q = data.quincena;
    const rows: Gasto[] = (q?.renglones ?? []).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      monto: r.monto,
      notas: r.notas,
      pagado: r.pagado,
      deudaId: r.deudaId
    }));
    // Entradas: si la quincena ya tenía filas de entradas, se usan tal cual.
    // Si no (p. ej. una quincena guardada antes de que existiera esta tabla),
    // se arranca con una sola entrada igual al `total` ya guardado.
    const entradasRows: EntradaItem[] = (q?.entradas ?? []).map((e) => ({
      id: e.id,
      nombre: e.nombre,
      monto: e.monto
    }));
    // Sin quincena cargada: default sensato a partir de la fecha de hoy.
    const hoy = new Date();
    return {
      id: q?.id ?? null,
      entradas: entradasRows.length > 0 ? entradasRows : [{ id: 1, nombre: '', monto: q?.total ?? 0 }],
      remanenteAnterior: q?.remanenteAnterior ?? 0,
      anio: q?.anio ?? hoy.getFullYear(),
      mes: q?.mes ?? hoy.getMonth() + 1,
      corte: q?.corte ?? (hoy.getDate() <= 15 ? 15 : 30),
      gastos:
        rows.length > 0
          ? rows
          : [{ id: 1, nombre: '', tipo: '', monto: 0, notas: '', pagado: false, deudaId: null }]
    };
  });

  let quincenaId = $state<number | null>(inicial.id);
  let entradas = $state<EntradaItem[]>(inicial.entradas);
  let nextEntradaId = Math.max(0, ...inicial.entradas.map((e) => e.id)) + 1;
  const total = $derived(entradas.reduce((s, e) => s + (Number(e.monto) || 0), 0));
  function agregarEntrada() {
    entradas.push({ id: nextEntradaId++, nombre: '', monto: 0 });
  }
  function quitarEntrada(id: number) {
    entradas = entradas.filter((e) => e.id !== id);
    if (entradas.length === 0) entradas.push({ id: nextEntradaId++, nombre: '', monto: 0 });
  }
  let remanenteAnterior = $state<number>(inicial.remanenteAnterior);
  let anio = $state<number>(inicial.anio);
  let mes = $state<number>(inicial.mes);
  let corte = $state<number>(inicial.corte);
  let editandoQuincena = $state(false); // fija por default; el lapicito abre los selects
  let gastos = $state<Gasto[]>(inicial.gastos);
  // El próximo id local no debe chocar con los ids que vienen de la base.
  let nextId = Math.max(0, ...inicial.gastos.map((g) => g.id)) + 1;

  let hovered = $state<number | null>(null); // id del segmento bajo el mouse (null = restante/ninguno)

  // ── Autoguardado (debounce) ──────────────────────────────────────────────────
  let guardando = $state(false);
  const payload = $derived(
    JSON.stringify({
      id: quincenaId,
      entradas: entradas.map((e) => ({ nombre: e.nombre, monto: e.monto })),
      remanenteAnterior,
      anio,
      mes,
      corte,
      renglones: gastos.map((g) => ({
        nombre: g.nombre,
        tipo: g.tipo,
        monto: g.monto,
        notas: g.notas,
        pagado: g.pagado,
        deudaId: g.deudaId
      }))
    })
  );
  let payloadGuardado = $state('__init__');
  const dirty = $derived(payload !== payloadGuardado);

  async function guardar() {
    if (!dirty) return;
    const snapshot = payload; // por si el usuario sigue tecleando durante el fetch
    guardando = true;
    try {
      const body = new FormData();
      body.set('payload', snapshot);
      const response = await fetch('?/guardar', { method: 'POST', body });
      const result = deserialize(await response.text());
      if (result.type === 'success' && result.data) {
        const resData = result.data as { id?: number };
        if (resData.id) quincenaId = resData.id;
        payloadGuardado = snapshot;
      } else if (result.type === 'failure') {
        console.error('No se pudo guardar la quincena', result.data);
      }
    } catch (e) {
      console.error('No se pudo guardar la quincena', e);
    } finally {
      guardando = false;
    }
  }

  // Debounce vía cleanup de $effect: cada cambio en `payload` cancela el timer
  // pendiente y arma uno nuevo; solo dispara guardar() tras 800ms sin cambios.
  $effect(() => {
    const current = payload;
    if (payloadGuardado === '__init__') {
      payloadGuardado = current; // baseline: lo cargado ya cuenta como guardado
      return;
    }
    if (current === payloadGuardado) return;
    const timer = setTimeout(guardar, 800);
    return () => clearTimeout(timer);
  });

  const quincenaLabel = $derived(`${MESES[mes - 1]}-${corte}`);

  // Disponible = lo que ya tenías + lo que cayó esta quincena. Es el "pool"
  // real contra el que se calculan Asignado/Restante/la dona.
  const disponible = $derived(total + remanenteAnterior);
  const asignado = $derived(gastos.reduce((s, g) => s + (Number(g.monto) || 0), 0));
  const restante = $derived(disponible - asignado);
  const sobregiro = $derived(restante < 0);

  const fmt = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });
  const pct = (v: number) => (disponible > 0 ? (v / disponible) * 100 : 0);

  // ── Geometría de la dona ───────────────────────────────────────────────────
  const R = 60;
  const STROKE = 22;
  const C = 2 * Math.PI * R; // circunferencia
  const GAP = 3; // separación (px de arco) entre segmentos (solo si hay 2+)

  // Denominador: si te pasaste, la dona se llena con lo asignado (sin restante).
  const denom = $derived(Math.max(disponible, asignado) || 1);

  type Seg = { id: number | null; nombre: string; monto: number; color: string; len: number; offset: number };

  const segments = $derived.by((): Seg[] => {
    const items = gastos.filter((g) => (Number(g.monto) || 0) > 0);
    const segs: Seg[] = [];
    let acc = 0;
    items.forEach((g, i) => {
      const frac = (Number(g.monto) || 0) / denom;
      segs.push({
        id: g.id,
        nombre: g.nombre.trim() || `Proyecto ${i + 1}`,
        monto: Number(g.monto) || 0,
        color: PALETTE[i % PALETTE.length],
        len: frac * C,
        offset: acc * C
      });
      acc += frac;
    });
    if (!sobregiro && restante > 0) {
      segs.push({
        id: null,
        nombre: 'Restante',
        monto: restante,
        color: RESTANTE_COLOR,
        len: (restante / denom) * C,
        offset: acc * C
      });
    }
    return segs;
  });

  // Qué mostrar en el centro de la dona.
  const centro = $derived.by(() => {
    if (hovered !== null) {
      const s = segments.find((x) => x.id === hovered);
      if (s) return { label: s.nombre, monto: s.monto, sub: `${pct(s.monto).toFixed(1)}%` };
    }
    if (sobregiro) return { label: 'Te pasaste', monto: Math.abs(restante), sub: 'sobregiro' };
    return { label: 'Restante', monto: restante, sub: disponible > 0 ? `${pct(restante).toFixed(1)}%` : '—' };
  });

  type TipoRow = { tipo: string; monto: number; color: string };

  // Distribución agrupada por Tipo (en vez de por proyecto). Mismo denominador
  // que la dona principal, así los porcentajes de ambas gráficas son comparables.
  const porTipo = $derived.by((): TipoRow[] => {
    const totales = new Map<string, number>();
    for (const g of gastos) {
      const monto = Number(g.monto) || 0;
      if (monto <= 0) continue;
      const key = g.tipo.trim() || 'Sin tipo';
      totales.set(key, (totales.get(key) ?? 0) + monto);
    }
    // Color por tipo asignado en orden alfabético (estable entre renders),
    // no por monto — así un tipo no cambia de color solo porque otro creció.
    const rows: TipoRow[] = [...totales.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((tipo, i) => ({ tipo, monto: totales.get(tipo)!, color: PALETTE[i % PALETTE.length] }));
    if (!sobregiro && restante > 0) {
      rows.push({ tipo: 'Restante', monto: restante, color: RESTANTE_COLOR });
    }
    return rows.sort((a, b) => b.monto - a.monto);
  });

  function agregar() {
    gastos.push({ id: nextId++, nombre: '', tipo: '', monto: 0, notas: '', pagado: false, deudaId: null });
  }
  function quitar(id: number) {
    gastos = gastos.filter((g) => g.id !== id);
    if (gastos.length === 0)
      gastos.push({ id: nextId++, nombre: '', tipo: '', monto: 0, notas: '', pagado: false, deudaId: null });
  }
</script>

<div class="qnc">
  <header class="qnc-head">
    <div>
      <h1>Distribución de quincena</h1>
      <p class="sub">Anota lo que recibiste y repártelo por proyecto.</p>
    </div>
    <span class="save-status" class:dirty>
      {guardando ? 'Guardando…' : dirty ? 'Sin guardar…' : 'Guardado ✓'}
    </span>
  </header>

  <div class="qnc-grid">
    <!-- ── Captura ─────────────────────────────────────────────────────── -->
    <section class="capture">
      <div class="top-row">
        <div class="quincena-field">
          <span class="total-label">Quincena</span>
          {#if editandoQuincena}
            <div class="quincena-inputs">
              <select class="q-select" bind:value={mes} aria-label="Mes">
                {#each MESES as m, i (m)}
                  <option value={i + 1}>{m}</option>
                {/each}
              </select>
              <select class="q-select q-corte" bind:value={corte} aria-label="Corte">
                <option value={15}>15</option>
                <option value={30}>30</option>
              </select>
              <input class="q-anio" type="number" bind:value={anio} placeholder="Año" aria-label="Año" />
              <button
                type="button"
                class="quincena-edit-btn"
                onclick={() => (editandoQuincena = false)}
                aria-label="Listo"
                title="Listo"
              >
                <Check size={14} />
              </button>
            </div>
          {:else}
            <div class="quincena-fixed">
              <span class="quincena-fixed-text">{quincenaLabel} · {anio}</span>
              <button
                type="button"
                class="quincena-edit-btn"
                onclick={() => (editandoQuincena = true)}
                aria-label="Editar quincena"
                title="Editar quincena"
              >
                <Pencil size={13} />
              </button>
            </div>
          {/if}
        </div>
      </div>

      {#snippet nombreEntrada(entrada: EntradaItem, placeholderText: string, labelClass: string)}
        {#if editandoNombreFor === entrada.id}
          <div class="entrada-label-row">
            <div class="entrada-nombre-wrap">
              <!-- svelte-ignore a11y_autofocus -->
              <input
                class="{labelClass} entrada-nombre-input"
                type="text"
                bind:value={entrada.nombre}
                placeholder={placeholderText}
                autocomplete="off"
                autofocus
                onfocus={() => (openEntradaDropdownFor = entrada.id)}
                onblur={() => {
                  editandoNombreFor = null;
                  openEntradaDropdownFor = null;
                }}
                onkeydown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
              <svg class="entrada-nombre-chevron" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              {#if entrada.nombre.trim() !== '' && !estaEnCatalogoEntrada(entrada.nombre)}
                <button
                  type="button"
                  class="entrada-nombre-star"
                  onmousedown={(ev) => ev.preventDefault()}
                  onclick={() => agregarNombreEntradaAlCatalogo(entrada.nombre)}
                  disabled={guardandoNombreEntrada === entrada.nombre.trim()}
                  aria-label="Agregar '{entrada.nombre.trim()}' al catálogo"
                  title="Agregar al catálogo"
                >
                  <Star size={11} />
                </button>
              {/if}
              {#if openEntradaDropdownFor === entrada.id && entradaPresetList.length > 0}
                <ul class="entrada-nombre-dropdown">
                  {#each entradaPresetList as opt (opt)}
                    <li>
                      <button
                        type="button"
                        class="opt-select"
                        onmousedown={(ev) => ev.preventDefault()}
                        onclick={() => {
                          entrada.nombre = opt;
                          openEntradaDropdownFor = null;
                        }}
                      >
                        {opt}
                      </button>
                      <button
                        type="button"
                        class="opt-del"
                        onmousedown={(ev) => ev.preventDefault()}
                        onclick={() => borrarNombreEntradaDelCatalogo(opt)}
                        aria-label="Borrar '{opt}' del catálogo"
                        title="Borrar del catálogo"
                      >
                        ×
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
            <button
              type="button"
              class="entrada-nombre-edit-btn"
              onmousedown={(ev) => ev.preventDefault()}
              onclick={() => (editandoNombreFor = null)}
              aria-label="Listo"
              title="Listo"
            >
              <Check size={12} />
            </button>
          </div>
        {:else}
          <div class="entrada-label-row">
            <span class={labelClass}>{entrada.nombre.trim() || placeholderText}</span>
            <button
              type="button"
              class="entrada-nombre-edit-btn"
              onclick={() => (editandoNombreFor = entrada.id)}
              aria-label="Editar nombre"
              title="Editar nombre"
            >
              <Pencil size={11} />
            </button>
          </div>
        {/if}
      {/snippet}

      <div class="entradas-field">
        <div class="entradas-head">
          <span class="h-entrada-nombre">Nombre</span>
          <span class="h-entrada-monto">Monto</span>
        </div>
        <div class="entrada-row">
          <span class="entrada-row-label">Remanente Anterior</span>
          <div class="entrada-monto-cell">
            <span class="cur">$</span>
            <input
              type="text"
              inputmode="decimal"
              value={formatearMiles(String(remanenteAnterior))}
              use:miles={{ get: () => remanenteAnterior, set: (v) => (remanenteAnterior = v) }}
              placeholder="0.00"
            />
          </div>
        </div>
        {#each entradas as entrada, i (entrada.id)}
          <div class="entrada-row">
            <div class="entrada-nombre-cell">
              {@render nombreEntrada(entrada, `Entrada ${i + 1}`, 'entrada-row-label')}
            </div>
            <div class="entrada-monto-cell">
              <span class="cur">$</span>
              <input
                type="text"
                inputmode="decimal"
                value={formatearMiles(String(entrada.monto))}
                use:miles={{ get: () => entrada.monto, set: (v) => (entrada.monto = v) }}
                placeholder="0.00"
              />
            </div>
            <button type="button" class="del" onclick={() => quitarEntrada(entrada.id)} aria-label="Quitar entrada">×</button>
          </div>
        {/each}

        <button class="add" type="button" onclick={agregarEntrada}>+ Agregar entrada</button>

        <div class="entradas-total">Disponible (entradas + remanente): <b>{fmt.format(disponible)}</b></div>
      </div>

      <div class="gastos">
        <div class="gastos-head">
          <span class="h-proyecto">Proyecto</span>
          <span class="h-tipo">Tipo</span>
          <span class="h-monto">Monto</span>
          <span class="h-notas">Notas</span>
          <span class="h-pagado">Pagado</span>
        </div>
        {#each gastos as g, i (g.id)}
          <div
            class="gasto-row"
            class:active={hovered === g.id}
            onmouseenter={() => (hovered = g.id)}
            onmouseleave={() => (hovered = null)}
            role="listitem"
          >
            <span class="swatch" style="background: {PALETTE[i % PALETTE.length]}"></span>
            <input class="g-nombre" type="text" bind:value={g.nombre} placeholder="¿En qué lo gastas?" />
            <div class="tipo-wrap">
              <input
                class="g-tipo"
                class:has-icon={iconoComponentePara(g.tipo) !== null}
                type="text"
                bind:value={g.tipo}
                placeholder="Tipo (opcional)"
                autocomplete="off"
                onfocus={() => (openTipoFor = g.id)}
                onblur={() => (openTipoFor = null)}
              />
              {#if iconoComponentePara(g.tipo)}
                {@const IconoActual = iconoComponentePara(g.tipo)}
                <span class="tipo-icon-actual"><IconoActual size={14} /></span>
              {/if}
              <svg class="tipo-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              {#if g.tipo.trim() !== '' && necesitaIcono(g.tipo)}
                <button
                  type="button"
                  class="tipo-star"
                  onmousedown={(e) => e.preventDefault()}
                  onclick={() => {
                    openTipoFor = null;
                    iconoPickerFor = iconoPickerFor === g.id ? null : g.id;
                  }}
                  disabled={guardandoTipoNuevo === g.tipo.trim()}
                  aria-label="Elegir ícono para '{g.tipo.trim()}'"
                  title="Elegir ícono para '{g.tipo.trim()}'"
                >
                  <Star size={13} />
                </button>
              {/if}
              {#if openTipoFor === g.id && sugerenciasTipo().length > 0}
                <ul class="tipo-dropdown">
                  {#each sugerenciasTipo() as t (t.nombre)}
                    {@const Icono = t.icono ? ICONOS_MAP[t.icono] : null}
                    <li>
                      <button
                        type="button"
                        class="opt-select"
                        onmousedown={(e) => e.preventDefault()}
                        onclick={() => elegirTipo(g, t.nombre)}
                      >
                        {#if Icono}<Icono size={14} />{/if}
                        <span>{t.nombre}</span>
                      </button>
                      <button
                        type="button"
                        class="opt-del"
                        onmousedown={(e) => e.preventDefault()}
                        onclick={() => borrarTipoDelCatalogo(t.nombre)}
                        aria-label="Borrar '{t.nombre}' del catálogo"
                        title="Borrar del catálogo"
                      >
                        ×
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if iconoPickerFor === g.id}
                <div class="icono-picker">
                  <div class="icono-picker-head">
                    <span>Ícono para "{g.tipo.trim()}"</span>
                    <button type="button" class="notas-close" onclick={() => (iconoPickerFor = null)} aria-label="Cerrar selector de ícono">×</button>
                  </div>
                  <div class="icono-grid">
                    {#each ICONOS_DISPONIBLES as opt (opt.key)}
                      {@const OptIcono = opt.Icono}
                      <button
                        type="button"
                        class="icono-opt"
                        title={opt.label}
                        onmousedown={(e) => e.preventDefault()}
                        onclick={() => elegirIconoTipo(g.tipo, opt.key)}
                      >
                        <OptIcono size={16} />
                      </button>
                    {/each}
                  </div>
                  <button
                    type="button"
                    class="icono-skip"
                    onmousedown={(e) => e.preventDefault()}
                    onclick={() => elegirIconoTipo(g.tipo, null)}
                  >
                    Sin ícono
                  </button>
                </div>
              {/if}
            </div>
            <div class="g-monto">
              <span class="cur">$</span>
              <input
                type="text"
                inputmode="decimal"
                value={formatearMiles(String(g.monto))}
                use:miles={{ get: () => g.monto, set: (v) => (g.monto = v) }}
                placeholder="0.00"
              />
            </div>
            <div class="notas-wrap">
              <button
                type="button"
                class="notas-toggle"
                class:has-content={g.notas.trim() !== ''}
                onclick={() => (openNotasFor = openNotasFor === g.id ? null : g.id)}
                aria-label="Notas"
                title={g.notas.trim() || 'Agregar nota'}
              >
                <NotepadText size={16} />
              </button>
              {#if openNotasFor === g.id}
                <div class="notas-panel">
                  <div class="notas-panel-head">
                    <span>Notas</span>
                    <button type="button" class="notas-close" onclick={() => (openNotasFor = null)} aria-label="Cerrar notas">×</button>
                  </div>
                  <!-- svelte-ignore a11y_autofocus -->
                  <textarea bind:value={g.notas} placeholder="Notas (opcional)" rows="3" autofocus></textarea>
                </div>
              {/if}
            </div>
            <button
              type="button"
              class="pagado-toggle"
              class:pagado={g.pagado}
              onclick={() => (g.pagado = !g.pagado)}
              aria-label={g.pagado ? 'Marcar como no pagado' : 'Marcar como pagado'}
              aria-pressed={g.pagado}
              title={g.pagado ? 'Pagado' : 'Marcar como pagado'}
            >
              {#if g.pagado}
                <CircleCheckBig size={18} />
              {:else}
                <Circle size={18} />
              {/if}
            </button>
            <button class="del" type="button" onclick={() => quitar(g.id)} aria-label="Quitar proyecto">×</button>
          </div>
        {/each}

        <button class="add" type="button" onclick={agregar}>+ Agregar proyecto</button>
      </div>

      <div class="totales">
        <div class="t-row"><span>Asignado</span><b>{fmt.format(asignado)}</b></div>
        <div class="t-row" class:over={sobregiro}>
          <span>{sobregiro ? 'Sobregiro' : 'Restante'}</span>
          <b>{fmt.format(sobregiro ? -restante : restante)}</b>
        </div>
      </div>
    </section>

    <!-- ── Gráfica ─────────────────────────────────────────────────────── -->
    <section class="chart">
      <div class="donut-wrap">
        <svg viewBox="0 0 160 160" class="donut" role="img" aria-label="Distribución de la quincena">
          <!-- track de fondo -->
          <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.08)" stroke-width={STROKE} />
          <g transform="rotate(-90 80 80)">
            {#each segments as s (s.id ?? 'restante')}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <circle
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={s.color}
                stroke-width={hovered === s.id ? STROKE + 4 : STROKE}
                stroke-dasharray="{Math.max(s.len - (segments.length > 1 ? GAP : 0), 0.001)} {C}"
                stroke-dashoffset={-s.offset}
                class="seg"
                class:dim={hovered !== null && hovered !== s.id}
                onmouseenter={() => (hovered = s.id)}
                onmouseleave={() => (hovered = null)}
              >
                <title>{s.nombre}: {fmt.format(s.monto)} ({pct(s.monto).toFixed(1)}%)</title>
              </circle>
            {/each}
          </g>
          <!-- centro -->
          <text x="80" y="74" text-anchor="middle" class="c-label">{centro.label}</text>
          <text x="80" y="90" text-anchor="middle" class="c-monto" class:over={sobregiro && hovered === null}>
            {fmt.format(centro.monto)}
          </text>
          <text x="80" y="103" text-anchor="middle" class="c-sub">{centro.sub}</text>
        </svg>
      </div>

      <!-- Leyenda = relieve requerido por contraste (labels visibles con valores). -->
      <ul class="legend">
        {#each segments as s (s.id ?? 'restante')}
          <li
            class:active={hovered === s.id}
            onmouseenter={() => (hovered = s.id)}
            onmouseleave={() => (hovered = null)}
          >
            <span class="swatch" style="background: {s.color}"></span>
            <span class="l-name">{s.nombre}</span>
            <span class="l-val">{fmt.format(s.monto)}</span>
            <span class="l-pct">{pct(s.monto).toFixed(0)}%</span>
          </li>
        {/each}
        {#if segments.length === 0}
          <li class="empty">Captura un total y tus proyectos para ver la distribución.</li>
        {/if}
      </ul>

      <!-- Segunda gráfica: la misma distribución, agrupada por Tipo. -->
      <div class="tipo-chart">
        <h3 class="chart-subtitle">Por tipo</h3>
        <ul class="tipo-bars">
          {#each porTipo as row (row.tipo)}
            <li>
              <div class="tb-label">
                <span class="swatch" style="background: {row.color}"></span>
                <span class="tb-name">{row.tipo}</span>
                <span class="tb-val">{fmt.format(row.monto)}</span>
                <span class="tb-pct">{pct(row.monto).toFixed(0)}%</span>
              </div>
              <div class="tb-track">
                <div class="tb-fill" style="width: {pct(row.monto)}%; background: {row.color}"></div>
              </div>
            </li>
          {/each}
          {#if porTipo.length === 0}
            <li class="empty">Aún no hay gastos con monto para agrupar por tipo.</li>
          {/if}
        </ul>
      </div>
    </section>
  </div>
</div>

<style>
  .qnc {
    max-width: 1300px;
    margin: 0 auto;
    padding: 0.5rem 0.25rem 1rem;
    color: rgba(255, 255, 255, 0.95);
  }
  .qnc-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .qnc-head h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .sub {
    margin: 0.25rem 0 0;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
  }
  .save-status {
    flex-shrink: 0;
    padding: 0.4rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #86efac;
    background: rgba(134, 239, 172, 0.12);
    border: 1px solid rgba(134, 239, 172, 0.3);
    border-radius: 999px;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .save-status.dirty {
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .qnc-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  @media (min-width: 860px) {
    .qnc-grid {
      grid-template-columns: 1.4fr 0.6fr;
      align-items: start;
    }
  }

  /* ── Panels internos ─────────────────────────────────────────────────── */
  .capture,
  .chart {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 1.25rem;
  }

  /* ── Fila superior: Quincena ──────────────────────────────────────────────── */
  .top-row {
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  /* ── Quincena (mes / corte / año) ───────────────────────────────────────── */
  .quincena-field {
    flex-shrink: 0;
  }
  .quincena-inputs {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .q-select,
  .q-anio {
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    padding: 0.5rem 0.6rem;
    color: #fff;
    font: inherit;
  }
  .q-select {
    flex: 0 0 140px;
    min-width: 0;
  }
  .q-corte {
    flex: 0 0 64px;
  }
  .q-anio {
    flex: 0 0 84px;
  }
  .quincena-fixed {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
  }
  .quincena-fixed-text {
    padding: 0.5rem 0.2rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
  .quincena-edit-btn {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .quincena-edit-btn:hover {
    color: #fff;
    background: rgba(134, 239, 172, 0.16);
    border-color: rgba(134, 239, 172, 0.4);
  }

  /* ── Total ───────────────────────────────────────────────────────────── */
  .total-label {
    display: block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 0.4rem;
  }

  /* ── Entradas: listado parejo, mismo lenguaje visual que Gastos ──────────── */
  .entradas-field {
    margin-bottom: 1.4rem;
  }
  .entradas-head {
    display: grid;
    grid-template-columns: 1fr 130px 28px;
    gap: 0.5rem;
    padding: 0 0.2rem 0.4rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.45);
  }
  .entrada-row {
    display: grid;
    grid-template-columns: 1fr 130px 28px;
    gap: 0.5rem;
    align-items: center;
    padding: 0.35rem 0.2rem;
    border-radius: 8px;
  }
  .entrada-nombre-cell {
    min-width: 0;
  }
  .entrada-monto-cell {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.35rem 0.55rem;
  }
  .entrada-monto-cell .cur {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
  .entrada-monto-cell input {
    text-align: right;
    font-size: 1rem;
    font-weight: 600;
  }
  .entrada-row-label {
    display: block;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.85);
  }
  .entrada-label-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .entrada-label-row .entrada-row-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entrada-nombre-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .entrada-nombre-input {
    width: 100%;
    box-sizing: border-box;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(134, 239, 172, 0.6);
    padding-bottom: 0.15rem;
    padding-right: 1.6rem;
    text-transform: none; /* mientras se edita, se ve tal cual se teclea */
    letter-spacing: normal;
  }
  .entrada-nombre-input:focus {
    outline: none;
  }
  .entrada-nombre-input::placeholder {
    text-transform: none;
    color: rgba(255, 255, 255, 0.35);
  }
  .entrada-nombre-chevron {
    position: absolute;
    top: 2px;
    right: 0.05rem;
    color: rgba(255, 255, 255, 0.35);
    pointer-events: none;
  }
  .entrada-nombre-star {
    position: absolute;
    top: 0;
    right: 0.85rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    color: rgba(250, 204, 21, 0.7);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .entrada-nombre-star:hover:not(:disabled) {
    color: #facc15;
    transform: scale(1.15);
  }
  .entrada-nombre-star:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .entrada-nombre-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 22;
    margin: 0;
    padding: 0.3rem;
    list-style: none;
    background: #0d3a1f;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .entrada-nombre-dropdown li {
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }
  .entrada-nombre-dropdown .opt-select {
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 0.4rem 0.55rem;
    color: rgba(255, 255, 255, 0.9);
    background: transparent;
    border: none;
    border-radius: 6px;
    font: inherit;
    font-size: 0.85rem;
    text-transform: none;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .entrada-nombre-dropdown .opt-select:hover {
    background: rgba(134, 239, 172, 0.16);
    color: #fff;
  }
  .entrada-nombre-dropdown .opt-del {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.35);
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .entrada-nombre-dropdown .opt-del:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.25);
  }
  .entrada-nombre-edit-btn {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    background: transparent;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .entrada-nombre-edit-btn:hover {
    color: #fff;
    background: rgba(134, 239, 172, 0.16);
  }
  .entradas-total {
    margin-top: 0.6rem;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: right;
  }
  .entradas-total b {
    color: #fff;
    font-variant-numeric: tabular-nums;
  }

  /* ── Gastos ──────────────────────────────────────────────────────────── */
  .gastos {
    margin-top: 1.4rem;
  }
  .gastos-head {
    display: grid;
    grid-template-columns: 24px 1fr 145px 95px 44px 36px 28px;
    gap: 0.5rem;
    padding: 0 0.2rem 0.4rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.45);
  }
  .h-proyecto {
    grid-column: 2;
  }
  .h-tipo {
    grid-column: 3;
  }
  .h-monto {
    grid-column: 4;
  }
  .h-notas {
    grid-column: 5;
  }
  .h-pagado {
    grid-column: 6;
  }
  .gasto-row {
    display: grid;
    grid-template-columns: 24px 1fr 145px 95px 44px 36px 28px;
    gap: 0.5rem;
    align-items: center;
    padding: 0.35rem 0.2rem;
    border-radius: 8px;
    transition: background 0.15s ease;
  }
  .gasto-row.active {
    background: rgba(255, 255, 255, 0.06);
  }
  .swatch {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    flex-shrink: 0;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
  }
  .g-monto {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.35rem 0.55rem;
  }
  .g-monto .cur {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
  }
  .g-monto input {
    text-align: right;
    font-size: 1rem;
    font-weight: 600;
  }
  .g-nombre,
  .g-tipo {
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
  }
  .g-nombre,
  .g-tipo {
    font-size: 0.9rem;
  }

  /* ── Combobox de Tipo (propio, no <datalist> nativo) ────────────────────── */
  .tipo-wrap {
    position: relative;
  }
  .tipo-wrap .g-tipo {
    width: 100%;
    box-sizing: border-box;
    padding-right: 2.6rem;
  }
  .tipo-wrap .g-tipo.has-icon {
    padding-left: 1.7rem;
  }
  .tipo-icon-actual {
    position: absolute;
    top: 50%;
    left: 0.55rem;
    transform: translateY(-50%);
    display: inline-flex;
    color: rgba(134, 239, 172, 0.85);
    pointer-events: none;
  }
  .tipo-chevron {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.4);
    pointer-events: none;
  }
  .tipo-star {
    position: absolute;
    top: 50%;
    right: 1.5rem;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    color: rgba(250, 204, 21, 0.7);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .tipo-star:hover:not(:disabled) {
    color: #facc15;
    transform: translateY(-50%) scale(1.15);
  }
  .tipo-star:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .tipo-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 20;
    margin: 0;
    padding: 0.3rem;
    list-style: none;
    background: #0d3a1f;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .tipo-dropdown li {
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }
  .tipo-dropdown .opt-select {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex: 1;
    min-width: 0;
    text-align: left;
    padding: 0.4rem 0.55rem;
    color: rgba(255, 255, 255, 0.9);
    background: transparent;
    border: none;
    border-radius: 6px;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .tipo-dropdown .opt-select :global(svg) {
    flex-shrink: 0;
    color: rgba(134, 239, 172, 0.85);
  }
  .tipo-dropdown .opt-select:hover {
    background: rgba(134, 239, 172, 0.16);
    color: #fff;
  }
  .tipo-dropdown .opt-del {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.35);
    background: transparent;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .tipo-dropdown .opt-del:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.25);
  }

  /* ── Selector de ícono para el catálogo de Tipos ─────────────────────────── */
  .icono-picker {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 210px;
    z-index: 25;
    padding: 0.5rem;
    background: #0d3a1f;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .icono-picker-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.6);
    overflow: hidden;
  }
  .icono-picker-head span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icono-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.3rem;
  }
  .icono-opt {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  }
  .icono-opt:hover {
    background: rgba(134, 239, 172, 0.18);
    border-color: rgba(134, 239, 172, 0.4);
    color: #fff;
  }
  .icono-skip {
    display: block;
    width: 100%;
    margin-top: 0.4rem;
    padding: 0.35rem;
    font-size: 0.78rem;
    text-align: center;
    color: rgba(255, 255, 255, 0.55);
    background: transparent;
    border: 1px dashed rgba(255, 255, 255, 0.18);
    border-radius: 7px;
    cursor: pointer;
    transition: color 0.12s ease, border-color 0.12s ease;
  }
  .icono-skip:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
  }

  /* ── Notas: replegadas por default, botón que despliega un panel ────────── */
  .notas-wrap {
    position: relative;
    display: flex;
    justify-content: center;
  }
  .notas-toggle {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.35);
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .notas-toggle:hover {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.08);
  }
  .notas-toggle.has-content {
    color: #86efac;
    border-color: rgba(134, 239, 172, 0.35);
  }

  /* ── Pagado: ícono clicable que confirma que el proyecto ya se pagó ──────── */
  .pagado-toggle {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .pagado-toggle:hover {
    color: rgba(255, 255, 255, 0.75);
    background: rgba(255, 255, 255, 0.08);
  }
  .pagado-toggle.pagado {
    color: #86efac;
    background: rgba(134, 239, 172, 0.14);
    border-color: rgba(134, 239, 172, 0.4);
  }
  .pagado-toggle.pagado:hover {
    color: #a7f3c8;
  }
  .notas-panel {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 260px;
    z-index: 20;
    padding: 0.5rem;
    background: #0d3a1f;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  }
  .notas-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.5);
  }
  .notas-close {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    background: transparent;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
  }
  .notas-close:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
  .notas-panel textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 70px;
    resize: vertical;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    padding: 0.5rem;
    color: #fff;
    font: inherit;
    font-size: 0.85rem;
  }
  .notas-panel textarea:focus {
    outline: none;
    border-color: rgba(134, 239, 172, 0.7);
  }
  input {
    color: #fff;
    background: transparent;
    border: none;
    outline: none;
    font: inherit;
    min-width: 0;
  }
  input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
  /* Oculta las flechitas del number para un look más limpio */
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .del {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    line-height: 1;
    color: rgba(255, 255, 255, 0.5);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 7px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .del:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
  .add {
    margin-top: 0.6rem;
    width: 100%;
    padding: 0.55rem;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.05);
    border: 1px dashed rgba(255, 255, 255, 0.22);
    border-radius: 9px;
    cursor: pointer;
    font: inherit;
    transition: all 0.15s ease;
  }
  .add:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }

  /* ── Totales ─────────────────────────────────────────────────────────── */
  .totales {
    margin-top: 1.4rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .t-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
  }
  .t-row b {
    font-size: 1.05rem;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .t-row.over,
  .t-row.over b {
    color: #ff8585;
  }

  /* ── Chart ───────────────────────────────────────────────────────────── */
  .donut-wrap {
    display: flex;
    justify-content: center;
  }
  .donut {
    width: 100%;
    max-width: 260px;
    height: auto;
  }
  .seg {
    cursor: pointer;
    transition: stroke-width 0.15s ease, opacity 0.15s ease;
  }
  .seg.dim {
    opacity: 0.4;
  }
  .c-label {
    fill: rgba(255, 255, 255, 0.6);
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .c-monto {
    fill: #fff;
    font-size: 13px;
    font-weight: 600;
  }
  .c-monto.over {
    fill: #ff8585;
  }
  .c-sub {
    fill: rgba(255, 255, 255, 0.5);
    font-size: 6.5px;
  }

  /* ── Leyenda ─────────────────────────────────────────────────────────── */
  .legend {
    list-style: none;
    margin: 1.25rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .legend li {
    display: grid;
    grid-template-columns: 14px 1fr auto auto;
    gap: 0.6rem;
    align-items: center;
    padding: 0.4rem 0.5rem;
    border-radius: 7px;
    font-size: 0.9rem;
    transition: background 0.15s ease;
  }
  .legend li.active {
    background: rgba(255, 255, 255, 0.07);
  }
  .l-name {
    color: rgba(255, 255, 255, 0.9);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .l-val {
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .l-pct {
    color: rgba(255, 255, 255, 0.5);
    font-variant-numeric: tabular-nums;
    min-width: 2.5em;
    text-align: right;
  }
  .legend .empty {
    display: block;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.85rem;
    padding: 0.5rem;
  }

  /* ── Segunda gráfica: distribución por Tipo (barras horizontales) ───────── */
  .tipo-chart {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .chart-subtitle {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.6);
  }
  .tipo-bars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
  .tb-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    font-size: 0.85rem;
  }
  .tb-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.9);
  }
  .tb-val {
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .tb-pct {
    color: rgba(255, 255, 255, 0.5);
    font-variant-numeric: tabular-nums;
    min-width: 2.5em;
    text-align: right;
  }
  .tb-track {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .tb-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.2s ease;
  }
  .tipo-bars .empty {
    display: block;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.85rem;
  }
</style>
