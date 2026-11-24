/* azuIQ: arranque, navegación en dos ejes, tema y teclado. */
(function () {
  'use strict';
  const P = window.P, h = P.h;

  // Eje principal (menú de la izquierda) y, para cada sección, sus apartados (barra horizontal).
  // Los apartados de Conservación son las áreas marinas, que salen del modelo.
  // Decisiones cruza los programas de la fundación con sus métricas, su impacto valorado y el presupuesto.
  const SECCIONES = [
    { id: 'inicio', nombre: 'Inicio', apartados: [['inicio', 'Mesa de trabajo'], ['acerca', 'Sobre el prototipo']] },
    { id: 'entrada', nombre: 'Entrada', apartados: [['cargar', 'Cargar'], ['revisar', 'Revisar'], ['fuentes', 'Fuentes']] },
    { id: 'datos', nombre: 'Datos', apartados: [['cifras', 'Cifras'], ['preguntar', 'Preguntar'], ['modelo', 'Modelo'], ['calidad', 'Calidad']] },
    { id: 'conservacion', nombre: 'Conservación', apartados: [['areas', 'Áreas']] },
    { id: 'economia', nombre: 'Economía', apartados: [['economia', 'Panel'], ['mapa', 'Mapa'], ['comparar', 'Comparar'], ['lagunas', 'Lagunas']] },
    { id: 'decisiones', nombre: 'Decisiones', apartados: [['programas', 'Programas'], ['cuadro', 'Cuadro de resultados'], ['presupuesto', 'Presupuesto'], ['memorando', 'Memorando']] },
    { id: 'salida', nombre: 'Salida', apartados: [['salida', 'Tablas para BI'], ['informe', 'Informe'], ['copia', 'Copia']] }
  ];
  const DE = {};
  SECCIONES.forEach(function (s) { s.apartados.forEach(function (a) { DE[a[0]] = s; }); });
  const ALIAS = { documentos: 'fuentes', origenes: 'fuentes', extraer: 'cargar', plataforma: 'acerca', modulos: 'acerca', tablas: 'salida', informes: 'informe', decisiones: 'programas', iniciativas: 'programas', resultados: 'cuadro', impacto: 'cuadro', supuestos: 'acerca' };
  const CUENTAS = {
    revisar: function () { return { n: P.pendientes.length || '', que: 'propuestas por revisar' }; },
    fuentes: function () { return { n: P.fuentes().filter(function (f) { return f.cal.estado === 'toca'; }).length || '', que: 'fuentes que toca volver a mirar' }; },
    cifras: function () { return { n: P.num(P.cifras.length), que: 'cifras aprobadas' }; },
    programas: function () { return { n: P.sinDecidir() || '', que: 'programas sin decisión' }; }
  };

  const app = document.getElementById('app');
  const lienzo = document.getElementById('lienzo');
  const raiz = document.getElementById('vista');
  const nav = document.getElementById('nav');
  const pestanas = document.getElementById('pestanas');
  const menuSeccion = document.getElementById('menu-seccion');

  function ruta() {
    let r = (location.hash || '').replace(/^#/, '');
    if (ALIAS[r]) r = ALIAS[r];
    if (r.indexOf('doc-') === 0) return { vista: 'documento', param: r.slice(4), seccion: DE.fuentes, apartado: 'fuentes', hash: r };
    if (r.indexOf('programa-') === 0) return { vista: 'programa', param: r.slice(9), seccion: DE.programas, apartado: 'programas', hash: r };
    if (r === 'areas' || r.indexOf('area-') === 0) {
      const ids = P.areas().map(function (a) { return a.id; });
      const pedida = r === 'areas' ? (P.estado.areas && P.estado.areas.id) : r.slice(5);
      const id = ids.indexOf(pedida) >= 0 ? pedida : ids[0];
      return { vista: 'areas', param: id, seccion: DE.areas, apartado: 'area-' + id, hash: 'area-' + id };
    }
    if (DE[r]) return { vista: r, seccion: DE[r], apartado: r, hash: r };
    return { vista: 'inicio', seccion: DE.inicio, apartado: 'inicio', hash: 'inicio' };
  }

  // ---------- Los dos ejes ----------

  const enlaces = {};
  SECCIONES.forEach(function (s) {
    const cuenta = h('span', { class: 'nav-cuenta' });
    const a = h('a', { class: 'nav-enlace', href: '#' + s.apartados[0][0] }, h('span', null, s.nombre), cuenta);
    enlaces[s.id] = { a: a, cuenta: cuenta };
    nav.appendChild(a);
  });

  function apartados(s) {
    if (s.id === 'conservacion') return P.areas().map(function (a) { return { ruta: 'area-' + a.id, t: a.corto }; });
    return s.apartados.map(function (a) {
      const c = CUENTAS[a[0]] ? CUENTAS[a[0]]() : null;
      return { ruta: a[0], t: a[1], n: c ? c.n : '', que: c ? c.que : '' };
    });
  }

  const ultima = {};
  let firma = '';
  function pintarNav(r) {
    ultima[r.seccion.id] = r.hash;
    SECCIONES.forEach(function (s) {
      const e = enlaces[s.id], activa = s === r.seccion;
      // La sección abierta lleva a su primer apartado; las demás, adonde se dejaron.
      e.a.setAttribute('href', '#' + (activa ? s.apartados[0][0] : (ultima[s.id] || s.apartados[0][0])));
      e.a.classList.toggle('activo', activa);
      if (activa) e.a.setAttribute('aria-current', 'true'); else e.a.removeAttribute('aria-current');
    });
    const pend = P.pendientes.length;
    enlaces.entrada.cuenta.textContent = pend || '';
    enlaces.entrada.cuenta.title = pend ? pend + (pend === 1 ? ' propuesta por revisar' : ' propuestas por revisar') : '';
    menuSeccion.textContent = r.seccion.nombre;

    const items = apartados(r.seccion);
    const nueva = r.seccion.id + '|' + items.map(function (i) { return i.ruta + ':' + i.t; }).join('|');
    if (nueva !== firma) {
      firma = nueva;
      P.poner(pestanas, items.map(function (i) {
        return h('a', { class: 'pestana', href: '#' + i.ruta }, h('span', { class: 'pestana-t', 'data-t': i.t }, i.t), h('span', { class: 'pestana-n', hidden: true }));
      }));
      pestanas.setAttribute('aria-label', 'Apartados de ' + r.seccion.nombre);
      pestanas.scrollLeft = 0;
    }
    let activa = null;
    items.forEach(function (i, k) {
      const a = pestanas.children[k], n = a.lastChild;
      if (i.ruta === r.apartado) { a.setAttribute('aria-current', 'page'); activa = a; } else a.removeAttribute('aria-current');
      n.textContent = i.n || '';
      n.hidden = !i.n;
      if (i.n) a.setAttribute('aria-label', i.t + ', ' + i.n + ' ' + i.que); else a.removeAttribute('aria-label');
    });
    if (activa) {
      const izq = activa.offsetLeft, der = izq + activa.offsetWidth;
      if (izq < pestanas.scrollLeft) pestanas.scrollLeft = Math.max(0, izq - 20);
      else if (der > pestanas.scrollLeft + pestanas.clientWidth) pestanas.scrollLeft = der - pestanas.clientWidth + 20;
    }
    asomar();
  }
  // Si quedan apartados fuera de la barra, el borde derecho se desvanece para avisar.
  function asomar() { pestanas.classList.toggle('sigue', pestanas.scrollLeft + pestanas.clientWidth < pestanas.scrollWidth - 4); }
  pestanas.addEventListener('scroll', asomar, { passive: true });

  // Posición de un nodo dentro de la vista, para devolverle el foco tras repintar.
  function camino(el) {
    const p = [];
    while (el && el !== raiz) {
      const padre = el.parentNode;
      if (!padre) return null;
      p.unshift(Array.prototype.indexOf.call(padre.children, el));
      el = padre;
    }
    return el === raiz ? p : null;
  }
  function nodoEn(p) {
    let el = raiz;
    for (let i = 0; i < p.length; i++) { el = el.children[p[i]]; if (!el) return null; }
    return el;
  }

  P.pintar = function () {
    if (!P.cifras) return;
    const r = ruta();
    const clave = r.vista + (r.param || '');
    const cambia = P.estado.ruta !== clave;
    const foco = cambia ? null : camino(document.activeElement);
    const arriba = lienzo.scrollTop;
    P.tip.ocultar();
    raiz.replaceChildren();
    try {
      P.vistas[r.vista](raiz, r.param);
    } catch (e) {
      console.error(e);
      raiz.replaceChildren(P.cabecera('No se pudo mostrar esta vista', 'Ha ocurrido un error al dibujarla. Prueba con otra sección.'));
    }
    pintarNav(r);
    if (cambia) {
      P.estado.ruta = clave;
      lienzo.scrollTop = 0;
      cerrarMenu();
    } else {
      lienzo.scrollTop = arriba;
      const el = foco && nodoEn(foco);
      if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
    }
  };

  // Vuelve a contar lo pendiente en el menú y en la barra sin repintar la vista.
  P.contarNav = function () { if (P.cifras) pintarNav(ruta()); };

  // ---------- Menú en pantallas estrechas ----------

  const btnMenu = document.getElementById('btn-menu');
  function cerrarMenu() { app.classList.remove('con-menu'); btnMenu.setAttribute('aria-expanded', 'false'); }
  btnMenu.addEventListener('click', function () {
    const abierto = app.classList.toggle('con-menu');
    btnMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  });
  lienzo.addEventListener('pointerdown', cerrarMenu);
  document.getElementById('carril').addEventListener('click', function (e) { if (e.target.closest('a')) cerrarMenu(); });

  // ---------- Tema ----------

  const btnTema = document.getElementById('btn-tema');
  const medioOscuro = window.matchMedia('(prefers-color-scheme: dark)');
  function temaActual() {
    return document.documentElement.getAttribute('data-theme') || (medioOscuro.matches ? 'dark' : 'light');
  }
  function marcarTema() {
    const oscuro = temaActual() === 'dark';
    btnTema.setAttribute('data-tema', oscuro ? 'dark' : 'light');
    btnTema.setAttribute('aria-label', oscuro ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro');
    btnTema.title = oscuro ? 'Tema claro' : 'Tema oscuro';
  }
  try {
    const guardado = localStorage.getItem('azuiq-tema');
    if (guardado === 'light' || guardado === 'dark') document.documentElement.setAttribute('data-theme', guardado);
  } catch (e) { /* sin almacenamiento: se sigue el tema del sistema */ }
  btnTema.addEventListener('click', function () {
    const t = temaActual() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('azuiq-tema', t); } catch (e) { /* no pasa nada */ }
    marcarTema();
  });
  if (medioOscuro.addEventListener) medioOscuro.addEventListener('change', marcarTema);
  marcarTema();

  // ---------- Buscador y teclado ----------

  document.getElementById('btn-buscar').addEventListener('click', function () { if (P.cifras) P.abrirBuscador(); });
  document.addEventListener('keydown', function (e) {
    const t = e.target;
    const enCampo = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !enCampo && !e.ctrlKey && !e.metaKey && !e.altKey)) {
      if (!P.cifras) return;
      e.preventDefault();
      P.abrirBuscador();
    } else if (e.key === 'Escape') {
      if (app.classList.contains('con-menu')) cerrarMenu(); else P.cerrarFicha();
    }
  });

  // ---------- Cambios de tamaño y de ruta ----------

  let anchoPrevio = window.innerWidth, espera = 0;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(function () {
      if (Math.abs(window.innerWidth - anchoPrevio) < 8) return;
      anchoPrevio = window.innerWidth;
      P.pintar();
    }, 180);
  });
  window.addEventListener('hashchange', P.pintar);

  // ---------- Carga de datos ----------

  function json(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ': ' + r.status); return r.json(); });
  }
  Promise.all([json('datos/cifras.json'), json('datos/apoyo.json')]).then(function (d) {
    P.preparar(d[0], d[1]);
    P.pintar();
    P.capacidad('downloads');   // se pide ya, para que esté resuelta cuando alguien pulse «Descargar»
  }).catch(function (e) {
    console.error(e);
    raiz.replaceChildren(h('p', { class: 'vacio' }, h('strong', null, 'No se pudieron cargar los datos.'), 'Recarga la página para volver a intentarlo.'));
  });
})();
