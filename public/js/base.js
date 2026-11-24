/* azuIQ: utilidades y acceso a los datos, compartidos por todas las vistas. */
(function () {
  'use strict';

  const P = window.P = { vistas: {}, estado: {}, g: {} };
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---------- Construcción de nodos ----------

  function anadir(el, hijos) {
    for (const hijo of hijos) {
      if (hijo == null || hijo === false) continue;
      if (Array.isArray(hijo)) anadir(el, hijo);
      else el.appendChild(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
    }
  }

  function crear(ns, etiqueta, attrs, hijos) {
    const el = ns ? document.createElementNS(ns, etiqueta) : document.createElement(etiqueta);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'on') { for (const ev in v) el.addEventListener(ev, v[ev]); }
      else if (k === 'style') { for (const p in v) el.style.setProperty(p, v[p]); }
      else el.setAttribute(k, v === true ? '' : v);
    }
    anadir(el, hijos);
    return el;
  }

  P.h = function (etiqueta, attrs) { return crear(null, etiqueta, attrs, Array.prototype.slice.call(arguments, 2)); };
  P.s = function (etiqueta, attrs) { return crear(SVG_NS, etiqueta, attrs, Array.prototype.slice.call(arguments, 2)); };
  // Sustituye el contenido de un nodo; admite nodos, textos y listas.
  P.poner = function (el) { el.replaceChildren(); anadir(el, Array.prototype.slice.call(arguments, 1)); return el; };

  const ICONOS = {
    ok: 'M3.5 8.5l3 3 6-7',
    raya: 'M4 8h8',
    aviso: 'M8 2.5l6 11H2z M8 6.8v3 M8 11.7v.2',
    cerrar: 'M4 4l8 8 M12 4l-8 8',
    fuera: 'M6.5 3.5h-3v9h9v-3 M9.5 3.5h3v3 M12.5 3.5l-5 5',
    volver: 'M9.5 3.5L5 8l4.5 4.5',
    bajar: 'M8 2.5v8 M4.5 7.5L8 11l3.5-3.5 M3 13.5h10',
    copiar: 'M5.5 5.5h7v8h-7z M3.5 10.5v-8h7'
  };
  P.icono = function (nombre, tam) {
    return P.s('svg', { width: tam || 14, height: tam || 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor',
      'stroke-width': 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
      P.s('path', { d: ICONOS[nombre] }));
  };

  // ---------- Texto y números ----------

  P.norm = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  P.num = function (v, dec) {
    if (v == null || isNaN(v)) return '';
    const partes = Math.abs(v).toFixed(dec || 0).split('.');
    let ent = partes[0];
    if (ent.length > 3) ent = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (v < 0 ? '−' : '') + ent + (partes[1] ? ',' + partes[1] : '');
  };

  // «10.219 M€» -> { n: '10.219', u: 'M€' }
  P.partes = function (c) {
    const t = c.valor_txt;
    if (c.unidad && t.slice(-c.unidad.length) === c.unidad) return { n: t.slice(0, t.length - c.unidad.length).trim(), u: c.unidad };
    return { n: t, u: '' };
  };

  P.fecha = function (iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return Number(m[3]) + ' de ' + meses[Number(m[2]) - 1] + ' de ' + m[1];
  };

  // ---------- Datos ----------

  const PRIORIDAD = {
    'Portugal': ['ine2025', 'ine2025x'],
    'Azores': ['srea2025', 'ine2025x', 'ine2025', 'drem2025'],
    'Madeira': ['drem2025', 'ine2025x', 'ine2025'],
    'UE-27': ['ue2025', 'drem2025', 'ine2025']
  };
  const ORIGENES = ['PDF: tabla', 'Excel: celda', 'Web: tabla en imagen', 'PDF: gráfico', 'PDF: texto', 'Web: texto'];

  function rango(territorio, doc) {
    const i = (PRIORIDAD[territorio] || ['drem2025', 'ine2025', 'ue2025']).indexOf(doc);
    return i < 0 ? 9 : i;
  }

  P.preparar = function (cifras, apoyo) {
    P.apoyo = apoyo;
    cifras.forEach(function (c) {
      if (c.unidad) c.valor_txt = c.valor_txt.replace(/^(\u2212?\d)(\d{3})(?=[,\s]|$)/, '$1.$2');
    });
    P.semilla = { cifras: cifras, documentos: apoyo.documentos, paginas: apoyo.paginas, pendientes: apoyo.pendientes || [] };
    P.contrastes = {};
    apoyo.contraste.forEach(function (k) {
      (P.contrastes[k.a] = P.contrastes[k.a] || []).push({ otro: k.b, resultado: k.resultado, mismo: k.mismo });
      (P.contrastes[k.b] = P.contrastes[k.b] || []).push({ otro: k.a, resultado: k.resultado, mismo: k.mismo });
    });
    P.almacen.leer();
    P.integrar();
  };

  // De varias cifras para el mismo dato, la de la fuente de referencia del territorio.
  P.mejor = function (lista) {
    return lista.slice().sort(function (a, b) {
      return rango(a.territorio, a.doc) - rango(b.territorio, b.doc) ||
        ORIGENES.indexOf(a.origen) - ORIGENES.indexOf(b.origen) || (a.id < b.id ? -1 : 1);
    })[0] || null;
  };

  P.dato = function (ind, territorio, periodo, sector) {
    return P.mejor(P.cifras.filter(function (c) {
      return c.ind === ind && c.territorio === territorio && c.periodo === periodo && c.sector === (sector || '');
    }));
  };

  // Serie anual coherente: todas las cifras salen del mismo documento y unidad,
  // el que cubre más años.
  P.serie = function (ind, territorio, sector) {
    const grupos = {};
    P.cifras.forEach(function (c) {
      if (c.ind !== ind || c.territorio !== territorio || c.sector !== (sector || '') || !/^\d{4}$/.test(c.periodo)) return;
      const g = grupos[c.doc + '|' + c.unidad] = grupos[c.doc + '|' + c.unidad] || { doc: c.doc, porPeriodo: {} };
      (g.porPeriodo[c.periodo] = g.porPeriodo[c.periodo] || []).push(c);
    });
    let elegido = null;
    Object.keys(grupos).forEach(function (k) {
      const g = grupos[k];
      g.n = Object.keys(g.porPeriodo).length;
      g.r = rango(territorio, g.doc);
      if (!elegido || g.n > elegido.n || (g.n === elegido.n && g.r < elegido.r)) elegido = g;
    });
    if (!elegido) return [];
    return Object.keys(elegido.porPeriodo).sort().map(function (p) { return P.mejor(elegido.porPeriodo[p]); });
  };

  // Reparto por sector de un indicador en un territorio y un año, con su total.
  P.estructura = function (ind, territorio, periodo) {
    const cand = P.cifras.filter(function (c) { return c.ind === ind && c.territorio === territorio && c.periodo === periodo; });
    const grupos = {};
    cand.forEach(function (c) {
      if (!c.sector) return;
      const g = grupos[c.doc + '|' + c.unidad] = grupos[c.doc + '|' + c.unidad] || { doc: c.doc, unidad: c.unidad, porSector: {} };
      (g.porSector[c.sector] = g.porSector[c.sector] || []).push(c);
    });
    let elegido = null;
    Object.keys(grupos).forEach(function (k) {
      const g = grupos[k];
      g.n = Object.keys(g.porSector).length;
      g.r = rango(territorio, g.doc);
      if (!elegido || g.n > elegido.n || (g.n === elegido.n && g.r < elegido.r)) elegido = g;
    });
    if (!elegido) return null;
    const partes = Object.keys(elegido.porSector).map(function (s) { return P.mejor(elegido.porSector[s]); });
    const totales = cand.filter(function (c) { return !c.sector && c.unidad === elegido.unidad; });
    const total = P.mejor(totales.filter(function (c) { return c.doc === elegido.doc; })) || P.mejor(totales);
    return { partes: partes, total: total, doc: elegido.doc };
  };

  function pesoBusqueda(c) {
    return (c.grupo.indexOf('kpi') >= 0 ? 4 : 0) + (c.sector ? 0 : 2) + (rango(c.territorio, c.doc) === 0 ? 1 : 0);
  }
  P.buscar = function (q, max) {
    const piezas = P.norm(q).split(/\s+/).filter(Boolean);
    if (!piezas.length) return [];
    const r = P.cifras.filter(function (c) { return piezas.every(function (t) { return c.txt.indexOf(t) >= 0; }); });
    r.sort(function (a, b) { return pesoBusqueda(b) - pesoBusqueda(a) || b.anio - a.anio; });
    return max ? r.slice(0, max) : r;
  };

  // ---------- Procedencia ----------

  P.lugar = function (c) {
    if (c.pagina) return 'p. ' + c.pagina;
    return c.loc.charAt(0).toLowerCase() + c.loc.slice(1);
  };
  P.procedencia = function (c) { return P.docs[c.doc].sigla + ', ' + P.lugar(c); };

  P.cita = function (c) {
    const d = P.docs[c.doc];
    return c.indicador + (c.sector ? ' (' + c.sector + ')' : '') + ', ' + c.territorio + ', ' + c.periodo + ': ' + c.valor_txt +
      '. Fuente: ' + d.organismo + ', «' + d.titulo + '», ' + P.lugar(c) + '. ' + d.enlace;
  };

  P.cifraBtn = function (c, texto, clase) {
    return P.h('button', { class: clase || 'cifra', type: 'button', title: 'Ver de dónde sale: ' + P.procedencia(c),
      on: { click: function (e) { e.stopPropagation(); P.abrirFicha(c.id, e.currentTarget); } } }, texto || c.valor_txt);
  };
  P.origenBtn = function (c) {
    return P.h('button', { class: 'origen', type: 'button', title: 'Ver la evidencia',
      on: { click: function (e) { e.stopPropagation(); P.abrirFicha(c.id, e.currentTarget); } } }, P.procedencia(c));
  };

  // ---------- Piezas de interfaz ----------

  P.estadoEl = function (tipo, texto) {
    const icono = tipo === 'bien' ? 'ok' : (tipo === 'neutro' ? 'raya' : 'aviso');
    return P.h('span', { class: 'estado estado-' + tipo }, P.icono(icono, 14), texto);
  };

  P.panel = function (titulo, sub, clase) {
    const cuerpo = P.h('div', { class: 'panel-cuerpo' });
    const el = P.h('section', { class: 'panel' + (clase ? ' ' + clase : '') },
      titulo ? P.h('header', { class: 'panel-cab' }, P.h('h2', { class: 'titulo-panel' }, titulo), sub ? P.h('p', { class: 'panel-sub' }, sub) : null) : null,
      cuerpo);
    el.cuerpo = cuerpo;
    return el;
  };

  P.cabecera = function (titulo, entradilla) {
    return P.h('header', { class: 'cab' }, P.h('h1', { class: 'titulo-vista' }, titulo), entradilla ? P.h('p', { class: 'entradilla' }, entradilla) : null);
  };

  P.selector = function (etiqueta, opciones, valor, alCambiar) {
    const sel = P.h('select', { class: 'campo', on: { change: function () { alCambiar(sel.value); } } },
      opciones.map(function (o) { return P.h('option', { value: o.v, selected: o.v === valor }, o.t); }));
    return P.h('label', { class: 'control' }, etiqueta, sel);
  };

  // Grupo de botones de conmutación. multiple=false se comporta como pestañas.
  P.conmutas = function (items, activos, multiple, alCambiar) {
    const caja = P.h('div', { class: 'conmutas' });
    items.forEach(function (it) {
      const b = P.h('button', { class: 'conmuta', type: 'button', 'aria-pressed': activos.indexOf(it.v) >= 0 ? 'true' : 'false',
        on: { click: function () {
          let nuevos;
          if (multiple) {
            nuevos = activos.indexOf(it.v) >= 0 ? activos.filter(function (x) { return x !== it.v; }) : activos.concat([it.v]);
            if (!nuevos.length) return;
          } else {
            nuevos = [it.v];
          }
          alCambiar(nuevos);
        } } },
        it.color ? P.h('i', { class: 'muestra', style: { background: it.color } }) : null, it.t);
      caja.appendChild(b);
    });
    return caja;
  };

  P.leyenda = function (items) {
    return P.h('div', { class: 'leyenda' }, items.map(function (it) {
      return P.h('span', { class: 'leyenda-item' },
        P.h('i', { class: 'muestra' + (it.linea ? ' linea' : ''), style: it.linea ? { 'border-color': it.color } : { background: it.color } }), it.nombre);
    }));
  };

  // ---------- Etiqueta flotante ----------

  const tip = P.h('div', { class: 'tip', role: 'tooltip', hidden: true });
  function colocar(x, y) {
    const r = tip.getBoundingClientRect();
    let izq = x + 14, arriba = y + 16;
    if (izq + r.width > window.innerWidth - 8) izq = x - r.width - 14;
    if (arriba + r.height > window.innerHeight - 8) arriba = y - r.height - 14;
    tip.style.left = Math.max(8, izq) + 'px';
    tip.style.top = Math.max(8, arriba) + 'px';
  }
  P.tip = {
    mostrar: function (x, y, contenido) {
      if (!tip.parentNode) document.body.appendChild(tip);
      tip.replaceChildren();
      anadir(tip, [contenido]);
      tip.hidden = false;
      colocar(x, y);
    },
    mover: function (x, y) { if (!tip.hidden) colocar(x, y); },
    ocultar: function () { tip.hidden = true; }
  };
  P.conTip = function (el, contenido) {
    el.addEventListener('pointerenter', function (e) { P.tip.mostrar(e.clientX, e.clientY, contenido()); });
    el.addEventListener('pointermove', function (e) { P.tip.mover(e.clientX, e.clientY); });
    el.addEventListener('pointerleave', P.tip.ocultar);
    el.addEventListener('focus', function () {
      const r = el.getBoundingClientRect();
      P.tip.mostrar(r.left + r.width / 2, r.bottom - 8, contenido());
    });
    el.addEventListener('blur', P.tip.ocultar);
    return el;
  };
  P.tipCifra = function (c, extra) {
    return [P.h('b', null, c.valor_txt),
      P.h('div', null, c.territorio + ', ' + c.periodo + (c.sector ? '. ' + c.sector : '')),
      extra ? P.h('div', null, extra) : null,
      P.h('span', { class: 'tip-fuente' }, P.procedencia(c))];
  };

  // ---------- Varios ----------

  P.ir = function (ruta) { if (location.hash !== '#' + ruta) location.hash = ruta; else P.pintar(); };

  P.csv = function (filas, columnas) {
    const celda = function (v) {
      const s = v == null ? '' : String(v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lineas = [columnas.map(function (c) { return celda(c.t); }).join(';')];
    filas.forEach(function (f) { lineas.push(columnas.map(function (c) { return celda(c.v(f)); }).join(';')); });
    return '﻿' + lineas.join('\r\n') + '\r\n';
  };

  // Aviso para quien llega a la página sin contexto: qué es esto y qué no es.
  P.avisoPublico = function () {
    return P.h('aside', { class: 'aviso-publico', 'aria-label': 'Aviso sobre este prototipo' }, P.icono('aviso', 16),
      P.h('p', null, P.h('strong', null, 'Prototipo de demostración.'), ' No es una herramienta de la Fundación Oceano Azul ni tiene su aval. Usa solo información publicada por la fundación y por organismos oficiales, y cada cifra enlaza con su fuente. Las valoraciones de impacto son supuestos, no datos de la fundación. ',
        P.dentroDeClaude() ? null : 'En esta copia pública no están activas las funciones de IA: leer documentos nuevos, preguntar y redactar borradores. ',
        P.h('a', { href: '#acerca' }, 'Qué es real y qué se ha supuesto'), '.'));
  };

  // Capacidades de la página (preguntar a Claude, guardar ficheros). Solo existen dentro de Claude y para quien
  // tiene permiso; sin ellas, lo que usa Claude se explica y los ficheros se descargan con el navegador o se copian.
  Object.defineProperty(P, 'SIN_CLAUDE', { get: function () {
    return P.dentroDeClaude()
      ? 'En un enlace público se ven los datos ya cargados, pero no las funciones que usan Claude; si has abierto azuIQ desde tu Claude, acepta el permiso.'
      : 'Esta copia pública enseña los datos ya cargados; las funciones que usan Claude solo están activas en la versión que se abre desde Claude.';
  } });
  P.dentroDeClaude = function () { return !!(window.claude && typeof window.claude.use === 'function'); };
  P.capacidad = function (nombre) {
    if (!P.dentroDeClaude()) return Promise.resolve(null);
    try { return Promise.resolve(window.claude.use(nombre)).catch(function () { return null; }); }
    catch (e) { return Promise.resolve(null); }
  };

  // Guarda un fichero. Dentro de Claude lo hace la página que lo aloja, con su confirmación; en cualquier otro
  // sitio, el navegador. Devuelve qué pasó: guardado, descargado, copiado, bloqueado, cancelado o error.
  const TIPOS = { csv: 'text/csv', json: 'application/json', md: 'text/markdown' };
  function descargaDelNavegador(nombre, datos) {
    try {
      const tipo = TIPOS[nombre.split('.').pop()] || 'text/plain';
      const url = URL.createObjectURL(new Blob([datos], { type: tipo + ';charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = nombre; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      return 'descargado';
    } catch (e) { return 'error'; }
  }
  // Dentro de un marco, el navegador ignora las descargas que inicia la página: ahí, al menos, se copia el contenido.
  const enMarco = (function () { try { return window.self !== window.top; } catch (e) { return true; } })();
  P.guardarFichero = function (nombre, datos) {
    return P.capacidad('downloads').then(function (d) {
      if (d) return d.save({ filename: nombre, data: datos }).then(function () { return 'guardado'; }, function (e) { return e && e.code === 'declined' ? 'cancelado' : 'error'; });
      if (!enMarco) return descargaDelNavegador(nombre, datos);
      try { return navigator.clipboard.writeText(datos).then(function () { return 'copiado'; }, function () { return 'bloqueado'; }); }
      catch (e) { return 'bloqueado'; }
    });
  };
  // El aviso que acompaña a cada resultado, para la línea de estado que hay junto al botón.
  P.avisoFichero = function (resultado, nombre) {
    if (resultado === 'guardado') return 'Fichero guardado: ' + nombre;
    if (resultado === 'descargado') return 'Descarga iniciada: ' + nombre;
    if (resultado === 'copiado') return 'Esta vista no permite descargar ficheros: el contenido de ' + nombre + ' se ha copiado al portapapeles.';
    if (resultado === 'bloqueado') return 'Esta vista no permite descargar ficheros.';
    return resultado === 'cancelado' ? '' : 'No se pudo guardar el fichero en esta vista.';
  };
})();
