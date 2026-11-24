/* azuIQ: gestión de la información. Registro de fuentes, modelo de datos y los tres apartados de Salida. */
(function () {
  'use strict';
  const P = window.P, h = P.h;
  const hoy = function () { return new Date().toISOString().slice(0, 10); };
  const nombrePregunta = function (id) { return P.pregunta(id).nombre; };
  const carrilEl = function (k) { return h('span', { class: 'etiqueta' }, k === 'conector' ? 'Conector' : 'Captura con IA'); };

  const PUNTUALES = ['ocde2025', 'jo2025', 'fa2026'];
  const PROPUESTAS = [
    ['Protected Planet', 'conservacion', 'conector', 'Límites, superficie, categoría y fecha de cada área protegida'],
    ['MPAtlas', 'conservacion', 'conector', 'Nivel real de protección y grado de implantación'],
    ['OBIS', 'conservacion', 'conector', 'Registros de especies marinas por zona'],
    ['Lista Roja de la UICN', 'conservacion', 'conector', 'Estado de amenaza de cada especie'],
    ['Global Fishing Watch', 'conservacion', 'conector', 'Esfuerzo pesquero aparente dentro y fuera de las áreas'],
    ['Copernicus Marine y EMODnet', 'conservacion', 'conector', 'Variables físicas, hábitats y fondos marinos'],
    ['Diarios oficiales de Portugal, Azores y Madeira', 'conservacion', 'ia', 'Normas de creación, planes de gestión y presupuestos'],
    ['Informes de expediciones y de seguimiento', 'conservacion', 'ia', 'Resultados científicos que no están en ninguna base de datos'],
    ['Colección de Tratados de Naciones Unidas', 'incidencia', 'conector', 'Firmas y ratificaciones por país'],
    ['Declaraciones, leyes y comunicados oficiales', 'incidencia', 'ia', 'Compromisos con fecha y su grado de cumplimiento'],
    ['Eurostat y OCDE', 'economia', 'conector', 'Series económicas comparables entre países'],
    ['Estudios de valoración de ecosistemas', 'economia', 'ia', 'Valor de los servicios del océano y retorno de proteger'],
    ['Contabilidad y presupuesto de la fundación', 'gestion', 'conector', 'Gasto por programa y por partida'],
    ['Datos de actividad del Oceanário', 'gestion', 'conector', 'Visitas, programas educativos e ingresos'],
    ['Memorias e informes de programa', 'gestion', 'ia', 'Resultados de cada programa']
  ];

  // Todo lo que alimenta la plataforma: documentos cargados, fuentes añadidas y conectores propuestos.
  P.fuentes = function () {
    const out = [];
    P.apoyo.documentos.forEach(function (d) {
      out.push({ id: d.id, nombre: d.titulo, sub: d.organismo, pregunta: d.modulo, carril: d.id === 'ine2025x' ? 'conector' : 'ia', fecha: d.fecha, doc: d, cifras: d.n_cifras,
        cal: P.calendario(d.id, d.fecha, d.propia || PUNTUALES.indexOf(d.id) >= 0 ? 'puntual' : 'anual') });
    });
    P.almacen.datos.fuentes.forEach(function (f) {
      out.push({ id: f.id, nombre: f.nombre, sub: f.organismo, pregunta: f.pregunta, carril: f.carril, fecha: f.creada, enlace: f.enlace, propia: true, cifras: 0, cal: P.calendario(f.id, f.creada, f.periodicidad) });
    });
    return out;
  };

  // ---------- Fuentes ----------

  P.vistas.fuentes = function (raiz) {
    const est = P.estado.fuentes = P.estado.fuentes || { pregunta: '', alta: false, nueva: { nombre: '', organismo: '', pregunta: 'conservacion', carril: 'ia', periodicidad: 'anual', enlace: '' } };
    const A = P.almacen.datos;
    const fuentes = P.fuentes().filter(function (f) { return !est.pregunta || f.pregunta === est.pregunta; });
    const toca = fuentes.filter(function (f) { return f.cal.estado === 'toca'; });
    const guardar = function (texto) { if (texto) P.almacen.anotar(texto); P.almacen.guardar(); P.contarNav(); P.pintar(); };

    raiz.appendChild(P.cabecera('Fuentes', 'El registro de todo lo que alimenta la plataforma: qué se ha cargado, de cuándo es y cuándo toca volver a mirar. La periodicidad es una suposición que puedes corregir en cada fuente.'));
    raiz.appendChild(h('div', { class: 'controles' },
      h('div', { class: 'control' }, 'Pregunta', P.conmutas([{ v: '', t: 'Todas' }].concat(P.PREGUNTAS.map(function (q) { return { v: q.id, t: q.nombre }; })), [est.pregunta], false, function (n) { est.pregunta = n[0]; P.pintar(); })),
      h('div', { class: 'fin' }, h('button', { class: 'btn', type: 'button', 'aria-expanded': est.alta ? 'true' : 'false', on: { click: function () { est.alta = !est.alta; P.pintar(); } } }, est.alta ? 'Cancelar' : 'Añadir una fuente'))));

    if (est.alta) {
      const n = est.nueva;
      const texto = function (etiqueta, clave, marcador) {
        const i = h('input', { class: 'campo', type: 'text', value: n[clave], placeholder: marcador || '', on: { input: function () { n[clave] = i.value; } } });
        return h('label', { class: 'control' }, etiqueta, i);
      };
      const pAlta = P.panel('Nueva fuente', 'Queda en el registro con su calendario. Sus documentos se cargan después desde «Cargar».');
      raiz.appendChild(h('div', { style: { 'margin-bottom': '16px' } }, pAlta));
      pAlta.cuerpo.appendChild(h('div', { class: 'formulario' },
        texto('Nombre', 'nombre', 'Informe anual de…'), texto('Organismo', 'organismo'),
        P.selector('Pregunta', P.PREGUNTAS.map(function (q) { return { v: q.id, t: q.nombre }; }), n.pregunta, function (v) { n.pregunta = v; }),
        P.selector('Cómo llega', [{ v: 'ia', t: 'Documento (captura con IA)' }, { v: 'conector', t: 'Base estructurada (conector)' }], n.carril, function (v) { n.carril = v; }),
        P.selector('Periodicidad', P.PERIODOS.map(function (p) { return { v: p, t: p.charAt(0).toUpperCase() + p.slice(1) }; }), n.periodicidad, function (v) { n.periodicidad = v; }),
        texto('Enlace', 'enlace', 'https://')));
      pAlta.cuerpo.appendChild(h('p', { class: 'separa' }, h('button', { class: 'btn btn-principal', type: 'button', on: { click: function () {
        if (!n.nombre.trim()) return;
        A.fuentes.push({ id: 'f' + Date.now().toString(36), nombre: n.nombre.trim(), organismo: n.organismo.trim(), pregunta: n.pregunta, carril: n.carril, periodicidad: n.periodicidad,
          enlace: /^https?:\/\//.test(n.enlace.trim()) ? n.enlace.trim() : '', creada: hoy() });
        est.alta = false; est.nueva = null; P.estado.fuentes = Object.assign({}, est, { nueva: { nombre: '', organismo: '', pregunta: n.pregunta, carril: 'ia', periodicidad: 'anual', enlace: '' } });
        guardar('Fuente añadida: ' + n.nombre.trim());
      } } }, 'Guardar la fuente')));
    }

    const panel = P.panel('En uso', fuentes.length + (fuentes.length === 1 ? ' fuente' : ' fuentes') + (toca.length ? '. ' + toca.length + ' con edición nueva probable.' : '. Todas al día.'));
    raiz.appendChild(panel);
    panel.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Fuente'), h('th', null, 'Pregunta'), h('th', null, 'Llega por'), h('th', null, 'Edición'), h('th', null, 'Periodicidad'), h('th', null, 'Estado'), h('th', { class: 'num' }, 'Cifras'), h('th', null, ''))),
      h('tbody', null, fuentes.map(function (f) {
        const sel = h('select', { class: 'campo mini', 'aria-label': 'Periodicidad de ' + f.nombre, on: { change: function () {
          A.calendario[f.id] = Object.assign({}, A.calendario[f.id], { periodicidad: sel.value }); guardar();
        } } }, P.PERIODOS.map(function (p) { return h('option', { value: p, selected: p === f.cal.periodicidad }, p); }));
        const estado = f.cal.estado === 'toca' ? P.estadoEl('aviso', 'Toca mirar desde el ' + P.fecha(f.cal.proxima))
          : (f.cal.estado === 'aldia' ? P.estadoEl('bien', 'Al día hasta el ' + P.fecha(f.cal.proxima)) : P.estadoEl('neutro', 'Sin calendario'));
        return h('tr', null,
          h('td', null, f.doc ? h('a', { href: '#doc-' + f.id }, f.nombre) : (f.enlace ? h('a', { href: f.enlace, target: '_blank', rel: 'noopener' }, f.nombre) : f.nombre), h('div', { class: 'tenue' }, f.sub || '')),
          h('td', null, nombrePregunta(f.pregunta)), h('td', null, carrilEl(f.carril)),
          h('td', { class: 'nw' }, P.fecha(f.fecha), f.cal.revisada ? h('div', { class: 'tenue' }, 'Revisada el ' + P.fecha(f.cal.revisada)) : null),
          h('td', null, sel), h('td', null, estado), h('td', { class: 'num' }, f.cifras ? P.num(f.cifras) : ''),
          h('td', { class: 'nw' },
            f.cal.estado === 'toca' ? h('button', { class: 'btn', type: 'button', title: 'He comprobado que no hay edición nueva', on: { click: function () {
              A.calendario[f.id] = Object.assign({}, A.calendario[f.id], { revisada: hoy() }); guardar('Revisada sin cambios: ' + f.nombre);
            } } }, 'Revisada hoy') : null,
            f.propia && !f.doc ? h('button', { class: 'btn btn-llano', type: 'button', on: { click: function () {
              A.fuentes = A.fuentes.filter(function (x) { return x.id !== f.id; }); guardar('Fuente quitada: ' + f.nombre);
            } } }, 'Quitar') : null));
      })))));
    panel.appendChild(h('p', { class: 'panel-pie' }, 'Cuando haya una edición nueva, ', h('a', { href: '#cargar' }, 'cárgala'), ' y la fuente volverá a estar al día. En el proyecto real, este aviso llega solo.'));

    const propuestas = PROPUESTAS.filter(function (p) { return !est.pregunta || p[1] === est.pregunta; });
    const pProp = P.panel('Por conectar', 'Fuentes propuestas para completar cada pregunta. La lista definitiva se acuerda con la fundación.');
    raiz.appendChild(h('div', { class: 'separa' }, pProp));
    pProp.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Fuente'), h('th', null, 'Pregunta'), h('th', null, 'Llega por'), h('th', null, 'Qué aporta'))),
      h('tbody', null, propuestas.map(function (p) {
        return h('tr', null, h('td', null, p[0]), h('td', null, nombrePregunta(p[1])), h('td', null, carrilEl(p[2])), h('td', { class: 'tenue' }, p[3]));
      })))));
  };

  // ---------- Modelo de datos ----------

  P.vistas.modelo = function (raiz) {
    const est = P.estado.modelo = P.estado.modelo || { pregunta: 'conservacion', nombre: '', unidad: '', bloque: '', area: '' };
    const A = P.almacen.datos, q = P.pregunta(est.pregunta);
    const campos = P.campos(est.pregunta);
    const usos = {};
    P.cifras.forEach(function (c) { if (c.modulo === est.pregunta) usos[c.ind] = (usos[c.ind] || 0) + 1; });
    const bloques = [];
    campos.forEach(function (c) { if (bloques.indexOf(c.bloque) < 0) bloques.push(c.bloque); });
    const guardar = function (texto) { P.almacen.anotar(texto); P.almacen.guardar(); P.pintar(); };

    raiz.appendChild(P.cabecera('Modelo de datos', 'Qué quiere saber la fundación, campo a campo. Lo que se define aquí es lo que la IA busca al cargar un documento y lo que enseñan las fichas y las tablas de salida.'));
    raiz.appendChild(h('div', { class: 'controles' }, h('div', { class: 'control' }, 'Pregunta',
      P.conmutas(P.PREGUNTAS.map(function (x) { return { v: x.id, t: x.nombre }; }), [est.pregunta], false, function (n) { est.pregunta = n[0]; P.pintar(); }))));

    const panel = P.panel(q.pregunta, campos.length + ' campos, ' + campos.filter(function (c) { return usos[c.codigo]; }).length + ' con alguna cifra cargada.');
    raiz.appendChild(panel);
    panel.cuerpo.replaceWith(h('div', { class: 'tabla-caja separa' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Campo'), h('th', null, 'Bloque'), h('th', null, 'Unidad'), h('th', null, 'Llega por'), h('th', { class: 'num' }, 'Cifras'), h('th', null, ''))),
      h('tbody', null, campos.map(function (c) {
        return h('tr', null, h('td', null, c.nombre, h('div', { class: 'tenue' }, c.codigo)), h('td', null, c.bloque), h('td', null, c.unidad || 'fecha o referencia'),
          h('td', null, carrilEl(c.carril), c.fuente ? h('div', { class: 'tenue' }, c.fuente) : null), h('td', { class: 'num' }, usos[c.codigo] ? P.num(usos[c.codigo]) : ''),
          h('td', null, c.propio ? h('button', { class: 'btn btn-llano', type: 'button', on: { click: function () {
            A.campos = A.campos.filter(function (x) { return !(x.pregunta === c.pregunta && x.codigo === c.codigo); }); guardar('Campo quitado: ' + c.nombre);
          } } }, 'Quitar') : null));
      })))));
    const texto = function (etiqueta, clave, marcador, lista) {
      const i = h('input', { class: 'campo', type: 'text', value: est[clave], placeholder: marcador || '', list: lista || null, on: { input: function () { est[clave] = i.value; } } });
      return h('label', { class: 'control' }, etiqueta, i);
    };
    panel.appendChild(h('div', { class: 'panel-cuerpo' },
      h('p', { class: 'dt' }, 'Añadir un campo a esta pregunta'),
      h('datalist', { id: 'bloques' }, bloques.map(function (b) { return h('option', { value: b }); })),
      h('div', { class: 'formulario' }, texto('Qué se quiere saber', 'nombre', 'Número de embarcaciones con licencia'), texto('Unidad', 'unidad', 'embarcaciones, €, %…'), texto('Bloque', 'bloque', bloques[0] || '', 'bloques'),
        h('div', { class: 'control' }, ' ', h('button', { class: 'btn btn-principal', type: 'button', on: { click: function () {
          const nombre = est.nombre.trim();
          if (!nombre) return;
          let codigo = P.codigo(nombre);
          while (P.campo(est.pregunta, codigo)) codigo += '_2';
          A.campos.push({ pregunta: est.pregunta, bloque: est.bloque.trim() || 'Otros campos', fila: nombre, codigo: codigo, nombre: nombre, unidad: est.unidad.trim(), carril: 'ia', fuente: '', propio: true });
          est.nombre = ''; est.unidad = '';
          guardar('Campo añadido: ' + nombre);
        } } }, 'Añadir el campo')))));

    if (est.pregunta === 'conservacion') {
      const pAreas = P.panel('Áreas marinas', 'Cada área tiene su ficha. Al añadir una, queda lista para recibir sus documentos.');
      raiz.appendChild(h('div', { class: 'separa' }, pAreas));
      const entrada = h('input', { class: 'campo', type: 'text', value: est.area, placeholder: 'Nombre del área', 'aria-label': 'Nombre del área nueva', on: { input: function () { est.area = entrada.value; } } });
      pAreas.cuerpo.appendChild(h('div', { class: 'fichas-campo' }, P.areas().map(function (a) {
        const n = P.cifras.filter(function (c) { return c.area === a.nombre; }).length;
        return h('span', { class: 'etiqueta' + (n ? ' viva' : '') }, a.corto + (n ? ', ' + n + ' cifras' : ''));
      })));
      pAreas.cuerpo.appendChild(h('div', { class: 'controles separa', style: { 'margin-bottom': '0' } }, h('div', { class: 'control crece' }, 'Añadir un área', entrada),
        h('button', { class: 'btn', type: 'button', on: { click: function () {
          const nombre = est.area.trim();
          if (!nombre || P.areas().some(function (a) { return a.nombre === nombre; })) return;
          A.areas.push({ id: 'a' + Date.now().toString(36), corto: nombre.length > 26 ? nombre.slice(0, 24) + '…' : nombre, nombre: nombre, sub: 'Área añadida en este navegador.' });
          est.area = '';
          guardar('Área añadida: ' + nombre);
        } } }, 'Añadir')));
    }
  };

  // ---------- Informes y BI ----------

  const decimal = function (v) { return v == null || v === '' ? '' : String(Math.round(Number(v) * 1000) / 1000).replace('.', ','); };
  const TABLAS = [
    { id: 'cifras', nombre: 'Cifras', que: 'Una fila por cifra aprobada, con su campo, su territorio y la referencia a su evidencia.',
      filas: function () { return P.cifras; },
      cols: [['id', function (c) { return c.id; }], ['pregunta', function (c) { return c.modulo; }], ['campo', function (c) { return c.ind; }], ['indicador', function (c) { return c.indicador; }],
        ['territorio', function (c) { return c.territorio; }], ['area', function (c) { return c.area || ''; }], ['sector', function (c) { return c.sector; }], ['periodo', function (c) { return c.periodo; }],
        ['valor', function (c) { return c.valor == null ? '' : String(c.valor).replace('.', ','); }], ['unidad', function (c) { return c.unidad; }], ['valor_texto', function (c) { return c.valor_txt; }],
        ['documento_id', function (c) { return c.doc; }], ['pagina', function (c) { return c.pagina || ''; }], ['lugar', function (c) { return c.loc; }], ['forma_en_la_fuente', function (c) { return c.forma; }],
        ['comprobacion', function (c) { return c.verif; }]] },
    { id: 'documentos', nombre: 'Documentos', que: 'Una fila por documento cargado.',
      filas: function () { return P.apoyo.documentos; },
      cols: [['documento_id', function (d) { return d.id; }], ['titulo', function (d) { return d.titulo; }], ['organismo', function (d) { return d.organismo; }], ['fecha', function (d) { return d.fecha; }],
        ['tipo', function (d) { return d.tipo; }], ['paginas', function (d) { return d.paginas || ''; }], ['pregunta', function (d) { return d.modulo; }], ['enlace', function (d) { return d.enlace; }], ['cifras', function (d) { return d.n_cifras; }]] },
    { id: 'campos', nombre: 'Campos', que: 'El diccionario: qué significa cada campo y de dónde llega.',
      filas: function () { return P.campos(); },
      cols: [['pregunta', function (c) { return c.pregunta; }], ['campo', function (c) { return c.codigo; }], ['nombre', function (c) { return c.nombre; }], ['bloque', function (c) { return c.bloque; }],
        ['unidad', function (c) { return c.unidad; }], ['llega_por', function (c) { return c.carril; }], ['fuente', function (c) { return c.fuente; }]] },
    { id: 'areas', nombre: 'Áreas', que: 'Las áreas marinas con ficha.',
      filas: function () { return P.areas(); },
      cols: [['area_id', function (a) { return a.id; }], ['nombre', function (a) { return a.nombre; }], ['nombre_corto', function (a) { return a.corto; }]] },
    { id: 'programas', nombre: 'Programas', que: 'Una fila por línea de gasto, con su coste publicado, su impacto valorado, la propuesta y la decisión.',
      filas: function () { return P.programas(); },
      cols: [['programa_id', function (g) { return g.id; }], ['eje', function (g) { return g.eje; }], ['nombre', function (g) { return g.nombre; }],
        ['gasto_' + P.PLAN.previo + '_k_eur', function (g) { const c = g.gasto[P.PLAN.previo]; return c ? c.valor : ''; }], ['gasto_' + P.PLAN.base + '_k_eur', function (g) { const c = g.gasto[P.PLAN.base]; return c ? c.valor : ''; }],
        ['propuesta_' + P.PLAN.objetivo + '_k_eur', function (g) { return g.fila.propuesta == null ? '' : g.fila.propuesta; }], ['decision', function (g) { return g.fila.decision || ''; }],
        ['justificacion', function (g) { return g.fila.nota || ''; }], ['resultado_de_referencia_id', function (g) { return g.resultado ? g.resultado.id : ''; }],
        ['impacto_valorado_k_eur', function (g) { const i = P.impacto(g); return i.total == null ? '' : decimal(i.total); }],
        ['impacto_valoracion', function (g) { const i = P.impacto(g); return i.total == null ? '' : P.claseImpacto(i); }],
        ['entradas_valoradas', function (g) { return P.impacto(g).valoradas; }], ['entradas_comprobadas', function (g) { return P.impacto(g).entradas.length; }]] },
    { id: 'programa_cifras', nombre: 'Programas y cifras', que: 'Qué cifras se vinculan a cada programa: une las dos tablas anteriores.',
      filas: function () { const f = []; P.programas().forEach(function (g) { g.metricas.forEach(function (c) { f.push({ g: g.id, c: c.id }); }); }); return f; },
      cols: [['programa_id', function (x) { return x.g; }], ['id', function (x) { return x.c; }]] },
    { id: 'impacto', nombre: 'Valoraciones del impacto', que: 'Una fila por valoración: el dato de entrada comprobado, el valor unitario, la parte atribuible y el supuesto escrito.',
      filas: function () { const f = []; P.programas().forEach(function (g) { P.impacto(g).lineas.forEach(function (x) { f.push({ g: g.id, x: x }); }); }); return f; },
      cols: [['programa_id', function (f) { return f.g; }], ['metodo', function (f) { return f.x.l.tipo === 'directo' ? 'importe ya calculado' : 'entrada x valor unitario x atribucion'; }],
        ['id', function (f) { return f.x.cifra ? f.x.cifra.id : ''; }], ['valor_unitario_eur', function (f) { return f.x.l.tipo === 'directo' ? '' : decimal(f.x.l.unitario); }],
        ['atribucion_pct', function (f) { return f.x.l.tipo === 'directo' ? '' : decimal(f.x.l.atrib); }], ['importe_k_eur', function (f) { return decimal(f.x.importe); }],
        ['supuesto', function (f) { return f.x.l.supuesto || ''; }], ['referencia', function (f) { return f.x.l.ref || ''; }], ['enlace', function (f) { return f.x.l.enlace || ''; }],
        ['es_ejemplo', function (f) { return f.x.l.ejemplo ? 'si' : 'no'; }]] }
  ];
  P.tablasBI = TABLAS;

  function informe(area) {
    const suyas = P.cifras.filter(function (c) { return c.area === area.nombre; });
    const campos = P.campos('conservacion'), filas = [], vacias = [];
    let md = '# ' + area.nombre + '\n\nInforme generado con azuIQ el ' + P.fecha(hoy()) + '. Cada dato lleva su fuente y su página.\n';
    const nodos = [];
    let bloque = '';
    campos.forEach(function (campo) {
      const cs = suyas.filter(function (c) { return c.ind === campo.codigo; });
      if (!cs.length) { if (vacias.indexOf(campo.fila) < 0 && filas.indexOf(campo.fila) < 0) vacias.push(campo.fila); return; }
      if (filas.indexOf(campo.fila) < 0) filas.push(campo.fila);
      if (campo.bloque !== bloque) { bloque = campo.bloque; md += '\n## ' + bloque + '\n\n'; nodos.push(h('h3', null, bloque)); }
      cs.forEach(function (c) {
        md += '- ' + c.indicador + ': ' + c.valor_txt + ' (' + P.procedencia(c) + ')' + (c.nota ? '. ' + c.nota : '') + '\n';
        nodos.push(h('p', null, c.indicador + ': ', P.cifraBtn(c), ' ', P.origenBtn(c)));
      });
    });
    const faltan = vacias.filter(function (f) { return filas.indexOf(f) < 0; });
    if (faltan.length) {
      md += '\n## Sin dato todavía\n\n' + faltan.map(function (f) { return '- ' + f; }).join('\n') + '\n';
      nodos.push(h('h3', null, 'Sin dato todavía'), h('p', { class: 'tenue' }, faltan.join('; ') + '.'));
    }
    return { md: md, nodos: nodos, n: suyas.length };
  }

  // Descargas compartidas por los apartados que entregan ficheros.
  function salidas() {
    const aviso = h('span', { class: 'cuenta', role: 'status' });
    return {
      aviso: aviso,
      guardar: function (nombre, datos) {
        aviso.textContent = '';
        P.guardarFichero(nombre, datos).then(function (r) { aviso.textContent = P.avisoFichero(r, nombre); });
      }
    };
  }

  P.descargas = salidas;

  P.vistas.salida = function (raiz) {
    const s = salidas();
    raiz.appendChild(P.cabecera('Tablas para BI', 'Lo que sale hacia la herramienta de BI: el mismo modelo que se ve aquí, en tablas relacionadas por sus identificadores. Cada cifra conserva el identificador que lleva de vuelta a la evidencia, y los programas llevan su propuesta, su decisión y su impacto valorado, con el supuesto de cada valoración.'));
    const pBI = P.panel(TABLAS.length + ' tablas', 'En el proyecto real, el BI las lee en directo. Aquí se descargan en CSV.');
    raiz.appendChild(pBI);
    pBI.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Tabla'), h('th', { class: 'num' }, 'Filas'), h('th', null, 'Columnas'), h('th', null, ''))),
      h('tbody', null, TABLAS.map(function (t) {
        return h('tr', null, h('td', null, h('strong', { style: { 'font-weight': '600' } }, t.nombre), h('div', { class: 'tenue' }, t.que)), h('td', { class: 'num' }, P.num(t.filas().length)),
          h('td', { class: 'tenue' }, t.cols.map(function (c) { return c[0]; }).join(', ')),
          h('td', null, h('button', { class: 'btn', type: 'button', 'aria-label': 'Descargar la tabla ' + t.nombre + ' en CSV', on: { click: function () {
            s.guardar('azuiq-' + t.id + '.csv', P.csv(t.filas(), t.cols.map(function (c) { return { t: c[0], v: c[1] }; })));
          } } }, P.icono('bajar'), 'CSV')));
      })))));
    pBI.appendChild(h('p', { class: 'panel-pie' }, 'Separador de punto y coma y coma decimal, listas para Excel y Power BI en español. ', s.aviso));
  };

  P.vistas.informe = function (raiz) {
    const est = P.estado.informe = P.estado.informe || { area: (P.estado.areas && P.estado.areas.id) || 'azores' };
    const s = salidas();
    const areas = P.areas();
    const area = areas.filter(function (a) { return a.id === est.area; })[0] || areas[0];
    const inf = informe(area);
    raiz.appendChild(P.cabecera('Informe de un área', 'Se compone con las cifras aprobadas, cada una con su fuente y su página. Sirve de base para una nota, una reunión o un memorando.'));
    raiz.appendChild(h('div', { class: 'controles' },
      P.selector('Área', areas.map(function (a) { return { v: a.id, t: a.corto }; }), area.id, function (v) { est.area = v; P.pintar(); }),
      h('button', { class: 'btn', type: 'button', on: { click: function () { s.guardar('informe-' + P.codigo(area.corto) + '.md', inf.md); } } }, P.icono('bajar'), 'Descargar'),
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        try { navigator.clipboard.writeText(inf.md).then(function () { s.aviso.textContent = 'Informe copiado.'; }, function () { s.aviso.textContent = 'No se pudo copiar.'; }); } catch (e) { s.aviso.textContent = 'No se pudo copiar.'; }
      } } }, P.icono('copiar'), 'Copiar'),
      s.aviso));
    const pInf = P.panel(null);
    raiz.appendChild(pInf);
    pInf.cuerpo.appendChild(h('article', { class: 'informe suelto' }, h('h2', null, area.nombre),
      inf.n ? inf.nodos : h('p', { class: 'tenue' }, 'Todavía no hay cifras aprobadas para esta área. Carga su norma de creación o su plan de gestión.')));
  };

  P.vistas.copia = function (raiz) {
    const est = P.estado.copia = P.estado.copia || { seguro: false };
    const s = salidas();
    const A = P.almacen.datos;
    raiz.appendChild(P.cabecera('Copia del trabajo', 'Lo que cargas, revisas y defines se guarda en este navegador. Con una copia puedes llevarlo a otro equipo o volver a un punto anterior.'));
    const pHay = P.panel('Lo que hay guardado en este navegador', null);
    raiz.appendChild(pHay);
    pHay.cuerpo.appendChild(h('div', { style: { 'max-width': '460px' } }, [
      ['Documentos cargados', A.cargas.length], ['Cifras aprobadas aquí', A.cifras.length], ['Propuestas de esas cargas por revisar', A.pendientes.length],
      ['Programas con decisión o propuesta', P.programas().filter(function (g) { return g.fila.decision || (g.fila.propuesta != null && g.fila.propuesta !== ''); }).length],
      ['Fuentes añadidas', A.fuentes.length], ['Campos añadidos al modelo', A.campos.length], ['Áreas añadidas', A.areas.length]
    ].map(function (f) { return h('div', { class: 'linea-cifra' }, h('span', null, f[0]), h('strong', { style: { 'font-variant-numeric': 'tabular-nums' } }, P.num(f[1]))); })));
    const entrada = h('input', { type: 'file', accept: '.json,application/json', class: 'solo-lector', id: 'fichero-copia' });
    entrada.addEventListener('change', function () {
      const f = entrada.files[0];
      if (!f) return;
      f.text().then(function (t) { P.almacen.restaurar(JSON.parse(t)); P.pintar(); }).catch(function () { s.aviso.textContent = 'Ese fichero no es una copia de azuIQ.'; });
    });
    pHay.appendChild(h('div', { class: 'panel-pie' }, h('div', { class: 'controles', style: { 'margin-bottom': '0', 'align-items': 'center' } },
      h('button', { class: 'btn', type: 'button', on: { click: function () { s.guardar('azuiq-copia-' + hoy() + '.json', JSON.stringify(P.almacen.datos)); } } }, P.icono('bajar'), 'Descargar una copia'),
      h('label', { class: 'btn', for: 'fichero-copia' }, entrada, 'Restaurar una copia'),
      h('button', { class: 'btn btn-llano', type: 'button', on: { click: function () {
        if (!est.seguro) { est.seguro = true; P.pintar(); return; }
        est.seguro = false; P.almacen.vaciar(); P.pintar();
      } } }, est.seguro ? 'Sí, vaciar lo cargado en este navegador' : 'Vaciar lo cargado aquí'),
      s.aviso)));
  };
})();
