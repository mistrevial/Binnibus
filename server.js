const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('iluminar_estacion', (datos) => {
        console.log(`\n[Cliente: ${socket.id}] Evento recibido:`, datos);
        io.emit('iluminar_estacion', datos);
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Por favor, escanea el código QR con tu aplicación de WhatsApp.');
});

// --- MEJORA: Usar el evento 'message' para fiabilidad ---

// ¡IMPORTANTE! Reemplaza esto con el ID real de tu grupo de WhatsApp.
// Para obtenerlo, puedes descomentar la línea de depuración en el evento 'message',
// ejecutar el servidor y enviar un mensaje a tu grupo. El ID aparecerá en la consola.
const ID_GRUPO_BINNIBUS = 'ID_DEL_GRUPO@g.us'; // EJEMPLO: 120363041234567890@g.us

client.on('ready', () => {
    console.log('✅ Sesión iniciada. El cliente está listo para recibir mensajes.');
    console.log(`📡 Escuchando mensajes del grupo Binnibús (${ID_GRUPO_BINNIBUS}) y Canales de WhatsApp...`);
});

client.on('message', async (message) => {
    const isChannel = message.from.endsWith('@newsletter');
    const isDM = message.from.endsWith('@c.us'); // Permitir mensajes directos para pruebas
    
    // Filtramos para procesar mensajes del grupo, canales o mensajes directos
    if (isChannel || message.from === ID_GRUPO_BINNIBUS || isDM) {
        if (message.body) {
            console.log(`\n[${new Date().toLocaleTimeString()}] Mensaje recibido de Canal/Grupo: "${message.body}"`);
            procesarMensaje(message.body);
        }
    }
    // ⚠️ LÍNEA DESCOMENTADA: Esto imprimirá TODO lo que recibas para que encuentres tu ID
    console.log(`[DEBUG WSP] Mensaje de: ${message.from} | Tipo: ${message.type} | Cuerpo: "${message.body}"`);
});

function procesarMensaje(texto) {
    console.log(`\n📨 Procesando mensaje: "${texto}"`);
    
    // Permite formato con o sin guion o espacio (ej. RA-17, RA 17, RA17)
    const regexRuta = /(R[A-C][-\s]?\d{2}|RT[-\s]?01)/i;
    const matchRuta = texto.match(regexRuta);

    if (matchRuta) {
        // Normalizamos quitando guiones y espacios para la lógica del frontend
        const ruta = matchRuta[0].toUpperCase().replace(/[-\s]/g, '');
        
        // Enviamos todo el texto (quitando solo el código de la ruta) para no perder palabras clave
        let estacion = texto.replace(matchRuta[0], '').trim();
        estacion = estacion.replace(/^[:\-,\.]+|[:\-,\.]+$/g, '').trim(); // Limpiar puntuaciones
        
        const hora_reporte = new Date().toISOString();
        
        const resultado = {
            ruta,
            estacion,
            hora_reporte,
            raw: texto
        };

        console.log(`✅ Evento extraído:`, resultado);
        console.log(`📡 Emitiendo: ruta="${ruta}", estación="${estacion}"\n`);
        
        io.emit('iluminar_estacion', { ruta: ruta, estacion: estacion });
    } else {
        console.log(`⏭️  No es un evento del Binnibús (no coincide con regex de ruta)\n`);
    }
}

(async () => {
    try {
        await client.initialize();
    } catch (error) {
        console.error('Fallo en la inicialización:', error);
    }
})();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: El puerto ${PORT} ya está en uso.`);
        console.error(`💡 SOLUCIÓN: Cierra la otra terminal que está corriendo el servidor, o usa 'taskkill' para detenerlo.\n`);
    }
});
