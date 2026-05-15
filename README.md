Qué onda, te dejo unas notas rápidas para que sepas cómo está armado y cómo funciona el proyecto del BinniBus.

Todo el sistema se divide básicamente en dos partes que se comunican entre sí: el bot de WhatsApp y el mapa en la página web.

El Bot de WhatsApp
Cuando corres el proyecto, te va a salir un código QR en la terminal de tu compu. Lo escaneas con tu cel y con eso el bot ya queda vinculado a tu WhatsApp. 
A partir de ahí, el bot se queda leyendo los mensajes del grupo. Cuando ve que alguien manda un reporte (tipo "unidad saliendo de Colonia Jardín"), agarra el texto, lo limpia y se queda solo con el nombre de la colonia. 

Luego checa en su lista de coordenadas dónde queda ese lugar. Si por alguna razón es un lugar nuevo y no lo conoce, lo busca rápido en internet usando los mapas de OpenStreetMap, saca las coordenadas y las guarda para la próxima. Ya que sabe exactamente dónde es, le manda una alerta al mapa.

El Mapa
La página web siempre está atenta a las alertas del bot. En cuanto recibe el aviso de una parada, la cámara del mapa vuela directo hacia esa ubicación. El punto se pone naranja, se hace un poco más grande para que lo ubiques rápido y suena una marimba.

Para no saturar la pantalla de puntos naranjas, pasados 10 segundos la parada regresa a su color gris original de forma automática.

Cómo arrancarlo
Nada más abre la terminal en la carpeta del proyecto, corre el comando:
node server.js

Y abre localhost:3000 en tu navegador web.

Modo de prueba (Mock Mode)
Si quieres hacer pruebas, moverle al código, o enseñarle el mapa a alguien pero no hay mensajes en el grupo de WhatsApp en ese momento, abre el archivo server.js y cambia la variable MOCK_MODE a true. 

Con eso el bot de WhatsApp se desactiva por completo y el sistema empieza a prender paradas al azar cada 10 segundos para que veas cómo funciona.

Cualquier duda, me avisas.
