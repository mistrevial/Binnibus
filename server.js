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

const ID_GRUPO_BINNIBUS = '120363041982639399@g.us';

client.on('message', async (message) => {
    // console.log(`\nDEBUG: Mensaje recibido del chat con ID: ${message.from}`);

    if (message.from === ID_GRUPO_BINNIBUS) {
        procesarMensaje(message.body);
    }
});

client.on('ready', () => {
    console.log('Sesión iniciada. El bot está escuchando nuevos mensajes en tiempo real.');
});

function procesarMensaje(texto) {
    console.log(`\nProcesando mensaje: "${texto}"`);
    
    const regexRuta = /(R[A-C]-?\d{2}|RT-?01)/i;
    const matchRuta = texto.match(regexRuta);

    if (matchRuta) {
        const ruta = matchRuta[0].toUpperCase().replace(/-/g, '');
        
        const regexEstacion = /(?:saliendo de|desde|en)\s+(.+?)(?=\s+con destino a|\s+con dirección a|\s+a\s+Base|\s+hacia|$)/i;
        const matchEstacion = texto.match(regexEstacion);
        
        if (!matchEstacion || !matchEstacion[1]) {
            console.log(`No se pudo extraer la estación del mensaje.\n`);
            return;
        }
        const estacion = matchEstacion[1].trim().replace(/^(la|el|base de|terminal)\s/i, ''); // Limpia prefijos comunes
        
        const hora_reporte = new Date().toISOString();
        
        const resultado = {
            ruta,
            estacion,
            hora_reporte,
            raw: texto
        };

        console.log(`Evento extraído:`, resultado);
        console.log(`Emitiendo: ruta="${ruta}", estación="${estacion}"\n`);
        
        io.emit('iluminar_estacion', { ruta: ruta, estacion: estacion });
    } else {
        console.log(`No es un evento del Binnibús (no coincide con regex de ruta).\n`);
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
});
