# Despliegue en Render

El archivo `render.yaml` de la raíz describe todo el sistema como un Blueprint de Render:

| Recurso | Tipo | Qué hace |
| --- | --- | --- |
| `peak-paz-db` | PostgreSQL gratuito | Guarda la base `peak_paz` de la API y la base `peak_paz_verification` del microservicio |
| `peak-paz-api` | Servicio web con Docker | API en NestJS. Al arrancar aplica las migraciones, crea las reglas y el administrador, y empieza a atender |
| `peak-paz-verification` | Servicio web con Docker | Microservicio de verificación de cuentas |
| `peak-paz-web` | Sitio estático | Web en React. Reenvía `/api/*` a la API, así el navegador no necesita CORS |

## Antes de empezar

1. Integrar `develop` en `main`. Render publica desde la rama que se elija al crear el Blueprint, y `main` es la rama de versiones entregadas.
2. Tener una cuenta de correo SMTP para enviar avisos reales, por ejemplo Brevo o Resend. Mailpit solo sirve en la computadora local.
3. Para que los documentos de los guías no se pierdan, una cuenta de Cloudinary. El disco de los servicios gratuitos de Render se borra en cada despliegue.

## Pasos

1. En Render, elegir **New > Blueprint**, conectar el repositorio de GitHub y la rama `main`. Render lee `render.yaml` y propone los cuatro recursos.
2. Completar las variables marcadas para llenar a mano:

| Variable | Valor |
| --- | --- |
| `PUBLIC_WEB_URL` | La dirección del sitio, por ejemplo `https://peak-paz-web.onrender.com` |
| `SMTP_URL` | La del proveedor de correo, con el formato `smtp://usuario:clave@servidor:587` |
| `MAIL_FROM` | El remitente, por ejemplo `Peak Paz <avisos@su-dominio>` |
| `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` | Correo y contraseña del administrador inicial |
| `VERIFICATION_SERVICE_URL` | La dirección del microservicio, por ejemplo `https://peak-paz-verification.onrender.com` |
| `PAYMENT_RETURN_URL` y `PAYMENT_CANCEL_URL` | `PUBLIC_WEB_URL` seguido de `/pagos/confirmar` y `/pagos/cancelado` |
| `CLOUDINARY_*` | Las claves de Cloudinary. Si se completan, cambiar `STORAGE_DRIVER` a `cloudinary` |

   `JWT_SECRET`, `EMAIL_TOKEN_SECRET` y `VERIFICATION_SERVICE_KEY` se generan solos. La clave del microservicio está en un grupo de variables compartido, así la API y el microservicio usan la misma.

3. Crear la segunda base dentro de la misma instancia. En la página de `peak-paz-db`, copiar el comando **PSQL Command** de la sección de conexión externa, ejecutarlo y escribir:

   ```sql
   CREATE DATABASE peak_paz_verification;
   ```

4. Volver a desplegar `peak-paz-verification` con **Manual Deploy**. Al arrancar crea sus tablas.
5. Si Render le dio a la API un nombre distinto de `peak-paz-api`, corregir la dirección de la regla `/api/*` en `render.yaml`.

## Limitaciones del plan gratuito

- Los servicios se apagan después de unos 15 minutos sin uso y la primera visita tarda en despertarlos. Conviene abrir la web unos minutos antes de una presentación.
- La base gratuita vence 30 días después de crearse. Para la defensa conviene crearla pocos días antes o pasar a un plan pagado.
- En producción Swagger no se publica. El contrato de la API está en `docs/openapi.json`.
- Los pagos quedan en modo de prueba (`PAYMENT_DRIVER=fake`) hasta tener credenciales de PayPal sandbox.
