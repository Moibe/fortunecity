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

  // Crece el textarea con su contenido (hasta el tope de max-height del CSS,
  // que sigue teniendo scroll de respaldo) para no tener que hacer scroll
  // con notas largas.
  function autoAltura(node: HTMLTextAreaElement) {
    function ajustar() {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    }
    ajustar(); // por si ya trae texto largo al abrir
    node.addEventListener('input', ajustar);
    return {
      destroy() {
        node.removeEventListener('input', ajustar);
      }
    };
  }

  // Enfoca el nodo por JS al montarlo — el atributo autofocus no le "roba" el
  // foco a un elemento que ya lo tiene (como el input de Tipo mientras editas
  // su catálogo), pero llamar .focus() explícito sí funciona.
  function enfocar(node: HTMLElement) {
    // Diferido al próximo frame: así gana cualquier carrera contra otros
    // eventos de foco/blur que sigan resolviéndose del clic que lo disparó.
    requestAnimationFrame(() => node.focus());
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
    Check,
    Tv,
    Heart,
    Gamepad2,
    Plane,
    GraduationCap,
    Dumbbell,
    PawPrint,
    Palette,
    Wine,
    Gift,
    Shirt,
    Fuel,
    Music,
    GripVertical
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
    { key: 'tag', Icono: Tag, label: 'General' },
    { key: 'tv', Icono: Tv, label: 'Streaming' },
    { key: 'heart', Icono: Heart, label: 'Salud' },
    { key: 'gamepad-2', Icono: Gamepad2, label: 'Gaming' },
    { key: 'plane', Icono: Plane, label: 'Viajes' },
    { key: 'graduation-cap', Icono: GraduationCap, label: 'Educación' },
    { key: 'dumbbell', Icono: Dumbbell, label: 'Ejercicio' },
    { key: 'paw-print', Icono: PawPrint, label: 'Mascotas' },
    { key: 'wine', Icono: Wine, label: 'Bares' },
    { key: 'gift', Icono: Gift, label: 'Regalos' },
    { key: 'shirt', Icono: Shirt, label: 'Ropa' },
    { key: 'fuel', Icono: Fuel, label: 'Gasolina' },
    { key: 'music', Icono: Music, label: 'Música' }
  ];
  const ICONOS_MAP: Record<string, typeof Banknote> = Object.fromEntries(
    ICONOS_DISPONIBLES.map((i) => [i.key, i.Icono])
  );

  type Gasto = {
    id: number;
    nombre: string;
    tipo: string;
    monto: number;
    fecha: string; // "YYYY-MM-DD" para <input type="date">, '' si no tiene
    notas: string;
    pagado: boolean;
    deudaId: number | null;
  };
  type TipoPresetItem = { nombre: string; icono: string | null };
  type EntradaItem = { id: number; nombre: string; monto: number; fecha: string };

  // Date | null (lo que carga Drizzle) <-> "YYYY-MM-DD" (lo que usa <input type="date">).
  function fechaAInput(d: Date | string | null | undefined): string {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function hoyInput(): string {
    return fechaAInput(new Date());
  }

  // Para ordenar por fecha: las vacías (sin fecha capturada) siempre se van al
  // final, sin importar si el orden es ascendente o descendente. Sin esto,
  // '' se compara como "la fecha más chica posible" y se amontonan al inicio.
  function compararFechaOrden(a: string, b: string, dir: number): number {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b) * dir;
  }

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

  // id del renglón cuyo selector de ícono está abierto (null = ninguno), y el
  // nombre del Tipo AL QUE se le está eligiendo ícono (puede venir del texto
  // escrito en el campo -estrellita- o de una entrada del catálogo -dropdown-).
  let iconoPickerFor = $state<number | null>(null);
  let iconoPickerObjetivo = $state<string | null>(null);
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
          existente.icono = icono; // puede ser null (quitar el ícono)
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
      iconoPickerObjetivo = null;
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

  // Renombrar un Tipo: cambia el catálogo Y, vía el servidor, TODOS los
  // renglones ya guardados (de cualquier quincena) que usaban el nombre viejo.
  let renombrandoTipo = $state<string | null>(null); // nombre actual que se está editando
  let nuevoNombreTipo = $state('');
  let guardandoRenombreTipo = $state(false);
  function iniciarRenombreTipo(nombreActual: string) {
    renombrandoTipo = nombreActual;
    nuevoNombreTipo = nombreActual;
  }
  async function confirmarRenombreTipo() {
    const viejo = renombrandoTipo;
    const nuevo = nuevoNombreTipo.trim();
    if (!viejo || guardandoRenombreTipo) return;
    if (!nuevo || nuevo.toLowerCase() === viejo.toLowerCase()) {
      renombrandoTipo = null;
      openTipoFor = null;
      return;
    }
    guardandoRenombreTipo = true;
    try {
      const body = new FormData();
      body.set('nombreViejo', viejo);
      body.set('nombreNuevo', nuevo);
      const response = await fetch('?/renombrarTipo', { method: 'POST', body });
      const result = deserialize(await response.text());
      if (result.type === 'success') {
        const idx = tiposPresetList.findIndex((t) => t.nombre.toLowerCase() === viejo.toLowerCase());
        const yaExisteNuevo = tiposPresetList.some(
          (t) => t.nombre.toLowerCase() === nuevo.toLowerCase() && t.nombre.toLowerCase() !== viejo.toLowerCase()
        );
        if (idx !== -1) {
          if (yaExisteNuevo) {
            tiposPresetList.splice(idx, 1); // se fusionó con el que ya existía
          } else {
            tiposPresetList[idx] = { ...tiposPresetList[idx], nombre: nuevo };
          }
          tiposPresetList.sort((a, b) => a.nombre.localeCompare(b.nombre));
        }
        // Refleja el cambio en los gastos ya cargados, si no el próximo
        // autoguardado reescribiría el nombre viejo encima del renombrado.
        for (const g of gastos) {
          if (g.tipo.trim().toLowerCase() === viejo.toLowerCase()) g.tipo = nuevo;
        }
      }
    } catch (e) {
      console.error('No se pudo renombrar el tipo', e);
    } finally {
      guardandoRenombreTipo = false;
      renombrandoTipo = null;
      openTipoFor = null;
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
      fecha: fechaAInput(r.fecha),
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
      monto: e.monto,
      fecha: fechaAInput(e.fecha)
    }));
    // Sin quincena cargada: default sensato a partir de la fecha de hoy.
    const hoy = new Date();
    return {
      id: q?.id ?? null,
      entradas:
        entradasRows.length > 0
          ? entradasRows
          : [{ id: 1, nombre: '', monto: q?.total ?? 0, fecha: fechaAInput(hoy) }],
      remanenteAnterior: q?.remanenteAnterior ?? 0,
      anio: q?.anio ?? hoy.getFullYear(),
      mes: q?.mes ?? hoy.getMonth() + 1,
      corte: q?.corte ?? (hoy.getDate() <= 15 ? 15 : 30),
      gastos:
        rows.length > 0
          ? rows
          : [{ id: 1, nombre: '', tipo: '', monto: 0, fecha: fechaAInput(hoy), notas: '', pagado: false, deudaId: null }]
    };
  });

  let quincenaId = $state<number | null>(inicial.id);
  let entradas = $state<EntradaItem[]>(inicial.entradas);
  let nextEntradaId = Math.max(0, ...inicial.entradas.map((e) => e.id)) + 1;
  const total = $derived(entradas.reduce((s, e) => s + (Number(e.monto) || 0), 0));
  function agregarEntrada() {
    entradas.push({ id: nextEntradaId++, nombre: '', monto: 0, fecha: hoyInput() });
  }
  function quitarEntrada(id: number) {
    entradas = entradas.filter((e) => e.id !== id);
    if (entradas.length === 0) entradas.push({ id: nextEntradaId++, nombre: '', monto: 0, fecha: hoyInput() });
  }

  // Número "Entrada N" ESTABLE (orden en que se agregaron), para que no cambie
  // solo porque ordenaste la tabla distinto.
  const entradaNumeroPorId = $derived.by((): Map<number, number> => {
    const map = new Map<number, number>();
    entradas.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  });

  // ── Orden de la tabla de Entradas por columna (clic en el encabezado) ───────
  type EntradaSortCol = 'nombre' | 'fecha' | 'monto';
  let entradaSortCol = $state<EntradaSortCol | null>(null);
  let entradaSortAsc = $state(true);
  function ordenarEntradasPor(col: EntradaSortCol) {
    if (entradaSortCol === col) {
      entradaSortAsc = !entradaSortAsc;
    } else {
      entradaSortCol = col;
      entradaSortAsc = true;
    }
  }
  const entradasOrdenadas = $derived.by((): EntradaItem[] => {
    if (!entradaSortCol) return entradas;
    const dir = entradaSortAsc ? 1 : -1;
    const col = entradaSortCol;
    return [...entradas].sort((a, b) => {
      if (col === 'monto') return ((Number(a.monto) || 0) - (Number(b.monto) || 0)) * dir;
      if (col === 'fecha') return compararFechaOrden(a.fecha, b.fecha, dir);
      return a[col].localeCompare(b[col]) * dir;
    });
  });
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
      entradas: entradas.map((e) => ({ nombre: e.nombre, monto: e.monto, fecha: e.fecha || null })),
      remanenteAnterior,
      anio,
      mes,
      corte,
      renglones: gastos.map((g) => ({
        nombre: g.nombre,
        tipo: g.tipo,
        monto: g.monto,
        fecha: g.fecha || null,
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

  // Color por gasto ESTABLE por id de creación (no por posición en el arreglo),
  // para que ni ordenar columnas ni arrastrar renglones le cambie el color a
  // nadie — la dona y el puntito de la tabla siempre lo leen de aquí.
  const colorPorGastoId = $derived.by((): Map<number, string> => {
    const map = new Map<number, string>();
    [...gastos]
      .filter((g) => (Number(g.monto) || 0) > 0)
      .sort((a, b) => a.id - b.id)
      .forEach((g, i) => map.set(g.id, PALETTE[i % PALETTE.length]));
    return map;
  });

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
        color: colorPorGastoId.get(g.id) ?? PALETTE[i % PALETTE.length],
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

  // ── Orden de la tabla de Gastos por columna (clic en el encabezado) ─────────
  type GastoSortCol = 'nombre' | 'tipo' | 'fecha' | 'monto' | 'pagado';
  let gastoSortCol = $state<GastoSortCol | null>(null);
  let gastoSortAsc = $state(true);
  function ordenarGastosPor(col: GastoSortCol) {
    if (gastoSortCol === col) {
      gastoSortAsc = !gastoSortAsc;
    } else {
      gastoSortCol = col;
      gastoSortAsc = true;
    }
  }
  const gastosOrdenados = $derived.by((): Gasto[] => {
    if (!gastoSortCol) return gastos;
    const dir = gastoSortAsc ? 1 : -1;
    const col = gastoSortCol;
    return [...gastos].sort((a, b) => {
      if (col === 'monto') return ((Number(a.monto) || 0) - (Number(b.monto) || 0)) * dir;
      if (col === 'pagado') return ((a.pagado ? 1 : 0) - (b.pagado ? 1 : 0)) * dir;
      if (col === 'fecha') return compararFechaOrden(a.fecha, b.fecha, dir);
      // nombre / tipo son texto.
      return a[col].localeCompare(b[col]) * dir;
    });
  });

  // Qué mostrar en el centro de la dona.
  const centro = $derived.by(() => {
    if (hovered !== null) {
      const s = segments.find((x) => x.id === hovered);
      if (s) return { label: s.nombre, monto: s.monto, sub: `${pct(s.monto).toFixed(1)}%` };
    }
    if (sobregiro) return { label: 'Te pasaste', monto: restante, sub: 'sobregiro' };
    return { label: 'Restante', monto: restante, sub: disponible > 0 ? `${pct(restante).toFixed(1)}%` : '—' };
  });

  type TipoRow = { tipo: string; monto: number; color: string };

  // Distribución agrupada por Tipo (en vez de por proyecto). Mismo denominador
  // que la dona principal, así los porcentajes de ambas gráficas son comparables.
  // Restante NO es un tipo — no entra a esta lista, se muestra aparte.
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
    return rows.sort((a, b) => b.monto - a.monto);
  });

  // ── Reordenar Gastos arrastrando (además del orden por columna) ─────────────
  // Arrastre 100% manual con Pointer Events (no drag-and-drop nativo del
  // navegador): así el "fantasma" que sigue al cursor lo dibujamos nosotros
  // -con su color y todo- en vez de depender del preview nativo, que varía
  // entre navegadores y no siempre incluye los hijos del elemento arrastrado.
  let dragGastoId = $state<number | null>(null);
  let dragOverGastoId = $state<number | null>(null);
  let dragPointer = $state<{ x: number; y: number } | null>(null);

  function soltarGasto(draggedId: number, targetId: number) {
    const orden = gastosOrdenados;
    const fromIdx = orden.findIndex((x) => x.id === draggedId);
    const toIdx = orden.findIndex((x) => x.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const nuevo = [...orden];
    const [movido] = nuevo.splice(fromIdx, 1);
    nuevo.splice(toIdx, 0, movido);

    gastos = nuevo;
    gastoSortCol = null; // el arrastre manual toma el control del orden
  }

  function iniciarArrastreGasto(e: PointerEvent, id: number) {
    e.preventDefault();
    dragGastoId = id;
    dragPointer = { x: e.clientX, y: e.clientY };

    function onMove(ev: PointerEvent) {
      dragPointer = { x: ev.clientX, y: ev.clientY };
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const fila = el?.closest('.gasto-row') as HTMLElement | null;
      const idAttr = fila?.dataset.gastoId;
      dragOverGastoId = idAttr ? Number(idAttr) : null;
    }
    function onEnd() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      const targetId = dragOverGastoId;
      dragGastoId = null;
      dragOverGastoId = null;
      dragPointer = null;
      if (targetId !== null && targetId !== id) soltarGasto(id, targetId);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  function agregar() {
    gastos.push({ id: nextId++, nombre: '', tipo: '', monto: 0, fecha: hoyInput(), notas: '', pagado: false, deudaId: null });
  }
  function quitar(id: number) {
    gastos = gastos.filter((g) => g.id !== id);
    if (gastos.length === 0)
      gastos.push({ id: nextId++, nombre: '', tipo: '', monto: 0, fecha: hoyInput(), notas: '', pagado: false, deudaId: null });
  }
</script>

<div class="qnc">
  <div class="qnc-grid">
    <!-- ── Captura ─────────────────────────────────────────────────────── -->
    <section class="capture">
      <div class="top-row">
        <div class="quincena-field">
          <span class="q-badge" title="Quincena" aria-label="Quincena">Q</span>
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
        <span class="save-status" class:dirty>
          {guardando ? 'Guardando…' : dirty ? 'Sin guardar…' : 'Guardado ✓'}
        </span>
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
        <button class="add" type="button" onclick={agregarEntrada}>+ Agregar entrada</button>

        <div class="entradas-head">
          <span></span>
          <button type="button" class="h-entrada-nombre sortable" onclick={() => ordenarEntradasPor('nombre')}>
            Nombre
            {#if entradaSortCol === 'nombre'}<span class="sort-arrow">{entradaSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
          <button type="button" class="h-entrada-fecha sortable" onclick={() => ordenarEntradasPor('fecha')}>
            Fecha
            {#if entradaSortCol === 'fecha'}<span class="sort-arrow">{entradaSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
          <button type="button" class="h-entrada-monto sortable" onclick={() => ordenarEntradasPor('monto')}>
            Monto
            {#if entradaSortCol === 'monto'}<span class="sort-arrow">{entradaSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
        </div>

        <div class="entrada-row">
          <span class="entrada-marker" aria-hidden="true">💵</span>
          <span class="entrada-row-label">Remanente Anterior</span>
          <span></span>
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
        {#each entradasOrdenadas as entrada (entrada.id)}
          <div class="entrada-row">
            <span class="entrada-marker" aria-hidden="true">💵</span>
            <div class="entrada-nombre-cell">
              {@render nombreEntrada(entrada, `Entrada ${entradaNumeroPorId.get(entrada.id)}`, 'entrada-row-label')}
            </div>
            <input class="entrada-fecha" type="date" bind:value={entrada.fecha} />
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

        <div class="entradas-total">Disponible (entradas + remanente): <b>{fmt.format(disponible)}</b></div>
      </div>

      <div class="gastos">
        <button class="add" type="button" onclick={agregar}>+ Agregar proyecto</button>

        <div class="gastos-head">
          <button
            type="button"
            class="h-manual"
            class:active={gastoSortCol === null}
            onclick={() => (gastoSortCol = null)}
            aria-label="Orden manual (el que armaste arrastrando)"
            title="Orden manual (el que armaste arrastrando)"
          >
            <GripVertical size={12} />
          </button>
          <button type="button" class="h-proyecto sortable" onclick={() => ordenarGastosPor('nombre')}>
            Proyecto
            {#if gastoSortCol === 'nombre'}<span class="sort-arrow">{gastoSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
          <button type="button" class="h-tipo sortable" onclick={() => ordenarGastosPor('tipo')}>
            Tipo
            {#if gastoSortCol === 'tipo'}<span class="sort-arrow">{gastoSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
          <button type="button" class="h-fecha sortable" onclick={() => ordenarGastosPor('fecha')}>
            Fecha
            {#if gastoSortCol === 'fecha'}<span class="sort-arrow">{gastoSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
          <button type="button" class="h-monto sortable" onclick={() => ordenarGastosPor('monto')}>
            Monto
            {#if gastoSortCol === 'monto'}<span class="sort-arrow">{gastoSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
          <span class="h-notas">Notas</span>
          <button type="button" class="h-pagado sortable" onclick={() => ordenarGastosPor('pagado')}>
            Pagado
            {#if gastoSortCol === 'pagado'}<span class="sort-arrow">{gastoSortAsc ? '▲' : '▼'}</span>{/if}
          </button>
        </div>

        {#each gastosOrdenados as g (g.id)}
          <div
            class="gasto-row"
            class:active={hovered === g.id}
            class:dragging={dragGastoId === g.id}
            class:drag-over={dragOverGastoId === g.id && dragGastoId !== null && dragGastoId !== g.id}
            data-gasto-id={g.id}
            onmouseenter={() => (hovered = g.id)}
            onmouseleave={() => (hovered = null)}
            role="listitem"
          >
            <button
              type="button"
              class="drag-handle"
              onpointerdown={(e) => iniciarArrastreGasto(e, g.id)}
              aria-label="Arrastrar para reordenar"
              title="Arrastrar para reordenar"
            >
              <GripVertical size={14} />
            </button>
            <span class="swatch" style="background: {colorPorGastoId.get(g.id) ?? 'rgba(255,255,255,0.3)'}"></span>
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
                onblur={(e) => {
                  if (renombrandoTipo !== null) return; // hay un renombre en curso; no cierres el combobox
                  const wrap = (e.currentTarget as HTMLElement).closest('.tipo-wrap');
                  const next = e.relatedTarget as Node | null;
                  if (wrap && next && wrap.contains(next)) return; // el foco solo se movió a un botón del mismo combobox
                  openTipoFor = null;
                }}
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
                    iconoPickerObjetivo = g.tipo.trim();
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
                      {#if renombrandoTipo === t.nombre}
                        <input
                          class="opt-rename-input"
                          type="text"
                          bind:value={nuevoNombreTipo}
                          use:enfocar
                          onkeydown={(e) => {
                            if (e.key === 'Enter') confirmarRenombreTipo();
                            if (e.key === 'Escape') {
                              renombrandoTipo = null;
                              openTipoFor = null;
                            }
                          }}
                        />
                        <button
                          type="button"
                          class="opt-del"
                          onmousedown={(e) => e.preventDefault()}
                          onclick={confirmarRenombreTipo}
                          aria-label="Confirmar nuevo nombre"
                          title="Confirmar (cambia todos los gastos que usan '{t.nombre}')"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          class="opt-del"
                          onmousedown={(e) => e.preventDefault()}
                          onclick={() => {
                            renombrandoTipo = null;
                            openTipoFor = null;
                          }}
                          aria-label="Cancelar renombrado"
                          title="Cancelar"
                        >
                          ×
                        </button>
                      {:else}
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
                          class="opt-rename"
                          onmousedown={(e) => e.preventDefault()}
                          onclick={() => {
                            openTipoFor = null;
                            iconoPickerObjetivo = t.nombre;
                            iconoPickerFor = g.id;
                          }}
                          aria-label="{Icono ? 'Cambiar' : 'Elegir'} ícono de '{t.nombre}'"
                          title="{Icono ? 'Cambiar' : 'Elegir'} ícono"
                        >
                          <Palette size={12} />
                        </button>
                        <button
                          type="button"
                          class="opt-rename"
                          onmousedown={(e) => e.preventDefault()}
                          onclick={() => iniciarRenombreTipo(t.nombre)}
                          aria-label="Renombrar '{t.nombre}'"
                          title="Renombrar (cambia todos los gastos que ya usan este tipo)"
                        >
                          <Pencil size={12} />
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
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if iconoPickerFor === g.id}
                {@const objetivo = iconoPickerObjetivo ?? g.tipo}
                <div class="icono-picker">
                  <div class="icono-picker-head">
                    <span>Ícono para "{objetivo.trim()}"</span>
                    <button
                      type="button"
                      class="notas-close"
                      onclick={() => {
                        iconoPickerFor = null;
                        iconoPickerObjetivo = null;
                      }}
                      aria-label="Cerrar selector de ícono"
                    >
                      ×
                    </button>
                  </div>
                  <div class="icono-grid">
                    {#each ICONOS_DISPONIBLES as opt (opt.key)}
                      {@const OptIcono = opt.Icono}
                      <button
                        type="button"
                        class="icono-opt"
                        title={opt.label}
                        onmousedown={(e) => e.preventDefault()}
                        onclick={() => elegirIconoTipo(objetivo, opt.key)}
                      >
                        <OptIcono size={16} />
                      </button>
                    {/each}
                  </div>
                  <button
                    type="button"
                    class="icono-skip"
                    onmousedown={(e) => e.preventDefault()}
                    onclick={() => elegirIconoTipo(objetivo, null)}
                  >
                    Sin ícono
                  </button>
                </div>
              {/if}
            </div>
            <input class="g-fecha" type="date" bind:value={g.fecha} />
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
                  <textarea
                    bind:value={g.notas}
                    placeholder="Notas (opcional)"
                    rows="3"
                    autofocus
                    use:autoAltura
                  ></textarea>
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

        {#if dragGastoId !== null && dragPointer}
          {@const arrastrado = gastos.find((x) => x.id === dragGastoId)}
          {#if arrastrado}
            <div class="drag-ghost" style="left: {dragPointer.x}px; top: {dragPointer.y}px;">
              <span class="swatch" style="background: {colorPorGastoId.get(arrastrado.id) ?? 'rgba(255,255,255,0.3)'}"></span>
              <span>{arrastrado.nombre.trim() || 'Sin nombre'}</span>
            </div>
          {/if}
        {/if}
      </div>

      <div class="totales">
        <div class="t-row"><span>Asignado</span><b>{fmt.format(asignado)}</b></div>
        <div class="t-row" class:over={sobregiro}>
          <span>{sobregiro ? 'Sobregiro' : 'Restante'}</span>
          <b>{fmt.format(restante)}</b>
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
        {#if !sobregiro && restante > 0}
          <div class="tipo-restante">
            <span class="swatch" style="background: {RESTANTE_COLOR}"></span>
            <span class="tr-name">Restante</span>
            <span class="tr-val">{fmt.format(restante)}</span>
            <span class="tr-pct">{pct(restante).toFixed(0)}%</span>
          </div>
        {/if}
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
  .save-status {
    display: block;
    width: fit-content;
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
      align-items: stretch;
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
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  /* ── Quincena (mes / corte / año) ───────────────────────────────────────── */
  .quincena-field {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .q-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border-radius: 6px;
    background: rgba(134, 239, 172, 0.16);
    border: 1px solid rgba(134, 239, 172, 0.35);
    color: #86efac;
    font-size: 0.75rem;
    font-weight: 700;
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

  /* ── Entradas: listado parejo, mismo lenguaje visual que Gastos ──────────── */
  .entradas-field {
    margin-bottom: 1.4rem;
  }
  .entradas-head {
    display: grid;
    grid-template-columns: 24px 1fr 140px 130px 28px;
    gap: 0.5rem;
    padding: 0 0.2rem 0.4rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.45);
  }
  .entradas-head .sortable {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .entradas-head .sortable:hover {
    color: rgba(255, 255, 255, 0.85);
  }
  .entrada-row {
    display: grid;
    grid-template-columns: 24px 1fr 140px 130px 28px;
    gap: 0.5rem;
    align-items: center;
    padding: 0.35rem 0.2rem;
    border-radius: 8px;
  }
  .entrada-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    line-height: 1;
    flex-shrink: 0;
  }
  .entrada-fecha {
    color-scheme: dark;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
    width: 100%;
    box-sizing: border-box;
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
    grid-template-columns: 18px 24px minmax(160px, 260px) 190px 140px 95px 44px 36px 28px;
    gap: 0.5rem;
    padding: 0 0.2rem 0.4rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.45);
  }
  .gastos-head .sortable {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .gastos-head .sortable:hover {
    color: rgba(255, 255, 255, 0.85);
  }
  .sort-arrow {
    font-size: 0.7em;
    color: #86efac;
  }
  .h-manual {
    grid-column: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .h-manual:hover {
    color: rgba(255, 255, 255, 0.7);
  }
  .h-manual.active {
    color: #86efac;
  }
  .h-proyecto {
    grid-column: 3;
  }
  .h-tipo {
    grid-column: 4;
  }
  .h-fecha {
    grid-column: 5;
  }
  .h-monto {
    grid-column: 6;
  }
  .h-notas {
    grid-column: 7;
  }
  .h-pagado {
    grid-column: 8;
  }
  .gasto-row {
    display: grid;
    grid-template-columns: 18px 24px minmax(160px, 260px) 190px 140px 95px 44px 36px 28px;
    gap: 0.5rem;
    align-items: center;
    padding: 0.22rem 0.2rem;
    border-radius: 8px;
    transition: background 0.15s ease;
  }
  .gasto-row.active {
    background: rgba(255, 255, 255, 0.06);
  }
  .gasto-row.dragging {
    opacity: 0.4;
  }
  .gasto-row.drag-over {
    background: rgba(134, 239, 172, 0.12);
    box-shadow: inset 0 0 0 1px rgba(134, 239, 172, 0.35);
  }
  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 0;
    color: rgba(255, 255, 255, 0.3);
    cursor: grab;
    touch-action: none;
  }
  .drag-handle:hover {
    color: rgba(255, 255, 255, 0.7);
  }
  .drag-handle:active {
    cursor: grabbing;
  }
  .drag-ghost {
    position: fixed;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    background: rgba(15, 46, 33, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    transform: translate(-16px, -50%);
  }
  .drag-ghost .swatch {
    width: 12px;
    height: 12px;
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
  .g-fecha {
    color-scheme: dark;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    font-size: 0.82rem;
    width: 100%;
    box-sizing: border-box;
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
  .tipo-dropdown .opt-rename {
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
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .tipo-dropdown .opt-rename:hover {
    color: #fff;
    background: rgba(134, 239, 172, 0.2);
  }
  .opt-rename-input {
    flex: 1;
    min-width: 0;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(134, 239, 172, 0.5);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    color: #fff;
    font: inherit;
    font-size: 0.85rem;
  }
  .opt-rename-input:focus {
    outline: none;
    border-color: rgba(134, 239, 172, 0.9);
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
    max-height: 320px;
    overflow-y: auto;
    resize: none;
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
    margin-bottom: 0.6rem;
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
  .tipo-restante {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.85rem;
    padding-top: 0.7rem;
    border-top: 1px dashed rgba(255, 255, 255, 0.14);
    font-size: 0.9rem;
  }
  .tr-name {
    flex: 1;
    color: rgba(255, 255, 255, 0.6);
  }
  .tr-val {
    color: rgba(255, 255, 255, 0.85);
    font-variant-numeric: tabular-nums;
  }
  .tr-pct {
    color: rgba(255, 255, 255, 0.45);
    font-variant-numeric: tabular-nums;
    min-width: 2.5em;
    text-align: right;
  }
</style>
