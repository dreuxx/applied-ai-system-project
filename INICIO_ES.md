# CueCrate en tu PC

La app está escrita en React Native con Expo. Abre en un navegador de PC y comparte las pantallas y el recomendador con Android e iOS. La API REST funciona en local con Node y en Netlify con una función. Python solo hace falta para volver a entrenar el modelo.

## 1. Arrancar en local

Descomprime el ZIP. Abre la carpeta **CueCrate_Movil**, donde están `package.json` y `package-lock.json`, en VS Code. En la terminal usa Node **24.22.3** (con nvm, `nvm install` y `nvm use` seleccionan la versión de .nvmrc).

```bash
npm ci
npx expo start --web
```

Abre la URL que muestra Expo, normalmente **http://localhost:8081**. Esa misma dirección sirve la interfaz y `/api/*`. Detén el proceso con Ctrl+C. La instalación inicial de dependencias requiere internet.

## 2. Recorrido de prueba

1. En **Inicio** toca **Hip Hop**. La primera sugerencia es *Big Plans Remix*, de Kellee Maize. Tócala para ver la puntuación o usarla como perfil.
2. En **Explorar**, escribe un artista en **Título o artista** y pulsa **Buscar en el catálogo**. Verás si los resultados llegaron por REST o desde la copia local.
3. En **Perfil**, usa **Importar preferencias CSV** y selecciona `data/preferencias.csv`. El perfil **Reggae con guitarra** recomienda *Condition Humaine*. Puedes regresar a Perfil para aplicar otro perfil del mismo archivo.
4. Activa **Calcular este perfil con la API REST** y pulsa **Recomendar música** para enviar esa consulta al servidor. El comportamiento inicial es calcularla en el dispositivo. El servidor y la app usan el mismo modelo y los mismos pesos.
5. Pulsa el icono de auriculares, abre una canción y pulsa **Reproducir muestra**. Hay 28 fragmentos de siete segundos.

Pruebas automáticas y versión de producción:

```bash
npm test
npm run build
npm run preview
```

Abre **http://127.0.0.1:3001**. Después de que la primera carga termine de almacenar la app y sus recursos, puedes desconectarte, recargar y utilizar el modelo local y las muestras. La caché web requiere localhost o HTTPS. La página de desarrollo de Expo usa Metro para servir código y recursos.

## 3. API REST

En desarrollo usa `http://localhost:8081`. En la vista previa usa `http://127.0.0.1:3001`. Para ejecutar únicamente la API en el puerto 3001, usa `npm run api`.

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | /api/health | Estado, 56.656 canciones y 103 géneros |
| GET | /api/genres | Lista de géneros |
| GET | /api/tracks?q=Kellee&genre=Hip%20Hop&limit=5 | Resultados por artista o título, con filtro opcional de género |
| GET | /api/tracks/track_0521030 | Ficha de Big Plans Remix |
| POST | /api/recommendations | Cinco resultados como máximo, puntuaciones y contribuciones |
| GET | /api/tracks/track_0521030/spotify | Estado de la coincidencia y enlace de Spotify |

Ejemplo en la terminal de Linux Mint mientras Expo está en marcha:

```bash
curl http://localhost:8081/api/health
curl -X POST http://localhost:8081/api/recommendations \
  -H 'Content-Type: application/json' \
  -d '{"genre":"Hip Hop","instruments":["Bass"],"strict":true}'
```

La primera consulta devuelve `{"status":"ok","tracks":56656,"genres":103}`. La primera canción de la segunda es *Big Plans Remix*. Un género desconocido devuelve HTTP 400; un perfil vacío devuelve una lista vacía.

## 4. Spotify opcional

La ficha ofrece **Buscar en Spotify**. Sin credenciales puedes abrir la búsqueda pública por título y artista. Para consultar la Web API, registra tu app en Spotify for Developers, copia `.env.example` a `.env` y configura **SPOTIFY_CLIENT_ID** y **SPOTIFY_CLIENT_SECRET**. Reinicia el servidor. En Netlify configura esas variables en los ajustes del sitio para Functions. El servidor obtiene el token por Client Credentials. Las claves van exclusivamente en el servidor.

Si la búsqueda encuentra el mismo título y artista, la app muestra **Abrir canción en Spotify**. Ante una grabación ausente, credenciales faltantes o servicio no disponible, la interfaz indica el estado y ofrece búsqueda manual. [Búsqueda de Spotify](https://developer.spotify.com/documentation/web-api/reference/search) · [Modo desarrollo y acceso](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

## 5. Probar un teléfono

Ejecuta `npx expo start` con la PC y el teléfono en la misma Wi-Fi y usa un cliente compatible con Expo SDK 58. Para la búsqueda remota y el modo REST en el teléfono, configura `EXPO_PUBLIC_API_ORIGIN=http://IP_DE_TU_PC:8081` en `.env` y reinicia Expo. La IP de la PC tiene que ser accesible desde el dispositivo. También puedes usar la URL HTTPS de tu despliegue. El modelo local funciona con sus datos incluidos. La exportación de paquetes de JavaScript para Android e iOS fue verificada; para instalar una app independiente hace falta generar el binario nativo.

## 6. GitHub y Netlify

Puedes publicar el contenido de **CueCrate_Movil** como raíz de un repositorio. Para llevar también los commits previos, usa el bundle incluido desde la carpeta donde descomprimiste el ZIP:

```bash
git clone -b main CueCrate_Movil.bundle cuecrate-github
cd cuecrate-github
git remote remove origin
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

Crea primero tu repositorio vacío en GitHub y reemplaza `URL_DE_TU_REPOSITORIO`. `.gitignore` excluye dependencias, compilaciones y secretos.

Para ensayar el entorno de Netlify en tu PC:

```bash
npm run build
npx netlify-cli@27.20.1 dev --offline --no-open
```

Abre **http://localhost:8888**. Para desplegar más adelante, conecta el repo en Netlify. `netlify.toml` ya define **npm run build**, **dist** y **netlify/functions**. Si el repo contiene el proyecto dentro de una subcarpeta, usa esa carpeta como base. Importar el repositorio permite que Netlify compile el sitio y empaquete la API.
