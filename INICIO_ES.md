# CueCrate en tu celular

Descarga CueCrate_Movil.html y abre el archivo guardado con un navegador que permita JavaScript en archivos locales. Si ves solo una vista previa sin controles funcionales, abre el archivo desde un navegador compatible. No necesitas iniciar un servidor, instalar Python ni descargar pesos. Puedes seleccionar tus preferencias en la pantalla sin usar ningún otro archivo.

Toca una de las portadas de Inicio para descubrir música. En Explorar puedes buscar un género. Toca una canción para ver su ficha, comparar el puntaje o reproducir su muestra cuando esté disponible.

Desde Perfil, para cargar varios perfiles usa data/preferencias.csv. Mantén el encabezado, separa varias etiquetas con | y usa 1 o 0 para las dos opciones finales. El formulario acepta las etiquetas del catálogo y sus traducciones mostradas. El tempo es opcional y admite enteros de 20 a 240 BPM. La preferencia de género es exacta.

Para buscar entre varios artistas, prueba **Hip hop con bajo** o **Reggae con guitarra**. MTG-Jamendo no proporciona BPM en estas tablas. Deja el tempo vacío para incluir sus canciones. En data/tracks_by_genre.csv encontrarás la lista ordenada por género. El archivo data/song_vectors.csv y su diccionario vector_dimensions.json contienen las 229 coordenadas de cada pista.

El ZIP contiene una carpeta con el código y un bundle de Git. Para conservar el historial, desde la carpeta que contiene el bundle ejecuta:

```bash
git clone -b main CueCrate_Movil.bundle cuecrate-github
cd cuecrate-github
git remote remove origin
git remote add origin URL_DE_TU_REPOSITORIO
git push -u origin main
```

Crea primero un repositorio público vacío y sustituye URL_DE_TU_REPOSITORIO por su URL real. La presentación y las pruebas están dentro de la carpeta del proyecto.
