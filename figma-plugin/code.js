// Remate — dibuja las pantallas del vendedor en el estilo de la Propuesta 2 ("Vitrina local").
// Uso: Figma de escritorio > Plugins > Development > Import plugin from manifest… > elegir manifest.json.
// Luego, con el archivo de Remate abierto: Plugins > Development > "Remate — Pantallas del vendedor".
// Solo crea nodos nuevos a la derecha del contenido existente; no modifica ni borra nada.

(async () => {
  try {
    await Promise.all([
      figma.loadFontAsync({ family: 'Outfit', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Outfit', style: 'Bold' }),
    ]);
  } catch (e) {
    figma.closePlugin('No se encontró la fuente Outfit en este archivo. Ábrelo en el archivo de diseños de Remate.');
    return;
  }

  const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
  const C = { fondo: '#f5f0e5', exterior: '#e5e2d5', sup: '#fffcf6', suave: '#dde9d8', arena: '#ebe2d0', prim: '#1d5a42', tinta: '#20382d', tenue: '#657267', borde: '#e3dccd' };
  const fill = (h) => [{ type: 'SOLID', color: hex(h) }];

  function txt(s, size, bold, color) {
    const t = figma.createText();
    t.fontName = { family: 'Outfit', style: bold ? 'Bold' : 'Regular' };
    t.characters = s;
    t.fontSize = size;
    t.fills = fill(color);
    return t;
  }

  // Marco con auto layout que se ajusta a su contenido.
  function box(dir, p = {}) {
    const f = figma.createFrame();
    f.layoutMode = dir;
    f.primaryAxisSizingMode = 'AUTO';
    f.counterAxisSizingMode = 'AUTO';
    f.fills = p.bg ? fill(p.bg) : [];
    f.clipsContent = false;
    if (p.name) f.name = p.name;
    f.itemSpacing = p.gap != null ? p.gap : 0;
    const pad = p.pad != null ? p.pad : 0;
    f.paddingTop = p.pt != null ? p.pt : pad;
    f.paddingBottom = p.pb != null ? p.pb : pad;
    f.paddingLeft = p.pl != null ? p.pl : pad;
    f.paddingRight = p.pr != null ? p.pr : pad;
    if (p.r) f.cornerRadius = p.r;
    if (p.stroke) { f.strokes = fill(p.stroke); f.strokeWeight = 1.5; }
    if (p.between) f.primaryAxisAlignItems = 'SPACE_BETWEEN';
    if (p.center) f.counterAxisAlignItems = 'CENTER';
    if (p.mainCenter) f.primaryAxisAlignItems = 'CENTER';
    return f;
  }
  function add(parent, child, fillW) { parent.appendChild(child); if (fillW) child.layoutSizingHorizontal = 'FILL'; return child; }
  function wrapText(parent, t) { parent.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; return t; }
  function boton(texto, sec) {
    const b = box('HORIZONTAL', { name: 'Botón / ' + texto, bg: sec ? null : C.prim, r: 12, pl: 24, pr: 24, center: true, mainCenter: true, stroke: C.prim });
    b.resize(100, 48); b.counterAxisSizingMode = 'FIXED'; b.primaryAxisSizingMode = 'AUTO';
    b.appendChild(txt(texto, 14, true, sec ? C.prim : C.sup));
    return b;
  }
  function chip(texto, bg, fg, borde) {
    const c = box('HORIZONTAL', { name: 'Chip / ' + texto, bg, r: 30, pt: 8, pb: 8, pl: 12, pr: 12, stroke: borde });
    c.appendChild(txt(texto, 12, true, fg));
    return c;
  }
  const estadoChip = (e) => ({
    abierta: () => chip('En curso', C.suave, C.prim),
    programada: () => chip('Lista para abrir', C.sup, C.prim, C.suave),
    borrador: () => chip('Borrador', C.arena, C.tinta),
    cerrada: () => chip('Cerrada', C.tinta, C.sup),
  })[e]();
  function pantalla(nombre, ancho, movil) {
    const f = box('VERTICAL', { name: nombre, bg: C.fondo, r: 20, gap: movil ? 16 : 22, pt: movil ? 24 : 0, pb: movil ? 32 : 40, pl: movil ? 24 : 32, pr: movil ? 24 : 32 });
    f.resize(ancho, 100); f.counterAxisSizingMode = 'FIXED'; f.primaryAxisSizingMode = 'AUTO';
    return f;
  }
  function nav(p, activo) {
    const n = box('HORIZONTAL', { name: 'Navegación', between: true, center: true, pt: 28, pb: 6 });
    add(p, n, true);
    n.appendChild(txt('remate.', 34, true, C.prim));
    const l = box('HORIZONTAL', { name: 'Enlaces', gap: 30 });
    for (const e of ['Explorar subastas', 'Mis subastas', 'Nueva subasta', 'Cochabamba, Bolivia']) l.appendChild(txt(e, 14, e === activo, e === activo ? C.prim : C.tenue));
    n.appendChild(l);
    n.appendChild(boton('Casa Norte · Vendedor', true));
  }
  function campo(p, etiqueta, valor, ayuda) {
    const c = box('VERTICAL', { name: 'Campo / ' + etiqueta, gap: 6 }); add(p, c, true);
    c.appendChild(txt(etiqueta, 14, true, C.tinta));
    const e = box('HORIZONTAL', { name: 'Entrada', bg: C.fondo, r: 10, pl: 14, pr: 14, center: true });
    e.resize(100, 48); e.counterAxisSizingMode = 'FIXED';
    add(c, e, true);
    e.appendChild(txt(valor, 16, false, C.tinta));
    if (ayuda) wrapText(c, txt(ayuda, 12, false, C.tenue));
    return c;
  }

  // ── Contenedor a la derecha del contenido existente ──
  let maxX = 0;
  for (const n of figma.currentPage.children) maxX = Math.max(maxX, n.x + n.width);
  const wrapper = box('HORIZONTAL', { name: 'Remate / Vendedor (sobre Vitrina local)', bg: C.exterior, gap: 48, pad: 48 });
  wrapper.x = maxX + 200; wrapper.y = 120; wrapper.counterAxisAlignItems = 'MIN';

  // ── 1. Panel «Mis subastas» ──
  const panel = pantalla('Vendedor / Panel «Mis subastas» (escritorio)', 1280); wrapper.appendChild(panel);
  nav(panel, 'Mis subastas');
  const hero = box('HORIZONTAL', { name: 'Bienvenida', bg: C.suave, r: 24, pad: 28, between: true, center: true }); add(panel, hero, true);
  const heroT = box('VERTICAL', { gap: 8 }); hero.appendChild(heroT);
  heroT.appendChild(txt('@casanorte.cbba · Cochabamba', 14, false, C.tenue));
  heroT.appendChild(txt('Hola, Casa Norte.', 40, true, C.prim));
  heroT.appendChild(txt('Prepara tus subastas antes del live y abre la sala cuando presentes el producto.', 14, false, C.tenue));
  hero.appendChild(boton('Nueva subasta'));
  const met = box('HORIZONTAL', { name: 'Resumen', gap: 20 }); add(panel, met, true);
  for (const [k, v] of [['En curso', '1'], ['Por abrir o en borrador', '2'], ['Cerradas', '1']]) {
    const m = box('VERTICAL', { name: 'Métrica / ' + k, bg: C.sup, r: 18, pad: 24, gap: 4 }); add(met, m); m.layoutSizingHorizontal = 'FILL';
    m.appendChild(txt(k, 14, false, C.tenue)); m.appendChild(txt(v, 40, true, C.prim));
  }
  const tabla = box('VERTICAL', { name: 'Mis subastas', bg: C.sup, r: 18, pad: 24 }); add(panel, tabla, true);
  tabla.appendChild(txt('Mis subastas', 22, true, C.tinta));
  const cols = [250, 170, 110, 150, 70, 200];
  function fila(celdas, encabezado) {
    const r = box('HORIZONTAL', { name: encabezado ? 'Encabezado' : 'Fila', center: true, pt: encabezado ? 18 : 16, pb: encabezado ? 10 : 16 }); add(tabla, r, true);
    if (!encabezado) { r.strokes = fill(C.borde); r.strokeTopWeight = 1; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; }
    celdas.forEach((c, i) => {
      const cell = box('VERTICAL', { gap: 2 });
      cell.resize(cols[i] || 120, 20); cell.counterAxisSizingMode = 'FIXED'; cell.primaryAxisSizingMode = 'AUTO';
      r.appendChild(cell);
      if (i === celdas.length - 1) { cell.layoutSizingHorizontal = 'FILL'; cell.counterAxisAlignItems = 'MAX'; }
      if (typeof c === 'string') cell.appendChild(txt(c, encabezado ? 12 : 14, false, encabezado ? C.tenue : C.tinta));
      else for (const n of c) cell.appendChild(n);
    });
  }
  fila(['Producto', 'Estado', 'Sala', 'Oferta vigente', 'Pujas', 'Resultado', ''], true);
  const datos = [
    ['Sillón de lectura', 'Hogar', 'abierta', 'RM-4821', 'Bs 120', '12', 'En curso', 'Ir a la sala'],
    ['Lámpara de mesa', 'Hogar', 'programada', 'RM-2056', 'Desde Bs 50', '0', 'Dura 03:00', 'Preparar'],
    ['Cámara analógica', 'Coleccionables', 'borrador', 'RM-9034', 'Desde Bs 200', '0', 'Dura 05:00', 'Preparar'],
    ['Silla de madera', 'Hogar', 'cerrada', 'RM-7310', 'Bs 75', '7', 'Rocío · Bs 75', 'Ver resultado'],
  ];
  for (const d of datos) {
    fila([[txt(d[0], 14, true, C.tinta), txt(d[1], 12, false, C.tenue)], [estadoChip(d[2])], [txt(d[3], 13, false, C.tinta)],
      [txt(d[4], 14, false, d[4].startsWith('Desde') ? C.tenue : C.tinta)], d[5], d[6], [boton(d[7], true)]]);
  }

  // ── 2. Nueva subasta ──
  const nueva = pantalla('Vendedor / Nueva subasta (escritorio)', 1280); wrapper.appendChild(nueva);
  nav(nueva, 'Nueva subasta');
  const cols2 = box('HORIZONTAL', { name: 'Contenido', gap: 24 }); add(nueva, cols2, true); cols2.counterAxisAlignItems = 'MIN';
  const form = box('VERTICAL', { name: 'Formulario', bg: C.sup, r: 18, pad: 24, gap: 20 }); cols2.appendChild(form);
  form.resize(720, 100); form.counterAxisSizingMode = 'FIXED'; form.primaryAxisSizingMode = 'AUTO';
  form.appendChild(txt('Nueva subasta', 26, true, C.tinta));
  campo(form, 'Producto', 'Sillón de lectura');
  const dos1 = box('HORIZONTAL', { gap: 16 }); add(form, dos1, true);
  campo(dos1, 'Categoría', 'Hogar').layoutSizingHorizontal = 'FILL';
  campo(dos1, 'Duración', '3 minutos', 'Empieza a contar cuando abras la sala.').layoutSizingHorizontal = 'FILL';
  campo(form, 'Descripción (opcional)', 'Estado, medidas, detalles que mostrarás en el live');
  const dos2 = box('HORIZONTAL', { gap: 16 }); add(form, dos2, true);
  campo(dos2, 'Precio inicial (Bs)', '80', 'La primera puja debe alcanzar este monto.').layoutSizingHorizontal = 'FILL';
  campo(dos2, 'Incremento mínimo (Bs)', '10', 'Cada puja debe superar la vigente al menos por este monto.').layoutSizingHorizontal = 'FILL';
  const av = box('HORIZONTAL', { name: 'Aviso / ampliación', bg: C.suave, r: 10, pad: 14 }); add(form, av, true);
  wrapText(av, txt('Si llega una puja en los últimos segundos, el cierre se ampliará. Los segundos exactos de esa regla todavía no están definidos.', 13, false, C.tinta));
  const acc = box('HORIZONTAL', { name: 'Acciones', gap: 12 }); add(form, acc, true);
  acc.appendChild(boton('Guardar lista para abrir')); acc.appendChild(boton('Guardar como borrador', true)); acc.appendChild(boton('Cancelar', true));
  const aside = box('VERTICAL', { name: 'Vista previa y reglas', gap: 16 }); add(cols2, aside); aside.layoutSizingHorizontal = 'FILL';
  const prev = box('VERTICAL', { name: 'Vista previa', bg: C.sup, r: 18, pad: 24, gap: 10 }); add(aside, prev, true);
  prev.appendChild(txt('Así lo verán los compradores', 14, false, C.tenue));
  prev.appendChild(txt('Sillón de lectura', 20, true, C.tinta)); prev.appendChild(txt('Hogar', 12, false, C.tenue));
  const pr = box('HORIZONTAL', { between: true }); add(prev, pr, true);
  for (const [k, v] of [['Precio inicial', 'Bs 80'], ['Incremento', 'Bs 10']]) {
    const b = box('VERTICAL', { gap: 2 }); pr.appendChild(b); b.appendChild(txt(k, 12, false, C.tenue)); b.appendChild(txt(v, 24, true, C.prim));
  }
  wrapText(prev, txt('Ejemplo: si la oferta vigente es Bs 80, la siguiente deberá ser de al menos Bs 90.', 12, false, C.tenue));
  const reglas = box('VERTICAL', { name: 'Reglas de la sala', bg: C.sup, r: 18, pad: 24, gap: 8 }); add(aside, reglas, true);
  reglas.appendChild(txt('Reglas de la sala', 16, true, C.tinta));
  for (const r of ['Solo cuentan las pujas aceptadas en Remate, no los comentarios del live.', 'No puedes pujar por tus propios productos.', 'Si nadie puja, la subasta termina sin ganador.']) {
    wrapText(reglas, txt(r, 14, false, C.tenue));
  }

  // ── 3, 4 y 5. Sala del vendedor (móvil) ──
  function cabeceraMovil(m, estado) {
    const h = box('HORIZONTAL', { between: true, center: true }); add(m, h, true);
    h.appendChild(txt('remate.', 28, true, C.prim)); h.appendChild(txt('Panel del vendedor', 12, false, C.tenue));
    const e = box('HORIZONTAL', { between: true, center: true }); add(m, e, true);
    e.appendChild(estadoChip(estado)); e.appendChild(txt('Conectado', 12, false, C.tenue));
  }
  function bloqueCodigo(m, codigo) {
    const cod = box('VERTICAL', { name: 'Código de sala', bg: C.sup, r: 18, pad: 24, gap: 12, center: true }); add(m, cod, true);
    cod.appendChild(txt('Código de la sala para tu live', 14, false, C.tenue));
    cod.appendChild(txt(codigo, 40, true, C.prim));
    const bs = box('HORIZONTAL', { gap: 10 }); add(cod, bs, true);
    add(bs, boton('Copiar código', true)).layoutSizingHorizontal = 'FILL';
    add(bs, boton('Copiar enlace', true)).layoutSizingHorizontal = 'FILL';
    const nota = wrapText(cod, txt('Compártelo en tu live o en tus grupos de WhatsApp. El código solo localiza la sala.', 12, false, C.tenue));
    nota.textAlignHorizontal = 'CENTER';
  }
  function bloqueProducto(m, nombre) {
    const prod = box('HORIZONTAL', { gap: 14, center: true }); add(m, prod, true);
    const il = figma.createRectangle(); il.name = 'Ilustración'; il.resize(96, 88); il.cornerRadius = 10; il.fills = fill(C.suave); prod.appendChild(il);
    const pt = box('VERTICAL', { gap: 4 }); prod.appendChild(pt);
    pt.appendChild(txt(nombre, 22, true, C.tinta)); pt.appendChild(txt('Casa Norte · Hogar', 14, false, C.tenue));
  }
  function bloqueMontos(m, etiqueta, monto, etiqueta2, valor2) {
    const o = box('HORIZONTAL', { name: 'Montos', bg: C.sup, r: 18, pad: 24, between: true }); add(m, o, true);
    const a = box('VERTICAL', { gap: 2 }); o.appendChild(a); a.appendChild(txt(etiqueta, 12, false, C.tenue)); a.appendChild(txt(monto, 40, true, C.prim));
    const b = box('VERTICAL', { gap: 2 }); o.appendChild(b); b.counterAxisAlignItems = 'MAX'; b.appendChild(txt(etiqueta2, 12, false, C.tenue)); b.appendChild(txt(valor2, 30, true, C.tinta));
  }
  function listaPujas(m, total, lista) {
    const pj = box('VERTICAL', { name: 'Pujas aceptadas', gap: 10 }); add(m, pj, true);
    const ph = box('HORIZONTAL', { between: true }); add(pj, ph, true);
    ph.appendChild(txt('Pujas aceptadas', 16, true, C.tinta)); ph.appendChild(txt(total, 12, false, C.tenue));
    if (lista.length === 0) pj.appendChild(txt('Todavía no hay pujas.', 14, false, C.tenue));
    for (const [k, v] of lista) {
      const r = box('HORIZONTAL', { between: true }); add(pj, r, true);
      r.appendChild(txt(k, 14, false, C.tenue)); r.appendChild(txt(v, 14, true, C.tinta));
    }
    const sep = figma.createRectangle(); sep.name = 'Separador'; sep.resize(342, 1); sep.fills = fill(C.borde); add(m, sep, true);
  }

  const sp = pantalla('Vendedor / Sala lista para abrir (móvil)', 390, true); wrapper.appendChild(sp);
  cabeceraMovil(sp, 'programada'); bloqueCodigo(sp, 'RM-2056'); bloqueProducto(sp, 'Lámpara de mesa');
  bloqueMontos(sp, 'Precio inicial', 'Bs 50', 'Duración', '03:00'); listaPujas(sp, '0 en total', []);
  add(sp, boton('Abrir subasta'), true);
  wrapText(sp, txt('Al abrirla empieza el tiempo de 03:00. Anuncia el código en el live antes de abrir.', 12, false, C.tenue));

  const sa = pantalla('Vendedor / Sala en vivo (móvil)', 390, true); wrapper.appendChild(sa);
  cabeceraMovil(sa, 'abierta'); bloqueCodigo(sa, 'RM-4821'); bloqueProducto(sa, 'Sillón de lectura');
  bloqueMontos(sa, 'Oferta vigente', 'Bs 120', 'Cierra en', '02:34');
  const s = box('HORIZONTAL', { bg: C.suave, r: 10, pad: 14 }); add(sa, s, true);
  wrapText(s, txt('Siguiente puja válida: desde Bs 130 · Incremento mínimo Bs 10', 13, false, C.tinta));
  listaPujas(sa, '12 en total', [['Ana · hace 8 s', 'Bs 120'], ['Luis · hace 20 s', 'Bs 110'], ['Ana · hace 41 s', 'Bs 100']]);
  wrapText(sa, txt('El cierre es automático. Solo cuentan las pujas aceptadas aquí, no los comentarios del live.', 12, false, C.tenue));

  const sc = pantalla('Vendedor / Resultado de la sala (móvil)', 390, true); wrapper.appendChild(sc);
  cabeceraMovil(sc, 'cerrada'); bloqueCodigo(sc, 'RM-7310'); bloqueProducto(sc, 'Silla de madera');
  const res = box('VERTICAL', { name: 'Resultado registrado', bg: C.suave, r: 24, pad: 24, gap: 8 }); add(sc, res, true);
  res.appendChild(txt('Resultado registrado', 14, false, C.tenue)); res.appendChild(txt('Ganó Rocío', 20, true, C.tinta)); res.appendChild(txt('Bs 75', 40, true, C.prim));
  wrapText(res, txt('7 pujas aceptadas. Coordina el pago y la entrega con el ganador fuera de Remate.', 12, false, C.tenue));
  listaPujas(sc, '7 en total', [['Rocío · hace 1 h', 'Bs 75'], ['Diego · hace 1 h', 'Bs 70']]);
  add(sc, boton('Volver a mis subastas', true), true);

  figma.currentPage.selection = [wrapper];
  figma.viewport.scrollAndZoomIntoView([wrapper]);
  figma.closePlugin('Listo: 5 pantallas del vendedor creadas a la derecha de las propuestas.');
})().catch((e) => figma.closePlugin('Error al dibujar las pantallas: ' + (e && e.message ? e.message : e)));
