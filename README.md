# Binnibus Mapa Sonoro

Este proyecto visualiza las rutas de Binnibus en un mapa interactivo y sonoro, reaccionando en tiempo real a los reportes de un canal de WhatsApp.

## Requisitos

-   [Node.js](https://nodejs.org/) (versión 16 o superior)

## Instalación

1.  Clona o descarga este repositorio.
2.  Abre una terminal en la carpeta del proyecto.
3.  Instala las dependencias necesarias ejecutando el siguiente comando:
    ```bash
    npm install
    ```

## Configuración

1.  Abre el archivo `server.js`.
2.  Busca la línea `const ID_GRUPO_BINNIBUS = '...';`.
3.  Reemplaza el ID de ejemplo con el ID real de tu grupo de WhatsApp.
    *   **Para obtener el ID de tu grupo:** Descomenta temporalmente la línea `// console.log(...)` dentro de `client.on('message', ...)` en `server.js`, ejecuta el servidor y envía un mensaje a tu grupo. El ID aparecerá en la consola. Cópialo, pégalo y vuelve a comentar la línea.

## Ejecución

1.  En la terminal, dentro de la carpeta del proyecto, ejecuta el siguiente comando para iniciar el servidor:
    ```bash
    node server.js
    ```
2.  La primera vez, se generará un código QR en la terminal. Escanéalo con tu teléfono desde la aplicación de WhatsApp (en `Dispositivos vinculados`).
3.  Una vez que la terminal muestre "Sesión iniciada", abre tu navegador web y ve a la siguiente dirección:
    ```
    http://localhost:3000
    ```

El mapa ahora está listo para recibir y visualizar los eventos.
