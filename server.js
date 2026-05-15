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

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Por favor, escanea el código QR con tu aplicación de WhatsApp.');
});

client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado y listo para escuchar mensajes!');
});

client.on('message', msg => {
    const match = msg.body.match(/saliendo de\s+(.*?)(?:\s+con destino a|$)/i);
    
    if (match && match[1]) {
        const estacion = match[1].trim().replace(/\.$/, '');
        
        console.log(`Estación detectada: ${estacion}`);
        io.emit('iluminar_estacion', estacion);
    }
});

client.initialize().catch(err => {
    console.error("Error al inicializar el bot de WhatsApp:", err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});