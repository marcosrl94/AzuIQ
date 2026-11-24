/* azuIQ: ficha de evidencia (panel lateral) y buscador. */
(function () {
  'use strict';
  const P = window.P, h = P.h;

  const LECTURA = {
    'PDF: tabla': 'Tabla de un PDF',
    'PDF: texto': 'Texto de un PDF',
    'PDF: gráfico': 'Gráfico de un PDF',
    'Web: tabla en imagen': 'Tabla publicada como imagen',
    'Web: texto': 'Texto de una página web',
    'Excel: celda': 'Celda de una hoja de cálculo'
  };

  // Tipo de comprobación y su explicación, a partir del texto de verificación.
  P.metodo = function (c) {
    const v = c.verif;
    if (v.indexOf('Lectura directa') === 0) return { clave: 'codigo', nombre: 'Lectura de la celda por código', explica: 'El valor se lee de la celda con un programa. La IA no interviene en la lectura.' };
    if (v.indexOf('Automática') === 0) return { clave: 'pagina', nombre: 'Búsqueda automática en la página', explica: 'Un programa busca la cifra, escrita igual que en la fuente, en el texto de esa página. Si no la encuentra, la cifra pasa a revisión.' };
    if (v.indexOf('Aprobada a mano') === 0) return { clave: 'manual', nombre: 'Revisión manual', explica: 'La cifra no estaba escrita así en la fuente. Una persona la revisó y la aprobó.' };
    if (v.indexOf('Cruzada') === 0) return { clave: 'cruzada', nombre: 'Cotejo con otra fuente', explica: 'La tabla está publicada como imagen. La IA la lee y el valor se coteja con la celda equivalente del Excel del INE.' };
    return { clave: 'relectura', nombre: 'Segunda lectura independiente', explica: 'El sitio impide la descarga automática. La cifra se confirmó con una segunda lectura independiente de la página y no pasa por la búsqueda automática.' };
  };

  let origen = null;

  function dato(etiqueta, valor) {
    return h('div', null, h('span', { class: 'dt' }, etiqueta), h('span', { class: 'dd' }, valor));
  }

  function esquema(c) {
    const pags = P.apoyo.paginas[c.doc];
    const pag = pags && c.pagina ? pags[String(c.pagina)] : null;
    if (pag) {
      const cajas = pag.cifras[c.id] || [];
      const pie = cajas.length === 1 ? 'La marca sitúa la cifra en la página.'
        : (cajas.length ? 'La cifra aparece ' + cajas.length + ' veces en esta página; se marcan todas.' : 'Esquema de la página.');
      return h('div', null,
        P.g.minimapa(pag, cajas.map(function (k) { return { caja: k }; }), { anchoPx: 150, guias: cajas.length <= 2, titulo: 'Esquema de la página ' + c.pagina + ' con la posición de la cifra' }),
        h('p', { class: 'minimapa-pie' }, pie + ' Cada barra gris es un tramo de texto.'));
    }
    if (c.origen === 'Excel: celda') {
      const g = P.g.celdas(c.loc);
      if (g) return h('div', null, g, h('p', { class: 'minimapa-pie' }, 'Posición de la celda en la hoja.'));
    }
    return null;
  }

  function pintar(c) {
    const ficha = document.getElementById('ficha');
    const d = P.docs[c.doc], pt = P.partes(c), metodo = P.metodo(c);
    const esq = esquema(c);
    const lugar = c.pagina ? 'Página ' + c.pagina + (d.paginas ? ' de ' + d.paginas : '') + '. ' + c.loc : c.loc;

    const cuerpo = h('div', { class: 'ficha-cuerpo' },
      h('p', { class: 'ficha-ind' }, c.indicador + (c.sector ? '. ' + c.sector : '') + (c.area ? '. ' + c.area : '')),
      h('h2', { class: 'ficha-titulo', id: 'ficha-titulo' }, c.territorio + ', ' + c.periodo),
      h('p', { class: 'ficha-valor' }, pt.n, pt.u ? [' ', h('small', null, pt.u)] : null),
      c.nota ? h('p', { class: 'ficha-nota' }, 'Nota de lectura: ' + c.nota + '.') : null,

      h('section', { class: 'ficha-seccion' },
        h('h3', { class: 'ficha-h' }, 'Dónde está'),
        h('div', { class: 'ficha-lugar' + (esq ? '' : ' sin-esquema') }, esq,
          h('div', { class: 'dl' },
            dato('Publicación', d.titulo),
            dato('Organismo', d.organismo + (d.fecha ? ', ' + P.fecha(d.fecha) : '') + (d.propia ? '. Cargado en este navegador' : '')),
            dato('Lugar', lugar),
            c.contexto ? h('div', null, h('span', { class: 'dt' }, 'Contexto'), h('span', { class: 'dd contexto' }, '…' + c.contexto + '…')) : null,
            dato('Tipo de lectura', LECTURA[c.origen] || c.origen),
            h('div', null, h('span', { class: 'dt' }, 'En la fuente se escribe'), h('span', { class: 'dd' }, h('span', { class: 'forma' }, c.forma))))),
        h('div', { class: 'ficha-acciones' },
          d.enlace ? h('a', { class: 'btn', href: d.enlace, target: '_blank', rel: 'noopener' }, 'Abrir la publicación', P.icono('fuera')) : null,
          h('a', { class: 'btn btn-llano', href: '#doc-' + d.id }, 'Ver el documento en azuIQ'))),

      h('section', { class: 'ficha-seccion' },
        h('h3', { class: 'ficha-h' }, 'Cómo se ha comprobado'),
        P.estadoEl(c.ok ? 'bien' : 'aviso', c.verif),
        h('p', { class: 'ficha-nota' }, metodo.explica)));

    const otros = P.contrastes[c.id] || [];
    const sec = h('section', { class: 'ficha-seccion' }, h('h3', { class: 'ficha-h' }, 'El mismo dato en otras lecturas'));
    if (otros.length) {
      sec.appendChild(h('ul', { class: 'lista-ficha' }, otros.map(function (k) {
        const o = P.porId[k.otro];
        return h('li', null, h('button', { type: 'button', on: { click: function () { P.abrirFicha(o.id); } } },
          h('span', null, P.procedencia(o)), h('span', { class: 'v' }, o.valor_txt),
          h('span', { class: 'abajo' }, P.estadoEl(k.resultado === 'Difiere' ? 'critico' : 'bien', k.resultado + (k.mismo ? ' (mismo documento)' : '')))));
      })));
    } else {
      sec.appendChild(h('p', { class: 'ficha-nota' }, 'Esta cifra aparece una sola vez en las publicaciones cargadas.'));
    }
    cuerpo.appendChild(sec);

    const serie = {};
    P.cifras.forEach(function (x) {
      if (x.doc === c.doc && x.ind === c.ind && x.territorio === c.territorio && x.sector === c.sector && x.unidad === c.unidad && /^\d{4}$/.test(x.periodo)) {
        (serie[x.periodo] = serie[x.periodo] || []).push(x);
      }
    });
    const anios = Object.keys(serie).sort();
    if (anios.length > 1 && serie[c.periodo]) {
      const puntos = anios.map(function (a) { return a === c.periodo ? c : P.mejor(serie[a]); });
      cuerpo.appendChild(h('section', { class: 'ficha-seccion' },
        h('h3', { class: 'ficha-h' }, 'Otros años en la misma fuente'),
        h('div', { class: 'periodos' }, puntos.map(function (x) {
          return h('button', { class: 'periodo-btn', type: 'button', 'aria-current': x.id === c.id ? 'true' : null,
            on: { click: function () { P.abrirFicha(x.id); } } }, h('span', null, x.periodo), P.partes(x).n);
        }))));
    }

    const aviso = h('p', { class: 'ficha-nota', role: 'status' });
    cuerpo.appendChild(h('div', { class: 'ficha-acciones' },
      c.propia ? h('button', { class: 'btn btn-llano', type: 'button', on: { click: function () {
        P.almacen.datos.cifras = P.almacen.datos.cifras.filter(function (x) { return x.id !== c.id; });
        P.almacen.anotar('Cifra retirada: ' + c.indicador + ', ' + c.territorio);
        P.almacen.guardar(); P.cerrarFicha(); P.contarNav(); P.pintar();
      } } }, 'Retirar esta cifra') : null,
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        const texto = P.cita(c);
        const fallo = function () {
          aviso.replaceChildren('No se pudo copiar automáticamente. Selecciona el texto: ', h('span', { style: { 'user-select': 'all' } }, texto));
        };
        try { navigator.clipboard.writeText(texto).then(function () { aviso.textContent = 'Cita copiada.'; }, fallo); } catch (e) { fallo(); }
      } } }, P.icono('copiar'), 'Copiar la cita')));
    cuerpo.appendChild(aviso);

    ficha.replaceChildren(
      h('div', { class: 'ficha-cab' }, h('strong', null, 'Evidencia de la cifra'),
        h('button', { class: 'btn btn-llano', type: 'button', id: 'ficha-cerrar', on: { click: P.cerrarFicha } }, P.icono('cerrar'), 'Cerrar')),
      cuerpo);
    ficha.scrollTop = 0;
  }

  P.abrirFicha = function (id, desde) {
    const c = P.porId[id];
    if (!c) return;
    if (desde) origen = desde;
    P.estado.ficha = id;
    P.tip.ocultar();
    pintar(c);
    document.getElementById('app').classList.add('con-ficha');
    const cerrar = document.getElementById('ficha-cerrar');
    if (cerrar) cerrar.focus({ preventScroll: true });
  };

  P.cerrarFicha = function () {
    if (!P.estado.ficha) return;
    P.estado.ficha = null;
    document.getElementById('app').classList.remove('con-ficha');
    if (origen && document.contains(origen)) origen.focus({ preventScroll: true });
    origen = null;
  };

  // ---------- Buscador ----------

  const VISTAS = [
    { t: 'Inicio: mesa de trabajo', r: 'inicio' }, { t: 'Inicio: sobre el prototipo', r: 'acerca' },
    { t: 'Entrada: cargar un documento', r: 'cargar' }, { t: 'Entrada: revisar propuestas', r: 'revisar' }, { t: 'Entrada: fuentes', r: 'fuentes' },
    { t: 'Datos: cifras', r: 'cifras' }, { t: 'Datos: preguntar', r: 'preguntar' }, { t: 'Datos: modelo', r: 'modelo' }, { t: 'Datos: calidad', r: 'calidad' },
    { t: 'Conservación: áreas marinas', r: 'areas' },
    { t: 'Economía: panel', r: 'economia' }, { t: 'Economía: mapa', r: 'mapa' }, { t: 'Economía: comparar territorios', r: 'comparar' }, { t: 'Economía: lagunas', r: 'lagunas' },
    { t: 'Decisiones: programas', r: 'programas' }, { t: 'Decisiones: cuadro de resultados e impacto', r: 'cuadro' }, { t: 'Decisiones: presupuesto', r: 'presupuesto' }, { t: 'Decisiones: memorando', r: 'memorando' },
    { t: 'Salida: tablas para BI', r: 'salida' }, { t: 'Salida: informe de un área', r: 'informe' }, { t: 'Salida: copia del trabajo', r: 'copia' }
  ];

  let paleta = null, antes = null;

  P.cerrarBuscador = function () {
    if (!paleta) return;
    paleta.remove();
    paleta = null;
    if (antes && document.contains(antes)) antes.focus();
  };

  P.abrirBuscador = function () {
    if (paleta) return;
    antes = document.activeElement;
    const lista = h('div', { class: 'paleta-lista', role: 'listbox', id: 'paleta-lista' });
    const entrada = h('input', { class: 'paleta-entrada', type: 'search', placeholder: 'azores protección total, Portugal empleo 2022, INE…', 'aria-label': 'Buscar', 'aria-controls': 'paleta-lista', autocomplete: 'off', spellcheck: 'false' });
    let items = [], activo = 0;

    function marcar() {
      items.forEach(function (it, i) { it.el.classList.toggle('activo', i === activo); it.el.setAttribute('aria-selected', i === activo ? 'true' : 'false'); });
      if (items[activo]) items[activo].el.scrollIntoView({ block: 'nearest' });
    }
    function item(lineas, alElegir) {
      const el = h('button', { class: 'paleta-item', type: 'button', role: 'option', on: { click: alElegir } }, lineas);
      items.push({ el: el, ir: alElegir });
      return el;
    }
    function pintarResultados() {
      const q = entrada.value.trim(), nq = P.norm(q);
      items = []; activo = 0;
      lista.replaceChildren();
      const cifras = q ? P.buscar(q, 8) : [];
      const docs = P.apoyo.documentos.filter(function (d) { return !q || P.norm(d.titulo + ' ' + d.organismo + ' ' + d.sigla).indexOf(nq) >= 0; });
      // Con texto, cada área marina es también un destino.
      const destinos = q ? VISTAS.concat(P.areas().map(function (a) { return { t: 'Conservación: ' + a.nombre, r: 'area-' + a.id }; }),
        P.programas().map(function (g) { return { t: 'Decisiones: ' + g.nombre, r: 'programa-' + g.id }; })) : VISTAS;
      const vistas = destinos.filter(function (v) { return !q || P.norm(v.t).indexOf(nq) >= 0; });
      if (cifras.length) {
        const total = P.buscar(q).length;
        lista.appendChild(h('div', { class: 'paleta-grupo' }, 'Cifras' + (total > cifras.length ? ' (' + cifras.length + ' de ' + total + ')' : '')));
        cifras.forEach(function (c) {
          lista.appendChild(item([
            h('span', { class: 'p1' }, c.indicador + (c.sector ? '. ' + c.sector : '') + ', ' + c.territorio + ', ' + c.periodo),
            h('span', { class: 'p2' }, c.valor_txt),
            h('span', { class: 'p3 origen' }, P.procedencia(c))], function () { P.cerrarBuscador(); P.abrirFicha(c.id); }));
        });
        if (total > cifras.length) {
          lista.appendChild(item([h('span', { class: 'p1' }, 'Ver las ' + total + ' cifras que coinciden')], function () {
            P.estado.cifras = { q: q, territorio: '', ind: '', doc: '', origen: '', orden: 'territorio', dir: 1 };
            P.cerrarBuscador(); P.ir('cifras');
          }));
        }
      }
      if (docs.length && (q || !cifras.length)) {
        lista.appendChild(h('div', { class: 'paleta-grupo' }, 'Documentos'));
        docs.forEach(function (d) {
          lista.appendChild(item([h('span', { class: 'p1' }, d.titulo), h('span', { class: 'p2' }, d.n_cifras + ' cifras'), h('span', { class: 'p3 origen' }, d.organismo)],
            function () { P.cerrarBuscador(); P.ir('doc-' + d.id); }));
        });
      }
      if (vistas.length) {
        lista.appendChild(h('div', { class: 'paleta-grupo' }, 'Ir a'));
        vistas.forEach(function (v) {
          lista.appendChild(item([h('span', { class: 'p1' }, v.t)], function () { P.cerrarBuscador(); P.ir(v.r); }));
        });
      }
      if (!items.length) lista.appendChild(h('p', { class: 'paleta-vacio' }, 'Nada coincide con «' + q + '». Prueba con un territorio, un indicador o un año.'));
      marcar();
    }

    entrada.addEventListener('input', pintarResultados);
    entrada.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); activo = Math.min(items.length - 1, activo + 1); marcar(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activo = Math.max(0, activo - 1); marcar(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[activo]) items[activo].ir(); }
    });

    paleta = h('div', { class: 'paleta-fondo', on: { pointerdown: function (e) { if (e.target === paleta) P.cerrarBuscador(); } } },
      h('div', { class: 'paleta', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Buscar en la plataforma' }, entrada, lista));
    paleta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); P.cerrarBuscador(); }
      if (e.key === 'Tab') { e.preventDefault(); entrada.focus(); }
    });
    document.body.appendChild(paleta);
    pintarResultados();
    entrada.focus();
  };
})();
