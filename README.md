# Cancionero

App para leer las letras y acordes de las canciones de la iglesia.

## Qué tiene

- **Inicio**: los próximos eventos (cultos) con su lista de canciones.
- **Canciones**: todas las canciones, con buscador por título o autor. Cada canción muestra la letra con los acordes encima, se puede cambiar el tono con − y +, editar y presentar.
- **Secciones**: cada canción se divide en Verso 1, Coro, Puente, etc. En "Orden de las secciones" se arrastran para cambiar el orden, se repiten o se quitan. Cada evento puede tener su propio orden para cada canción.
- **Importar**: pega una canción copiada de una página web (acordes en la línea de arriba de la letra) y la app pone los acordes entre corchetes y detecta intro, versos, coros, puentes y repeticiones. No usa internet ni tiene costo.
- **Eventos**: crear un evento (nombre, fecha, hora), armar su lista de canciones, ordenarla y elegir el tono de cada canción para ese culto. Incluye un ranking de las canciones más y menos usadas del último año, con su última fecha de uso.
- **Ajustes**: tamaño de letra, mostrar u ocultar acordes, notación americana (C, D, E) o latina (Do, Re, Mi), tema claro u oscuro, y respaldo de los datos.
- **Modo presentación** a pantalla completa. Teclas: `→` / `←` siguiente y anterior canción, `+` / `−` cambiar tono, `F` pantalla completa, `Esc` salir.

Las canciones y eventos se guardan **en el mismo equipo** (en el navegador). Usa *Ajustes → Descargar respaldo* para guardar una copia.

## Formato de las canciones

```
[VERSO]
[G]Cuán grande es [C]Él

[CORO]
[C]Este es el [G]coro

[VERSO 2]
[G]Otra estrofa
```

- Cada sección empieza con su nombre entre corchetes, solo en una línea: `[INTRO]`, `[VERSO]`, `[PRE CORO]`, `[CORO]`, `[PUENTE]` o `[CODA]`. En el editor hay un botón para cada una.
- Si ya existe una sección del mismo tipo se numera sola: `[VERSO 2]`, `[VERSO 3]`… hasta 5.
- La sección termina con una línea vacía.
- El acorde va entre corchetes justo antes de la sílaba.
- Las canciones antiguas escritas con `{c: Coro}` o `{soc}` / `{eoc}` siguen funcionando.

## Abrirla sin instalar nada

La app se publica sola en https://leoriquelme.github.io/Aplicacion-acordes-1/ cada vez que se suben cambios.

## Cómo ejecutarla en tu PC

1. Instala [Node.js](https://nodejs.org) (versión 20 o más nueva).
2. Descarga este repositorio y abre una terminal en la carpeta.
3. Ejecuta `npm install` (solo la primera vez).
4. Ejecuta `npm run dev` y abre en el navegador la dirección que aparece (normalmente http://localhost:5173).

Otros comandos:

- `npm test` corre las pruebas.
- `npm run build` genera la versión final en la carpeta `dist`.

## Más adelante: iOS y Android

La app está pensada para empaquetarse con [Capacitor](https://capacitorjs.com) sin cambiar el código (usa rutas con `#` y rutas relativas).
