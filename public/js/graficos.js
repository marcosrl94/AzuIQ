/* azuIQ: gráficos. Barras y puntos en HTML; líneas y esquemas en SVG. */
(function () {
  'use strict';
  const P = window.P, h = P.h, s = P.s;

  // Marcas «redondas» de un eje entre min y max.
  P.g.marcas = function (min, max, n) {
    if (min === max) { min -= 1; max += 1; }
    const bruto = (max - min) / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    const r = bruto / mag;
    const paso = (r >= 7.5 ? 10 : r >= 3.5 ? 5 : r >= 1.5 ? 2 : 1) * mag;
    const a = Math.floor(min / paso + 1e-9) * paso, b = Math.ceil(max / paso - 1e-9) * paso;
    const out = [];
    for (let v = a; v <= b + paso * 1e-6; v += paso) out.push(Number(v.toFixed(10)));
    return out;
  };

  // Barras horizontales ordenadas. items: [{nombre, valor, texto, clase, tip, alPulsar}]
  P.g.barras = function (cont, items, o) {
    o = o || {};
    const max = o.max || Math.max.apply(null, items.map(function (i) { return i.valor; })) || 1;
    const caja = h('div', { class: 'barras', style: o.anchoNombre ? { '--ancho-nombre': o.anchoNombre + 'px' } : null });
    items.forEach(function (it) {
      const fila = h('button', { class: 'barra-fila' + (it.clase ? ' ' + it.clase : ''), type: 'button', 'aria-label': it.nombre + ': ' + it.texto },
        h('span', { class: 'barra-nombre' }, it.nombre),
        h('span', { class: 'barra-pista' },
          h('span', { class: 'barra-relleno', style: { width: Math.max(0, it.valor / max * 100).toFixed(2) + '%' } })),
        h('span', { class: 'barra-valor' }, it.texto));
      if (it.tip) P.conTip(fila, it.tip);
      if (it.alPulsar) fila.addEventListener('click', it.alPulsar);
      caja.appendChild(fila);
    });
    cont.appendChild(caja);
    return caja;
  };

  // Gráfico de puntos por fila. filas: [{nombre, puntos: [{v, color, etiqueta, tip, alPulsar}]}]
  P.g.puntos = function (cont, filas, o) {
    o = o || {};
    const marcas = P.g.marcas(0, o.max, cont.clientWidth < 520 ? 3 : 5);
    const tope = marcas[marcas.length - 1];
    const pos = function (v) { return (v / tope * 100).toFixed(2) + '%'; };
    const caja = h('div', { class: 'puntos', style: o.anchoNombre ? { '--ancho-nombre': o.anchoNombre + 'px' } : null });
    caja.appendChild(h('div', { class: 'puntos-eje', 'aria-hidden': 'true' }, h('span'),
      h('div', { class: 'puntos-pista' }, marcas.map(function (m) { return h('span', { style: { left: pos(m) } }, P.num(m) + (o.sufijo || '')); }))));
    const rejilla = {
      'background-image': 'linear-gradient(to right, var(--linea) 1px, transparent 1px)',
      'background-size': (100 / (marcas.length - 1)).toFixed(4) + '% 100%',
      'border-right': '1px solid var(--linea)'
    };
    filas.forEach(function (f) {
      const pista = h('div', { class: 'puntos-pista', style: rejilla });
      const vs = f.puntos.map(function (p) { return p.v; });
      if (vs.length > 1) {
        const a = Math.min.apply(null, vs), b = Math.max.apply(null, vs);
        pista.appendChild(h('i', { class: 'puntos-rango', style: { left: pos(a), width: ((b - a) / tope * 100).toFixed(2) + '%' } }));
      }
      f.puntos.forEach(function (p) {
        const b = h('button', { class: 'punto', type: 'button', 'aria-label': p.etiqueta, style: { left: pos(p.v), background: p.color } });
        if (p.tip) P.conTip(b, p.tip);
        if (p.alPulsar) b.addEventListener('click', p.alPulsar);
        pista.appendChild(b);
      });
      caja.appendChild(h('div', { class: 'puntos-fila' }, h('span', { class: 'puntos-nombre' }, f.nombre), pista));
    });
    cont.appendChild(caja);
    return caja;
  };

  // Líneas por año. series: [{nombre, color, puntos: [{x, y, texto, c}]}]
  P.g.lineas = function (cont, series, o) {
    o = o || {};
    const ancho = Math.max(260, cont.clientWidth), alto = o.alto || 280;
    const m = { t: 14, r: ancho < 480 ? 74 : 104, b: 28, l: 46 };
    const xs = [];
    series.forEach(function (se) { se.puntos.forEach(function (p) { if (xs.indexOf(p.x) < 0) xs.push(p.x); }); });
    xs.sort();
    const ys = [];
    series.forEach(function (se) { se.puntos.forEach(function (p) { ys.push(p.y); }); });
    if (o.base != null) ys.push(o.base);
    let lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    if (o.desdeCero) lo = Math.min(0, lo);
    const marcas = P.g.marcas(lo, hi, 5);
    lo = marcas[0]; hi = marcas[marcas.length - 1];
    const X = function (x) { return m.l + (xs.length < 2 ? 0.5 : xs.indexOf(x) / (xs.length - 1)) * (ancho - m.l - m.r); };
    const Y = function (v) { return m.t + (1 - (v - lo) / (hi - lo)) * (alto - m.t - m.b); };
    const svg = s('svg', { class: 'grafico', width: ancho, height: alto, viewBox: '0 0 ' + ancho + ' ' + alto, role: 'img', 'aria-label': o.titulo || 'Gráfico de líneas' });

    marcas.forEach(function (v) {
      svg.appendChild(s('line', { class: o.base === v ? 'g-base' : 'g-rejilla', x1: m.l, x2: ancho - m.r, y1: Y(v), y2: Y(v) }));
      svg.appendChild(s('text', { class: 'g-eje', x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, P.num(v, o.decEje || 0) + (o.sufijoEje || '')));
    });
    const cadaX = xs.length > 9 && ancho < 700 ? 2 : 1;
    xs.forEach(function (x, i) {
      if ((xs.length - 1 - i) % cadaX) return;
      svg.appendChild(s('text', { class: 'g-eje', x: X(x), y: alto - 8, 'text-anchor': 'middle' }, x));
    });

    const cruz = s('line', { class: 'g-cruz', y1: m.t, y2: alto - m.b, visibility: 'hidden' });
    svg.appendChild(cruz);
    const zona = s('rect', { x: m.l - 10, y: m.t, width: ancho - m.l - m.r + 20, height: alto - m.t - m.b, fill: 'transparent' });
    svg.appendChild(zona);

    const finales = [];
    series.forEach(function (se) {
      if (!se.puntos.length) return;
      const d = se.puntos.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join(' ');
      svg.appendChild(s('path', { class: 'g-linea', d: d, stroke: se.color }));
      const ultimo = se.puntos[se.puntos.length - 1];
      finales.push({ x: X(ultimo.x) + 10, y: Y(ultimo.y) + 4, texto: se.nombre });
    });
    series.forEach(function (se) {
      const marcar = se.puntos.length <= 6;
      se.puntos.forEach(function (p, i) {
        if (!marcar && i !== se.puntos.length - 1) return;
        const c = s('circle', { class: 'g-punto', cx: X(p.x), cy: Y(p.y), r: 4.5, fill: se.color, tabindex: 0, role: 'button', 'aria-label': se.nombre + ', ' + p.x + ': ' + p.texto });
        P.conTip(c, function () { return p.c ? P.tipCifra(p.c, o.notaTip ? o.notaTip(p) : null) : [h('b', null, p.texto), h('div', null, se.nombre + ', ' + p.x)]; });
        if (p.c) {
          c.addEventListener('click', function (e) { P.abrirFicha(p.c.id, e.currentTarget); });
          c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); P.abrirFicha(p.c.id, e.currentTarget); } });
        }
        svg.appendChild(c);
      });
    });
    finales.sort(function (a, b) { return a.y - b.y; });
    finales.forEach(function (f, i) {
      if (i && f.y - finales[i - 1].y < 15) f.y = finales[i - 1].y + 15;
      svg.appendChild(s('text', { class: 'g-etiqueta', x: Math.min(f.x, ancho - 4), y: f.y, 'paint-order': 'stroke', stroke: 'var(--papel)', 'stroke-width': 3, 'stroke-linejoin': 'round' }, f.texto));
    });

    // Cruz: con el puntero en el gráfico, una etiqueta con todas las series de ese año.
    zona.addEventListener('pointermove', function (e) {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (ancho / r.width);
      let cerca = xs[0];
      xs.forEach(function (x) { if (Math.abs(X(x) - px) < Math.abs(X(cerca) - px)) cerca = x; });
      cruz.setAttribute('x1', X(cerca)); cruz.setAttribute('x2', X(cerca)); cruz.setAttribute('visibility', 'visible');
      const filas = [h('div', null, cerca)];
      series.forEach(function (se) {
        const p = se.puntos.filter(function (q) { return q.x === cerca; })[0];
        if (p) filas.push(h('div', { class: 'tip-fila' }, h('i', { class: 'muestra linea', style: { 'border-color': se.color } }), h('b', null, p.texto), ' ' + se.nombre));
      });
      P.tip.mostrar(e.clientX, e.clientY, filas);
    });
    zona.addEventListener('pointerleave', function () { cruz.setAttribute('visibility', 'hidden'); P.tip.ocultar(); });

    cont.appendChild(svg);
    return svg;
  };

  P.g.chispa = function (valores, ancho, alto) {
    ancho = ancho || 84; alto = alto || 22;
    const lo = Math.min.apply(null, valores), hi = Math.max.apply(null, valores);
    const X = function (i) { return 3 + i / (valores.length - 1) * (ancho - 6); };
    const Y = function (v) { return 3 + (hi === lo ? 0.5 : 1 - (v - lo) / (hi - lo)) * (alto - 6); };
    const d = valores.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    return s('svg', { class: 'chispa', width: ancho, height: alto, viewBox: '0 0 ' + ancho + ' ' + alto, 'aria-hidden': 'true' },
      s('path', { d: d }), s('circle', { cx: X(valores.length - 1), cy: Y(valores[valores.length - 1]), r: 2.6 }));
  };

  // Esquema de una página: cada barra es un tramo de texto; las marcas sitúan cifras.
  // marcas: [{caja: [x, y, ancho, alto], id}]
  P.g.minimapa = function (pag, marcas, o) {
    o = o || {};
    const anchoPx = o.anchoPx || 150;
    const u = pag.w / anchoPx;
    let d = '';
    for (let i = 0; i < pag.barras.length; i += 4) {
      d += 'M' + pag.barras[i] + ' ' + pag.barras[i + 1] + 'h' + pag.barras[i + 2] + 'v' + pag.barras[i + 3] + 'h-' + pag.barras[i + 2] + 'z';
    }
    const svg = s('svg', { class: 'minimapa', viewBox: '-3 -3 ' + (pag.w + 6) + ' ' + (pag.h + 6), role: 'img', 'aria-label': o.titulo || 'Esquema de la página' },
      s('rect', { class: 'hoja', x: 0, y: 0, width: pag.w, height: pag.h }),
      s('path', { class: 'texto', d: d }));
    marcas.forEach(function (mk) {
      const c = mk.caja, cx = c[0] + c[2] / 2, cy = c[1] + c[3] / 2;
      if (o.guias) {
        svg.appendChild(s('line', { class: 'guia', x1: 0, y1: cy, x2: Math.max(0, cx - 9 * u), y2: cy }));
        svg.appendChild(s('line', { class: 'guia', x1: cx, y1: 0, x2: cx, y2: Math.max(0, cy - 9 * u) }));
        svg.appendChild(s('circle', { class: 'aro', cx: cx, cy: cy, r: 9 * u }));
      }
      const pad = 1.5 * u;
      const r = s('rect', { class: 'marca', x: c[0] - pad, y: c[1] - pad, width: c[2] + 2 * pad, height: c[3] + 2 * pad, rx: u });
      if (mk.id) r.setAttribute('data-id', mk.id);
      svg.appendChild(r);
    });
    return svg;
  };

  // Esquema de hoja de cálculo con la celda señalada, a partir de «Hoja X, celda B10».
  P.g.celdas = function (loc) {
    const m = /celda ([A-Z]+)(\d+)/.exec(loc || '');
    if (!m) return null;
    let col = 0;
    for (let i = 0; i < m[1].length; i++) col = col * 26 + (m[1].charCodeAt(i) - 64);
    const fila = Number(m[2]);
    const c0 = Math.max(1, col - 1), f0 = Math.max(1, fila - 2);
    const letra = function (n) { let t = ''; while (n > 0) { t = String.fromCharCode(65 + (n - 1) % 26) + t; n = Math.floor((n - 1) / 26); } return t; };
    const aw = 38, ah = 17, cab = 22;
    const svg = s('svg', { class: 'celdas', viewBox: '0 0 ' + (cab + aw * 4 + 1) + ' ' + (ah * 6 + 1), role: 'img', 'aria-label': 'Celda ' + m[1] + m[2] });
    for (let j = 0; j < 4; j++) {
      svg.appendChild(s('rect', { class: 'cab', x: cab + j * aw + 0.5, y: 0.5, width: aw, height: ah }));
      svg.appendChild(s('text', { x: cab + j * aw + aw / 2, y: 12.5 }, letra(c0 + j)));
    }
    for (let i = 0; i < 5; i++) {
      svg.appendChild(s('rect', { class: 'cab', x: 0.5, y: ah * (i + 1) + 0.5, width: cab, height: ah }));
      svg.appendChild(s('text', { x: cab / 2, y: ah * (i + 1) + 12.5 }, String(f0 + i)));
      for (let j = 0; j < 4; j++) svg.appendChild(s('rect', { x: cab + j * aw + 0.5, y: ah * (i + 1) + 0.5, width: aw, height: ah }));
    }
    svg.appendChild(s('rect', { class: 'obj', x: cab + (col - c0) * aw + 0.5, y: ah * (fila - f0 + 1) + 0.5, width: aw, height: ah }));
    return svg;
  };
})();
