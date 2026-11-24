/* azuIQ: la respuesta de economía (panel, mapa, comparar) y la tabla de cifras. */
(function () {
  'use strict';
  const P = window.P, h = P.h;

  const TERRITORIOS = [
    { v: 'Portugal', color: 'var(--s1)' },
    { v: 'Madeira', color: 'var(--s2)' },
    { v: 'Azores', color: 'var(--s3)' },
    { v: 'UE-27', color: 'var(--s-ref)' }
  ];
  const colorDe = function (t) { const x = TERRITORIOS.filter(function (k) { return k.v === t; })[0]; return x ? x.color : 'var(--s-ref)'; };
  const sinNumero = function (sector) { return sector.replace(/^\d+\.\s*/, ''); };
  const NOMBRE_KPI = { vab: 'VAB (valor añadido bruto)', peso_vab: 'Peso en el VAB total', empleo: 'Empleo', var_vab: 'Variación anual del VAB' };

  function periodoTxt(p) {
    if (/^\d{4}$/.test(p)) return 'en ' + p;
    const m = /^(\d{4})-(\d{4})$/.exec(p);
    return m ? 'entre ' + m[1] + ' y ' + m[2] : p;
  }

  function pesoDeEscala(e) {
    const ids = e.kpis[1], a = P.porId[ids[0]];
    return ids.length > 1 ? P.partes(a).n + ' a ' + P.porId[ids[1]].valor_txt : a.valor_txt;
  }

  // ---------- Panel ----------

  function kpi(ids) {
    const c = P.porId[ids[0]], pt = P.partes(c);
    let nombre = NOMBRE_KPI[c.ind] || c.indicador, numero = pt.n, unidad = pt.u;
    if (ids.length > 1) { nombre = 'Peso en el VAB mundial'; numero = pt.n + ' a ' + P.partes(P.porId[ids[1]]).n; }
    if (c.ind === 'var_vab' && c.valor > 0) numero = '+' + numero;
    const serie = /^\d{4}$/.test(c.periodo) ? P.serie(c.ind, c.territorio, '') : [];
    return h('div', { class: 'kpi' },
      h('span', { class: 'kpi-nombre' }, nombre),
      h('button', { class: 'kpi-valor', type: 'button', title: 'Ver de dónde sale',
        on: { click: function (e) { P.abrirFicha(c.id, e.currentTarget); } } }, numero, unidad ? [' ', h('small', null, unidad)] : null),
      h('span', { class: 'kpi-periodo' }, periodoTxt(c.periodo) + (c.nota ? '. ' + c.nota : '')),
      P.origenBtn(c),
      serie.length >= 3 && c.ind !== 'var_vab' ? h('span', { title: 'Evolución ' + serie[0].periodo + ' a ' + serie[serie.length - 1].periodo },
        P.g.chispa(serie.map(function (x) { return x.valor; }))) : null);
  }

  function panelEstructura(esc) {
    if (esc.id === 'mundo') {
      const p = P.panel('La economía del océano en el mundo', 'Cifras del resumen ejecutivo de la OCDE. No hay desglose por territorio.');
      const filas = P.cifras.filter(function (c) { return c.doc === 'ocde2025'; });
      p.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla' },
        h('thead', null, h('tr', null, h('th', null, 'Indicador'), h('th', null, 'Periodo'), h('th', { class: 'num' }, 'Valor'))),
        h('tbody', null, filas.map(function (c) {
          return h('tr', null, h('td', null, c.indicador, c.nota ? h('div', { class: 'tenue' }, c.nota) : null), h('td', { class: 'nw' }, c.periodo), h('td', { class: 'num' }, P.cifraBtn(c)));
        })))));
      return p;
    }
    const est = P.estructura('vab', esc.territorio, '2022');
    const p = P.panel('Dónde se genera el VAB azul de ' + (esc.id === 'ue' ? 'la UE' : esc.nombre) + ', 2022',
      esc.id === 'ue' ? 'Cuota de cada sector, según la clasificación del informe europeo.' : 'Cuota de cada agrupamiento de la cuenta satélite del mar.');
    if (!est || !est.total) { p.cuerpo.appendChild(h('p', { class: 'vacio' }, 'No hay desglose por sector para esta escala.')); return p; }
    const items = est.partes.map(function (c) {
      const cuota = c.valor / est.total.valor * 100;
      return { nombre: sinNumero(c.sector), valor: cuota, texto: P.num(cuota, 1) + ' %',
        tip: function () { return P.tipCifra(c, P.num(cuota, 1) + ' % del total'); },
        alPulsar: function (e) { P.abrirFicha(c.id, e.currentTarget); } };
    }).sort(function (a, b) { return b.valor - a.valor; });
    P.g.barras(p.cuerpo, items, { anchoNombre: 230 });
    p.appendChild(h('p', { class: 'panel-pie' }, 'Total: ', P.cifraBtn(est.total), '. Las cuotas se calculan sobre el total publicado; cada barra abre su cifra.'));
    return p;
  }

  P.vistas.economia = function (raiz) {
    const est = P.estado.panel = P.estado.panel || { escala: 'portugal', focoPrevio: 'todo' };
    const escalas = P.apoyo.escalas;
    const esc = escalas.filter(function (e) { return e.id === est.escala; })[0];

    raiz.appendChild(P.cabecera('Economía azul',
      'Lo que dicen seis publicaciones públicas sobre la economía del mar, de la escala mundial a Madeira. Cada cifra lleva su fuente: púlsala y verás la página exacta de la que sale.'));

    raiz.appendChild(h('div', { class: 'escalas', role: 'tablist', 'aria-label': 'Escala' }, escalas.map(function (e) {
      return h('button', { class: 'escala' + (e.id === esc.id ? ' activa' : ''), type: 'button', role: 'tab', 'aria-selected': e.id === esc.id ? 'true' : 'false',
        on: { click: function () { est.escala = e.id; P.pintar(); } } },
        h('span', { class: 'escala-nombre' }, e.nombre), h('span', { class: 'escala-dato' }, pesoDeEscala(e) + ' del VAB'));
    })));

    raiz.appendChild(h('section', { class: 'panel banda', 'aria-label': 'Cifras clave de ' + esc.nombre }, esc.kpis.map(kpi)));

    const rej = h('div', { class: 'rejilla separa' });
    raiz.appendChild(rej);

    const panelCarta = h('section', { class: 'panel col-5' },
      h('header', { class: 'panel-cab' }, h('h2', { class: 'titulo-panel' }, 'Peso de la economía azul en el VAB, 2022'),
        h('p', { class: 'panel-sub' }, 'Países de la UE, con Azores y Madeira aparte.')));
    const huecoCarta = h('div', { class: 'separa' });
    panelCarta.appendChild(huecoCarta);
    panelCarta.appendChild(h('div', { class: 'carta-pie' }, P.g.cartaLeyenda()));
    rej.appendChild(panelCarta);
    const foco = { mundo: 'todo', ue: 'todo', portugal: 'portugal', azores: 'azores', madeira: 'madeira' }[esc.id];
    const carta = P.g.carta(huecoCarta, { foco: est.focoPrevio, seleccion: foco === 'todo' ? null : esc.territorio });
    if (foco !== est.focoPrevio) { carta.enfocar(foco, true); est.focoPrevio = foco; }

    const derecha = h('div', { class: 'pila col-7' });
    rej.appendChild(derecha);
    derecha.appendChild(panelEstructura(esc));

    derecha.appendChild(h('section', { class: 'panel hallazgo' },
      h('h2', null, 'Ninguna de las publicaciones leídas pone valor monetario al capital natural marino'),
      h('p', null, 'Las cuentas satélite del mar de Portugal, Azores y Madeira lo excluyen de forma expresa, y los informes europeos solo lo mencionan. De la OCDE solo se leyó el resumen ejecutivo. Es la laguna más relevante para quien trabaja en la conservación del océano.'),
      h('p', { class: 'acciones' }, h('a', { href: '#lagunas' }, 'Ver qué falta en cada fuente'))));
  };

  // ---------- Mapa ----------

  P.vistas.mapa = function (raiz) {
    const est = P.estado.mapa = P.estado.mapa || { sel: 'Portugal', foco: 'todo' };
    const vals = P.g.cartaValores();
    const M = P.apoyo.mapa;
    const regiones = M.regiones.map(function (r) { return r.nombre; });
    const orden = Object.keys(vals).sort(function (a, b) { return vals[b].valor - vals[a].valor; });
    const paises = orden.filter(function (nm) { return regiones.indexOf(nm) < 0; });

    raiz.appendChild(P.cabecera('Mapa', 'Peso de la economía azul en el VAB de cada país de la UE en 2022, con Azores y Madeira aparte. Elige un territorio en el mapa o en la lista.'));
    const rej = h('div', { class: 'rejilla' });
    raiz.appendChild(rej);

    const panelCarta = h('section', { class: 'panel col-7' });
    const pie = h('div', { class: 'carta-pie arriba' }, P.g.cartaLeyenda());
    const hueco = h('div', { class: 'carta-alta' });
    panelCarta.appendChild(pie);
    panelCarta.appendChild(hueco);
    rej.appendChild(panelCarta);
    const derecha = h('div', { class: 'pila col-5' });
    rej.appendChild(derecha);

    let carta = null;
    function elegir(nombre) { est.sel = nombre; carta.seleccionar(nombre); pintarDerecha(); }

    function perfil() {
      const c = vals[est.sel], esRegion = regiones.indexOf(est.sel) >= 0;
      const p = P.panel(est.sel, esRegion ? 'Región autónoma de Portugal' : 'Estado miembro de la UE');
      const pt = P.partes(c);
      p.cuerpo.appendChild(h('div', { class: 'kpi', style: { padding: '0', border: '0' } },
        h('span', { class: 'kpi-nombre' }, 'Peso de la economía azul en el VAB, 2022'),
        h('button', { class: 'kpi-valor', type: 'button', on: { click: function (e) { P.abrirFicha(c.id, e.currentTarget); } } }, pt.n, ' ', h('small', null, pt.u)),
        P.origenBtn(c)));
      const pos = paises.indexOf(est.sel) + 1;
      const ue = P.dato('peso_vab', 'UE-27', '2022');
      const frases = [];
      if (esRegion) frases.push('Está por encima de cualquier Estado miembro: el primero, ' + paises[0] + ', llega al ' + vals[paises[0]].valor_txt + '.');
      else frases.push('Ocupa el puesto ' + pos + ' de los ' + paises.length + ' Estados miembros.');
      if (ue) frases.push('El conjunto de la UE está en el ' + ue.valor_txt + '.');
      p.cuerpo.appendChild(h('p', { class: 'separa' }, frases.join(' ')));
      const emp = P.dato('peso_empleo', est.sel, '2022');
      const escala = P.apoyo.escalas.filter(function (e) { return e.territorio === est.sel; })[0];
      const extras = [];
      if (emp) extras.push(h('div', null, h('span', { class: 'dt' }, 'Peso en el empleo total, 2022'), h('span', { class: 'dd' }, P.cifraBtn(emp), ' ', P.origenBtn(emp))));
      if (escala) {
        [escala.kpis[0][0], escala.kpis[2][0]].forEach(function (id) {
          const k = P.porId[id];
          extras.push(h('div', null, h('span', { class: 'dt' }, (NOMBRE_KPI[k.ind] || k.indicador) + ', ' + k.periodo), h('span', { class: 'dd' }, P.cifraBtn(k), ' ', P.origenBtn(k))));
        });
      }
      if (extras.length) p.cuerpo.appendChild(h('div', { class: 'dl separa' }, extras));
      if (escala) p.appendChild(h('p', { class: 'panel-pie' }, h('a', { href: '#comparar' }, 'Comparar su evolución con otros territorios')));
      return p;
    }

    function ranking() {
      const p = P.panel('Todos los territorios', 'De mayor a menor peso en el VAB. Azores y Madeira forman parte de Portugal.');
      P.g.barras(p.cuerpo, orden.map(function (nm) {
        const c = vals[nm];
        return { nombre: nm + (regiones.indexOf(nm) >= 0 ? ' (región)' : ''), valor: c.valor, texto: P.partes(c).n + ' %',
          clase: (nm === est.sel ? 'destacada' : '') + (regiones.indexOf(nm) >= 0 ? ' referencia' : ''),
          tip: function () { return P.tipCifra(c); }, alPulsar: function () { elegir(nm); } };
      }), { anchoNombre: 150 });
      return p;
    }

    function pintarDerecha() { derecha.replaceChildren(perfil(), ranking()); }

    carta = P.g.carta(hueco, { foco: est.foco, seleccion: est.sel, alElegir: function (nombre) { elegir(nombre); } });
    const focos = [{ v: 'todo', t: 'Europa' }, { v: 'portugal', t: 'Portugal' }, { v: 'azores', t: 'Azores' }, { v: 'madeira', t: 'Madeira' }];
    const botones = h('div', { class: 'carta-focos', role: 'group', 'aria-label': 'Acercar a' });
    function pintarFocos() {
      P.poner(botones, focos.map(function (f) {
        return h('button', { class: 'conmuta', type: 'button', 'aria-pressed': est.foco === f.v ? 'true' : 'false',
          on: { click: function () { est.foco = f.v; carta.enfocar(f.v, true); pintarFocos(); if (f.v !== 'todo') elegir(f.t); } } }, f.t);
      }));
    }
    pintarFocos();
    pie.appendChild(botones);
    panelCarta.appendChild(h('p', { class: 'panel-pie' }, 'Las cifras de los demás países proceden del gráfico comparativo de la DREM de Madeira (', P.origenBtn(vals[paises[0]]), '), que cita el informe europeo; las de Portugal, Azores y Madeira, de sus cuentas satélite. Geometría: Natural Earth.'));
    pintarDerecha();
  };

  // ---------- Comparar ----------

  const INDICADORES = [
    { v: 'vab', t: 'VAB', indice: true, reparto: 'vab' },
    { v: 'empleo', t: 'Empleo', indice: true, reparto: 'empleo' },
    { v: 'remun', t: 'Remuneraciones', indice: true, reparto: 'remun' },
    { v: 'peso_vab', t: 'Peso en el VAB total', indice: false, reparto: 'vab' },
    { v: 'peso_empleo', t: 'Peso en el empleo total', indice: false, reparto: 'empleo' }
  ];
  const NOMBRE_REPARTO = { vab: 'el VAB', empleo: 'el empleo', remun: 'las remuneraciones' };

  P.vistas.comparar = function (raiz) {
    const est = P.estado.comparar = P.estado.comparar || { ind: 'vab', terr: ['Portugal', 'Madeira', 'Azores', 'UE-27'], anio: '2022' };
    const ind = INDICADORES.filter(function (i) { return i.v === est.ind; })[0];
    const repintar = function () { P.pintar(); };

    raiz.appendChild(P.cabecera('Comparar territorios', 'Evolución y estructura de la economía azul en Portugal, sus dos regiones autónomas y la UE. Los puntos y las celdas abren la evidencia de cada cifra.'));
    raiz.appendChild(h('div', { class: 'controles' },
      P.selector('Indicador', INDICADORES, est.ind, function (v) { est.ind = v; repintar(); }),
      h('div', { class: 'control' }, 'Territorios',
        P.conmutas(TERRITORIOS.map(function (t) { return { v: t.v, t: t.v, color: t.color }; }), est.terr, true, function (n) { est.terr = n; repintar(); }))));

    // Evolución
    const series = [], sinBase = [];
    TERRITORIOS.forEach(function (t) {
      if (est.terr.indexOf(t.v) < 0) return;
      const sr = P.serie(ind.v, t.v, '').filter(function (c) { return c.periodo >= '2020'; });
      if (!sr.length) { sinBase.push(t.v); return; }
      const base = sr[0].periodo === '2020' ? sr[0].valor : null;
      if (ind.indice && !base) { sinBase.push(t.v); return; }
      series.push({ nombre: t.v, color: t.color, cifras: sr, puntos: sr.map(function (c) {
        const y = ind.indice ? c.valor / base * 100 : c.valor;
        return { x: c.periodo, y: y, texto: ind.indice ? P.num(y, 0) : c.valor_txt, c: c };
      }) });
    });
    const pEvo = P.panel(ind.indice ? ind.t + ': evolución desde 2020 (2020 = 100)' : ind.t + ': evolución desde 2020',
      ind.indice ? 'Se usa un índice porque los territorios tienen tamaños muy distintos. Los valores están en la tabla.' : 'En porcentaje del total de cada territorio.');
    raiz.appendChild(pEvo);
    if (series.length) {
      pEvo.cuerpo.appendChild(P.leyenda(series.map(function (se) { return { nombre: se.nombre, color: se.color, linea: true }; })));
      const hueco = h('div', { class: 'separa' });
      pEvo.cuerpo.appendChild(hueco);
      P.g.lineas(hueco, series, { alto: 300, base: ind.indice ? 100 : null, sufijoEje: ind.indice ? '' : ' %', decEje: 0, titulo: pEvo.querySelector('h2').textContent,
        notaTip: ind.indice ? function (p) { return 'Índice ' + P.num(p.y, 0); } : null });
      const anios = [];
      series.forEach(function (se) { se.cifras.forEach(function (c) { if (anios.indexOf(c.periodo) < 0) anios.push(c.periodo); }); });
      anios.sort();
      pEvo.appendChild(h('div', { class: 'tabla-caja libre' }, h('table', { class: 'tabla' },
        h('thead', null, h('tr', null, h('th', null, 'Territorio'), h('th', null, 'Unidad'), anios.map(function (a) { return h('th', { class: 'num' }, a); }), h('th', null, 'Fuente'))),
        h('tbody', null, series.map(function (se) {
          return h('tr', null, h('td', null, h('span', { class: 'leyenda-item' }, h('i', { class: 'muestra', style: { background: se.color } }), se.nombre)),
            h('td', { class: 'tenue' }, se.cifras[0].unidad),
            anios.map(function (a) {
              const c = se.cifras.filter(function (x) { return x.periodo === a; })[0];
              return h('td', { class: 'num' }, c ? P.cifraBtn(c, P.partes(c).n) : h('span', { class: 'tenue' }, 'sin dato'));
            }),
            h('td', null, h('span', { class: 'origen' }, P.docs[se.cifras[0].doc].sigla)));
        })))));
    } else {
      pEvo.cuerpo.appendChild(h('p', { class: 'vacio' }, 'Ningún territorio elegido tiene esta serie.'));
    }
    if (sinBase.length) pEvo.appendChild(h('p', { class: 'panel-pie' }, 'Sin serie comparable desde 2020 para ' + sinBase.join(' y ') + ': las fuentes no publican todos los años.'));

    // Estructura por agrupamiento
    const tres = ['Portugal', 'Madeira', 'Azores'].filter(function (t) { return est.terr.indexOf(t) >= 0; });
    const pEst = P.panel('Cómo se reparte ' + NOMBRE_REPARTO[ind.reparto] + ' por agrupamiento, ' + est.anio,
      'Cuota de cada agrupamiento de la cuenta satélite del mar en el total del territorio.');
    raiz.appendChild(h('div', { class: 'separa' }, pEst));
    pEst.cuerpo.appendChild(h('div', { class: 'controles' },
      h('div', { class: 'control' }, 'Año', P.conmutas(['2020', '2021', '2022'].map(function (a) { return { v: a, t: a }; }), [est.anio], false, function (n) { est.anio = n[0]; repintar(); })),
      h('div', { class: 'fin' }, P.leyenda(tres.map(function (t) { return { nombre: t, color: colorDe(t) }; })))));
    const filas = {}, sinReparto = [];
    let maximo = 0;
    tres.forEach(function (t) {
      const e = P.estructura(ind.reparto, t, est.anio);
      if (!e || !e.total) { sinReparto.push(t); return; }
      e.partes.forEach(function (c) {
        const cuota = c.valor / e.total.valor * 100;
        maximo = Math.max(maximo, cuota);
        (filas[c.sector] = filas[c.sector] || []).push({ t: t, v: cuota, c: c });
      });
    });
    const sectores = Object.keys(filas).sort();
    if (sectores.length) {
      P.g.puntos(pEst.cuerpo, sectores.map(function (sec) {
        return { nombre: sinNumero(sec), puntos: filas[sec].map(function (p) {
          return { v: p.v, color: colorDe(p.t), etiqueta: p.t + ', ' + sinNumero(sec) + ': ' + P.num(p.v, 1) + ' %',
            tip: function () { return P.tipCifra(p.c, P.num(p.v, 1) + ' % del total de ' + p.t); },
            alPulsar: function (e) { P.abrirFicha(p.c.id, e.currentTarget); } };
        }) };
      }), { max: maximo, sufijo: ' %', anchoNombre: 250 });
    } else {
      pEst.cuerpo.appendChild(h('p', { class: 'vacio' }, 'Elige Portugal, Madeira o Azores para ver el reparto por agrupamiento.'));
    }
    pEst.appendChild(h('p', { class: 'panel-pie' }, 'Los agrupamientos sin punto no se publican para ese territorio.' + (sinReparto.length ? ' Sin reparto en ' + est.anio + ' para ' + sinReparto.join(' y ') + '.' : '')));

    // Serie larga de la UE
    if (est.ind === 'vab') {
      const larga = P.serie('vab', 'UE-27', '');
      if (larga.length > 6) {
        const pUE = P.panel('La serie larga: VAB azul de la UE-27, ' + larga[0].periodo + ' a ' + larga[larga.length - 1].periodo, 'En miles de millones de euros.');
        raiz.appendChild(h('div', { class: 'separa' }, pUE));
        const div = larga[0].unidad === 'M€' ? 1000 : 1;
        P.g.lineas(pUE.cuerpo, [{ nombre: 'UE-27', color: 'var(--s1)', puntos: larga.map(function (c) {
          return { x: c.periodo, y: c.valor / div, texto: c.valor_txt, c: c };
        }) }], { alto: 250, desdeCero: true, titulo: 'VAB azul de la UE-27' });
        pUE.appendChild(h('p', { class: 'panel-pie' }, 'Fuente: ', P.origenBtn(larga[larga.length - 1]), '. El último punto abre su evidencia; el resto está en la vista de cifras.'));
      }
    }
  };

  // ---------- Cifras ----------

  const COLUMNAS = [
    { k: 'territorio', t: 'Territorio' }, { k: 'indicador', t: 'Indicador' }, { k: 'sector', t: 'Sector' },
    { k: 'periodo', t: 'Periodo' }, { k: 'valor', t: 'Valor', num: true }, { k: 'doc', t: 'Fuente' }, { k: 'origen', t: 'Lectura' }
  ];
  const CSV_COLUMNAS = [
    { t: 'territorio', v: function (c) { return c.territorio; } }, { t: 'indicador', v: function (c) { return c.indicador; } },
    { t: 'sector', v: function (c) { return c.sector; } }, { t: 'periodo', v: function (c) { return c.periodo; } },
    { t: 'area', v: function (c) { return c.area || ''; } }, { t: 'valor', v: function (c) { return c.valor == null ? '' : String(c.valor).replace('.', ','); } }, { t: 'unidad', v: function (c) { return c.unidad; } },
    { t: 'forma_en_la_fuente', v: function (c) { return c.forma; } }, { t: 'organismo', v: function (c) { return P.docs[c.doc].organismo; } },
    { t: 'publicacion', v: function (c) { return P.docs[c.doc].titulo; } }, { t: 'pagina', v: function (c) { return c.pagina || ''; } },
    { t: 'localizacion', v: function (c) { return c.loc; } }, { t: 'tipo_de_lectura', v: function (c) { return c.origen; } },
    { t: 'comprobacion', v: function (c) { return c.verif; } }, { t: 'nota', v: function (c) { return c.nota; } },
    { t: 'enlace', v: function (c) { return P.docs[c.doc].enlace; } }
  ];

  P.vistas.cifras = function (raiz) {
    const est = P.estado.cifras = P.estado.cifras || { q: '', territorio: '', ind: '', doc: '', origen: '', orden: 'territorio', dir: 1 };
    const unicos = function (k) { const o = []; P.cifras.forEach(function (c) { if (o.indexOf(c[k]) < 0) o.push(c[k]); }); return o.sort(function (a, b) { return a.localeCompare(b, 'es'); }); };
    const opciones = function (lista, todos, texto) { return [{ v: '', t: todos }].concat(lista.map(function (v) { return { v: v, t: texto ? texto(v) : v }; })); };
    const inds = {};
    P.cifras.forEach(function (c) { inds[c.ind] = c.indicador; });

    raiz.appendChild(P.cabecera('Cifras', 'Todas las cifras aprobadas, con su fuente y su comprobación. Pulsa una fila para ver la evidencia; las que has cargado tú se pueden retirar desde ahí.'));

    const cuenta = h('p', { class: 'cuenta', role: 'status' });
    const cuerpo = h('tbody');
    const cabeza = h('tr');
    let visibles = [];

    function filtrar() {
      const piezas = P.norm(est.q).split(/\s+/).filter(Boolean);
      visibles = P.cifras.filter(function (c) {
        return (!est.modulo || c.modulo === est.modulo) && (!est.propia || (est.propia === 'propia') === !!c.propia) && (!est.territorio || c.territorio === est.territorio) && (!est.ind || c.ind === est.ind) && (!est.doc || c.doc === est.doc) &&
          (!est.origen || c.origen === est.origen) && piezas.every(function (t) { return c.txt.indexOf(t) >= 0; });
      });
      const k = est.orden;
      visibles.sort(function (a, b) {
        const x = k === 'doc' ? P.docs[a.doc].sigla : a[k], y = k === 'doc' ? P.docs[b.doc].sigla : b[k];
        const r = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'es', { numeric: true });
        return (r || a.indicador.localeCompare(b.indicador, 'es') || String(a.periodo).localeCompare(String(b.periodo))) * est.dir;
      });
    }
    function pintarTabla() {
      filtrar();
      cuenta.textContent = visibles.length === P.cifras.length ? P.num(visibles.length) + ' cifras' : P.num(visibles.length) + ' de ' + P.num(P.cifras.length) + ' cifras';
      P.poner(cabeza, COLUMNAS.map(function (col) {
        const activa = est.orden === col.k;
        return h('th', { class: col.num ? 'num' : null, 'aria-sort': activa ? (est.dir > 0 ? 'ascending' : 'descending') : null },
          h('button', { type: 'button', on: { click: function () { if (activa) est.dir = -est.dir; else { est.orden = col.k; est.dir = 1; } pintarTabla(); } } },
            col.t + (activa ? (est.dir > 0 ? ' ↑' : ' ↓') : '')));
      }));
      P.poner(cuerpo, visibles.map(function (c) {
        const abrir = function (e) { P.abrirFicha(c.id, e.currentTarget); };
        return h('tr', { class: 'fila-enlace', tabindex: 0, on: { click: abrir, keydown: function (e) { if (e.key === 'Enter') abrir(e); } } },
          h('td', null, c.territorio), h('td', null, c.indicador), h('td', { class: 'tenue' }, c.sector ? sinNumero(c.sector) : ''),
          h('td', { class: 'nw' }, c.periodo), h('td', { class: 'num' }, c.valor_txt), h('td', null, h('span', { class: 'origen' }, P.procedencia(c))),
          h('td', { class: 'tenue' }, c.origen));
      }));
      if (!visibles.length) cuerpo.appendChild(h('tr', null, h('td', { colspan: COLUMNAS.length }, h('p', { class: 'vacio' }, h('strong', null, 'Ninguna cifra cumple los filtros.'), 'Quita algún filtro o cambia el texto de búsqueda.'))));
    }

    const entrada = h('input', { class: 'campo', type: 'search', value: est.q, placeholder: 'empleo madeira 2022', on: { input: function () { est.q = entrada.value; pintarTabla(); } } });
    const avisoCsv = h('span', { class: 'cuenta', role: 'status' });
    const exportar = h('button', { class: 'btn', type: 'button', on: { click: function () {
      avisoCsv.textContent = '';
      P.guardarFichero('azuiq-cifras-filtradas.csv', P.csv(visibles, CSV_COLUMNAS)).then(function (r) { avisoCsv.textContent = P.avisoFichero(r, 'azuiq-cifras-filtradas.csv'); });
    } } }, P.icono('bajar'), 'Descargar CSV');

    raiz.appendChild(h('div', { class: 'controles' },
      h('label', { class: 'control crece' }, 'Buscar', entrada),
      P.selector('Pregunta', [{ v: '', t: 'Todas' }].concat(P.PREGUNTAS.map(function (q) { return { v: q.id, t: q.nombre }; })), est.modulo || '', function (v) { est.modulo = v; pintarTabla(); }),
      P.selector('Procedencia', [{ v: '', t: 'Todas' }, { v: 'inicial', t: 'Carga inicial' }, { v: 'propia', t: 'Cargadas aquí' }], est.propia || '', function (v) { est.propia = v; pintarTabla(); }),
      P.selector('Territorio', opciones(unicos('territorio'), 'Todos'), est.territorio, function (v) { est.territorio = v; pintarTabla(); }),
      P.selector('Indicador', [{ v: '', t: 'Todos' }].concat(Object.keys(inds).map(function (k) { return { v: k, t: inds[k] }; }).sort(function (a, b) { return a.t.localeCompare(b.t, 'es'); })), est.ind, function (v) { est.ind = v; pintarTabla(); }),
      P.selector('Fuente', opciones(P.apoyo.documentos.map(function (d) { return d.id; }), 'Todas', function (v) { return P.docs[v].sigla; }), est.doc, function (v) { est.doc = v; pintarTabla(); }),
      P.selector('Lectura', opciones(unicos('origen'), 'Todas'), est.origen, function (v) { est.origen = v; pintarTabla(); })));

    const panel = h('section', { class: 'panel' },
      h('div', { class: 'panel-cuerpo', style: { display: 'flex', 'align-items': 'center', gap: '12px', 'flex-wrap': 'wrap' } }, cuenta, avisoCsv, h('span', { style: { 'margin-left': 'auto' } }, exportar)),
      h('div', { class: 'tabla-caja' }, h('table', { class: 'tabla' }, h('thead', null, cabeza), cuerpo)));
    raiz.appendChild(panel);
    pintarTabla();
  };
})();
