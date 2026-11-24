/* azuIQ: detalle de documento, calidad del dato y lagunas. */
(function () {
  'use strict';
  const P = window.P, h = P.h;

  const sinNumero = function (sector) { return sector.replace(/^\d+\.\s*/, ''); };
  const tipoCorto = function (d) { return d.id === 'ine2025x' ? 'XLSX' : (d.paginas ? 'PDF' : 'WEB'); };
  const QUE_ES = {
    ine2025x: 'Hoja de cálculo. Las celdas se leen con un programa, sin IA.',
    srea2025: 'Página web con las tablas publicadas como imagen. Se leen y se cotejan con el Excel del INE.',
    ocde2025: 'Página web. Solo se leyó el resumen ejecutivo: el sitio impide la descarga automática.'
  };

  function paginasCon(id) {
    const out = {};
    P.cifras.forEach(function (c) { if (c.doc === id && c.pagina) out[c.pagina] = (out[c.pagina] || 0) + 1; });
    return out;
  }

  // ---------- Documento ----------

  function tablaCifras(lista, alEntrar, alSalir) {
    return h('div', { class: 'tabla-caja libre' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Indicador'), h('th', null, 'Territorio'), h('th', null, 'Periodo'), h('th', { class: 'num' }, 'Valor'), h('th', null, 'Lugar'))),
      h('tbody', null, lista.map(function (c) {
        const abrir = function (e) { P.abrirFicha(c.id, e.currentTarget); };
        return h('tr', { class: 'fila-enlace', tabindex: 0, on: { click: abrir, keydown: function (e) { if (e.key === 'Enter') abrir(e); },
          pointerenter: alEntrar ? function () { alEntrar(c); } : null, pointerleave: alSalir || null, focus: alEntrar ? function () { alEntrar(c); } : null, blur: alSalir || null } },
          h('td', null, c.indicador, c.sector ? h('div', { class: 'tenue' }, sinNumero(c.sector)) : null),
          h('td', null, c.territorio), h('td', { class: 'nw' }, c.periodo), h('td', { class: 'num' }, c.valor_txt), h('td', { class: 'tenue' }, c.loc));
      }))));
  }

  P.vistas.documento = function (raiz, id) {
    const d = P.docs[id];
    if (!d) {
      raiz.appendChild(P.cabecera('Documento no encontrado', 'Ese documento no está cargado.'));
      raiz.appendChild(h('a', { class: 'btn', href: '#fuentes' }, 'Ver las fuentes'));
      return;
    }
    const cifras = P.cifras.filter(function (c) { return c.doc === id; });
    const con = paginasCon(id), pags = P.apoyo.paginas[id];
    const est = P.estado.doc = (P.estado.doc && P.estado.doc.id === id) ? P.estado.doc : { id: id, pagina: null };

    raiz.appendChild(h('a', { class: 'volver', href: '#fuentes' }, P.icono('volver'), 'Fuentes'));
    raiz.appendChild(P.cabecera(d.titulo, d.organismo + ', ' + P.fecha(d.fecha) + '. ' + (d.idioma ? d.idioma + '. ' : '') + (QUE_ES[id] || (d.paginas ? 'PDF de ' + d.paginas + ' páginas.' : d.tipo))));
    raiz.appendChild(h('div', { class: 'controles' },
      d.enlace ? h('a', { class: 'btn', href: d.enlace, target: '_blank', rel: 'noopener' }, 'Abrir la publicación', P.icono('fuera')) : null,
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        P.estado.cifras = { q: '', territorio: '', ind: '', doc: id, origen: '', orden: 'territorio', dir: 1 };
        P.ir('cifras');
      } } }, 'Ver sus ' + cifras.length + ' cifras en la tabla general')));

    if (d.paginas && pags) {
      const conDatos = Object.keys(con).map(Number).sort(function (a, b) { return a - b; });
      if (!est.pagina || !con[est.pagina]) est.pagina = conDatos.slice().sort(function (a, b) { return con[b] - con[a]; })[0];
      const panel = P.panel('Páginas con cifras', 'La regla representa las ' + d.paginas + ' páginas del documento. Elige una página marcada para ver dónde está cada cifra.');
      raiz.appendChild(panel);
      const regla = h('div', { class: 'regla grande', role: 'group', 'aria-label': 'Páginas del documento' });
      const botones = h('div', { class: 'pag-botones' });
      const visor = h('div', { class: 'pag-visor separa' });
      panel.cuerpo.appendChild(regla);
      panel.cuerpo.appendChild(botones);
      panel.cuerpo.appendChild(visor);

      const pintarPagina = function () {
        const marcas = [];
        for (let i = 1; i <= d.paginas; i++) {
          (function (n) {
            marcas.push(h('button', { type: 'button', class: (con[n] ? 'con' : '') + (n === est.pagina ? ' sel' : ''), disabled: !con[n], tabindex: -1,
              'aria-hidden': 'true', title: con[n] ? 'Página ' + n + ': ' + con[n] + ' cifras' : null,
              on: { click: function () { est.pagina = n; pintarPagina(); } } }));
          })(i);
        }
        P.poner(regla, marcas);
        P.poner(botones, conDatos.map(function (n) {
          return h('button', { class: 'conmuta', type: 'button', 'aria-pressed': n === est.pagina ? 'true' : 'false',
            on: { click: function () { est.pagina = n; pintarPagina(); } } }, 'p. ' + n, h('span', { class: 'nav-cuenta' }, con[n]));
        }));
        const pag = pags[String(est.pagina)];
        const enPagina = cifras.filter(function (c) { return c.pagina === est.pagina; });
        const marcasPag = [];
        enPagina.forEach(function (c) { (pag.cifras[c.id] || []).forEach(function (k) { marcasPag.push({ caja: k, id: c.id }); }); });
        const mini = P.g.minimapa(pag, marcasPag, { anchoPx: 300, titulo: 'Esquema de la página ' + est.pagina + ' con ' + enPagina.length + ' cifras señaladas' });
        const resaltar = function (c) {
          mini.querySelectorAll('.marca').forEach(function (m) {
            const mia = m.getAttribute('data-id') === c.id;
            m.classList.toggle('viva', mia);
            m.classList.toggle('apagada', !mia);
          });
        };
        const soltar = function () { mini.querySelectorAll('.marca').forEach(function (m) { m.classList.remove('viva', 'apagada'); }); };
        visor.replaceChildren(
          h('div', null, mini, h('p', { class: 'minimapa-pie' }, 'Página ' + est.pagina + ' de ' + d.paginas + '. Cada barra gris es un tramo de texto; cada marca magenta, una cifra extraída. Pasa por una fila para localizarla.')),
          tablaCifras(enPagina, resaltar, soltar));
      };
      pintarPagina();
    } else {
      const grupos = {};
      cifras.forEach(function (c) {
        const g = c.origen === 'Excel: celda' ? c.loc.split(',')[0] : c.loc;
        (grupos[g] = grupos[g] || []).push(c);
      });
      const nombres = Object.keys(grupos).sort(function (a, b) { return a.localeCompare(b, 'es', { numeric: true }); });
      if (!est.grupo || !grupos[est.grupo]) est.grupo = nombres[0];
      const panel = P.panel(id === 'ine2025x' ? 'Cifras por hoja' : 'Cifras por apartado', 'Elige un grupo para ver sus cifras.');
      raiz.appendChild(panel);
      const botones = h('div', { class: 'pag-botones' });
      const hueco = h('div', { class: 'separa' });
      panel.cuerpo.appendChild(botones);
      panel.appendChild(hueco);
      const pintarGrupo = function () {
        P.poner(botones, nombres.map(function (g) {
          return h('button', { class: 'conmuta', type: 'button', 'aria-pressed': g === est.grupo ? 'true' : 'false',
            on: { click: function () { est.grupo = g; pintarGrupo(); } } }, g, h('span', { class: 'nav-cuenta' }, grupos[g].length));
        }));
        hueco.replaceChildren(tablaCifras(grupos[est.grupo]));
      };
      pintarGrupo();
    }
  };

  // ---------- Calidad ----------

  P.vistas.calidad = function (raiz) {
    const est = P.estado.calidad = P.estado.calidad || { resultado: '', distintos: false };
    const total = P.cifras.length;
    const comprobadas = P.cifras.filter(function (c) { return c.ok; }).length;
    const pares = P.apoyo.contraste;
    const difieren = pares.filter(function (k) { return k.resultado === 'Difiere'; }).length;
    const celda = function (nombre, valor, pie) {
      return h('div', { class: 'kpi' }, h('span', { class: 'kpi-nombre' }, nombre), h('span', { class: 'kpi-valor', style: { cursor: 'default' } }, valor), h('span', { class: 'kpi-periodo' }, pie));
    };

    raiz.appendChild(P.cabecera('Calidad del dato', 'Ninguna cifra entra en la plataforma sin una comprobación. Aquí se ve cuál recibió cada una y qué pasa cuando dos lecturas dan el mismo dato.'));
    raiz.appendChild(h('section', { class: 'panel banda' },
      celda('Cifras extraídas', P.num(total), 'de ' + P.apoyo.documentos.length + ' documentos'),
      celda('Comprobadas', P.num(comprobadas), P.num(comprobadas / total * 100, 0) + ' % del total'),
      celda('Contrastes entre lecturas', P.num(pares.length), pares.filter(function (k) { return !k.mismo; }).length + ' entre documentos distintos'),
      celda('Pendientes de revisión', P.num(total - comprobadas + difieren), 'cifras sin comprobar o con diferencias')));

    const metodos = {}, lecturas = {};
    P.cifras.forEach(function (c) {
      const m = P.metodo(c);
      (metodos[m.clave] = metodos[m.clave] || { m: m, n: 0 }).n++;
      lecturas[c.origen] = (lecturas[c.origen] || 0) + 1;
    });
    const rej = h('div', { class: 'rejilla separa' });
    raiz.appendChild(rej);
    const pMet = P.panel('Qué comprobación recibió cada cifra', 'Número de cifras por tipo de comprobación.', 'col-7');
    rej.appendChild(pMet);
    const listaMet = Object.keys(metodos).map(function (k) { return metodos[k]; }).sort(function (a, b) { return b.n - a.n; });
    P.g.barras(pMet.cuerpo, listaMet.map(function (x) { return { nombre: x.m.nombre, valor: x.n, texto: P.num(x.n) }; }), { anchoNombre: 240 });
    pMet.cuerpo.appendChild(h('div', { class: 'dl separa' }, listaMet.map(function (x) {
      return h('div', null, h('span', { class: 'dt' }, x.m.nombre), h('span', { class: 'dd' }, x.m.explica));
    })));
    const pLec = P.panel('De dónde se leyó', 'Número de cifras por tipo de soporte.', 'col-5');
    rej.appendChild(pLec);
    P.g.barras(pLec.cuerpo, Object.keys(lecturas).map(function (k) { return { nombre: k, valor: lecturas[k], texto: P.num(lecturas[k]) }; })
      .sort(function (a, b) { return b.valor - a.valor; }), { anchoNombre: 160 });
    pLec.appendChild(h('p', { class: 'panel-pie' }, 'En los gráficos, la cifra se localiza en la página y se empareja con su etiqueta por la posición en el eje.'));

    // Contraste
    const pCon = P.panel('Contraste entre lecturas', 'Cuando el mismo dato aparece dos veces, en dos documentos o en dos lugares del mismo, la plataforma compara los valores.');
    raiz.appendChild(h('div', { class: 'separa' }, pCon));
    const cuenta = h('span', { class: 'cuenta', role: 'status' });
    const cuerpo = h('tbody');
    const lectura = function (c) { return h('td', null, P.cifraBtn(c), h('div', null, h('span', { class: 'origen' }, P.procedencia(c)))); };
    const pintarTabla = function () {
      const filas = pares.filter(function (k) { return (!est.resultado || k.resultado === est.resultado) && (!est.distintos || !k.mismo); });
      cuenta.textContent = filas.length + (filas.length === 1 ? ' contraste' : ' contrastes');
      P.poner(cuerpo, filas.map(function (k) {
        const a = P.porId[k.a], b = P.porId[k.b];
        return h('tr', null, h('td', null, a.territorio), h('td', null, a.indicador, a.sector ? h('div', { class: 'tenue' }, sinNumero(a.sector)) : null), h('td', { class: 'nw' }, a.periodo),
          lectura(a), lectura(b), h('td', null, P.estadoEl(k.resultado === 'Difiere' ? 'critico' : 'bien', k.resultado)));
      }));
      if (!filas.length) cuerpo.appendChild(h('tr', null, h('td', { colspan: 6 }, h('p', { class: 'vacio' }, h('strong', null, 'Ningún contraste con ese resultado.'), 'Cambia el filtro para ver los demás.'))));
    };
    const resultados = [{ v: '', t: 'Todos' }, { v: 'Coincide', t: 'Coincide' }, { v: 'Coincide con redondeo', t: 'Coincide con redondeo' }, { v: 'Difiere', t: 'Difiere' }];
    pCon.cuerpo.appendChild(h('div', { class: 'controles', style: { 'margin-bottom': '0' } },
      P.selector('Resultado', resultados, est.resultado, function (v) { est.resultado = v; pintarTabla(); }),
      h('div', { class: 'control' }, 'Alcance', P.conmutas([{ v: 'todos', t: 'Todos' }, { v: 'distintos', t: 'Solo entre documentos distintos' }], [est.distintos ? 'distintos' : 'todos'], false,
        function (n) { est.distintos = n[0] === 'distintos'; P.pintar(); })),
      h('div', { class: 'fin' }, cuenta)));
    pCon.appendChild(h('div', { class: 'tabla-caja' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Territorio'), h('th', null, 'Indicador'), h('th', null, 'Periodo'), h('th', null, 'Lectura A'), h('th', null, 'Lectura B'), h('th', null, 'Resultado'))),
      cuerpo)));
    pintarTabla();

    const pRev = P.panel('Bandeja de revisión', 'Aquí llegan las cifras que propone la IA al cargar un documento. Las que no se encuentran escritas así en su página esperan a que una persona decida.');
    raiz.appendChild(h('div', { class: 'separa' }, pRev));
    const nPend = P.pendientes.length;
    pRev.cuerpo.appendChild(h('p', { class: 'vacio', style: { padding: '4px 0 0' } },
      h('strong', null, nPend ? nPend + (nPend === 1 ? ' propuesta espera' : ' propuestas esperan') + ' revisión.' : 'No hay nada pendiente.'),
      nPend ? h('a', { href: '#revisar' }, 'Ir a revisar') : 'Todas las cifras de los datos pasaron su comprobación y ningún contraste dio diferencias.'));
  };

  // ---------- Lagunas ----------

  const ABREVIA = { 'Sin cifra': 'sin cifra', 'Mencionado': 'mención', 'No consta': 'no consta', 'No localizado': 'no leído', 'No aplica': 'no aplica' };
  const EXPLICA = [
    ['Número', 'cifras extraídas de esa fuente para ese campo'],
    ['Mención', 'la fuente habla del tema, pero no se extrajo ninguna cifra'],
    ['Sin cifra', 'la fuente lo trata sin dar un valor, o lo excluye de forma expresa'],
    ['No consta', 'el tema no aparece en el texto leído'],
    ['No leído', 'no se pudo leer la parte del documento donde estaría'],
    ['No aplica', 'el tipo de documento no puede contenerlo']
  ];

  P.vistas.lagunas = function (raiz) {
    const cob = P.apoyo.cobertura, docs = P.apoyo.documentos;
    const campos = [];
    cob.forEach(function (k) { if (campos.indexOf(k.campo) < 0) campos.push(k.campo); });
    const CLAVE = 'Valoración del capital natural';

    raiz.appendChild(P.cabecera('Lagunas', 'Tan importante como lo que dicen las fuentes es lo que callan. Para cada campo de interés, la plataforma registra si la publicación da la cifra, solo la menciona o la deja fuera.'));

    const capital = cob.filter(function (k) { return k.campo === CLAVE; });
    const cercanas = P.cifras.filter(function (c) { return c.grupo.indexOf('capital_natural') >= 0; })
      .sort(function (a, b) { return a.ind.length - b.ind.length; });
    const pCap = h('section', { class: 'panel hallazgo' },
      h('h2', null, 'Ninguna de las publicaciones leídas pone valor monetario al capital natural marino'),
      h('p', null, 'Es un dato que un programa de conservación necesitaría para defender su inversión. Las cuentas satélite del mar lo dejan fuera de forma expresa, los informes europeos solo lo mencionan y de la OCDE solo se leyó el resumen ejecutivo.'),
      h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
        h('thead', null, h('tr', null, h('th', null, 'Fuente'), h('th', null, 'Situación'), h('th', null, 'Detalle'))),
        h('tbody', null, capital.map(function (k) {
          return h('tr', null, h('td', null, P.docs[k.doc].sigla), h('td', null, P.estadoEl('neutro', k.estado)), h('td', { class: 'tenue' }, k.detalle));
        })))),
      cercanas.length ? h('p', null, 'Lo más cercano que sí se publica: ', cercanas.map(function (c, i) {
        return [i ? '; ' : '', c.indicador.charAt(0).toLowerCase() + c.indicador.slice(1) + ', ', P.cifraBtn(c)];
      }), '.') : null);
    raiz.appendChild(pCap);

    const pMat = P.panel('Cobertura por campo y fuente', 'Cada celda dice qué se obtuvo de esa fuente. Las celdas con número llevan a sus cifras.');
    raiz.appendChild(h('div', { class: 'separa' }, pMat));
    const tabla = h('table', { class: 'matriz' },
      h('thead', null, h('tr', null, h('th', { scope: 'col', style: { 'text-align': 'left', 'padding-left': '18px' } }, 'Campo'),
        docs.map(function (d) { return h('th', { scope: 'col' }, d.sigla); }))),
      h('tbody', null, campos.map(function (campo) {
        return h('tr', { class: campo === CLAVE ? 'clave' : null }, h('th', { scope: 'row' }, campo), docs.map(function (d) {
          const k = cob.filter(function (x) { return x.campo === campo && x.doc === d.id; })[0];
          if (!k) return h('td', null);
          if (k.estado === 'Extraído') {
            return h('td', null, h('button', { class: 'm-ext', type: 'button', title: k.detalle + ' en ' + d.sigla,
              on: { click: function () { P.estado.cifras = { q: '', territorio: '', ind: '', doc: d.id, origen: '', orden: 'indicador', dir: 1 }; P.ir('cifras'); } } }, k.n));
          }
          const celda = h('button', { class: 'm-otro', type: 'button', 'aria-label': k.estado + '. ' + k.detalle }, ABREVIA[k.estado] || k.estado);
          P.conTip(celda, function () { return [h('b', null, k.estado), h('div', null, k.detalle)]; });
          return h('td', null, celda);
        }));
      })));
    pMat.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, tabla));
    pMat.appendChild(h('div', { class: 'panel-cuerpo' }, h('div', { class: 'dl', style: { 'max-width': '70ch' } }, EXPLICA.map(function (e) {
      return h('div', { style: { 'flex-direction': 'row', gap: '8px' } }, h('span', { class: 'dt', style: { 'min-width': '74px', 'font-size': '13px' } }, e[0]), h('span', { class: 'dd' }, e[1]));
    }))));
    pMat.appendChild(h('p', { class: 'panel-pie' }, 'La cobertura se calcula buscando términos de cada campo en el texto completo de cada publicación. Sirve para decidir qué fuentes añadir.'));
  };

})();
