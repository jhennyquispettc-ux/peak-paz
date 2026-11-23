# Despliegue en Render

El archivo `render.yaml` de la raíz describe todo el sistema como un Blueprint de Render:

| Recurso | Tipo | Qué hace |
| --- | --- | --- |
| `peak-paz-db` | PostgreSQL gratuito | Guarda la base `peak_paz` de la API |
| `peak-paz-api` | Servicio web con Docker | API en NestJS. Al arrancar aplica las migraciones, crea las reglas y el administrador, y empieza a atender |
| `peak-paz-verification-python` | Servicio web con Docker | Microservicio en Python para correo y revisión de documentos |
| `peak-paz-web` | Sitio estático | Web en React. Reenvía `/api/*` a la API, así el navegador no necesita CORS |

## Antes de empezar

1. Integrar `develop` en `main`. Render publica desde la rama que se elija al crear el Blueprint, y `main` es la rama de versiones entregadas.
2. Tener una cuenta de correo SMTP que permita el puerto 2525, por ejemplo Brevo. Mailpit solo sirve en la computadora local.
3. Una cuenta de Cloudinary para guardar los documentos de guías y agencias. Es obligatoria porque el disco de los servicios gratuitos de Render se borra en cada despliegue.
4. Una instancia gratuita de RabbitMQ en CloudAMQP. Render no ofrece RabbitMQ en su plan gratuito.

## Pasos

1. En Render, elegir **New > Blueprint**, conectar el repositorio de GitHub y la rama `main`. Render lee `render.yaml` y propone los cuatro recursos.
2. Completar las variables marcadas para llenar a mano:

| Variable | Valor |
| --- | --- |
| `PUBLIC_WEB_URL` | La dirección del sitio, por ejemplo `https://peak-paz-web.onrender.com` |
| `SMTP_URL` | La del proveedor de correo, con el formato `smtp://usuario:clave@servidor:2525`. Los servicios gratuitos de Render bloquean los puertos 25, 465 y 587 |
| `MAIL_FROM` | El remitente, por ejemplo `Peak Paz <avisos@su-dominio>` |
| `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` | Correo y contraseña del administrador inicial |
| `RABBITMQ_URL` | La dirección `amqps://` de la instancia de CloudAMQP |
| `DOCUMENT_BASE_URL` | La dirección pública de la API, por ejemplo `https://peak-paz-api.onrender.com` |
| `VERIFICATION_WAKE_URL` | La dirección de salud del servicio Python, por ejemplo `https://peak-paz-verification-python.onrender.com/health` |
| `PAYMENT_RETURN_URL` y `PAYMENT_CANCEL_URL` | `PUBLIC_WEB_URL` seguido de `/pagos/confirmar` y `/pagos/cancelado` |
| `CLOUDINARY_*` | Las tres claves de Cloudinary. Sin ellas la API no arranca |

   `JWT_SECRET` se genera solo. Si falta `RABBITMQ_URL`, `DOCUMENT_BASE_URL`, `SMTP_URL` o `PUBLIC_WEB_URL`, la API no arranca e indica cuál falta.

3. Si Render le dio a la API un nombre distinto de `peak-paz-api`, corregir la dirección de la regla `/api/*` en `render.yaml`.

## Limitaciones del plan gratuito

- Los servicios se apagan después de unos 15 minutos sin uso y la primera visita tarda en despertarlos. Conviene abrir la web unos minutos antes de una presentación.
- Si el servicio Python está apagado, la API lo despierta al enviar un mensaje. Los correos y análisis esperan en RabbitMQ, así que el primero puede tardar alrededor de un minuto.
- No conviene mantener los servicios siempre despiertos, porque el plan incluye 750 horas al mes por cuenta.
- La base gratuita vence 30 días después de crearse. Para la defensa conviene crearla pocos días antes o pasar a un plan pagado.
- En producción Swagger no se publica. El contrato de la API está en `docs/openapi.json`.
- Los pagos quedan en modo de prueba (`PAYMENT_DRIVER=fake`) hasta tener credenciales de PayPal sandbox.
