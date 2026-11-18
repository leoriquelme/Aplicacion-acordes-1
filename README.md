# Cancionero

App para leer las letras y acordes de las canciones de la iglesia.

## Qué tiene

- **Inicio**: los próximos eventos (cultos) con su lista de canciones.
- **Canciones**: todas las canciones, con buscador por título o autor. Cada canción muestra la letra con los acordes encima, se puede cambiar el tono con − y +, editar y presentar.
- **Eventos**: crear un evento (nombre, fecha, hora), armar su lista de canciones, ordenarla y elegir el tono de cada canción para ese culto.
- **Ajustes**: tamaño de letra, mostrar u ocultar acordes, notación americana (C, D, E) o latina (Do, Re, Mi), tema claro u oscuro, y respaldo de los datos.
- **Modo presentación** a pantalla completa. Teclas: `→` / `←` siguiente y anterior canción, `+` / `−` cambiar tono, `F` pantalla completa, `Esc` salir.

Las canciones y eventos se guardan **en el mismo equipo** (en el navegador). Usa *Ajustes → Descargar respaldo* para guardar una copia.

## Formato de las canciones (ChordPro)

```
{c: Estrofa 1}
[G]Cuán grande es [C]Él

{soc}
[C]Este es el [G]coro
{eoc}
```

- El acorde va entre corchetes justo antes de la sílaba.
- Una línea en blanco separa estrofas.
- `{soc}` y `{eoc}` marcan el inicio y fin del coro.
- `{c: texto}` pone un título de sección.

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
