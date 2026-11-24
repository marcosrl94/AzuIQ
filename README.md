# azuIQ

Prototipo de demostración: de la fuente pública a la cifra comprobada, y de ahí al cuadro de resultados, el presupuesto y las tablas para BI.

No es una herramienta de la Fundación Oceano Azul ni tiene su aval. Usa solo información publicada por la fundación y por organismos oficiales; cada cifra enlaza con su documento y su página.

## Qué hay aquí

- `public/`: el sitio, estático. No tiene servidor ni paso de construcción.
  - `index.html`, `estilo.css` y `js/`: la aplicación.
  - `datos/`: las cifras de la carga inicial y el texto de las páginas que sirven de evidencia.
- `vercel.json`: cabeceras con las que se sirve (sin indexar en buscadores y con política de contenido).

## Qué funciona en esta copia pública

Todo lo que trabaja con los datos ya cargados: cifras y evidencia, bandeja de revisión, fuentes, modelo, fichas de área, economía, programas, impacto monetizado, cuadro de resultados, presupuesto, memorando y descargas.

No están activas las funciones que usan IA (leer documentos nuevos, preguntar y redactar borradores): solo funcionan en la versión que se abre desde Claude.

Lo que cada persona carga, revisa o decide se guarda en su navegador y no sale de él.

## Publicar un cambio

Cada envío a `main` se despliega solo en Vercel.
