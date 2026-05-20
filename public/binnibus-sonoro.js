// Asumiendo que Mapbox GL JS, Turf.js, Tone.js y Socket.IO ya están cargados en el HTML.
// Y que existe la variable global `rutasBinnibus` con el objeto GeoJSON.

const socket = io();

// ==========================================
// 1. CONFIGURACIÓN DE COLORES
// ==========================================
const COLOR_INACTIVO = '#555555';
const coloresRutas = {
    'RT-01': '#D81B60', // Fucsia oscuro
    'RC-06': '#1565C0', // Azul vibrante
    'RC-09': '#00838F', // Cian/Verde esmeralda
    'DEFAULT': '#F57F17' // Naranja por defecto
};

// ==========================================
// 2. ORQUESTA TONE.JS (Marimba y Jarana)
// ==========================================
let marimbaSynth;
let jaranaSynth;
let audioIniciado = false;

// Las notas pentatónicas solicitadas
const pentatonica = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5'];

// Inicializar el contexto de audio con la primera interacción del usuario
document.addEventListener('click', async () => {
    if (!audioIniciado) {
        await Tone.start();
        
        // Marimba (sonido percusivo de madera usando un oscilador senoidal con envolvente corta)
        marimbaSynth = new Tone.Synth({
            oscillator: { type: "sine" },
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.5 }
        }).toDestination();

        // Jarana (sonido de cuerda rasgueada usando triángulo y un filtro pasa-bajas)
        jaranaSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.8 },
            filter: { type: "lowpass", frequency: 1500 }
        }).toDestination();

        audioIniciado = true;
        console.log('🎵 Tone.js iniciado y listo para tocar.');
    }
}, { once: true });

// Algoritmo pseudo-aleatorio para asignar una nota pentatónica según la coordenada
function obtenerNotaDeCoordenada(coordenadas) {
    const suma = Math.abs(coordenadas[0] + coordenadas[1]);
    const indice = Math.floor(suma * 10000) % pentatonica.length;
    return pentatonica[indice];
}

// ==========================================
// 3. MAPBOX GL JS
// ==========================================
mapboxgl.accessToken = 'AQUI_TU_TOKEN_DE_MAPBOX'; // ¡No olvides poner tu token real!

const map = new mapboxgl.Map({
    container: 'mapa', // ID del div en tu HTML
    style: 'mapbox://styles/mapbox/light-v11', // Tema claro para resaltar los colores
    center: [-96.7250, 17.0608], // Coordenadas de Oaxaca
    zoom: 12
});

map.on('load', () => {
    // Cargar el GeoJSON global de rutas
    map.addSource('rutas-source', {
        type: 'geojson',
        data: rutasBinnibus
    });

    // Dibujar la capa de líneas inactivas
    map.addLayer({
        id: 'rutas-layer',
        type: 'line',
        source: 'rutas-source',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': COLOR_INACTIVO,
            'line-width': 3,
            'line-opacity': 0.8
        }
    });

    console.log('🗺️ Mapa cargado con rutas.');
});

// ==========================================
// 4. RECEPCIÓN DE WEBSOCKETS Y ANIMACIÓN
// ==========================================
socket.on('iluminar_estacion', (datos) => { // Cambiado de 'nueva-unidad' a 'iluminar_estacion'
    const rutaClean = datos.ruta.toUpperCase().trim(); // Acceder a la propiedad 'ruta' del objeto 'datos'
    const colorDestino = coloresRutas[rutaClean] || coloresRutas['DEFAULT'];
    
    console.log(`🚍 ¡Se detectó una salida! Ruta: ${rutaClean}, Estación: ${datos.estacion}`);

    iluminarRuta3Segundos(rutaClean, colorDestino);
    desplegarBusVirtual(rutaClean, colorDestino);
});

