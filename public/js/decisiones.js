/* azuIQ: decisiones. Cruza el coste publicado de cada programa con sus métricas comprobadas
   y deja escritas la decisión y la propuesta de presupuesto. Los costes de 2025 y 2024 salen
   del informe anual de la fundación; las propuestas y decisiones las escribe quien usa la página. */
(function () {
  'use strict';
  const P = window.P, h = P.h;
  const B = P.PLAN;
  const hoy = function () { return new Date().toISOString().slice(0, 10); };
  const k = function (v) { return P.num(v) + ' k€'; };
  const variacion = function (a, b) { return b ? (a - b) / b * 100 : null; };
  const txtVar = function (v, dec) { return v == null ? '' : (v > 0 ? '+' : '') + P.num(v, dec == null ? 1 : dec) + ' %'; };
  const nombreDec = function (id) { const d = P.DECISIONES.filter(function (x) { return x[0] === id; })[0]; return d ? d[1] : 'Sin decidir'; };
  const etiquetaDec = function (id) { return h('span', { class: 'etiqueta' + (id ? ' firme' : '') }, nombreDec(id)); };
  const tiene = function (v) { return v != null && v !== '' && !isNaN(v); };
  const dato = function (clave, anio) { return P.porId['foa2025-' + clave + '-' + anio] || null; };
  const SINGULAR = { 'países': 'país', acciones: 'acción', intervenciones: 'intervención', ratificaciones: 'ratificación', 'millones de contactos': 'millón de contactos', km: 'km', t: 't' };
  const singular = function (u) { return SINGULAR[u] || u.replace(/s$/, ''); };
  // Qué parte de los datos de entrada de un programa tiene valoración.
  const cobertura = function (i) { return i.valoradas + ' de ' + i.entradas.length + (i.entradas.length === 1 ? ' dato de entrada' : ' datos de entrada'); };
  // Lo que cubre la valoración, en una frase: «Valora 1 de 6 datos de entrada.»
  const alcance = function (i) {
    if (i.directo && !i.valoradas) return 'Es un importe calculado con otro método.';
    return 'Valora ' + cobertura(i) + (i.directo ? ' e incluye un importe calculado con otro método.' : '.');
  };
  // Celda con el impacto valorado y, debajo, de qué clase es la valoración.
  function impactoCelda(i) {
    if (i.total == null) return h('span', { class: 'tenue' }, P.claseImpacto(i));
    const clase = P.claseImpacto(i);
    return [h('strong', { style: { 'font-weight': '620' } }, P.textoImpacto(i.total)), clase === 'completa' ? null : h('div', { class: 'tenue' }, clase)];
  }
  // Una línea de valoración, en una frase, para el memorando y las tablas.
  function fraseValoracion(x) {
    const l = x.l, supuesto = (l.supuesto || '').trim();
    const cola = (supuesto ? ' ' + supuesto.replace(/\.?$/, '.') : '') + (l.ref ? ' Referencia: ' + l.ref + '.' : '');
    if (l.tipo === 'directo') return 'Importe calculado con otro método: ' + P.textoImpacto(x.importe) + '.' + cola;
    return rotuloMetrica(x.cifra) + ': ' + x.cifra.valor_txt + ' × ' + P.num(Number(l.unitario), Number(l.unitario) % 1 ? 2 : 0) + ' € × ' + P.num(Number(l.atrib), Number(l.atrib) % 1 ? 1 : 0) + ' % = ' + P.textoImpacto(x.importe) + '.' + cola;
  }
  // En una frase, cuántos programas tienen impacto valorado y de qué clase.
  function notaImpacto(progs) {
    const con = progs.filter(function (g) { return P.impacto(g).total != null; });
    const ej = con.filter(function (g) { return P.impacto(g).ejemplo; }).length;
    if (!con.length) return 'Ningún programa tiene todavía impacto valorado.';
    if (ej === con.length) return ej === 1 ? 'La única valoración cargada es un ejemplo.' : 'Las valoraciones cargadas son ejemplos.';
    return (con.length === 1 ? 'Un programa tiene' : con.length + ' programas tienen') + ' impacto valorado' + (ej ? '; ' + (ej === 1 ? 'una valoración es' : ej + ' son') + ' de ejemplo.' : '.');
  }
  P.notaImpacto = function () { return notaImpacto(P.programas()); };
  function kpiCaja(nombre, valor, pie) {
    return h('div', { class: 'kpi' }, h('span', { class: 'kpi-nombre' }, nombre), h('span', { class: 'kpi-valor', style: { cursor: 'default' } }, valor), h('span', { class: 'kpi-periodo' }, pie));
  }

  function guardar(texto) {
    if (texto) P.almacen.anotar(texto);
    P.almacen.guardar();
    P.contarNav();
  }
  function estadoFuentes() {
    const e = {};
    P.fuentes().forEach(function (f) { e[f.id] = f.cal.estado; });
    return e;
  }
  function ajustes(id) {
    const m = P.plan().metricas;
    m[id] = m[id] || {};
    m[id].mas = m[id].mas || [];
    m[id].menos = m[id].menos || [];
    return m[id];
  }
  function lugar(c) {
    if (c.area) return (P.areas().filter(function (a) { return a.nombre === c.area; })[0] || { corto: c.area }).corto;
    return c.territorio === 'Fundación' ? '' : c.territorio;
  }
  function rotuloMetrica(c) {
    const l = lugar(c);
    return c.indicador + (l ? ', ' + l : '') + ', ' + c.periodo;
  }
  // Coste por unidad de resultado: gasto del año (en miles de euros) entre el resultado declarado.
  function costePorResultado(g) {
    const c = g.gasto[B.base], r = g.resultado;
    if (!c || !r || !r.valor) return null;
    const v = c.valor * 1000 / (r.unidad === 'millones de contactos' ? r.valor * 1e6 : r.valor);
    const unidad = r.unidad === 'millones de contactos' ? 'contacto' : singular(r.unidad);
    return { v: v, texto: P.num(v, v < 100 ? 2 : 0) + ' € por ' + unidad };
  }

  // Lo que conviene saber antes de decidir, calculado con los datos y con el propio plan.
  function senales(g, fuentes) {
    const s = [], c25 = g.gasto[B.base], c24 = g.gasto[B.previo];
    if (c25 && c24) {
      if (c24.valor === 0) s.push({ tipo: 'neutro', t: 'Programa nuevo en ' + B.base + ': no tenía gasto en ' + B.previo + '.' });
      else {
        const v = variacion(c25.valor, c24.valor);
        if (Math.abs(v) >= 20) s.push({ tipo: 'aviso', t: 'El gasto ' + (v > 0 ? 'subió' : 'bajó') + ' un ' + P.num(Math.abs(v), 0) + ' % sobre ' + B.previo + '.' });
        else s.push({ tipo: 'neutro', t: 'El gasto se movió poco sobre ' + B.previo + ' (' + txtVar(v) + ').' });
      }
    } else if (!c25) s.push({ tipo: 'neutro', t: 'Línea nueva: no tiene gasto publicado.' });
    if (!g.metricas.length) s.push({ tipo: 'aviso', t: 'Sin métricas vinculadas: hoy no se puede medir lo que consigue.' });
    else s.push({ tipo: 'bien', t: g.metricas.length === 1 ? 'Una métrica vinculada, con su evidencia.' : g.metricas.length + ' métricas vinculadas, cada una con su evidencia.' });
    const i = P.impacto(g);
    if (i.total != null) {
      s.push({ tipo: i.completa && !i.ejemplo ? 'bien' : 'neutro', t: 'Impacto valorado: ' + P.textoImpacto(i.total) + (i.ejemplo ? ', con una valoración de ejemplo' : '') +
        (i.completa ? '.' : '. Es parcial: ' + alcance(i).replace(/^./, function (l) { return l.toLowerCase(); })) });
    } else if (i.entradas.length) {
      s.push({ tipo: 'aviso', t: 'Sin impacto monetizado: ' + (i.entradas.length === 1 ? 'tiene un dato de entrada comprobado' : 'tiene ' + i.entradas.length + ' datos de entrada comprobados') + ' y falta su valoración.' });
    } else {
      s.push({ tipo: 'aviso', t: 'Sin impacto monetizado ni datos de entrada con los que calcularlo.' });
    }
    const toca = [];
    g.metricas.forEach(function (c) { if (fuentes[c.doc] === 'toca' && toca.indexOf(P.docs[c.doc].sigla) < 0) toca.push(P.docs[c.doc].sigla); });
    if (toca.length) s.push({ tipo: 'aviso', t: 'Toca volver a mirar ' + (toca.length === 1 ? 'una fuente' : 'fuentes') + ' de sus métricas: ' + toca.join(', ') + '.', ruta: 'fuentes' });
    if (g.aviso) s.push({ tipo: 'aviso', t: g.aviso[0], ruta: g.aviso[1] });
    const d = g.fila.decision, p = g.fila.propuesta;
    if (d && tiene(p) && c25 && c25.valor) {
      const v = variacion(Number(p), c25.valor);
      if ((d === 'reforzar' && v <= 0) || (d === 'reducir' && v >= 0) || (d === 'mantener' && Math.abs(v) > 10)) {
        s.push({ tipo: 'aviso', t: 'La propuesta (' + txtVar(v) + ' sobre ' + B.base + ') no encaja con la decisión «' + nombreDec(d) + '».' });
      }
    }
    return s;
  }
  function listaSenales(lista) {
    return h('ul', { class: 'senales' }, lista.map(function (x) {
      return h('li', { class: 'senal senal-' + x.tipo }, P.icono(x.tipo === 'bien' ? 'ok' : (x.tipo === 'neutro' ? 'raya' : 'aviso'), 15),
        h('span', null, x.t, x.ruta ? [' ', h('a', { href: '#' + x.ruta }, 'Ver')] : null));
    }));
  }
  function totalesEje(eje, suyos) {
    const solo = suyos.length === 1 && suyos[0].nombre === eje.nombre;
    return { solo: solo, c25: solo ? suyos[0].gasto[B.base] : dato('gasto-eje-' + eje.id, B.base), c24: solo ? suyos[0].gasto[B.previo] : dato('gasto-eje-' + eje.id, B.previo) };
  }
  function suma(progs) {
    let propuesta = 0, n = 0, base = 0;
    progs.forEach(function (g) {
      if (!tiene(g.fila.propuesta)) return;
      propuesta += Number(g.fila.propuesta); n++;
      if (g.gasto[B.base]) base += g.gasto[B.base].valor;
    });
    return { propuesta: propuesta, n: n, base: base };
  }

  // ---------- Programas ----------

  P.vistas.programas = function (raiz) {
    const est = P.estado.programas = P.estado.programas || { nombre: '', eje: 'conservacion' };
    const progs = P.programas();
    const decididos = progs.filter(function (g) { return g.fila.decision; }).length;

    raiz.appendChild(P.cabecera('Programas', 'Las líneas de gasto de la fundación, con los nombres de su informe anual. Cada una reúne lo que costó, lo que dicen los datos, su impacto valorado y la decisión para ' + B.objetivo + '. Abre un programa para ver su evidencia, valorar su impacto y decidir.'));

    const filas = [];
    P.EJES.forEach(function (eje) {
      const suyos = progs.filter(function (g) { return g.eje === eje.id; });
      if (!suyos.length) return;
      const t = totalesEje(eje, suyos);
      if (!t.solo) {
        filas.push(h('tr', { class: 'grupo-fila' }, h('th', { scope: 'colgroup' }, eje.nombre),
          h('th', { class: 'num' }, t.c25 ? P.cifraBtn(t.c25) : ''),
          h('th', { class: 'num' }, t.c25 && t.c24 && t.c24.valor ? txtVar(variacion(t.c25.valor, t.c24.valor)) : ''),
          h('th', null), h('th', { colspan: 3 })));
      }
      suyos.forEach(function (g) {
        const c25 = g.gasto[B.base], c24 = g.gasto[B.previo];
        filas.push(h('tr', { class: 'fila-enlace', on: { click: function () { P.ir('programa-' + g.id); } } },
          h('td', null, h('a', { class: 'enlace-fuerte', href: '#programa-' + g.id, on: { click: function (e) { e.stopPropagation(); } } }, g.nombre),
            g.propio ? h('div', { class: 'tenue' }, 'Línea añadida en este navegador') : null,
            h('div', { class: 'solo-estrecho' }, etiquetaDec(g.fila.decision))),
          h('td', { class: 'num' }, c25 ? P.cifraBtn(c25) : h('span', { class: 'tenue' }, 'Sin gasto publicado')),
          h('td', { class: 'num' }, c25 && c24 ? (c24.valor ? txtVar(variacion(c25.valor, c24.valor)) : 'Nuevo') : ''),
          h('td', null, g.metricas.length ? (g.metricas.length === 1 ? '1 métrica' : g.metricas.length + ' métricas') : P.estadoEl('aviso', 'Sin métricas')),
          h('td', { class: 'num' }, impactoCelda(P.impacto(g))),
          h('td', null, etiquetaDec(g.fila.decision)),
          h('td', { class: 'num' }, tiene(g.fila.propuesta) ? k(Number(g.fila.propuesta)) : '')));
      });
    });

    const panel = P.panel(progs.length + ' programas', decididos + ' con decisión para ' + B.objetivo + '. Importes en miles de euros.');
    raiz.appendChild(panel);
    panel.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla por-grupos lista-programas' },
      h('thead', null, h('tr', null, h('th', null, 'Programa'), h('th', { class: 'num' }, 'Gasto ' + B.base), h('th', { class: 'num' }, 'Sobre ' + B.previo),
        h('th', null, 'Lo que dicen los datos'), h('th', { class: 'num' }, '«Blue impact»'), h('th', null, 'Decisión ' + B.objetivo), h('th', { class: 'num' }, 'Propuesta ' + B.objetivo))),
      h('tbody', null, filas))));
    const total = dato('gasto-total', B.base);
    panel.appendChild(h('p', { class: 'panel-pie' }, 'Gasto total en programas en ' + B.base + ': ', total ? P.cifraBtn(total) : '', '. Los costes salen del ',
      h('a', { href: '#doc-foa2025' }, 'informe anual de la fundación'), '; las métricas vinculadas a cada programa son una propuesta de partida que puedes ajustar. El impacto valorado es un supuesto de quien lo escribe. ' + notaImpacto(progs) + ' ',
      h('a', { href: '#cuadro' }, 'Ver el cuadro de resultados'), '.'));

    const pNueva = P.panel('Añadir una línea', 'Para una iniciativa que todavía no figura en las cuentas publicadas.');
    raiz.appendChild(h('div', { class: 'separa' }, pNueva));
    const nombre = h('input', { class: 'campo', type: 'text', value: est.nombre, placeholder: 'Nombre de la iniciativa', 'aria-label': 'Nombre de la iniciativa', on: { input: function () { est.nombre = nombre.value; } } });
    pNueva.cuerpo.appendChild(h('div', { class: 'controles', style: { 'margin-bottom': '0' } }, h('div', { class: 'control crece' }, 'Nombre', nombre),
      P.selector('Eje', P.EJES.map(function (e) { return { v: e.id, t: e.nombre }; }), est.eje, function (v) { est.eje = v; }),
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        const n = est.nombre.trim();
        if (!n || progs.some(function (g) { return g.nombre === n; })) return;
        const id = 'n' + Date.now().toString(36);
        P.almacen.datos.programas.push({ id: id, eje: est.eje, nombre: n });
        est.nombre = '';
        guardar('Línea añadida al plan: ' + n);
        P.ir('programa-' + id);
      } } }, 'Añadir')));
  };

  // ---------- Un programa: su evidencia y su decisión ----------

  const OCULTAR = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
  function peticion(g, fila) {
    const lineas = [];
    [B.base, B.previo].forEach(function (a) { const c = g.gasto[a]; if (c) lineas.push([c.id, 'Gasto del programa', a, c.valor_txt + ' (miles de euros)', P.procedencia(c)].join(' | ')); });
    g.metricas.forEach(function (c) { lineas.push([c.id, rotuloMetrica(c), c.periodo, c.valor_txt + (c.nota ? ' (' + c.nota + ')' : ''), P.procedencia(c)].join(' | ')); });
    const valoraciones = P.impacto(g).lineas.filter(function (x) { return x.importe != null; }).map(fraseValoracion);
    const encargo = fila.decision
      ? 'la justificación de la decisión «' + nombreDec(fila.decision) + '» para el programa'
      : 'un resumen de lo que los datos permiten decir, y de lo que falta saber, para decidir sobre el programa';
    return 'Eres analista de una fundación dedicada al océano. Redacta en español ' + encargo + ' «' + g.nombre + '» de cara al presupuesto de ' + B.objetivo + '.\n' +
      'Reglas:\n' +
      '- Usa solo los DATOS. Detrás de cada cifra que cites escribe su identificador entre corchetes, por ejemplo [' + (lineas.length ? lineas[0].split(' | ')[0] : 'id') + '].\n' +
      '- No inventes cifras, resultados ni motivos. Si los datos no bastan para sostener la decisión, dilo con claridad.\n' +
      '- Máximo cuatro frases, en texto corrido, sin listas ni formato Markdown.\n' +
      (valoraciones.length ? '- La VALORACIÓN DEL IMPACTO es un supuesto de quien la escribió, no un dato comprobado. Si la citas, di que es una valoración' + (P.impacto(g).completa ? '' : ' parcial') + ' y no la uses para comparar programas.\n' : '') + '\n' +
      'DATOS (identificador | qué es | periodo | valor | fuente):\n' + (lineas.length ? lineas.join('\n') : '(sin datos vinculados)') +
      (valoraciones.length ? '\n\nVALORACIÓN DEL IMPACTO (supuesto):\n' + valoraciones.join('\n') : '') +
      (tiene(fila.propuesta) ? '\n\nPROPUESTA PARA ' + B.objetivo + ': ' + k(Number(fila.propuesta)) : '');
  }
  // En la nota, cada identificador pasa a ser su fuente y su página.
  function conFuentes(texto) {
    return texto.replace(/\s*\[([^\]\n]{6,160})\]/g, function (todo, dentro) {
      const cs = dentro.split(/[\s,;]+/).map(function (x) { return P.porId[x]; }).filter(Boolean);
      return cs.length ? ' (' + cs.map(P.procedencia).join('; ') + ')' : todo;
    });
  }

  P.vistas.programa = function (raiz, id) {
    const g = P.programa(id);
    if (!g) {
      raiz.appendChild(P.cabecera('Programa no encontrado', 'Esa línea no está en el plan.'));
      raiz.appendChild(h('a', { class: 'btn', href: '#programas' }, 'Ver los programas'));
      return;
    }
    const est = P.estado.programa = P.estado.programa && P.estado.programa.id === id ? P.estado.programa : { id: id, q: '', ia: 'reposo', aviso: '', sinIA: !P.dentroDeClaude(), seguro: false };
    const plan = P.plan();
    const fila = plan.filas[id] = plan.filas[id] || {};
    const eje = P.EJES.filter(function (e) { return e.id === g.eje; })[0];
    const c25 = g.gasto[B.base], c24 = g.gasto[B.previo];

    raiz.appendChild(h('a', { class: 'volver', href: '#programas' }, P.icono('volver'), 'Programas'));
    raiz.appendChild(P.cabecera(g.nombre, eje.nombre + (g.original ? '. En el informe anual figura como «' + g.original + '».' : '. Línea añadida en este navegador.')));
    const izq = h('div', { class: 'col-7 pila' }), der = h('div', { class: 'col-5 pila' });
    raiz.appendChild(h('div', { class: 'rejilla' }, izq, der));

    // Lo que cuesta
    const pCoste = P.panel('Lo que cuesta', c25 ? 'Miles de euros, según las cuentas publicadas.' : null);
    izq.appendChild(pCoste);
    if (c25) {
      const total = dato('gasto-total', B.base);
      pCoste.cuerpo.appendChild(h('div', null,
        h('div', { class: 'linea-cifra' }, h('span', null, 'Gasto en ' + B.base), P.cifraBtn(c25), P.origenBtn(c25)),
        c24 ? h('div', { class: 'linea-cifra' }, h('span', null, 'Gasto en ' + B.previo), P.cifraBtn(c24), P.origenBtn(c24)) : null,
        c24 ? h('div', { class: 'linea-cifra' }, h('span', null, 'Variación'), h('strong', null, c24.valor ? txtVar(variacion(c25.valor, c24.valor)) : 'Programa nuevo en ' + B.base)) : null,
        total ? h('div', { class: 'linea-cifra' }, h('span', null, 'Peso en el gasto en programas de ' + B.base), h('strong', null, P.num(c25.valor / total.valor * 100, 1) + ' %')) : null));
    } else {
      pCoste.cuerpo.appendChild(h('p', { class: 'tenue' }, 'Esta línea no figura en las cuentas publicadas. Su coste será el que propongas para ' + B.objetivo + '.'));
    }

    // Lo que dicen los datos
    const pDatos = P.panel('Lo que dicen los datos', 'Métricas comprobadas que se vinculan a este programa. La vinculación inicial es una propuesta: quita las que no apliquen y añade las que falten.');
    izq.appendChild(pDatos);
    if (g.metricas.length) {
      pDatos.cuerpo.appendChild(h('div', null, g.metricas.map(function (c) {
        return h('div', { class: 'linea-cifra' }, h('span', null, rotuloMetrica(c), c.nota ? h('div', { class: 'tenue' }, c.nota) : null), P.cifraBtn(c), P.origenBtn(c),
          h('button', { class: 'btn btn-llano mini', type: 'button', 'aria-label': 'Quitar la métrica: ' + c.indicador, on: { click: function () {
            const a = ajustes(id);
            a.mas = a.mas.filter(function (x) { return x !== c.id; });
            if (g.base.indexOf(c.id) >= 0 && a.menos.indexOf(c.id) < 0) a.menos.push(c.id);
            if (a.resultado === c.id) a.resultado = null;
            plan.impacto.lineas[id] = (plan.impacto.lineas[id] || []).filter(function (l) { return l.cifra !== c.id; });
            guardar(); P.pintar();
          } } }, 'Quitar'));
      })));
    } else {
      pDatos.cuerpo.appendChild(h('p', { class: 'vacio', style: { padding: '0 0 6px' } }, h('strong', null, 'Todavía no hay métricas vinculadas.'),
        'Busca una cifra de los datos o carga el documento donde el programa cuenta sus resultados.'));
    }
    const resultados = h('div', { class: 'vincular-lista' });
    const buscar = h('input', { class: 'campo', type: 'search', value: est.q, placeholder: 'voluntarios, Azores protección, especies Gorringe…', 'aria-label': 'Buscar una cifra para vincularla',
      on: { input: function () { est.q = buscar.value; pintarResultados(); } } });
    function pintarResultados() {
      const q = est.q.trim();
      const r = q.length > 1 ? P.buscar(q, 12).filter(function (c) { return g.metricas.indexOf(c) < 0 && c.ind.indexOf('gasto') !== 0; }).slice(0, 6) : [];
      P.poner(resultados, r.length ? r.map(function (c) {
        return h('button', { class: 'paleta-item', type: 'button', on: { click: function () {
          const a = ajustes(id);
          a.menos = a.menos.filter(function (x) { return x !== c.id; });
          if (g.base.indexOf(c.id) < 0 && a.mas.indexOf(c.id) < 0) a.mas.push(c.id);
          est.q = '';
          guardar(); P.pintar();
        } } }, h('span', { class: 'p1' }, rotuloMetrica(c)), h('span', { class: 'p2' }, c.valor_txt), h('span', { class: 'p3 origen' }, P.procedencia(c)));
      }) : (q.length > 1 ? [h('p', { class: 'tenue', style: { padding: '6px 2px' } }, 'Ninguna cifra coincide. Si el dato está en un documento, cárgalo desde Entrada.')] : []));
    }
    pDatos.cuerpo.appendChild(h('div', { class: 'vincular' }, h('label', { class: 'control' }, 'Vincular otra cifra', buscar), resultados));
    pintarResultados();
    const numericas = g.metricas.filter(function (c) { return c.valor != null && c.valor > 0 && c.unidad && c.unidad !== '%'; });
    if (c25 && numericas.length) {
      const cpr = costePorResultado(g);
      pDatos.appendChild(h('div', { class: 'panel-pie' }, h('div', { class: 'controles', style: { 'margin-bottom': '0', 'align-items': 'center' } },
        P.selector('Resultado de referencia', [{ v: '', t: 'Ninguno' }].concat(numericas.map(function (c) { return { v: c.id, t: rotuloMetrica(c) }; })), g.resultado ? g.resultado.id : '',
          function (v) { ajustes(id).resultado = v || null; guardar(); P.pintar(); }),
        cpr ? h('div', null, h('strong', { class: 'por-euro' }, cpr.texto), h('div', { class: 'tenue' }, 'Gasto de ' + B.base + ' entre el resultado declarado. Es orientativo: no mide el efecto del programa.')) : null)));
    }

    // Impacto monetizado: el dato de entrada es una cifra comprobada; la valoración es un supuesto escrito.
    const lineasPlan = plan.impacto.lineas[id] = plan.impacto.lineas[id] || [];
    const imp = P.impacto(g);
    const pImp = P.panel('Impacto monetizado («blue impact»)', 'Lo que más pesa al valorar un programa. El dato de entrada se comprueba; la valoración se discute, y por eso cada importe lleva escritos su método y sus supuestos.');
    pImp.classList.add('impacto');
    izq.appendChild(pImp);
    const totalImp = h('strong', { class: 'imp-valor' }), pieImp = h('div', { class: 'tenue' });
    // Al escribir se recalcula en el sitio, sin repintar la vista: el foco no se mueve del campo.
    let refrescarSenales = function () {};
    const pintarTotal = function () {
      const i = P.impacto(g);
      totalImp.textContent = i.total == null ? 'Sin valorar' : P.textoImpacto(i.total);
      pieImp.textContent = i.total == null ? (i.entradas.length ? 'Añade una valoración a alguno de sus datos de entrada.' : '')
        : alcance(i) + (i.porEuro != null ? ' Son ' + P.num(i.porEuro, 2) + ' € de impacto por cada euro gastado en ' + B.base + '.' : (i.completa ? '' : ' Al ser parcial, no se calcula el impacto por euro.'));
      refrescarSenales();
    };
    const cambiada = function () { guardar('Valoración del impacto cambiada: ' + g.nombre); };
    imp.lineas.forEach(function (x) {
      const l = x.l, c = x.cifra;
      const importeEl = h('strong', { class: 'imp-importe' });
      const pintarImporte = function () {
        const y = P.impacto(g).lineas.filter(function (z) { return z.l === l; })[0];
        importeEl.textContent = y && y.importe != null ? P.textoImpacto(y.importe) : 'Falta un dato';
        pintarTotal();
      };
      const numero = function (clave, etiqueta, ancho) {
        const el = h('input', { class: 'campo mini importe', type: 'number', min: '0', step: 'any', inputmode: 'decimal', value: tiene(l[clave]) ? String(l[clave]) : '', 'aria-label': etiqueta, style: { width: ancho },
          on: { input: function () { l[clave] = el.value === '' ? null : Number(el.value); pintarImporte(); }, change: cambiada } });
        return el;
      };
      const ajustar = function () { if (!supuesto.isConnected) return; supuesto.style.height = 'auto'; supuesto.style.height = (supuesto.scrollHeight + 2) + 'px'; };
      const supuesto = h('textarea', { class: 'campo', rows: 2, placeholder: 'De dónde sale el valor unitario, qué parte se atribuye al programa y por qué.',
        on: { input: function () { l.supuesto = supuesto.value; ajustar(); }, change: function () { guardar(); } } }, l.supuesto || '');
      setTimeout(ajustar, 0);
      const quitar = h('button', { class: 'btn btn-llano mini', type: 'button', 'aria-label': 'Quitar esta valoración', on: { click: function () {
        plan.impacto.lineas[id] = lineasPlan.filter(function (z) { return z !== l; });
        guardar('Valoración quitada: ' + g.nombre); P.pintar();
      } } }, 'Quitar');
      const cuenta = l.tipo === 'directo'
        ? h('div', { class: 'imp-cuenta' }, numero('importe', 'Importe en miles de euros', '120px'), h('span', null, 'k€, calculados con otro método'))
        : (c ? h('div', { class: 'imp-cuenta' }, P.cifraBtn(c), h('span', { class: 'imp-op' }, '×'), numero('unitario', 'Valor unitario en euros', '104px'), h('span', null, '€ por ' + (c.unidad === 'millones de contactos' ? 'contacto' : singular(c.unidad))),
            h('span', { class: 'imp-op' }, '×'), numero('atrib', 'Parte atribuible al programa, en porcentaje', '74px'), h('span', null, '% atribuible'), h('span', { class: 'imp-op' }, '='), importeEl)
          : h('p', { class: 'tenue' }, 'El dato de entrada ya no está en los datos.'));
      pImp.cuerpo.appendChild(h('div', { class: 'imp-linea' },
        h('div', { class: 'imp-cab' }, h('span', { class: 'imp-que' }, l.tipo === 'directo' ? 'Importe ya calculado' : (c ? rotuloMetrica(c) : 'Dato de entrada')),
          l.ejemplo ? h('span', { class: 'etiqueta viva' }, 'Ejemplo') : null, c ? P.origenBtn(c) : null, quitar),
        cuenta,
        h('label', { class: 'control' }, 'Método y supuestos', supuesto),
        l.ref ? h('p', { class: 'imp-ref' }, 'Referencia: ', l.enlace ? h('a', { href: l.enlace, target: '_blank', rel: 'noopener' }, l.ref, P.icono('fuera', 12)) : l.ref) : null));
      if (l.tipo !== 'directo' && c) pintarImporte();
    });
    if (!imp.lineas.length) {
      pImp.cuerpo.appendChild(h('p', { class: 'vacio', style: { padding: '0 0 6px' } }, h('strong', null, 'Todavía no tiene impacto valorado.'),
        imp.entradas.length ? 'Tiene ' + (imp.entradas.length === 1 ? 'un dato de entrada comprobado' : imp.entradas.length + ' datos de entrada comprobados') + '. Falta la valoración: el valor de cada unidad y la parte que se atribuye al programa.'
          : 'No tiene datos de entrada con valor. Vincula sus métricas arriba o anota un importe ya calculado con otro método.'));
    }
    const libres = imp.entradas.filter(function (c) { return !lineasPlan.some(function (l) { return l.tipo === 'calculo' && l.cifra === c.id; }); });
    const opciones = libres.map(function (c) { return { v: c.id, t: 'Valorar: ' + rotuloMetrica(c) }; }).concat([{ v: '*', t: 'Anotar un importe ya calculado con otro método' }]);
    if (!opciones.some(function (o) { return o.v === est.valorar; })) est.valorar = opciones[0].v;
    const elegir = P.selector('Añadir una valoración', opciones, est.valorar, function (v) { est.valorar = v; });
    elegir.classList.add('crece');
    pImp.cuerpo.appendChild(h('div', { class: 'vincular' }, h('div', { class: 'controles', style: { 'margin-bottom': '0' } },
      elegir,
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        const directo = est.valorar === '*';
        lineasPlan.push({ id: 'v' + Date.now().toString(36), tipo: directo ? 'directo' : 'calculo', cifra: directo ? null : est.valorar, unitario: null, atrib: null, importe: null, supuesto: '' });
        est.valorar = '';
        guardar('Valoración añadida: ' + g.nombre); P.pintar();
      } } }, 'Añadir'))));
    pImp.appendChild(h('div', { class: 'panel-pie' }, h('div', { class: 'imp-total' }, h('span', null, 'Impacto valorado'), totalImp), pieImp));
    pImp.appendChild(h('p', { class: 'panel-pie' }, P.IMPACTO.metodo + ' En lo publicado por la fundación no hemos encontrado un método de valoración; la fundación financia ', h('a', { href: P.IMPACTO.iniciativa.enlace, target: '_blank', rel: 'noopener' }, P.IMPACTO.iniciativa.t, P.icono('fuera', 12)),
      ', de la London School of Economics, que estudia cómo valorar el capital natural azul. Aquí cada importe es un supuesto de quien lo escribe.'));
    pintarTotal();

    // Iniciativas
    if (g.iniciativas.length) {
      const pIni = P.panel('Iniciativas que incluye', 'Las que la fundación publica en su web. La agrupación en esta línea de gasto es una propuesta.');
      izq.appendChild(pIni);
      pIni.cuerpo.appendChild(h('ul', { class: 'lista-enlaces' }, g.iniciativas.map(function (i) {
        return h('li', null, h('a', { href: i.enlace, target: '_blank', rel: 'noopener' }, i.t, P.icono('fuera', 12)));
      })));
    }

    // Señales
    const pSen = P.panel('Antes de decidir', null);
    der.appendChild(pSen);
    refrescarSenales = function () { P.poner(pSen.cuerpo, listaSenales(senales(g, estadoFuentes()))); };
    refrescarSenales();

    // Decisión
    const pDec = P.panel('Decisión para ' + B.objetivo, fila.fecha ? 'Última anotación: ' + P.fecha(fila.fecha) + '.' : 'Se guarda en este navegador y pasa al memorando.');
    pDec.classList.add('decision');
    der.appendChild(pDec);
    const estadoTxt = h('span', { class: 'cuenta', role: 'status' }, est.aviso || '');
    const anotar = function (texto) { fila.fecha = hoy(); guardar(texto); estadoTxt.textContent = 'Guardado.'; };
    pDec.cuerpo.appendChild(h('div', { class: 'control' }, 'Qué hacer con el programa',
      P.conmutas(P.DECISIONES.map(function (d) { return { v: d[0], t: d[1] }; }), fila.decision ? [fila.decision] : [], false, function (n) {
        fila.decision = n[0]; est.aviso = 'Guardado.'; anotar('Decisión sobre ' + g.nombre + ': ' + nombreDec(n[0])); P.pintar();
      })));
    if (fila.decision) {
      pDec.cuerpo.appendChild(h('button', { class: 'enlace-llano', type: 'button', style: { 'margin-top': '6px', 'font-size': '13px' }, on: { click: function () {
        fila.decision = ''; est.aviso = 'Decisión quitada.'; anotar('Decisión quitada: ' + g.nombre); P.pintar();
      } } }, 'Quitar la decisión'));
    }
    const nota25 = h('span', { class: 'tenue' });
    const pintarVar = function () {
      const p = fila.propuesta;
      nota25.textContent = c25 ? (tiene(p) ? (c25.valor ? txtVar(variacion(Number(p), c25.valor)) + ' sobre los ' + k(c25.valor) + ' de ' + B.base : 'En ' + B.base + ' no tuvo gasto') : 'En ' + B.base + ' costó ' + k(c25.valor)) : '';
    };
    const propuesta = h('input', { class: 'campo', id: 'propuesta-prog', type: 'number', min: '0', step: '1', inputmode: 'numeric', value: tiene(fila.propuesta) ? String(fila.propuesta) : '', style: { width: '150px' },
      on: { input: function () { fila.propuesta = propuesta.value === '' ? null : Number(propuesta.value); pintarVar(); },
        change: function () { anotar('Propuesta para ' + g.nombre + ': ' + (tiene(fila.propuesta) ? k(Number(fila.propuesta)) : 'sin importe')); } } });
    pDec.cuerpo.appendChild(h('div', { class: 'control separa' }, h('label', { for: 'propuesta-prog' }, 'Propuesta para ' + B.objetivo + ', en miles de euros'), propuesta, nota25));
    pintarVar();
    const nota = h('textarea', { class: 'campo', id: 'nota-prog', rows: 5, style: { 'min-height': '112px' }, placeholder: 'Por qué: qué dicen los datos, qué falta saber y qué se espera conseguir.',
      on: { input: function () { fila.nota = nota.value; }, change: function () { anotar(); } } }, fila.nota || '');
    pDec.cuerpo.appendChild(h('div', { class: 'control separa' }, h('label', { for: 'nota-prog' }, 'Justificación'), nota));

    const btnIA = h('button', { class: 'btn', type: 'button' }, 'Proponer un borrador con IA');
    const cajaIA = h('div', { class: 'controles separa', style: { 'margin-bottom': '0', 'align-items': 'center' } }, btnIA, estadoTxt);
    pDec.cuerpo.appendChild(est.sinIA
      ? h('p', { class: 'aviso-nota separa' }, 'El borrador con IA usa Claude con la cuenta de quien mira la página y no está disponible en esta vista. ' + P.SIN_CLAUDE)
      : cajaIA);
    btnIA.addEventListener('click', function () {
      if (est.ia === 'pensando') return;
      est.ia = 'pensando'; btnIA.disabled = true; estadoTxt.textContent = 'Redactando con los datos vinculados…';
      P.capacidad('sample').then(function (sample) {
        if (!sample) { est.ia = 'reposo'; est.sinIA = true; P.pintar(); return null; }
        return sample(peticion(g, fila), {}).then(function (r) {
          est.ia = 'reposo';
          const texto = conFuentes((r && r.text || '').trim());
          if (!texto) { est.aviso = 'No hubo respuesta. Vuelve a intentarlo.'; P.pintar(); return; }
          fila.nota = texto;
          est.aviso = 'Borrador de la IA: revísalo antes de darlo por bueno.';
          fila.fecha = hoy(); guardar('Borrador de justificación con IA: ' + g.nombre);
          P.pintar();
        });
      }).catch(function (e) {
        est.ia = 'reposo';
        if (e && OCULTAR.indexOf(e.code) >= 0) est.sinIA = true;
        else est.aviso = e && e.code === 'rate_limited' ? 'Se ha alcanzado el límite de uso por ahora. Vuelve a intentarlo más tarde.' : 'No se pudo redactar el borrador. Vuelve a intentarlo.';
        P.pintar();
      });
    });
    est.aviso = '';
    pDec.appendChild(h('p', { class: 'panel-pie' }, h('a', { href: '#presupuesto' }, 'Ver el presupuesto'), ' y el ', h('a', { href: '#memorando' }, 'memorando'), ' con todas las decisiones.'));

    if (g.propio) {
      der.appendChild(h('div', null, h('button', { class: 'btn btn-llano', type: 'button', on: { click: function () {
        if (!est.seguro) { est.seguro = true; P.pintar(); return; }
        const A = P.almacen.datos;
        A.programas = A.programas.filter(function (x) { return x.id !== id; });
        delete plan.filas[id]; delete plan.metricas[id];
        guardar('Línea quitada del plan: ' + g.nombre);
        P.ir('programas');
      } } }, est.seguro ? 'Sí, quitar esta línea del plan' : 'Quitar esta línea')));
    }
  };

  // ---------- Cuadro de resultados ----------
  // Lo que el piloto entrega: cada línea de gasto con su coste de dos años, sus métricas comprobadas y su impacto valorado.

  const TOPE = 5;
  const CUADRO_COLS = [
    { t: 'eje', v: function (g) { return P.EJES.filter(function (e) { return e.id === g.eje; })[0].nombre; } },
    { t: 'programa', v: function (g) { return g.nombre; } },
    { t: 'gasto_' + B.previo + '_k_eur', v: function (g) { const c = g.gasto[B.previo]; return c ? c.valor : ''; } },
    { t: 'gasto_' + B.base + '_k_eur', v: function (g) { const c = g.gasto[B.base]; return c ? c.valor : ''; } },
    { t: 'metricas_comprobadas', v: function (g) { return g.metricas.length; } },
    { t: 'metricas', v: function (g) { return g.metricas.map(function (c) { return rotuloMetrica(c) + ': ' + c.valor_txt + ' (' + P.procedencia(c) + ')'; }).join(' | '); } },
    { t: 'impacto_valorado_k_eur', v: function (g) { const i = P.impacto(g); return i.total == null ? '' : String(Math.round(i.total * 1000) / 1000).replace('.', ','); } },
    { t: 'valoracion', v: function (g) { const i = P.impacto(g); return i.total == null ? P.claseImpacto(i).toLowerCase() : P.claseImpacto(i); } },
    { t: 'entradas_valoradas', v: function (g) { return P.impacto(g).valoradas; } },
    { t: 'entradas_comprobadas', v: function (g) { return P.impacto(g).entradas.length; } },
    { t: 'decision_' + B.objetivo, v: function (g) { return g.fila.decision ? nombreDec(g.fila.decision) : ''; } },
    { t: 'propuesta_' + B.objetivo + '_k_eur', v: function (g) { return tiene(g.fila.propuesta) ? g.fila.propuesta : ''; } }
  ];

  P.vistas.cuadro = function (raiz) {
    const s = P.descargas();
    const progs = P.programas();
    const imp = {};
    progs.forEach(function (g) { imp[g.id] = P.impacto(g); });
    const de = function (n) { return [String(n), ' ', h('small', null, 'de ' + progs.length)]; };
    const conMet = progs.filter(function (g) { return g.metricas.length; }).length;
    const conTres = progs.filter(function (g) { return g.metricas.length >= 3; }).length;
    const conImp = progs.filter(function (g) { return imp[g.id].total != null; });
    const ejemplos = conImp.filter(function (g) { return imp[g.id].ejemplo; }).length;
    const defendibles = conImp.filter(function (g) { return imp[g.id].comprobado; }).length;

    raiz.appendChild(P.cabecera('Cuadro de resultados', 'Cada línea de gasto con lo que costó en ' + B.previo + ' y ' + B.base + ', sus métricas comprobadas y su impacto valorado. Es lo que se lleva a la conversación del presupuesto de ' + B.objetivo + '.'));
    raiz.appendChild(h('section', { class: 'panel banda' },
      kpiCaja('Programas con métricas', de(conMet), 'Comprobadas: cada una abre su página en la fuente'),
      kpiCaja('Con tres métricas o más', de(conTres), 'El objetivo: de tres a cinco por programa'),
      kpiCaja('Con impacto valorado', de(conImp.length), conImp.length ? (ejemplos === conImp.length ? (ejemplos === 1 ? 'Es una valoración de ejemplo' : 'Son valoraciones de ejemplo') : (ejemplos ? ejemplos + ' de ejemplo' : 'Con su método y sus supuestos')) : 'Se escribe en la ficha del programa'),
      kpiCaja('Impacto defendible', de(defendibles), 'Toda su valoración parte de cifras con fuente')));

    const filas = [];
    P.EJES.forEach(function (eje) {
      const suyos = progs.filter(function (g) { return g.eje === eje.id; });
      if (!suyos.length) return;
      const t = totalesEje(eje, suyos);
      if (!t.solo) {
        filas.push(h('tr', { class: 'grupo-fila' }, h('th', { scope: 'colgroup' }, eje.nombre),
          h('th', { class: 'num', 'data-t': String(B.previo) }, t.c24 ? P.cifraBtn(t.c24) : ''), h('th', { class: 'num', 'data-t': String(B.base) }, t.c25 ? P.cifraBtn(t.c25) : ''), h('th', { colspan: 2 }), h('th', null)));
      }
      suyos.forEach(function (g) {
        const c25 = g.gasto[B.base], c24 = g.gasto[B.previo], i = imp[g.id], resto = g.metricas.length - TOPE;
        filas.push(h('tr', null,
          h('td', null, h('a', { class: 'enlace-fuerte', href: '#programa-' + g.id }, g.nombre)),
          h('td', { class: 'num', 'data-t': String(B.previo) }, c24 ? P.cifraBtn(c24) : h('span', { class: 'tenue' }, 'Sin gasto')), h('td', { class: 'num', 'data-t': String(B.base) }, c25 ? P.cifraBtn(c25) : h('span', { class: 'tenue' }, 'Sin gasto')),
          h('td', { 'data-t': 'Métricas comprobadas' }, g.metricas.length
            ? h('ul', { class: 'cuadro-metricas' }, g.metricas.slice(0, TOPE).map(function (c) { return h('li', null, P.cifraBtn(c), h('span', null, rotuloMetrica(c))); }),
                resto > 0 ? h('li', { class: 'tenue' }, h('a', { href: '#programa-' + g.id }, resto === 1 ? 'y una más' : 'y ' + resto + ' más')) : null)
            : P.estadoEl('aviso', 'Sin métricas')),
          h('td', { class: 'num', 'data-t': '«Blue impact»' }, i.total == null ? h('span', { class: 'tenue' }, P.claseImpacto(i))
            : [h('strong', { style: { 'font-weight': '620' } }, P.textoImpacto(i.total)), h('div', { class: 'tenue' }, P.claseImpacto(i).replace(/^./, function (l) { return l.toUpperCase(); }) + (i.directo ? '' : ': ' + cobertura(i)))]),
          h('td', { 'data-t': 'Decisión ' + B.objetivo }, etiquetaDec(g.fila.decision))));
      });
    });
    const panel = P.panel(progs.length + ' programas', 'Importes en miles de euros. Las cifras subrayadas abren su evidencia.');
    raiz.appendChild(h('div', { class: 'separa' }, panel));
    panel.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla por-grupos cuadro' },
      h('thead', null, h('tr', null, h('th', null, 'Programa'), h('th', { class: 'num' }, String(B.previo)), h('th', { class: 'num' }, String(B.base)),
        h('th', null, 'Métricas comprobadas'), h('th', { class: 'num' }, '«Blue impact»'), h('th', null, 'Decisión ' + B.objetivo))),
      h('tbody', null, filas))));
    panel.appendChild(h('div', { class: 'panel-pie' }, h('div', { class: 'controles', style: { 'margin-bottom': '0', 'align-items': 'center' } },
      h('button', { class: 'btn', type: 'button', on: { click: function () { s.guardar('azuiq-cuadro-de-resultados.csv', P.csv(progs, CUADRO_COLS)); } } }, P.icono('bajar'), 'Descargar el cuadro'), s.aviso)));

    const pLee = P.panel('Cómo leer el impacto', null);
    raiz.appendChild(h('div', { class: 'separa' }, pLee));
    pLee.cuerpo.appendChild(h('div', { class: 'dl', style: { 'max-width': '86ch' } }, [
      ['Dato de entrada', 'Una métrica del programa con valor y unidad, comprobada en su fuente. Se puede auditar.'],
      ['Valoración', 'Cuánto vale cada unidad y qué parte se atribuye al programa. Es un supuesto, y por eso va escrito junto al importe, con su referencia.'],
      ['Parcial', 'La valoración no cubre todos los datos de entrada del programa. Un importe parcial no se compara con el de otro programa ni se divide por su coste.'],
      ['Ejemplo', 'Valoración puesta por nosotros para enseñar el mecanismo, con una referencia pública. No es una valoración de la fundación.']
    ].map(function (x) { return h('div', null, h('span', { class: 'dt' }, x[0]), h('span', { class: 'dd' }, x[1])); })));
    pLee.appendChild(h('p', { class: 'panel-pie' }, 'En lo publicado por la fundación no hemos encontrado un método de valoración, así que aquí no se presupone ninguno: ' + P.IMPACTO.metodo.replace(/^./, function (l) { return l.toLowerCase(); }) +
      ' Un importe calculado con otro método se anota tal cual, con su explicación. ', h('a', { href: '#acerca' }, 'Ver los supuestos del prototipo'), '.'));
  };

  // ---------- Presupuesto ----------

  const CUENTAS = [['Ingresos de explotación del grupo', 'ingresos'], ['De ellos, generados por el Oceanário', 'oceanario', true], ['De ellos, venta de entradas', 'entradas', true],
    ['Donativos recibidos', 'donativos'], ['De ellos, dotaciones del fundador', 'fundador', true], ['Costes de explotación del grupo', 'costes'], ['De ellos, programas', 'programas', true],
    ['De ellos, personal', 'personal', true], ['De ellos, funcionamiento de la fundación', 'estructura', true], ['Resultado neto del ejercicio', 'resultado']];

  P.vistas.presupuesto = function (raiz) {
    const est = P.estado.presupuesto = P.estado.presupuesto || { seguro: false };
    const plan = P.plan();
    const progs = P.programas();
    const total25 = dato('gasto-total', B.base), total24 = dato('gasto-total', B.previo);
    const ing25 = dato('ingresos', B.base), ing24 = dato('ingresos', B.previo), neto25 = dato('resultado', B.base), neto24 = dato('resultado', B.previo), peso = dato('pesooceanario', B.base);

    raiz.appendChild(P.cabecera('Presupuesto ' + B.objetivo, 'La propuesta de cada programa junto a lo que costó en ' + B.base + ' y ' + B.previo + ', según las cuentas publicadas, y junto a su impacto valorado. De ' + (B.base + 1) + ' todavía no hay cuentas publicadas, así que la comparación es con ' + B.base + '.'));

    // Resumen: se repinta al escribir, sin tocar la tabla.
    const banda = h('section', { class: 'panel banda' });
    raiz.appendChild(banda);
    function kpi(nombre, valor, pie) { return h('div', { class: 'kpi' }, h('span', { class: 'kpi-nombre' }, nombre), valor, h('span', { class: 'kpi-periodo' }, pie)); }
    function valorKpi(n, sufijo) { return h('span', { class: 'kpi-valor', style: { cursor: 'default' } }, n, sufijo ? [' ', h('small', null, sufijo)] : null); }
    function cifraKpi(c) {
      const p = P.partes(c);
      return h('button', { class: 'kpi-valor', type: 'button', title: 'Ver de dónde sale: ' + P.procedencia(c), on: { click: function (e) { P.abrirFicha(c.id, e.currentTarget); } } }, p.n, ' ', h('small', null, p.u));
    }
    function pintarResumen() {
      const s = suma(progs), techo = plan.techo;
      const conBase = progs.filter(function (g) { return g.gasto[B.base]; }).length;
      P.poner(banda,
        kpi('Gasto en programas, ' + B.base, total25 ? cifraKpi(total25) : valorKpi('Sin dato'), total25 && total24 ? txtVar(variacion(total25.valor, total24.valor)) + ' sobre ' + B.previo : ''),
        kpi('Propuesta ' + B.objetivo, s.n ? valorKpi(P.num(s.propuesta), 'k€') : valorKpi('Sin propuestas'),
          s.n ? s.n + ' de ' + progs.length + ' programas' + (s.base ? '; ' + txtVar(variacion(s.propuesta, s.base)) + ' sobre lo que costaron en ' + B.base : '') : 'Escribe la de cada programa en la tabla'),
        kpi('Techo de gasto ' + B.objetivo, tiene(techo) ? valorKpi(P.num(Number(techo)), 'k€') : valorKpi('Sin fijar'),
          tiene(techo) && s.n ? (Number(techo) - s.propuesta >= 0 ? 'Quedan ' + k(Number(techo) - s.propuesta) + (s.n < conBase ? ', con ' + (progs.length - s.n) + ' programas sin propuesta' : '') : 'La propuesta se pasa en ' + k(s.propuesta - Number(techo))) : 'Opcional: el máximo para programas'),
        kpi('Resultado neto, ' + B.base, neto25 ? cifraKpi(neto25) : valorKpi('Sin dato'), neto24 ? 'En ' + B.previo + ': ' + neto24.valor_txt : ''));
    }

    // La tensión que explica el presupuesto, con sus cifras.
    if (total25 && total24 && ing25 && ing24 && neto25) {
      const vProg = variacion(total25.valor, total24.valor), vIng = variacion(ing25.valor, ing24.valor);
      raiz.appendChild(h('section', { class: 'panel hallazgo separa' },
        h('h2', null, 'En ' + B.base + ' el gasto en programas ' + (vProg >= 0 ? 'subió' : 'bajó') + ' un ' + P.num(Math.abs(vProg), 1) + ' % y los ingresos ' + (vIng >= 0 ? 'subieron' : 'bajaron') + ' un ' + P.num(Math.abs(vIng), 1) + ' %'),
        h('p', null, 'Los programas pasaron de ', P.cifraBtn(total24), ' a ', P.cifraBtn(total25), ' y los ingresos de explotación del grupo, de ', P.cifraBtn(ing24), ' a ', P.cifraBtn(ing25),
          '. El ejercicio cerró con ', P.cifraBtn(neto25), peso ? ['. El ', P.cifraBtn(peso), ' de esos ingresos lo genera el Oceanário'] : null, '. ', h('a', { class: 'origen', href: '#doc-foa2025' }, 'Informe anual 2025, pp. 88 a 90'))));
    }

    // Controles del plan
    const techoEl = h('input', { class: 'campo', type: 'number', min: '0', step: '1', inputmode: 'numeric', value: tiene(plan.techo) ? String(plan.techo) : '', style: { width: '150px' }, 'aria-label': 'Techo de gasto en programas para ' + B.objetivo + ', en miles de euros',
      on: { input: function () { plan.techo = techoEl.value === '' ? '' : Number(techoEl.value); pintarResumen(); }, change: function () { guardar('Techo de gasto para ' + B.objetivo + ': ' + (tiene(plan.techo) ? k(Number(plan.techo)) : 'sin fijar')); } } });
    const vacias = progs.filter(function (g) { return !tiene(g.fila.propuesta) && g.gasto[B.base]; }).length;
    raiz.appendChild(h('div', { class: 'controles separa' }, h('label', { class: 'control' }, 'Techo de gasto ' + B.objetivo + ' (k€)', techoEl),
      h('button', { class: 'btn', type: 'button', disabled: !vacias, on: { click: function () {
        progs.forEach(function (g) { if (!tiene(g.fila.propuesta) && g.gasto[B.base]) { plan.filas[g.id] = plan.filas[g.id] || {}; plan.filas[g.id].propuesta = g.gasto[B.base].valor; } });
        guardar('Propuestas de partida: lo gastado en ' + B.base); P.pintar();
      } } }, 'Partir de lo gastado en ' + B.base),
      suma(progs).n ? h('button', { class: 'btn btn-llano', type: 'button', on: { click: function () {
        if (!est.seguro) { est.seguro = true; P.pintar(); return; }
        est.seguro = false;
        Object.keys(plan.filas).forEach(function (id) { plan.filas[id].propuesta = null; });
        guardar('Propuestas vaciadas'); P.pintar();
      } } }, est.seguro ? 'Sí, vaciar las propuestas' : 'Vaciar las propuestas') : null));

    // Tabla de trabajo
    const subtotales = {}, celdasVar = {};
    const totalProp = h('strong', null), totalVar = h('span', null);
    const grafico = h('div', null);
    function varPropuesta(g) {
      const c = g.gasto[B.base], p = g.fila.propuesta;
      return tiene(p) && c && c.valor ? txtVar(variacion(Number(p), c.valor)) : (tiene(p) && c && !c.valor ? 'Sin gasto en ' + B.base : '');
    }
    function recalcular() {
      progs.forEach(function (g) { if (celdasVar[g.id]) celdasVar[g.id].textContent = varPropuesta(g); });
      P.EJES.forEach(function (eje) {
        if (!subtotales[eje.id]) return;
        const s = suma(progs.filter(function (g) { return g.eje === eje.id; }));
        subtotales[eje.id].textContent = s.n ? k(s.propuesta) : '';
      });
      const s = suma(progs);
      totalProp.textContent = s.n ? k(s.propuesta) : '';
      totalVar.textContent = s.n && s.base ? txtVar(variacion(s.propuesta, s.base)) : '';
      pintarResumen();
      pintarGrafico();
    }
    const filas = [];
    P.EJES.forEach(function (eje) {
      const suyos = progs.filter(function (g) { return g.eje === eje.id; });
      if (!suyos.length) return;
      const t = totalesEje(eje, suyos);
      if (!t.solo) {
        subtotales[eje.id] = h('span', null);
        filas.push(h('tr', { class: 'grupo-fila' }, h('th', { scope: 'colgroup' }, eje.nombre),
          h('th', { class: 'num' }, t.c24 ? P.cifraBtn(t.c24) : ''), h('th', { class: 'num' }, t.c25 ? P.cifraBtn(t.c25) : ''),
          h('th', { class: 'num' }, t.c25 && t.c24 && t.c24.valor ? txtVar(variacion(t.c25.valor, t.c24.valor)) : ''),
          h('th', null), h('th', { class: 'num' }, subtotales[eje.id]), h('th', { colspan: 2 })));
      }
      suyos.forEach(function (g) {
        const c25 = g.gasto[B.base], c24 = g.gasto[B.previo];
        const fila = plan.filas[g.id] = plan.filas[g.id] || {};
        g.fila = fila;
        celdasVar[g.id] = h('td', { class: 'num' });
        const entrada = h('input', { class: 'campo mini importe', type: 'number', min: '0', step: '1', inputmode: 'numeric', value: tiene(fila.propuesta) ? String(fila.propuesta) : '',
          'aria-label': 'Propuesta ' + B.objetivo + ' para ' + g.nombre + ', en miles de euros',
          on: { input: function () { fila.propuesta = entrada.value === '' ? null : Number(entrada.value); recalcular(); },
            change: function () { fila.fecha = hoy(); guardar('Propuesta para ' + g.nombre + ': ' + (tiene(fila.propuesta) ? k(Number(fila.propuesta)) : 'sin importe')); } } });
        filas.push(h('tr', null,
          h('td', null, h('a', { class: 'enlace-fuerte', href: '#programa-' + g.id }, g.nombre)),
          h('td', { class: 'num' }, c24 ? P.cifraBtn(c24) : ''), h('td', { class: 'num' }, c25 ? P.cifraBtn(c25) : ''),
          h('td', { class: 'num' }, c25 && c24 ? (c24.valor ? txtVar(variacion(c25.valor, c24.valor)) : 'Nuevo') : ''),
          h('td', { class: 'num' }, impactoCelda(P.impacto(g))),
          h('td', { class: 'num' }, entrada), celdasVar[g.id], h('td', null, etiquetaDec(fila.decision))));
      });
    });
    filas.push(h('tr', { class: 'total-fila' }, h('th', { scope: 'row' }, 'Total de programas'),
      h('td', { class: 'num' }, total24 ? P.cifraBtn(total24) : ''), h('td', { class: 'num' }, total25 ? P.cifraBtn(total25) : ''),
      h('td', { class: 'num' }, total25 && total24 ? txtVar(variacion(total25.valor, total24.valor)) : ''),
      h('td', null), h('td', { class: 'num' }, totalProp), h('td', { class: 'num' }, totalVar), h('td', null)));
    const pTabla = P.panel('Propuesta por programa', 'Miles de euros. Las cifras subrayadas abren su página en el informe anual; el impacto valorado se escribe en la ficha de cada programa.');
    raiz.appendChild(pTabla);
    pTabla.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla por-grupos presupuesto' },
      h('thead', null, h('tr', null, h('th', null, 'Programa'), h('th', { class: 'num' }, String(B.previo)), h('th', { class: 'num' }, String(B.base)), h('th', { class: 'num' }, 'Variación'), h('th', { class: 'num' }, '«Blue impact»'),
        h('th', { class: 'num' }, 'Propuesta ' + B.objetivo), h('th', { class: 'num' }, 'Sobre ' + B.base), h('th', null, 'Decisión'))),
      h('tbody', null, filas))));
    pTabla.appendChild(h('p', { class: 'panel-pie' }, 'El total publicado incluye dos partidas menores de «otros» que no se listan. La variación del total propuesto se calcula sobre lo que esos mismos programas costaron en ' + B.base + '. El impacto valorado no se suma: las valoraciones parciales no son comparables entre programas.'));

    // Gráfico
    const pGraf = P.panel('Cada programa en ' + B.previo + ', ' + B.base + ' y la propuesta', 'Miles de euros. Pulsa un punto publicado para ver su evidencia.');
    raiz.appendChild(h('div', { class: 'separa' }, pGraf));
    pGraf.cuerpo.appendChild(P.leyenda([{ nombre: String(B.previo), color: 'var(--s-ref)' }, { nombre: String(B.base), color: 'var(--s1)' }, { nombre: 'Propuesta ' + B.objetivo, color: 'var(--s2)' }]));
    pGraf.cuerpo.appendChild(h('div', { class: 'separa' }, grafico));
    function pintarGrafico() {
      if (!grafico.isConnected) return;
      let max = 0;
      const datos = progs.map(function (g) {
        const puntos = [];
        [[B.previo, 'var(--s-ref)'], [B.base, 'var(--s1)']].forEach(function (a) {
          const c = g.gasto[a[0]];
          if (!c) return;
          max = Math.max(max, c.valor);
          puntos.push({ v: c.valor, color: a[1], etiqueta: g.nombre + ', ' + a[0] + ': ' + c.valor_txt, tip: function () { return P.tipCifra(c, g.nombre); }, alPulsar: function (e) { P.abrirFicha(c.id, e.currentTarget); } });
        });
        if (tiene(g.fila.propuesta)) {
          const v = Number(g.fila.propuesta);
          max = Math.max(max, v);
          puntos.push({ v: v, color: 'var(--s2)', etiqueta: g.nombre + ', propuesta ' + B.objetivo + ': ' + k(v), tip: function () { return [h('b', null, k(v)), h('div', null, g.nombre), h('div', null, 'Propuesta ' + B.objetivo)]; } });
        }
        return { nombre: g.nombre, puntos: puntos };
      }).filter(function (f) { return f.puntos.length; });
      grafico.replaceChildren();
      P.g.puntos(grafico, datos, { max: max || 1, anchoNombre: 250 });
    }

    // El impacto valorado junto al coste
    const conImp = progs.map(function (g) { return { g: g, i: P.impacto(g) }; }).filter(function (x) { return x.i.total != null; });
    const pImp = P.panel('Impacto valorado junto al coste', 'El «blue impact» de cada programa frente a lo que costó en ' + B.base + '. Miles de euros.');
    raiz.appendChild(h('div', { class: 'separa' }, pImp));
    if (conImp.length) {
      pImp.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla impacto-coste' },
        h('thead', null, h('tr', null, h('th', null, 'Programa'), h('th', { class: 'num' }, 'Gasto ' + B.base), h('th', { class: 'num' }, 'Impacto valorado'), h('th', null, 'Qué valora'), h('th', { class: 'num' }, 'Impacto por euro'))),
        h('tbody', null, conImp.map(function (x) {
          const c = x.g.gasto[B.base];
          return h('tr', null, h('td', null, h('a', { class: 'enlace-fuerte', href: '#programa-' + x.g.id }, x.g.nombre)), h('td', { class: 'num' }, c ? P.cifraBtn(c) : ''),
            h('td', { class: 'num' }, impactoCelda(x.i)),
            h('td', null, alcance(x.i).replace(/\.$/, ''),
              h('div', { class: 'tenue' }, x.i.lineas.filter(function (y) { return y.importe != null && y.cifra; }).map(function (y) { return y.cifra.indicador; }).join('; '))),
            h('td', { class: 'num' }, x.i.porEuro != null ? h('strong', null, P.num(x.i.porEuro, 2) + ' €') : h('span', { class: 'tenue' }, 'No se calcula')));
        })))));
    } else {
      pImp.cuerpo.appendChild(h('p', { class: 'vacio', style: { padding: '0' } }, h('strong', null, 'Ningún programa tiene impacto valorado.'), 'Se escribe en la ficha de cada programa, a partir de sus datos de entrada comprobados.'));
    }
    const sinImp = progs.filter(function (g) { return g.gasto[B.base] && P.impacto(g).total == null; });
    pImp.appendChild(h('p', { class: 'panel-pie' }, notaImpacto(progs) + ' ',
      sinImp.length ? [sinImp.length + ' programas con gasto no tienen impacto valorado; ', sinImp.filter(function (g) { return P.impacto(g).entradas.length; }).length + ' de ellos ya tienen datos de entrada comprobados. '] : null,
      'El impacto por euro solo se calcula cuando la valoración cubre todos los datos de entrada del programa; con valoraciones parciales, los programas no se comparan entre sí. ', h('a', { href: '#cuadro' }, 'Ver el cuadro de resultados'), '.'));

    // Qué se consigue por euro
    const conRes = progs.map(function (g) { return { g: g, cpr: costePorResultado(g) }; }).filter(function (x) { return x.cpr; });
    const pRes = P.panel('Coste por unidad de resultado', 'Gasto de ' + B.base + ' entre el resultado de referencia de cada programa. Es orientativo: no mide el efecto ni lo valora, solo el coste por unidad declarada.');
    raiz.appendChild(h('div', { class: 'separa' }, pRes));
    if (conRes.length) {
      pRes.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
        h('thead', null, h('tr', null, h('th', null, 'Programa'), h('th', { class: 'num' }, 'Gasto ' + B.base), h('th', null, 'Resultado de referencia'), h('th', { class: 'num' }, 'Coste por unidad'))),
        h('tbody', null, conRes.map(function (x) {
          const r = x.g.resultado;
          return h('tr', null, h('td', null, h('a', { class: 'enlace-fuerte', href: '#programa-' + x.g.id }, x.g.nombre)), h('td', { class: 'num' }, P.cifraBtn(x.g.gasto[B.base])),
            h('td', null, P.cifraBtn(r), ' ', h('span', { class: 'tenue' }, r.indicador), ' ', P.origenBtn(r)), h('td', { class: 'num' }, h('strong', null, x.cpr.texto)));
        })))));
    }
    const sinRes = progs.filter(function (g) { return !g.resultado && g.gasto[B.base]; });
    pRes.appendChild(h('p', { class: 'panel-pie' }, sinRes.length
      ? [sinRes.length + ' programas con gasto no tienen todavía un resultado de referencia: ', sinRes.map(function (g, i) { return [i ? ', ' : '', h('a', { href: '#programa-' + g.id }, g.nombre)]; }), '. Elígelo en la ficha de cada uno.']
      : 'Todos los programas con gasto tienen su resultado de referencia.'));

    // Marco financiero publicado
    const pCue = P.panel('De dónde sale el dinero', 'Cuentas consolidadas de la fundación y el Oceanário, en miles de euros.');
    raiz.appendChild(h('div', { class: 'separa' }, pCue));
    pCue.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Concepto'), h('th', { class: 'num' }, String(B.previo)), h('th', { class: 'num' }, String(B.base)), h('th', { class: 'num' }, 'Variación'))),
      h('tbody', null, CUENTAS.map(function (c) {
        const a = dato(c[1], B.previo), b = dato(c[1], B.base);
        return h('tr', null, h('td', { class: c[2] ? 'sangria' : null }, c[0]), h('td', { class: 'num' }, a ? P.cifraBtn(a) : ''), h('td', { class: 'num' }, b ? P.cifraBtn(b) : ''),
          h('td', { class: 'num' }, a && b && a.valor > 0 && b.valor > 0 ? txtVar(variacion(b.valor, a.valor)) : ''));
      })))));
    pCue.appendChild(h('p', { class: 'panel-pie' }, h('a', { class: 'origen', href: '#doc-foa2025' }, 'Informe anual 2025, pp. 88 y 90'), '. En el proyecto real, estas cifras y el gasto del año en curso llegan por conector desde la contabilidad.'));

    recalcular();
  };

  // ---------- Memorando ----------

  function memorando() {
    const progs = P.programas(), plan = P.plan();
    const con = progs.filter(function (g) { return g.fila.decision || tiene(g.fila.propuesta) || (g.fila.nota || '').trim(); });
    const s = suma(progs), total25 = dato('gasto-total', B.base);
    let md = '# Propuesta de presupuesto y decisiones ' + B.objetivo + '\n\nGenerado con azuIQ el ' + P.fecha(hoy()) + '. Importes en miles de euros. Los de ' + B.base + ' y ' + B.previo + ' son los publicados en el informe anual de la fundación; cada dato lleva su fuente y su página. El impacto valorado («blue impact») es un supuesto de quien lo escribe y va con su método.\n';
    const nodos = [];
    const resumen = [];
    if (total25) resumen.push('Gasto en programas en ' + B.base + ': ' + total25.valor_txt + ' (' + P.procedencia(total25) + ').');
    resumen.push(s.n ? 'Propuesta para ' + B.objetivo + ': ' + k(s.propuesta) + ' en ' + s.n + ' de ' + progs.length + ' programas' + (s.base ? ' (' + txtVar(variacion(s.propuesta, s.base)) + ' sobre lo que costaron en ' + B.base + ').' : '.') : 'Todavía no hay propuestas de importe.');
    if (tiene(plan.techo)) resumen.push('Techo de gasto: ' + k(Number(plan.techo)) + '.' + (s.n ? (Number(plan.techo) >= s.propuesta ? ' Quedan ' + k(Number(plan.techo) - s.propuesta) + '.' : ' La propuesta se pasa en ' + k(s.propuesta - Number(plan.techo)) + '.') : ''));
    const valorados = progs.filter(function (g) { return P.impacto(g).total != null; }).length;
    resumen.push('Impacto valorado: ' + valorados + ' de ' + progs.length + ' programas. ' + notaImpacto(progs) + (valorados ? ' Las valoraciones parciales no se suman ni se comparan entre programas.' : ''));
    md += '\n## Resumen\n\n' + resumen.map(function (r) { return '- ' + r; }).join('\n') + '\n';
    nodos.push(h('h3', null, 'Resumen'), resumen.map(function (r) { return h('p', null, r); }));
    P.EJES.forEach(function (eje) {
      const suyos = con.filter(function (g) { return g.eje === eje.id; });
      if (!suyos.length) return;
      md += '\n## ' + eje.nombre + '\n';
      nodos.push(h('h3', null, eje.nombre));
      suyos.forEach(function (g) {
        const c25 = g.gasto[B.base], c24 = g.gasto[B.previo], p = g.fila.propuesta;
        md += '\n### ' + g.nombre + ': ' + nombreDec(g.fila.decision).toLowerCase() + '\n\n';
        const lineaCoste = [];
        if (c25) lineaCoste.push('Gasto en ' + B.base + ': ' + c25.valor_txt + ' (' + P.procedencia(c25) + ')' + (c24 ? '; en ' + B.previo + ': ' + c24.valor_txt : '') + '.');
        if (tiene(p)) lineaCoste.push('Propuesta para ' + B.objetivo + ': ' + k(Number(p)) + (c25 && c25.valor ? ' (' + txtVar(variacion(Number(p), c25.valor)) + ' sobre ' + B.base + ')' : '') + '.');
        md += lineaCoste.map(function (l) { return '- ' + l; }).join('\n') + (lineaCoste.length ? '\n' : '');
        nodos.push(h('p', { class: 'memo-prog' }, h('strong', null, g.nombre), ' ', etiquetaDec(g.fila.decision)));
        nodos.push(h('p', null, c25 ? ['Gasto en ' + B.base + ': ', P.cifraBtn(c25), ' ', P.origenBtn(c25), c24 ? ['; en ' + B.previo + ': ', P.cifraBtn(c24)] : null, '. '] : null,
          tiene(p) ? 'Propuesta para ' + B.objetivo + ': ' + k(Number(p)) + (c25 && c25.valor ? ' (' + txtVar(variacion(Number(p), c25.valor)) + ' sobre ' + B.base + ').' : '.') : h('span', { class: 'tenue' }, 'Sin importe propuesto.')));
        const nota = (g.fila.nota || '').trim();
        if (nota) { md += '\nJustificación: ' + nota + '\n'; nodos.push(h('p', null, nota)); }
        const i = P.impacto(g);
        if (i.total != null) {
          const clase = P.claseImpacto(i);
          const cabeza = 'Impacto valorado: ' + P.textoImpacto(i.total) + (clase === 'completa' ? '' : ' (' + clase + ')') + '. ' + alcance(i);
          const frases = i.lineas.filter(function (x) { return x.importe != null; }).map(fraseValoracion);
          md += '\n' + cabeza + '\n' + frases.map(function (f) { return '- ' + f; }).join('\n') + '\n';
          nodos.push(h('p', null, h('strong', { style: { 'font-weight': '620' } }, cabeza)), frases.map(function (f) { return h('p', { class: 'tenue' }, f); }));
        } else {
          md += '\nImpacto valorado: sin valorar' + (i.entradas.length ? ' (tiene ' + (i.entradas.length === 1 ? 'un dato de entrada comprobado' : i.entradas.length + ' datos de entrada comprobados') + ')' : '') + '.\n';
          nodos.push(h('p', { class: 'tenue' }, 'Sin impacto valorado.'));
        }
        if (g.metricas.length) {
          md += '\nEvidencia:\n' + g.metricas.map(function (c) { return '- ' + rotuloMetrica(c) + ': ' + c.valor_txt + ' (' + P.procedencia(c) + ')'; }).join('\n') + '\n';
          nodos.push(h('p', { class: 'tenue' }, 'Evidencia: ', g.metricas.map(function (c, i) { return [i ? '; ' : '', rotuloMetrica(c) + ': ', P.cifraBtn(c)]; }), '.'));
        } else {
          md += '\nEvidencia: sin métricas vinculadas.\n';
          nodos.push(h('p', { class: 'tenue' }, 'Sin métricas vinculadas.'));
        }
      });
    });
    const sin = progs.filter(function (g) { return con.indexOf(g) < 0; });
    if (sin.length) {
      md += '\n## Sin decidir\n\n' + sin.map(function (g) {
        const i = P.impacto(g), partes = [];
        if (g.gasto[B.base]) partes.push(g.gasto[B.base].valor_txt + ' en ' + B.base);
        if (i.total != null) partes.push('impacto valorado: ' + P.textoImpacto(i.total) + (P.claseImpacto(i) === 'completa' ? '' : ', ' + P.claseImpacto(i)));
        return '- ' + g.nombre + (partes.length ? ' (' + partes.join('; ') + ')' : '');
      }).join('\n') + '\n';
      nodos.push(h('h3', null, 'Sin decidir'), h('p', { class: 'tenue' }, sin.map(function (g) { return g.nombre; }).join('; ') + '.'));
    }
    return { md: md, nodos: nodos, n: con.length };
  }

  P.vistas.memorando = function (raiz) {
    const s = P.descargas();
    const m = memorando();
    raiz.appendChild(P.cabecera('Memorando', 'Las decisiones y las propuestas de importe, programa a programa, con la evidencia que las sostiene. Sirve para llevarlas al órgano que aprueba el presupuesto.'));
    if (!m.n) {
      raiz.appendChild(h('section', { class: 'panel' }, h('p', { class: 'vacio' }, h('strong', null, 'Todavía no hay decisiones ni propuestas.'),
        'Abre un programa, mira lo que dicen los datos y deja escrita la decisión. ', h('a', { href: '#programas' }, 'Ir a los programas'))));
      return;
    }
    raiz.appendChild(h('div', { class: 'controles' },
      h('button', { class: 'btn', type: 'button', on: { click: function () { s.guardar('azuiq-memorando-' + B.objetivo + '.md', m.md); } } }, P.icono('bajar'), 'Descargar'),
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        try { navigator.clipboard.writeText(m.md).then(function () { s.aviso.textContent = 'Memorando copiado.'; }, function () { s.aviso.textContent = 'No se pudo copiar.'; }); } catch (e) { s.aviso.textContent = 'No se pudo copiar.'; }
      } } }, P.icono('copiar'), 'Copiar'),
      s.aviso));
    const panel = P.panel(null);
    raiz.appendChild(panel);
    panel.cuerpo.appendChild(h('article', { class: 'informe suelto' }, h('h2', null, 'Propuesta de presupuesto y decisiones ' + B.objetivo), m.nodos));
  };

  // Para otras vistas: cuántos programas siguen sin decisión y cuáles se apoyan en un área.
  P.sinDecidir = function () { return P.programas().filter(function (g) { return !g.fila.decision; }).length; };
  P.programasDeArea = function (nombre) { return P.programas().filter(function (g) { return g.metricas.some(function (c) { return c.area === nombre; }); }); };
})();
