/* azuIQ: la carta. Europa y el Atlántico nordeste en proyección de Mercator,
   con el peso de la economía azul en el VAB de cada país (2022) y un marco
   graduado que se recalcula al acercar. */
(function () {
  'use strict';
  const P = window.P, h = P.h, s = P.s;

  const FOCOS = {
    todo: null,
    portugal: { lon: [-12.6, -4.4], lat: [36.1, 43.1] },
    azores: { lon: [-31.9, -24.3], lat: [36.4, 40.2] },
    madeira: { lon: [-18.0, -15.5], lat: [32.0, 33.5] }
  };
  const MARES = [
    { t: 'Océano Atlántico', lon: -20.5, lat: 48 },
    { t: 'Mediterráneo', lon: 22.4, lat: 33.55 }
  ];
  // Desplazamiento de la cifra respecto al centro del país, en píxeles.
  const AJUSTE = { 'Malta': [0, 15], 'Chipre': [-12, 16], 'Croacia': [-4, -9], 'Grecia': [-9, -3], 'Dinamarca': [-6, 2], 'Países Bajos': [2, 0], 'Estonia': [2, 2] };
  const TRAMOS = [{ t: '< 1', hasta: 1 }, { t: '1 a 2', hasta: 2 }, { t: '2 a 4', hasta: 4 }, { t: '4 a 6', hasta: 6 }, { t: '6 o más', hasta: Infinity }];

  function clase(v) { for (let i = 0; i < TRAMOS.length; i++) if (v < TRAMOS[i].hasta) return i + 1; return 5; }
  function grados(v, pos, neg) {
    const t = P.num(Math.abs(v), v % 1 ? 1 : 0) + '°';
    return v === 0 ? t : t + ' ' + (v > 0 ? pos : neg);
  }

  P.g.cartaLeyenda = function () {
    return h('div', { class: 'escala-color', role: 'img', 'aria-label': 'Escala de color: porcentaje del VAB, de menos de 1 a 6 o más' },
      h('span', { class: 'escala-titulo' }, '% del VAB'),
      TRAMOS.map(function (t, i) { return h('span', { class: 'escala-tramo' }, h('i', { style: { background: 'var(--q' + (i + 1) + ')' } }), t.t); }));
  };

  P.g.cartaValores = function () {
    const M = P.apoyo.mapa, out = {};
    M.paises.concat(M.regiones).forEach(function (g) {
      const c = P.dato('peso_vab', g.nombre, '2022');
      if (c) out[g.nombre] = c;
    });
    return out;
  };

  P.g.carta = function (cont, o) {
    o = o || {};
    const M = P.apoyo.mapa, W = M.ancho, H = M.alto, mc = M.marco;
    const kx = W / (mc.lon1 - mc.lon0), ky = kx * 180 / Math.PI;
    const merc = function (lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); };
    const arriba = merc(mc.lat1);
    const X = function (lon) { return (lon - mc.lon0) * kx; };
    const Y = function (lat) { return (arriba - merc(lat)) * ky; };
    const lonDe = function (x) { return mc.lon0 + x / kx; };
    const latDe = function (y) { return (2 * Math.atan(Math.exp(arriba - y / ky)) - Math.PI / 2) * 180 / Math.PI; };
    const vals = P.g.cartaValores();

    const caja = h('div', { class: 'carta' });
    const svg = s('svg', { class: 'carta-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Mapa del peso de la economía azul en el VAB de cada país de la UE, 2022' });
    const marco = s('svg', { class: 'carta-marco', 'aria-hidden': 'true' });
    caja.appendChild(svg);
    caja.appendChild(marco);
    cont.appendChild(caja);

    // Rumbos desde una rosa en el Atlántico y retícula cada 10 grados.
    const rosa = [X(-24), Y(45.5)];
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16;
      svg.appendChild(s('line', { class: 'rumbo', x1: rosa[0], y1: rosa[1], x2: rosa[0] + 2600 * Math.cos(a), y2: rosa[1] + 2600 * Math.sin(a) }));
    }
    let ret = '';
    for (let lon = -30; lon <= 30; lon += 10) ret += 'M' + X(lon).toFixed(1) + ' 0V' + H;
    for (let lat = 30; lat <= 70; lat += 10) ret += 'M0 ' + Y(lat).toFixed(1) + 'H' + W;
    svg.appendChild(s('path', { class: 'reticula', d: ret }));
    svg.appendChild(s('path', { class: 'tierra', d: M.tierra }));

    const nodos = {}, etiquetas = [], marcadores = [];
    function activar(el, nombre, c) {
      P.conTip(el, function () { return [h('b', null, nombre + ': ' + c.valor_txt), h('div', null, 'del VAB, ' + c.periodo), h('span', { class: 'tip-fuente' }, P.procedencia(c))]; });
      const elegir = function (e) { if (o.alElegir) o.alElegir(nombre, c, e.currentTarget); else P.abrirFicha(c.id, e.currentTarget); };
      el.addEventListener('click', elegir);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(e); } });
    }

    const gPaises = s('g');
    svg.appendChild(gPaises);
    M.paises.forEach(function (p) {
      const c = vals[p.nombre];
      const el = s('path', { class: 'pais c' + (c ? clase(c.valor) : 1), d: p.d, tabindex: 0, role: 'button', 'aria-label': p.nombre + (c ? ': ' + c.valor_txt + ' del VAB' : '') });
      if (c) activar(el, p.nombre, c);
      gPaises.appendChild(el);
      nodos[p.nombre] = el;
    });

    MARES.forEach(function (mar) {
      const t = s('text', { class: 'mar-nombre', x: X(mar.lon), y: Y(mar.lat) }, mar.t);
      svg.appendChild(t);
      etiquetas.push({ el: t, tam: 12.5, mar: true });
    });

    M.paises.forEach(function (p) {
      const c = vals[p.nombre];
      if (!c) return;
      const aj = AJUSTE[p.nombre] || [0, 0];
      const t = s('text', { class: 'sonda' + (c.valor >= 2.9 ? '' : ' menor') }, P.partes(c).n);
      svg.appendChild(t);
      etiquetas.push({ el: t, tam: 11.5, halo: true, x: p.c[0], y: p.c[1], dx: aj[0], dy: aj[1] + 4 });
    });

    M.regiones.forEach(function (r) {
      const c = vals[r.nombre];
      if (!c) return;
      const forma = s('path', { class: 'pais c' + clase(c.valor), d: r.d, 'aria-hidden': 'true' });
      svg.appendChild(forma);
      const punto = s('circle', { class: 'isla pais c' + clase(c.valor), cx: r.c[0], cy: r.c[1], tabindex: 0, role: 'button', 'aria-label': r.nombre + ': ' + c.valor_txt + ' del VAB' });
      const zona = s('circle', { class: 'isla-zona', cx: r.c[0], cy: r.c[1], 'aria-hidden': 'true' });
      activar(punto, r.nombre, c);
      zona.addEventListener('click', function () { punto.dispatchEvent(new MouseEvent('click', { bubbles: false })); });
      const t = s('text', { class: 'sonda izq' }, s('tspan', { class: 'isla-nombre' }, r.nombre + ' '), P.partes(c).n);
      svg.appendChild(zona);
      svg.appendChild(punto);
      svg.appendChild(t);
      nodos[r.nombre] = punto;
      marcadores.push({ punto: punto, zona: zona });
      etiquetas.push({ el: t, tam: 11.5, halo: true, x: r.c[0], y: r.c[1], dx: 11, dy: 4, izq: true });
    });

    let vista = { x: 0, y: 0, w: W, h: H }, anim = 0, elegido = null;

    function dibujarMarco(v, pxW) {
      const pxH = pxW * H / W, u = v.w / pxW, g = 5, banda = 14, m = g + banda;
      marco.setAttribute('viewBox', '0 0 ' + pxW + ' ' + pxH);
      marco.replaceChildren();
      [[0, 0, pxW, m], [0, pxH - m, pxW, m], [0, 0, m, pxH], [pxW - m, 0, m, pxH]].forEach(function (r) {
        marco.appendChild(s('rect', { class: 'zebra-b', x: r[0], y: r[1], width: r[2], height: r[3] }));
      });
      const lonA = lonDe(v.x), lonB = lonDe(v.x + v.w), latA = latDe(v.y + v.h), latB = latDe(v.y);
      const porPx = (lonB - lonA) / pxW;
      const paso = [0.25, 0.5, 1, 2, 5, 10].filter(function (p) { return p / porPx >= 22; })[0] || 10;
      for (let i = Math.floor(lonA / paso); i * paso < lonB; i++) {
        const a = Math.max(0, (X(i * paso) - v.x) / u), b = Math.min(pxW, (X((i + 1) * paso) - v.x) / u);
        if (b <= a) continue;
        if (Math.abs(i) % 2) {
          marco.appendChild(s('rect', { class: 'zebra-a', x: a, y: 0, width: b - a, height: g }));
          marco.appendChild(s('rect', { class: 'zebra-a', x: a, y: pxH - g, width: b - a, height: g }));
        }
        if (i % 2 === 0 && a > m + 14 && a < pxW - m - 14) marco.appendChild(s('text', { x: a, y: m - 3.5, 'text-anchor': 'middle' }, grados(i * paso, 'E', 'O')));
      }
      for (let i = Math.floor(latA / paso); i * paso < latB; i++) {
        const a = Math.max(0, (Y((i + 1) * paso) - v.y) / u), b = Math.min(pxH, (Y(i * paso) - v.y) / u);
        if (b <= a) continue;
        if (Math.abs(i) % 2) {
          marco.appendChild(s('rect', { class: 'zebra-a', x: 0, y: a, width: g, height: b - a }));
          marco.appendChild(s('rect', { class: 'zebra-a', x: pxW - g, y: a, width: g, height: b - a }));
        }
        if (i % 2 === 0 && b > m + 14 && b < pxH - m - 14) {
          marco.appendChild(s('text', { x: m - 3.5, y: b, 'text-anchor': 'middle', transform: 'rotate(-90 ' + (m - 3.5) + ' ' + b + ')' }, grados(i * paso, 'N', 'S')));
        }
      }
      marco.appendChild(s('rect', { class: 'zebra-borde', x: 0.5, y: 0.5, width: pxW - 1, height: pxH - 1 }));
      marco.appendChild(s('rect', { class: 'zebra-borde fina', x: g + 0.5, y: g + 0.5, width: pxW - 2 * g - 1, height: pxH - 2 * g - 1 }));
      marco.appendChild(s('rect', { class: 'zebra-borde', x: m + 0.5, y: m + 0.5, width: pxW - 2 * m - 1, height: pxH - 2 * m - 1 }));
    }

    function aplicar(v) {
      vista = v;
      svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].map(function (n) { return n.toFixed(2); }).join(' '));
      const pxW = caja.clientWidth || 600, u = v.w / pxW;
      etiquetas.forEach(function (e) {
        e.el.setAttribute('font-size', (e.tam * u).toFixed(3));
        if (e.halo) e.el.style.strokeWidth = (3 * u).toFixed(3);
        if (e.mar) e.el.style.display = pxW < 430 ? 'none' : '';
        if (e.x != null) { e.el.setAttribute('x', e.x + e.dx * u); e.el.setAttribute('y', e.y + e.dy * u); }
      });
      marcadores.forEach(function (mk) { mk.punto.setAttribute('r', 6.5 * u); mk.zona.setAttribute('r', 17 * u); });
      caja.classList.toggle('cerca', v.w < W * 0.62);
      dibujarMarco(v, pxW);
    }

    function encuadre(clave) {
      const f = FOCOS[clave];
      if (!f) return { x: 0, y: 0, w: W, h: H };
      const x0 = X(f.lon[0]), x1 = X(f.lon[1]), y0 = Y(f.lat[1]), y1 = Y(f.lat[0]);
      let w = x1 - x0, alto = y1 - y0;
      if (w / alto > W / H) alto = w * H / W; else w = alto * W / H;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return { x: Math.min(Math.max(0, cx - w / 2), W - w), y: Math.min(Math.max(0, cy - alto / 2), H - alto), w: w, h: alto };
    }

    const api = {
      enfocar: function (clave, animar) {
        const fin = encuadre(clave), ini = vista;
        cancelAnimationFrame(anim);
        if (!animar || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { aplicar(fin); return; }
        const t0 = performance.now();
        const paso = function (t) {
          const k = Math.min(1, Math.max(0, (t - t0) / 520));
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          aplicar({ x: ini.x + (fin.x - ini.x) * e, y: ini.y + (fin.y - ini.y) * e, w: ini.w + (fin.w - ini.w) * e, h: ini.h + (fin.h - ini.h) * e });
          if (k < 1) anim = requestAnimationFrame(paso);
        };
        anim = requestAnimationFrame(paso);
      },
      seleccionar: function (nombre) {
        if (elegido && nodos[elegido]) nodos[elegido].classList.remove('sel');
        elegido = nombre;
        const el = nodos[nombre];
        if (!el) return;
        el.classList.add('sel');
        if (el.parentNode === gPaises) gPaises.appendChild(el);
      },
      focos: Object.keys(FOCOS)
    };
    aplicar(encuadre(o.foco || 'todo'));
    if (o.seleccion) api.seleccionar(o.seleccion);
    return api;
  };
})();