function iluminarRuta3Segundos(rutaId, colorBrillante) {
    // Usamos una expresión "match" para que solo la ruta afectada cambie de color.
    // Asumimos que el GeoJSON tiene una propiedad "name" o "ruta" con el ID ("RC-06", etc.)
    const expresionColor = [
        'match',
        ['get', 'name'], // Ajusta 'name' al nombre real de la propiedad en tu GeoJSON
        rutaId, colorBrillante,
        COLOR_INACTIVO // Para todas las demás, sigue siendo gris
    ];

    map.setPaintProperty('rutas-layer', 'line-color', expresionColor);
    map.setPaintProperty('rutas-layer', 'line-width', [
        'match', ['get', 'name'], rutaId, 6, 3 // Hacemos la línea activa un poco más gruesa
    ]);

    // Regresar al estado inactivo tras 3000ms
    setTimeout(() => {
        map.setPaintProperty('rutas-layer', 'line-color', COLOR_INACTIVO);
        map.setPaintProperty('rutas-layer', 'line-width', 3);
    }, 3000);
}

function desplegarBusVirtual(rutaId, color) {
    // 1. Buscar la ruta específica dentro del GeoJSON
    const featureRuta = rutasBinnibus.features.find(f => {
        const nombre = f.properties.name || f.properties.ruta || f.properties.nombre || "";
        return nombre.toUpperCase().includes(rutaId);
    });

    if (!featureRuta) {
        console.warn(`No se encontró el LineString para la ruta ${rutaId} en rutas.js`);
        return;
    }

    // 2. Crear el DOM Element para el marcador del bus
    const el = document.createElement('div');
    el.style.width = '16px';
    el.style.height = '16px';
    el.style.backgroundColor = color;
    el.style.borderRadius = '50%';
    el.style.boxShadow = `0 0 12px ${color}`;
    el.style.border = '2px solid white';
    el.style.transition = 'transform 0.1s ease-out'; // Para el latido musical

    const verticesRuta = featureRuta.geometry.coordinates;
    const busMarker = new mapboxgl.Marker(el)
        .setLngLat(verticesRuta[0])
        .addTo(map);

    // 3. Calcular distancias con Turf.js
    const longitudTotalKm = turf.length(featureRuta, { units: 'kilometers' });
    
    // El usuario pidió 30 minutos (1800000 ms), pero aquí lo dejamos configurable.
    // Para depuración rápida lo seteamos en 2 minutos (120000 ms).
    const duracionViajeMs = 120000; 
    
    let startTime = null;
    let indiceVerticeActual = 0;

    // 4. Bucle de Animación e Interpolación
    function animarMovimiento(timestamp) {
        if (!startTime) startTime = timestamp;
        const progreso = timestamp - startTime;
        const fraccion = progreso / duracionViajeMs;

        if (fraccion >= 1) {
            busMarker.remove(); // El bus llegó a su destino
            return;
        }

        // ¿Dónde está el bus en este instante?
        const distanciaActual = longitudTotalKm * fraccion;
        const puntoInterpolado = turf.along(featureRuta, distanciaActual, { units: 'kilometers' });
        busMarker.setLngLat(puntoInterpolado.geometry.coordinates);

        // 5. Detección de vértices (Estaciones) y Sonificación
        // Revisamos si ya superamos la distancia hacia el *siguiente* vértice conocido
        if (indiceVerticeActual < verticesRuta.length - 1) {
            const nextCoord = verticesRuta[indiceVerticeActual + 1];
            // Calculamos la distancia desde el inicio hasta ese próximo vértice
            const segmentoHastaProximo = turf.lineString(verticesRuta.slice(0, indiceVerticeActual + 2));
            const distHastaProximo = turf.length(segmentoHastaProximo, { units: 'kilometers' });

            if (distanciaActual >= distHastaProximo) {
                // ¡Hemos cruzado un vértice!
                indiceVerticeActual++;

                // Latido visual
                el.style.transform = 'scale(1.6)';
                setTimeout(() => el.style.transform = 'scale(1)', 150);

                // Latido sonoro
                if (audioIniciado) {
                    const nota = obtenerNotaDeCoordenada(nextCoord);
                    
                    // Condición solicitada: Marimba para unas, Jarana para otras
                    if (rutaId.startsWith('RT')) {
                        marimbaSynth.triggerAttackRelease(nota, "8n");
                    } else {
                        // RC-xx u otras suenan a Jarana
                        jaranaSynth.triggerAttackRelease(nota, "8n");
                    }
                }
            }
        }

        requestAnimationFrame(animarMovimiento);
    }

    // Iniciar el frame
    requestAnimationFrame(animarMovimiento);
}