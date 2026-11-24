/* azuIQ: el modelo de datos (preguntas, campos, áreas y programas) y el trabajo propio
   (cargas, revisiones, fuentes, campos añadidos y plan de decisiones), que se guarda en este navegador. */
(function () {
  'use strict';
  const P = window.P;
  const CLAVE = 'azuiq.v1';

  function vacio() {
    return { cargas: [], cifras: [], pendientes: [], resueltas: {}, fuentes: [], calendario: {}, campos: [], areas: [], movimientos: [], programas: [], plan: {} };
  }
  function copiar(origen) {
    const base = vacio();
    Object.keys(base).forEach(function (k) {
      if (origen && origen[k] != null && Array.isArray(origen[k]) === Array.isArray(base[k]) && typeof origen[k] === 'object') base[k] = origen[k];
    });
    return base;
  }

  P.almacen = {
    datos: vacio(),
    persistente: true,
    leer: function () {
      try { const t = window.localStorage.getItem(CLAVE); if (t) this.datos = copiar(JSON.parse(t)); }
      catch (e) { this.persistente = false; }
    },
    guardar: function () {
      try { window.localStorage.setItem(CLAVE, JSON.stringify(this.datos)); this.persistente = true; }
      catch (e) { this.persistente = false; }
      P.integrar();
    },
    anotar: function (texto) {
      this.datos.movimientos.unshift({ t: texto, f: new Date().toISOString() });
      this.datos.movimientos = this.datos.movimientos.slice(0, 25);
    },
    restaurar: function (obj) { this.datos = copiar(obj); this.guardar(); },
    vaciar: function () {
      this.datos = vacio();
      try { window.localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
      P.integrar();
    }
  };

  // ---------- Modelo de datos ----------

  P.PREGUNTAS = [
    { id: 'conservacion', nombre: 'Conservación', pregunta: 'De lo protegido en nuestro ámbito, ¿qué está protegido de verdad?', ruta: 'areas' },
    { id: 'incidencia', nombre: 'Incidencia internacional', pregunta: '¿Qué ha prometido cada país y qué ha cumplido?', ruta: null },
    { id: 'economia', nombre: 'Economía y capital natural', pregunta: '¿Qué evidencia hay del valor del océano y del retorno de protegerlo?', ruta: 'economia' },
    { id: 'gestion', nombre: 'Gestión interna', pregunta: '¿Qué conseguimos por euro y cómo presupuestamos el año que viene?', ruta: 'programas' }
  ];
  P.pregunta = function (id) { return P.PREGUNTAS.filter(function (q) { return q.id === id; })[0] || P.PREGUNTAS[0]; };

  // pregunta, bloque, fila de la ficha, código, nombre, unidad, carril previsto, fuente que lo completa
  const CAMPOS = [
    ['conservacion', 'Designación', 'Superficie protegida', 'superficie', 'Superficie protegida', 'km²', 'conector', 'Protected Planet'],
    ['conservacion', 'Designación', 'Parte del mar protegida y nivel de protección', 'pct_protegido', 'Parte del mar protegida', '%', 'conector', 'MPAtlas'],
    ['conservacion', 'Designación', 'Parte del mar protegida y nivel de protección', 'pct_total', 'Parte del mar en protección total', '%', 'conector', 'MPAtlas'],
    ['conservacion', 'Designación', 'Parte del mar protegida y nivel de protección', 'pct_alta', 'Parte del mar en protección alta', '%', 'conector', 'MPAtlas'],
    ['conservacion', 'Designación', 'Parte del mar protegida y nivel de protección', 'min_total', 'Mínimo legal en protección total', '%', 'ia', 'Diarios oficiales'],
    ['conservacion', 'Designación', 'Norma que la crea o la revisa', 'ley', 'Norma que crea o revisa el área', '', 'ia', 'Diarios oficiales'],
    ['conservacion', 'Gestión', 'Estrategia o plan de gestión', 'estrategia', 'Estrategia o plan de gestión aprobado', '', 'ia', 'Diarios oficiales y planes de gestión'],
    ['conservacion', 'Gestión', 'Estrategia o plan de gestión', 'vigor', 'Entrada en vigor', '', 'ia', 'Diarios oficiales y planes de gestión'],
    ['conservacion', 'Gestión', 'Compromisos y plazos', 'compromiso_gestion', 'Compromiso de gestión con fecha', '', 'ia', 'Planes de gestión y programas de acción'],
    ['conservacion', 'Gestión', 'Compromisos y plazos', 'plazo', 'Plazo', '', 'ia', 'Planes de gestión y programas de acción'],
    ['conservacion', 'Gestión', 'Financiación', 'dotacion', 'Dotación o presupuesto', '€', 'ia', 'Presupuestos y convocatorias'],
    ['conservacion', 'Gestión', 'Financiación', 'dotacion_ipma', 'Dotación asignada al IPMA', '€', 'ia', 'Presupuestos y convocatorias'],
    ['conservacion', 'Gestión', 'Financiación', 'dotacion_dgrm', 'Dotación asignada a la DGRM', '€', 'ia', 'Presupuestos y convocatorias'],
    ['conservacion', 'Gestión', 'Metas', 'meta', 'Meta de protección', '%', 'ia', 'Estrategias y compromisos oficiales'],
    ['conservacion', 'Ciencia y participación', 'Base científica', 'estudio', 'Estudio científico de base', '', 'ia', 'Informes científicos y de expediciones'],
    ['conservacion', 'Ciencia y participación', 'Base científica', 'cientificos', 'Científicos participantes', 'científicos', 'ia', 'Informes científicos y de expediciones'],
    ['conservacion', 'Ciencia y participación', 'Base científica', 'entidades', 'Entidades científicas participantes', 'entidades', 'ia', 'Informes científicos y de expediciones'],
    ['conservacion', 'Ciencia y participación', 'Proceso participativo', 'representantes', 'Representantes de sectores del mar', 'representantes', 'ia', 'Documentos del proceso'],
    ['conservacion', 'Ciencia y participación', 'Proceso participativo', 'reuniones', 'Reuniones del proceso', 'reuniones', 'ia', 'Documentos del proceso'],
    ['conservacion', 'Ciencia y participación', 'Proceso participativo', 'contributos', 'Aportaciones en consulta pública', 'aportaciones', 'ia', 'Documentos del proceso'],
    ['conservacion', 'Biodiversidad y presión', 'Especies y hábitats registrados', 'especies', 'Especies registradas', 'especies', 'conector', 'OBIS'],
    ['conservacion', 'Biodiversidad y presión', 'Especies amenazadas', 'amenazadas', 'Especies amenazadas', 'especies', 'conector', 'Lista Roja de la UICN'],
    ['conservacion', 'Biodiversidad y presión', 'Esfuerzo pesquero dentro del área', 'esfuerzo', 'Esfuerzo pesquero dentro del área', 'horas', 'conector', 'Global Fishing Watch'],
    ['conservacion', 'Biodiversidad y presión', 'Resultados del seguimiento', 'seguimiento', 'Resultado del seguimiento', '', 'ia', 'Informes de seguimiento'],
    ['incidencia', 'Compromisos', 'Tratados', 'ratificacion', 'Ratificación de un tratado', '', 'conector', 'Colección de Tratados de Naciones Unidas'],
    ['incidencia', 'Compromisos', 'Tratados', 'ratificaciones', 'Ratificaciones de un tratado', 'ratificaciones', 'conector', 'Colección de Tratados de Naciones Unidas'],
    ['incidencia', 'Compromisos', 'Metas de protección', 'meta_pais', 'Meta de protección del país', '%', 'ia', 'Declaraciones y estrategias nacionales'],
    ['incidencia', 'Compromisos', 'Compromisos anunciados', 'compromiso', 'Compromiso anunciado con fecha', '', 'ia', 'Declaraciones y comunicados oficiales'],
    ['incidencia', 'Compromisos', 'Apoyo a una moratoria', 'apoyo_moratoria', 'Países que apoyan una moratoria', 'países', 'ia', 'Declaraciones y comunicados oficiales'],
    ['incidencia', 'Cumplimiento', 'Protección declarada', 'protegido_pais', 'Parte del mar protegida por el país', '%', 'conector', 'Protected Planet'],
    ['gestion', 'Programas', 'Gasto', 'gasto_programa', 'Gasto del programa', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Programas', 'Gasto', 'gasto_eje', 'Gasto del eje', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Programas', 'Gasto', 'gasto_programas', 'Gasto total en programas', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Programas', 'Resultados', 'resultado_programa', 'Resultado del programa', '', 'ia', 'Memorias e informes de programa'],
    ['gestion', 'Cuentas', 'Ingresos', 'ingresos_explotacion', 'Ingresos de explotación', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Ingresos', 'ingresos_oceanario', 'Ingresos generados por el Oceanário', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Ingresos', 'ingresos_entradas', 'Venta de entradas del Oceanário', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Ingresos', 'peso_oceanario', 'Parte de los ingresos que genera el Oceanário', '%', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Ingresos', 'donativos', 'Donativos recibidos', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Ingresos', 'donativo_fundador', 'Dotaciones del fundador', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Costes y resultado', 'costes_explotacion', 'Costes de explotación', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Costes y resultado', 'costes_personal', 'Gastos de personal', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Costes y resultado', 'costes_estructura', 'Costes de funcionamiento de la fundación', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Cuentas', 'Costes y resultado', 'resultado_neto', 'Resultado neto del ejercicio', 'k€', 'conector', 'Contabilidad de la fundación'],
    ['gestion', 'Oceanário', 'Actividad', 'visitas', 'Visitantes', 'visitantes', 'conector', 'Datos de actividad del Oceanário'],
    ['gestion', 'Oceanário', 'Actividad', 'alcance_educativo', 'Personas en programas educativos', 'personas', 'conector', 'Datos de actividad del Oceanário']
  ].map(function (c) { return { pregunta: c[0], bloque: c[1], fila: c[2], codigo: c[3], nombre: c[4], unidad: c[5], carril: c[6], fuente: c[7] }; });

  const AREAS = [
    { id: 'azores', corto: 'Azores', nombre: 'Red de áreas marinas protegidas de las Azores', sub: 'Red regional, revisada con el programa Blue Azores.' },
    { id: 'portugal', corto: 'Portugal, red nacional', nombre: 'Red nacional de áreas marinas protegidas de Portugal', sub: 'Red nacional en desarrollo.' },
    { id: 'selvagens', corto: 'Selvagens', nombre: 'Islas Selvagens', sub: 'Zona de trabajo de la fundación en Madeira.' },
    { id: 'algarve', corto: 'Algarve', nombre: 'Recife do Algarve', sub: 'Zona de trabajo de la fundación en la costa sur de Portugal.' },
    { id: 'gorringe', corto: 'Gorringe', nombre: 'Monte submarino Gorringe', sub: 'Zona de trabajo de la fundación en mar abierto.' }
  ];

  // ---------- Programas de la fundación ----------
  // Son sus líneas de gasto, con los nombres de su informe anual. Las métricas vinculadas y la agrupación
  // de iniciativas (las que publica en su web) son una propuesta de partida que se ajusta en la página.

  P.PLAN = { base: 2025, previo: 2024, objetivo: 2027 };
  P.DECISIONES = [['reforzar', 'Reforzar'], ['mantener', 'Mantener'], ['reducir', 'Reducir'], ['replantear', 'Replantear']];
  P.EJES = [
    { id: 'conservacion', nombre: 'Conservación' },
    { id: 'incidencia', nombre: 'Incidencia internacional' },
    { id: 'economia', nombre: 'Políticas, marcos y economía' },
    { id: 'generacion', nombre: 'Generación Azul' },
    { id: 'marketing', nombre: 'Marketing y comunicación' },
    { id: 'institucional', nombre: 'Asuntos institucionales' }
  ];
  const WEB = 'https://oceanoazulfoundation.org/what-we-do/';
  // id, eje, nombre, rótulo en el informe, métricas (ids de cifras), resultado de referencia, iniciativas [título, ruta en su web], aviso [texto, ruta]
  const PROGRAMAS = [
    ['amp', 'conservacion', 'Áreas marinas protegidas', 'Marine Protected Areas',
      ['foa2025-superficie-azores', 'jo2025-pcttotal-azores', 'jo2025-estrategia-azores', 'foa2025-superficie-algarve', 'foa2025-superficie-selvagens'], null,
      [['Blue Azores', 'blue-azores'], ['Reserva marina de las Islas Selvagens', 'selvagens-islands'],
        ['Parque natural marino del Recife do Algarve', 'the-first-marine-protected-area-of-community-interest-in-portugal'],
        ['Área marina protegida propuesta en Gorringe', 'proposed-marine-protected-area-gorringe'],
        ['Proceso colaborativo en Cascais, Mafra y Sintra', 'a-collaborative-process-to-protect-the-coast-of-cascais-mafra-and-sintra']]],
    ['expediciones', 'conservacion', 'Expediciones científicas', 'Scientific Expeditions',
      ['foa2025-especies-gorringe', 'foa2025-especies-algarve', 'foa2025-cientificos-algarve', 'foa2025-res-expediciones-dias'], null,
      [['Expedición Oceano Azul a Gorringe', 'gorringe-expedition'], ['Expediciones científicas a las Selvagens', 'scientific-expeditions-to-the-selvagens-islands'],
        ['Expedición científica en Cascais, Mafra y Sintra', 'oceano-azul-expedition-cascais-mafra-sintra'], ['Expediciones científicas en las Azores', 'unveiling-the-azores']]],
    ['comunidad', 'conservacion', 'Participación de la comunidad', 'Community Engagement',
      ['foa2025-res-comunidad-participantes', 'foa2025-res-comunidad-voluntarios', 'foa2025-res-comunidad-limpiezas', 'foa2025-res-comunidad-km', 'foa2025-res-comunidad-basura', 'foa2025-res-comunidad-mesdelmar'],
      'foa2025-res-comunidad-participantes',
      [['Participación de la comunidad', 'community-engagement'], ['Convención de organizaciones por un océano limpio (COOL)', 'cool-convention-of-organisations-for-a-clean-ocean'],
        ['Día Internacional de Limpieza Costera', 'international-coastal-clean-up-day'], ['Mes del Mar', 'month-of-the-sea'], ['The Ocean is Our Earth', 'the-ocean-is-our-earth']]],
    ['biodiversidad', 'conservacion', 'Biodiversidad marina en el Oceanário', 'Marine Biodiversity by Oceanário de Lisboa', ['foa2025-res-biodiversidad-reproducidas'], null, []],
    ['politica', 'incidencia', 'Política del océano', 'Ocean policy',
      ['foa2025-res-politica-eventos', 'foa2025-res-politica-participantes', 'foa2025-ratificaciones-bbnj', 'foa2025-moratoria-paises', 'foa2025-res-politica-becarios', 'foa2025-res-politica-paises'], null,
      [['UNOC3, tercera Conferencia de Naciones Unidas sobre el Océano', 'unoc3'], ['SOS Ocean: reunión de París', 'sos-ocean-paris-meeting'], ['Tratado de Alta Mar (BBNJ)', 'high-seas-treaty'],
        ['Minería submarina', 'deep-sea-mining'], ['Programa de becas Naciones Unidas-Portugal', 'ocean-fellowship']]],
    ['riseup', 'incidencia', 'RISE UP', 'RISE UP - A blue call to action',
      ['foa2025-res-riseup-eventos', 'foa2025-res-riseup-basecamp-eventos', 'foa2025-res-riseup-basecamp-participantes'], null, [['Ocean Basecamp', 'ocean-basecamp']]],
    ['ue', 'incidencia', 'Gobernanza azul de la UE', 'EU Blue Governance', [], null, [['Ley Europea del Océano', 'eu-ocean-pact']]],
    ['otros', 'incidencia', 'Otros de incidencia', 'Other', [], null, []],
    ['capital', 'economia', 'Valorar el capital natural azul', 'Valuing blue natural capital',
      ['foa2025-res-economia-eventos', 'foa2025-res-economia-ponencias', 'ine2025-pesovab-portugal-2023', 'ue2025-vab-ue-27-2022'], null, [],
      ['Ninguna de las publicaciones económicas leídas pone valor monetario al capital natural.', 'lagunas']],
    ['biovalue', 'economia', 'Blue Bio Value', 'Blue bio value', [], null, []],
    ['mensaje', 'economia', 'Amplificar el mensaje', 'Amplify the message', [], null, []],
    ['educar', 'generacion', 'Educar a una Generación Azul', 'Educating a Blue Generation', ['foa2025-res-educar-km'], null, []],
    ['educacion', 'generacion', 'Actividades educativas en el Oceanário', 'Educational activities at Oceanário de Lisboa',
      ['foa2025-res-educacion-participantes', 'foa2025-res-educacion-gratuitas', 'foa2025-res-oceanario-visitas'], 'foa2025-res-educacion-participantes', []],
    ['marketing', 'marketing', 'Marketing y comunicación', 'Marketing and Communication', ['foa2025-res-marketing-noticias', 'foa2025-res-marketing-contactos'], null, []],
    ['institucional', 'institucional', 'Asuntos institucionales', 'Institutional Affairs', [], null, []]
  ];

  // ---------- Impacto ambiental monetizado («blue impact») ----------
  // Dos cosas que se guardan por separado: el dato de entrada, que es una cifra comprobada, y la valoración
  // (valor unitario y parte atribuible), que es un supuesto y lleva escritos su método y su referencia.
  // En lo publicado por la fundación no hay un método de valoración: por eso no se presupone ninguno y cada importe dice cómo sale.
  P.IMPACTO = {
    metodo: 'Importe = dato de entrada comprobado × valor unitario × parte atribuible al programa.',
    iniciativa: { t: 'Re-Valuing Blue Natural Capital', enlace: 'https://www.lse.ac.uk/granthaminstitute/projects/re-valuing-blue-natural-capital-initiative/' }
  };
  // Un único ejemplo, con una referencia pública, para enseñar el mecanismo. No es una valoración de la fundación.
  const EJEMPLO = {
    comunidad: [{ id: 'ej-basura', tipo: 'calculo', cifra: 'foa2025-res-comunidad-basura', unitario: 3000, atrib: 50, ejemplo: true,
      supuesto: 'Valor unitario: lo que una tonelada de plástico en el mar resta cada año al valor de los ecosistemas marinos, en el extremo inferior del rango publicado (de 3.300 a 33.000 dólares de 2011), tomado como 3.000 € sin actualizar. Se supone que toda la basura recogida es plástico que habría acabado en el mar, y se cuenta un solo año. Atribución: la mitad, porque en estas iniciativas participan 386 organizaciones y entidades según el informe anual (p. 39); el porcentaje es un supuesto.',
      ref: 'Beaumont et al. (2019), Marine Pollution Bulletin 142, 189-195', enlace: 'https://doi.org/10.1016/j.marpolbul.2019.03.022' }]
  };
  const hay = function (v) { return v != null && v !== '' && !isNaN(v); };

  // El plan (propuestas, decisiones, vínculos ajustados y valoraciones del impacto) vive en el trabajo propio.
  P.plan = function () {
    const A = P.almacen.datos;
    const p = A.plan = A.plan || {};
    p.filas = p.filas || {};
    p.metricas = p.metricas || {};
    if (p.techo == null) p.techo = '';
    if (!p.impacto) p.impacto = { lineas: JSON.parse(JSON.stringify(EJEMPLO)) };
    p.impacto.lineas = p.impacto.lineas || {};
    return p;
  };
  // Datos de entrada posibles de un programa: sus métricas con valor y unidad.
  P.entradasImpacto = function (g) {
    return g.metricas.filter(function (c) { return c.valor != null && c.valor > 0 && c.unidad && c.unidad !== '%' && c.unidad.indexOf('€') < 0; });
  };
  // Impacto valorado de un programa, en miles de euros, con lo que cubre la valoración.
  // Solo se da un importe por euro gastado cuando la valoración es completa.
  P.impacto = function (g) {
    const entradas = P.entradasImpacto(g), valoradas = {};
    let total = 0, n = 0, directo = false, ejemplo = false;
    const lineas = (P.plan().impacto.lineas[g.id] || []).map(function (l) {
      const c = l.tipo === 'calculo' ? (P.porId[l.cifra] || null) : null;
      let importe = null;
      if (l.tipo === 'directo') { if (hay(l.importe)) importe = Number(l.importe); }
      else if (c && hay(l.unitario) && hay(l.atrib)) importe = c.valor * (c.unidad === 'millones de contactos' ? 1e6 : 1) * Number(l.unitario) * Number(l.atrib) / 100 / 1000;
      if (importe != null) {
        total += importe; n++;
        if (l.tipo === 'directo') directo = true; else valoradas[l.cifra] = true;
        if (l.ejemplo) ejemplo = true;
      }
      return { l: l, cifra: c, importe: importe };
    });
    const nVal = entradas.filter(function (c) { return valoradas[c.id]; }).length;
    // Completa: o todos sus datos de entrada tienen valoración, o el importe llega ya calculado y no se mezcla con otros.
    const completa = n > 0 && (directo ? nVal === 0 && n === 1 : (entradas.length > 0 && nVal === entradas.length));
    const gasto = g.gasto[P.PLAN.base];
    return { lineas: lineas, total: n ? total : null, n: n, entradas: entradas, valoradas: nVal, completa: completa, directo: directo, ejemplo: ejemplo,
      comprobado: n > 0 && !directo,
      porEuro: completa && gasto && gasto.valor ? total / gasto.valor : null };
  };
  P.textoImpacto = function (v) { return v == null ? '' : P.num(v, v < 10 ? 1 : 0) + ' k€'; };
  // En pocas palabras, qué clase de valoración tiene un programa.
  P.claseImpacto = function (i) {
    if (i.total == null) return i.entradas.length ? 'Sin valorar' : 'Sin datos de entrada';
    const partes = [];
    if (i.ejemplo) partes.push('ejemplo');
    if (!i.completa) partes.push('parcial');
    return partes.length ? partes.join(', ') : 'completa';
  };
  P.programas = function () {
    const plan = P.plan(), B = P.PLAN;
    const semilla = PROGRAMAS.map(function (g) {
      return { id: g[0], eje: g[1], nombre: g[2], original: g[3], base: g[4], resultadoBase: g[5],
        iniciativas: g[6].map(function (i) { return { t: i[0], enlace: WEB + i[1] + '/' }; }), aviso: g[7] || null };
    });
    const propios = P.almacen.datos.programas.map(function (g) {
      return { id: g.id, eje: g.eje, nombre: g.nombre, original: '', base: [], resultadoBase: null, iniciativas: [], aviso: null, propio: true };
    });
    return semilla.concat(propios).map(function (g) {
      const m = plan.metricas[g.id] || {};
      const ids = g.base.filter(function (id) { return (m.menos || []).indexOf(id) < 0; });
      (m.mas || []).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
      g.metricas = ids.map(function (id) { return P.porId[id]; }).filter(Boolean);
      const ref = m.resultado !== undefined ? m.resultado : g.resultadoBase;
      g.resultado = (ref && g.metricas.filter(function (c) { return c.id === ref; })[0]) || null;
      g.gasto = {};
      g.gasto[B.base] = P.porId['foa2025-gasto-' + g.id + '-' + B.base] || null;
      g.gasto[B.previo] = P.porId['foa2025-gasto-' + g.id + '-' + B.previo] || null;
      g.fila = plan.filas[g.id] || {};
      return g;
    });
  };
  P.programa = function (id) { return P.programas().filter(function (g) { return g.id === id; })[0] || null; };

  let economia = null;
  P.campos = function (pregunta) {
    if (!economia) {
      const vistos = {};
      economia = [];
      P.semilla.cifras.forEach(function (c) {
        if (c.modulo !== 'economia' || vistos[c.ind]) return;
        vistos[c.ind] = true;
        economia.push({ pregunta: 'economia', bloque: 'Economía azul', fila: c.indicador, codigo: c.ind, nombre: c.indicador, unidad: c.unidad, carril: 'ia', fuente: 'Cuentas satélite e informes' });
      });
    }
    return CAMPOS.concat(economia, P.almacen.datos.campos).filter(function (c) { return !pregunta || c.pregunta === pregunta; });
  };
  P.campo = function (pregunta, codigo) { return P.campos(pregunta).filter(function (c) { return c.codigo === codigo; })[0] || null; };
  P.areas = function () { return AREAS.concat(P.almacen.datos.areas); };
  P.codigo = function (texto) { return P.norm(texto).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'campo'; };

  // ---------- Integración de la carga inicial con el trabajo propio ----------

  P.integrar = function () {
    const A = P.almacen.datos, S = P.semilla;
    if (!S) return;
    const docs = S.documentos.concat(A.cargas.map(function (c) {
      return { id: c.id, titulo: c.titulo, organismo: c.organismo || 'Documento cargado', sigla: c.titulo.length > 34 ? c.titulo.slice(0, 32) + '…' : c.titulo,
        fecha: c.fecha || c.cargado.slice(0, 10), idioma: '', tipo: c.tipo, paginas: c.paginas || null, enlace: c.enlace || '', modulo: c.pregunta, propia: true, cargado: c.cargado };
    }));
    P.docs = {};
    docs.forEach(function (d) { P.docs[d.id] = d; d.n_cifras = 0; });
    P.cifras = S.cifras.concat(A.cifras).filter(function (c) { return P.docs[c.doc]; });
    P.porId = {};
    P.cifras.forEach(function (c) {
      P.porId[c.id] = c;
      P.docs[c.doc].n_cifras++;
      c.txt = P.norm([c.territorio, c.area || '', c.indicador, c.sector, c.periodo, c.valor_txt, P.docs[c.doc].sigla, c.origen].join(' '));
    });
    P.apoyo.documentos = docs;

    const pags = {};
    Object.keys(S.paginas).forEach(function (doc) {
      pags[doc] = {};
      Object.keys(S.paginas[doc]).forEach(function (n) {
        const p = S.paginas[doc][n];
        pags[doc][n] = { w: p.w, h: p.h, barras: p.barras, cifras: Object.assign({}, p.cifras) };
      });
    });
    A.cargas.forEach(function (c) {
      pags[c.id] = {};
      Object.keys(c.esquemas || {}).forEach(function (n) { const p = c.esquemas[n]; pags[c.id][n] = { w: p.w, h: p.h, barras: p.barras, cifras: {} }; });
    });
    A.cifras.forEach(function (c) {
      const p = pags[c.doc] && pags[c.doc][String(c.pagina)];
      if (!p) return;
      if (c.cajas && c.cajas.length) p.cifras[c.id] = c.cajas;
      else if (c.desde && p.cifras[c.desde]) p.cifras[c.id] = p.cifras[c.desde];
    });
    P.apoyo.paginas = pags;
    P.pendientes = S.pendientes.filter(function (p) { return !A.resueltas[p.id]; }).concat(A.pendientes);
  };

  function decimales(v) { const d = (String(v).split('.')[1] || '').length; return Math.min(d, 2); }
  P.textoValor = function (valor, unidad, alternativa) {
    if (valor == null || valor === '' || isNaN(valor)) return alternativa || '';
    return P.num(Number(valor), decimales(valor)) + (unidad ? ' ' + unidad : '');
  };

  // Una propuesta revisada pasa a ser una cifra de los datos.
  P.aprobar = function (p) {
    const A = P.almacen.datos, campo = P.campo(p.pregunta, p.campo);
    const periodo = String(p.periodo || '');
    const c = {
      id: 'u-' + p.id + '-' + Date.now().toString(36), doc: p.carga, territorio: p.territorio || 'Sin territorio', area: p.area || '',
      ind: p.campo || 'otro', indicador: campo ? campo.nombre : (p.indicador || 'Otro dato'), sector: '', periodo: periodo,
      anio: Number((/\d{4}/.exec(periodo.split('-').pop()) || [0])[0]), valor: p.valor == null || p.valor === '' ? null : Number(p.valor), unidad: p.unidad || '',
      valor_txt: p.texto || P.textoValor(p.valor, p.unidad, p.forma), forma: p.forma, pagina: p.pagina || null,
      loc: p.loc || (p.pagina ? 'Página ' + p.pagina : 'Texto pegado'), origen: p.origen || 'PDF: texto',
      verif: p.hallada ? 'Automática: la cifra aparece en ' + (p.pagina ? 'la página ' + p.pagina : 'el texto') : 'Aprobada a mano: no estaba escrita así en la fuente',
      ok: true, grupo: '', nota: p.nota || '', modulo: p.pregunta, propia: true, aprobada: new Date().toISOString(),
      cajas: p.cajas || null, desde: p.ejemplo ? p.id : null, contexto: p.contexto || ''
    };
    A.cifras.push(c);
    if (p.ejemplo) A.resueltas[p.id] = 'aprobada'; else A.pendientes = A.pendientes.filter(function (x) { return x.id !== p.id; });
    return c;
  };
  P.descartar = function (p) {
    const A = P.almacen.datos;
    if (p.ejemplo) A.resueltas[p.id] = 'descartada'; else A.pendientes = A.pendientes.filter(function (x) { return x.id !== p.id; });
  };

  // ---------- Calendario de fuentes ----------

  const MESES = { puntual: 0, anual: 12, semestral: 6, trimestral: 3, mensual: 1 };
  P.PERIODOS = Object.keys(MESES);
  // Estado de una fuente según su última edición o revisión y su periodicidad.
  P.calendario = function (id, fecha, porDefecto) {
    const k = P.almacen.datos.calendario[id] || {};
    const periodicidad = k.periodicidad || porDefecto || 'anual';
    const base = [fecha, k.revisada].filter(Boolean).sort().pop() || '';
    const meses = MESES[periodicidad] || 0;
    if (!meses || !base) return { periodicidad: periodicidad, revisada: k.revisada || '', proxima: '', estado: 'sin' };
    const d = new Date(base + 'T12:00:00Z');
    d.setMonth(d.getMonth() + meses);
    const proxima = d.toISOString().slice(0, 10);
    return { periodicidad: periodicidad, revisada: k.revisada || '', proxima: proxima, estado: proxima <= new Date().toISOString().slice(0, 10) ? 'toca' : 'aldia' };
  };
})();
