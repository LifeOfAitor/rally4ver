# Rally4ver

App para **Android** que te canta las curvas de una carretera como un copiloto de rally.

Eliges un tramo (por ejemplo, el puerto que haces todos los fines de semana), la app lo analiza y, mientras conduces, te va diciendo por voz lo que viene antes de llegar. Funciona en segundo plano, así que puedes llevar Google Maps o Waze delante.

## Qué hace

- Convierte cualquier ruta en notas de copiloto, con escala del 1 (la más cerrada) al 6 (casi recta).
- Avisa de horquillas, curvas largas, curvas que cierran o abren, y de las que van encadenadas.
- Canta cada nota unos segundos antes de la curva, según tu velocidad.
- Importa rutas de Google Maps o Waze y te deja elegir entre varias alternativas.
- Guarda tus tramos y tus tiempos, con cronómetro y mejor tiempo por tramo.
- Tres voces a elegir, generadas con IA.

## Ejemplo

Lo que oyes al acercarte a una zona de curvas:

```
cuidado, izquierda tres larga, cien, derecha dos cierra y horquilla izquierda
```

| Nota | Significa |
|---|---|
| `derecha 6` | curva muy abierta, casi recta |
| `izquierda 3` | curva media |
| `derecha 1` | curva muy cerrada |
| `horquilla izquierda` | giro de casi 180 grados |
| `cierra` / `abre` | la curva se va cerrando / abriendo |
| `larga` | curva que dura más de lo normal |
| `cien` | 100 metros hasta la siguiente curva |
| `y` | la siguiente curva va pegada a esta |
| `cuidado` | curva cerrada después de una recta larga |

## Cómo se usa

1. Pulsa **+** para crear un tramo:
   - toca el mapa para marcar la salida y la llegada, o
   - en Google Maps calcula la ruta, pulsa **Compartir**, copia el enlace y pégalo con el botón del enlace.
2. Si salen varias rutas, toca la que quieras. Si ninguna pasa por donde quieres, toca esa carretera en el mapa.
3. Guarda el tramo.
4. Ve a la salida, pulsa **Empezar tramo** y deja el móvil en el soporte. Las notas empiezan solas al pasar por la salida.

Para que suene con la pantalla apagada, da a la app el permiso de ubicación **Permitir todo el tiempo**.

## Instalar

1. Descarga el archivo `.apk` de la última versión en [Releases](../../releases).
2. Ábrelo en el móvil. Android te pedirá permiso para instalar apps de fuera de Google Play.

## Aviso

Esto no es un rally. En carretera abierta hay tráfico, peatones y límites de velocidad. Las notas salen de datos de mapas que pueden tener errores. Conduce con prudencia: usas Rally4ver bajo tu responsabilidad y no debes manipular el móvil mientras conduces.

## Desarrollo

Hecha con React Native y Expo.

```bash
npm install
npm test
npx expo run:android
```

## Créditos

- Mapas: © colaboradores de OpenStreetMap, teselas de OpenFreeMap.
- Rutas: OSRM (servidor de FOSSGIS). Búsqueda de lugares: Nominatim.
- Voces: generadas con Piper. davefx (CC0) y SHARVARD (CC BY 3.0, Universidad de Edimburgo).
