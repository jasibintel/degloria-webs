# Biblioteca web de Escuela de Gloria

Sitio estático para organizar y publicar páginas HTML independientes con GitHub Pages. No requiere frameworks, servidor, base de datos ni paquetes externos.

## Categorías

- `panorama-nuevo-testamento/`
- `estudios-biblicos/`
- `guias-estudiantes/`
- `recursos/`

Cada carpeta contiene una portada `index.html`. Las publicaciones se guardan como archivos HTML dentro de su categoría y se registran en `publicaciones.json` para que aparezcan en la biblioteca.

## Agregar una página nueva

1. Guarda el archivo HTML dentro de la categoría correspondiente, por ejemplo `estudios-biblicos/fe-y-esperanza.html`.
2. Si la página usa imágenes, hojas CSS o JavaScript propios, guárdalos junto al HTML o en una carpeta de recursos dentro de esa categoría. Usa rutas relativas, por ejemplo `imagenes/mapa.jpg` o `estilos/tema.css`.
3. Abre `publicaciones.json` y agrega un objeto a `publications`, con título, descripción, categoría y ruta:

   ```json
   {
     "title": "Fe y esperanza",
     "description": "Un estudio para grupos pequeños.",
     "category": "estudios-biblicos",
     "url": "estudios-biblicos/fe-y-esperanza.html"
   }
   ```

4. Publica los cambios en la rama `main`. GitHub Pages actualizará el sitio automáticamente.

Usa nombres de archivo simples, en minúscula, sin espacios ni tildes. El campo `category` debe coincidir con el nombre de una carpeta. La ruta `url` debe apuntar al HTML y terminar en `.html`.

## Crear una categoría

1. Crea una carpeta con un nombre corto en minúsculas, por ejemplo `lecturas-devocionales/`.
2. Dentro, crea un `index.html` copiando la portada de otra categoría y adapta su `data-category` y textos. Para mantener la navegación y estilos, conserva las rutas a `../assets/css/styles.css` y `../assets/js/library.js`.
3. Añade la categoría al arreglo `categories` de `publicaciones.json`:

   ```json
   {
     "id": "lecturas-devocionales",
     "name": "Lecturas devocionales",
     "shortName": "Devocionales",
     "description": "Lecturas para acompañar el estudio personal.",
     "number": "05"
   }
   ```

4. Usa ese mismo `id` en el campo `category` de cada publicación nueva.

## Obtener el enlace público

El sitio principal es `https://jasibintel.github.io/degloria-webs/`. Cada HTML tiene su propio enlace, formado con la dirección del sitio y su ruta. Por ejemplo:

`https://jasibintel.github.io/degloria-webs/estudios-biblicos/fe-y-esperanza.html`

Las portadas de categoría también tienen URL propia, como `https://jasibintel.github.io/degloria-webs/recursos/`.

## Actualizar un HTML

Edita el archivo de la publicación y sube el cambio a `main`. Su URL no cambia mientras se mantengan el nombre y la ubicación del archivo.

## Eliminar una publicación

Elimina su objeto de `publications` en `publicaciones.json` y borra el HTML correspondiente. Elimina también imágenes u otros archivos usados solo por esa página. Publica los cambios en `main`; el enlace dejará de estar disponible una vez que Pages termine de actualizar.

## Agregar imágenes y CSS

Puedes guardar archivos compartidos en `assets/` o recursos exclusivos dentro de la categoría. Ejemplo de estructura:

```text
estudios-biblicos/
  fe-y-esperanza.html
  imagenes/
    portada.jpg
  estilos/
    tema.css
```

Dentro de `fe-y-esperanza.html`, enlaza los archivos con rutas relativas como `<img src="imagenes/portada.jpg" alt="...">` y `<link rel="stylesheet" href="estilos/tema.css">`. Conviene optimizar imágenes grandes y añadir texto `alt` descriptivo.

## Publicación

GitHub Pages debe publicar desde la rama `main`, carpeta raíz (`/`). Al subir cambios, espera a que finalice la implementación de Pages antes de compartirlos. Las direcciones públicas pueden tardar unos minutos en reflejar una actualización.
