/* azuIQ: fichas de áreas marinas (la respuesta de conservación) y la página sobre el prototipo. */
(function () {
  'use strict';
  const P = window.P, h = P.h;

  const ESTADOS = { hecho: ['Funciona aquí', true], experimental: ['Experimental', true], diseno: ['En diseño', false] };
  const estado = function (k) { return h('span', { class: 'etiqueta' + (ESTADOS[k][1] ? ' viva' : '') }, ESTADOS[k][0]); };
  const carril = function (k) { return h('span', { class: 'etiqueta' }, k === 'conector' ? 'Conector' : 'Captura con IA'); };

  // ---------- Áreas marinas ----------

  // El área llega por la ruta: cada área es un apartado de Conservación en la barra superior.
  P.vistas.areas = function (raiz, id) {
    const est = P.estado.areas = P.estado.areas || { id: 'azores' };
    if (id) est.id = id;
    const areas = P.areas();
    const area = areas.filter(function (a) { return a.id === est.id; })[0] || areas[0];
    const suyas = P.cifras.filter(function (c) { return c.area === area.nombre; });
    const filas = [];
    P.campos('conservacion').forEach(function (c) {
      let f = filas.filter(function (x) { return x.fila === c.fila && x.bloque === c.bloque; })[0];
      if (!f) { f = { bloque: c.bloque, fila: c.fila, codigos: [], carril: c.carril, fuente: c.fuente }; filas.push(f); }
      f.codigos.push(c.codigo);
    });
    const conocidos = [];
    filas.forEach(function (f) { f.cifras = suyas.filter(function (c) { return f.codigos.indexOf(c.ind) >= 0; }); f.codigos.forEach(function (k) { conocidos.push(k); }); });
    const llenos = filas.filter(function (f) { return f.cifras.length; }).length;
    const otros = suyas.filter(function (c) { return conocidos.indexOf(c.ind) < 0; });
    if (otros.length) filas.push({ bloque: 'Otros datos', fila: 'Datos fuera del modelo', cifras: otros, extra: true });

    const vinculados = P.programasDeArea(area.nombre);
    raiz.appendChild(P.cabecera(area.nombre, area.sub + ' De lo protegido, qué está protegido de verdad: la ficha reúne lo que dicen sus documentos y deja a la vista lo que falta y quién lo completaría.'));
    raiz.appendChild(h('div', { class: 'controles' },
      h('button', { class: 'btn', type: 'button', on: { click: function () {
        P.estado.cargar = P.cargaNueva({ pregunta: 'conservacion', area: area.id }); P.ir('cargar');
      } } }, 'Cargar un documento de esta área'),
      h('button', { class: 'btn', type: 'button', on: { click: function () { P.estado.informe = { area: area.id }; P.ir('informe'); } } }, 'Ver su informe'),
      vinculados.length ? h('span', { class: 'cuenta' }, 'Estos datos sostienen ' + (vinculados.length === 1 ? 'un programa: ' : 'programas: '),
        vinculados.map(function (g, i) { return [i ? ', ' : '', h('a', { href: '#programa-' + g.id }, g.nombre)]; })) : null));

    let previo = '';
    const cuerpo = [];
    filas.forEach(function (f) {
      if (f.bloque !== previo) { previo = f.bloque; cuerpo.push(h('tr', { class: 'grupo-fila' }, h('th', { colspan: 3, scope: 'colgroup' }, f.bloque))); }
      cuerpo.push(h('tr', null, h('th', { scope: 'row' }, f.fila),
        h('td', null, f.cifras.length ? f.cifras.map(function (c) {
          return h('div', { class: 'linea-campo' }, f.cifras.length > 1 || f.extra ? h('span', { class: 'tenue' }, c.indicador + ': ') : null, P.cifraBtn(c), ' ', P.origenBtn(c),
            c.nota ? h('div', { class: 'tenue' }, c.nota) : null);
        }) : h('span', { class: 'tenue' }, 'Sin dato todavía')),
        h('td', null, f.extra ? h('span', { class: 'tenue' }, 'Añade el campo al modelo para que forme parte de la ficha') : [f.fuente, ' ', carril(f.carril)])));
    });

    const total = filas.filter(function (f) { return !f.extra; }).length;
    const panel = P.panel('Ficha del área', null);
    panel.cuerpo.appendChild(h('div', { class: 'completo' },
      h('strong', null, llenos + ' de ' + total + ' campos con evidencia'),
      h('div', { class: 'metro', role: 'img', 'aria-label': llenos + ' de ' + total + ' campos con evidencia' }, h('i', { style: { width: (llenos / total * 100).toFixed(1) + '%' } }))));
    if (!suyas.length) panel.cuerpo.appendChild(h('p', { class: 'vacio', style: { padding: '14px 0 0' } }, h('strong', null, 'Todavía no hay documentos cargados para esta área.'),
      'Carga su norma de creación o su plan de gestión y los campos se llenarán con su evidencia.'));
    panel.appendChild(h('div', { class: 'tabla-caja libre' }, h('table', { class: 'tabla ficha-area' },
      h('thead', null, h('tr', null, h('th', null, 'Campo'), h('th', null, 'Lo que dicen los documentos'), h('th', null, 'Quién lo completa'))),
      h('tbody', null, cuerpo))));
    panel.appendChild(h('p', { class: 'panel-pie' }, 'Los campos salen del ', h('a', { href: '#modelo' }, 'modelo de datos'), '. Casi todos los de biodiversidad y presión pesquera llegarán por conector desde bases públicas.'));
    raiz.appendChild(panel);
  };

  // ---------- Sobre el prototipo ----------

  const FUNCIONES = [
    ['Cargar documentos y leerlos con IA', 'Convierte en dato lo que hoy se copia a mano de informes y normas.', 'hecho', 'cargar'],
    ['Comprobación automática y bandeja de revisión', 'Ninguna cifra entra sin que un programa la compruebe y una persona la apruebe.', 'hecho', 'revisar'],
    ['Evidencia a un clic', 'Cada cifra de un informe o de un memorando se puede defender con su página.', 'hecho', 'cifras'],
    ['Registro de fuentes con calendario', 'Dice qué se ha cargado y cuándo toca volver a mirar cada fuente.', 'hecho', 'fuentes'],
    ['Modelo de datos editable', 'La fundación define qué quiere saber sin depender de un desarrollo.', 'hecho', 'modelo'],
    ['Datos en bruto con filtros', 'El equipo consulta y reutiliza los datos sin pedírselos a nadie.', 'hecho', 'cifras'],
    ['Fichas por área', 'Reúnen lo que se sabe y dejan a la vista lo que falta.', 'hecho', 'areas'],
    ['Tablas para BI', 'Salidas limpias, con el identificador que lleva de vuelta a la evidencia.', 'hecho', 'salida'],
    ['Informe de un área', 'La base de una nota o un memorando, con cada dato y su fuente.', 'hecho', 'informe'],
    ['Decisiones y presupuesto por programa', 'Cruza lo que costó cada programa con lo que dicen los datos y deja escrita la decisión.', 'hecho', 'programas'],
    ['Cuadro de resultados por programa', 'Cada línea de gasto con su coste de dos años, sus métricas comprobadas y su impacto valorado.', 'hecho', 'cuadro'],
    ['Impacto monetizado con su método a la vista', 'Guarda cada importe de «blue impact» con su dato de entrada comprobado y el supuesto de su valoración.', 'hecho', 'cuadro'],
    ['Borrador de justificación con IA', 'Redacta el porqué de una decisión citando solo las cifras vinculadas.', 'experimental', 'programas'],
    ['Preguntas en lenguaje natural', 'Respuestas rápidas, con cada cifra enlazada a su evidencia.', 'experimental', 'preguntar'],
    ['Conectores a bases públicas y a sistemas propios', 'Mantienen al día lo estructurado sin trabajo manual.', 'diseno', null],
    ['Base de datos compartida, usuarios y permisos', 'Todo el equipo ve lo mismo; cada cambio queda con su autor.', 'diseno', null],
    ['Avisos automáticos de ediciones nuevas', 'La plataforma vigila las fuentes y avisa cuando cambian.', 'diseno', null],
    ['Lectura de escaneados, Excel y tablas en imagen al cargar', 'Amplía los formatos que se pueden subir desde la página.', 'diseno', null],
    ['Conexión con la contabilidad y el presupuesto', 'El gasto del año en curso y el presupuesto aprobado llegan solos y se cruzan con las métricas.', 'diseno', null],
    ['Método de valoración de la fundación', 'El «blue impact» de cada programa se calcula con sus reglas y sus valores, sin escribirlos a mano.', 'diseno', null]
  ];

  // Lo que el prototipo da por bueno en cada cuestión abierta: [cuestión, lo que asume, si no es así, estado, dónde se ve].
  const SUPUESTOS = [
    ['Qué es la planificación financiera', 'El presupuesto por programa de la propia fundación.', 'Si fuera la financiación de las áreas marinas, Decisiones pasaría a planes financieros por área.', 'confirmado', 'presupuesto'],
    ['Qué pesa más al valorar un programa', 'Su impacto ambiental monetizado, el «blue impact», que condiciona el importe que se le propone.', 'Si pesaran más otros criterios, el cuadro los pondría delante.', 'confirmado', 'cuadro'],
    ['Si sustituye a otra herramienta', 'No: la herramienta es nueva.', '', 'confirmado', null],
    ['Cómo se calcula el «blue impact»', function () { return 'No se presupone ningún método. Cada importe se guarda con su dato de entrada comprobado, el valor de cada unidad, la parte atribuible y el supuesto escrito; también se puede anotar un importe ya calculado. ' + P.notaImpacto(); }, 'Con el método de la fundación, el cálculo se configura una vez y se aplica a todos los programas.', 'supuesto', 'cuadro'],
    ['Qué decisión se prepara', 'El presupuesto del año siguiente, programa a programa: reforzar, mantener, reducir o replantear.', 'Si la decisión fuera otra, cambian las opciones y el memorando, no los datos.', 'supuesto', 'programas'],
    ['Cuál es la unidad de decisión', function () { return 'El programa, tal como aparece en las cuentas del informe anual: ' + P.programas().filter(function (g) { return !g.propio; }).length + ' líneas de gasto.'; }, 'Si se decide por área geográfica o por proyecto, cambia el modelo de datos.', 'supuesto', 'programas'],
    ['Qué calendario sigue', function () { return 'Ejercicio de año natural. Se planifica ' + P.PLAN.objetivo + ' con las últimas cuentas publicadas, las de ' + P.PLAN.base + '.'; }, function () { return 'En el proyecto, el cuadro se montaría con las cuentas de ' + (P.PLAN.base + 1) + ' y serviría al presupuesto siguiente.'; }, 'supuesto', 'presupuesto'],
    ['Qué panel o informe existe hoy', 'Ninguno del que partir: la referencia es el informe anual publicado.', 'Si existe, sus indicadores se cargan como una fuente más y el cuadro se ajusta a ellos.', 'supuesto', 'cuadro'],
    ['Para quién son los paneles', 'Para decidir dentro de la fundación: dirección, finanzas y los equipos de programa.', 'Si fueran para el patronato, los donantes o el público, pesaría más el informe con fuentes que el panel.', 'supuesto', 'inicio'],
    ['Quién usa cada parte', 'El equipo está por determinar: no hay usuarios ni permisos, y lo que cada persona hace se guarda en su navegador.', 'En el proyecto, cada cambio queda con su autor y los permisos se reparten por equipo.', 'supuesto', 'copia'],
    ['De qué fuentes sale el dato', 'Las proponemos nosotros, todas públicas: el informe anual de la fundación, las normas de las áreas marinas y estadísticas oficiales. El dato que más cuesta está en documentos, no en bases de datos.', 'Si estuviera en estadísticas públicas, pesarían más los conectores que la lectura con IA.', 'supuesto', 'fuentes'],
    ['Si se usan documentos internos', 'Ninguno: todo sale de publicaciones de la fundación y de fuentes oficiales.', 'Con documentos internos, cada programa ganaría métricas y haría falta un acuerdo de confidencialidad.', 'supuesto', 'fuentes'],
    ['Qué evidencia necesita cada cifra', 'Su documento y su página, y la aprobación de una persona antes de entrar.', 'Si bastara con citar la fuente, la revisión sería más ligera.', 'supuesto', 'revisar'],
    ['Qué métricas tiene cada programa', 'La vinculación de métricas e iniciativas a cada programa es una propuesta nuestra, a partir del informe anual y de la web de la fundación.', 'Se corrige en la ficha de cada programa.', 'supuesto', 'programas'],
    ['Qué herramientas de BI y de planificación hay', 'Están por elegir: por eso las salidas son tablas que cualquier herramienta lee.', 'Con las herramientas elegidas, la conexión sería directa.', 'supuesto', 'salida']
  ];
  const texto = function (v) { return typeof v === 'function' ? v() : v; };

  P.vistas.acerca = function (raiz) {
    raiz.appendChild(P.cabecera('Sobre este prototipo', 'azuIQ enseña el flujo completo con datos reales: de la fuente a la cifra aprobada y de ahí a la ficha, el cuadro de resultados, el presupuesto y el BI. Aquí está lo que ya funciona, lo que se ha supuesto y lo que añadiría el proyecto.'));
    raiz.appendChild(P.avisoPublico());
    const pFun = P.panel('Funciones', FUNCIONES.filter(function (f) { return f[2] !== 'diseno'; }).length + ' se pueden usar aquí; ' + FUNCIONES.filter(function (f) { return f[2] === 'diseno'; }).length + ' están en diseño.');
    raiz.appendChild(pFun);
    pFun.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla apilada' },
      h('thead', null, h('tr', null, h('th', null, 'Función'), h('th', null, 'Para qué sirve'), h('th', null, 'Estado'))),
      h('tbody', null, FUNCIONES.map(function (f) {
        return h('tr', null, h('td', null, f[3] ? h('a', { href: '#' + f[3] }, f[0]) : f[0]), h('td', { class: 'tenue' }, f[1]), h('td', null, estado(f[2])));
      })))));

    const nConf = SUPUESTOS.filter(function (x) { return x[3] === 'confirmado'; }).length;
    const pSup = P.panel('Supuestos adoptados', 'Lo que el prototipo da por bueno en cada cuestión abierta: ' + nConf + ' confirmadas y ' + (SUPUESTOS.length - nConf) + ' supuestas. Las supuestas se revisan en la sesión de trabajo.');
    raiz.appendChild(h('div', { class: 'separa' }, pSup));
    pSup.cuerpo.replaceWith(h('div', { class: 'tabla-caja libre separa' }, h('table', { class: 'tabla supuestos apilada' },
      h('thead', null, h('tr', null, h('th', null, 'Cuestión'), h('th', null, 'Lo que asume el prototipo'), h('th', null, 'Estado'))),
      h('tbody', null, SUPUESTOS.map(function (x) {
        const otro = texto(x[2]);
        return h('tr', null, h('td', null, x[4] ? h('a', { href: '#' + x[4] }, x[0]) : x[0]),
          h('td', null, texto(x[1]), otro ? h('span', { class: 'tenue' }, otro) : null),
          h('td', null, h('span', { class: 'etiqueta' + (x[3] === 'confirmado' ? ' firme' : '') }, x[3] === 'confirmado' ? 'Confirmado' : 'Supuesto')));
      })))));
    pSup.appendChild(h('p', { class: 'panel-pie' }, '«Confirmado» sale de lo hablado con la fundación o de sus publicaciones. «Supuesto» lo hemos decidido nosotros a falta de respuesta; debajo de cada uno va lo que cambiaría si no fuera así.'));

    const pReal = P.panel('Qué es real y qué no', null);
    raiz.appendChild(h('div', { class: 'separa' }, pReal));
    pReal.cuerpo.appendChild(h('div', { class: 'dl', style: { 'max-width': '78ch' } },
      h('div', null, h('span', { class: 'dt' }, 'Real'), h('span', { class: 'dd' }, 'Las ' + P.num(P.semilla.cifras.length) + ' cifras de la carga inicial salen de ' + P.semilla.documentos.length + ' documentos públicos y cada una está comprobada. La carga de PDF, la revisión, el registro de fuentes, el modelo, el cuadro de resultados y el cálculo del impacto funcionan de verdad.')),
      h('div', null, h('span', { class: 'dt' }, 'Limitado'), h('span', { class: 'dd' }, 'Lo que cargas y decides se guarda solo en este navegador. La lectura con IA, las preguntas y los borradores usan Claude con la cuenta de quien mira la página: en un enlace público no funcionan y se ven los datos ya cargados. Solo se leen PDF con texto y texto pegado. Los costes por programa salen del informe anual de la carga inicial: cargar el de otro año todavía no actualiza la sección de decisiones. De partida, el impacto monetizado solo trae una valoración, de ejemplo: su valor unitario sale de un artículo científico y no es una valoración de la fundación.')),
      h('div', null, h('span', { class: 'dt' }, 'Sin construir'), h('span', { class: 'dd' }, 'Los conectores, la base compartida con usuarios y los avisos automáticos. Los costes de los programas son los del informe anual publicado: el gasto del año en curso y el presupuesto aprobado no están. El método con el que la fundación valore el impacto de sus programas no está aplicado: no lo hemos encontrado en lo que publica.'))));

    const pasos = function (items) {
      return h('div', { class: 'pasos separa', style: { 'border-top': '1px solid var(--linea)' } }, items.map(function (it) {
        return h('div', { class: 'cauce-paso' + (it[2] ? ' ahora' : '') }, h('h3', null, it[0]), h('p', null, it[1]));
      }));
    };
    const pRuta = P.panel('Hoja de ruta', 'Tres pasos, de esta demostración a la plataforma.');
    raiz.appendChild(h('div', { class: 'separa' }, pRuta));
    pRuta.cuerpo.replaceWith(pasos([
      ['Demo ilustrativa', 'Este prototipo: el flujo completo funcionando con datos reales.', true],
      ['Piloto', 'El cuadro de resultados por programa, con base de datos compartida, usuarios y los primeros conectores.'],
      ['Módulos por prioridad', 'Al cierre del piloto, el censo con el esfuerzo de cada módulo: la fundación elige por dónde seguir.']
    ]));
  };
})();
