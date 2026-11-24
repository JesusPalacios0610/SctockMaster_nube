# ElectroMarket · Sistema de inventario

Aplicación de inventario con frontend React + TypeScript + Vite y backend Spring Boot + PostgreSQL.

## Iniciar el frontend

1. Copia `frontend/.env.example` como `frontend/.env.local`.
2. Ajusta `VITE_API_BASE_URL` al entorno local.
3. En `frontend/`, ejecuta `npm install` y luego `npm run dev`.
4. Inicia el backend y PostgreSQL antes de usar productos, proveedores y movimientos.

La dirección predeterminada del backend es `http://localhost:8080/api`. El frontend no carga datos de muestra: lee productos, proveedores y movimientos desde la API. El login usa las credenciales almacenadas en la tabla `usuario`.

## Iniciar todo en local con Docker

1. Copia `.env.example` como `.env` y establece `POSTGRES_PASSWORD`, `APP_ADMIN_PASSWORD` (mínimo 12 bytes) y `JWT_SECRET` (llave aleatoria en Base64 de al menos 32 bytes). En PowerShell puedes generarla con `[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))`.
2. Ejecuta `docker compose up --build` desde la raíz.
3. Abre `http://localhost:5173`. La API queda en `http://localhost:8080/api`.

El script SQL se ejecuta automáticamente solo al crear por primera vez el volumen vacío. Si `usuario` está vacía, el backend crea una cuenta inicial con las variables `APP_ADMIN_*` y guarda la contraseña con BCrypt. Para Render revisa [CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md).

## Iniciar backend sin Docker

1. Copia `backend/application-local.example.properties` como `backend/src/main/resources/application-local.properties` y completa la contraseña local de PostgreSQL.
2. Define `JWT_SECRET`, `APP_ADMIN_USERNAME`, `APP_ADMIN_NAME` y `APP_ADMIN_PASSWORD` en la terminal. La contraseña debe tener 12–72 bytes UTF-8.
3. Desde `backend/`, ejecuta `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` (en Windows, `mvnw.cmd`).

El archivo local con la contraseña está excluido de Git. Flyway crea o actualiza el esquema al iniciar; Hibernate solo valida las tablas. No uses este perfil para producción.

## Rutas del frontend

| Ruta | Pantalla |
|---|---|
| `/dashboard` | Resumen de inventario |
| `/productos` | Búsqueda, alta, edición y activación de productos |
| `/proveedores` | Búsqueda, alta, edición y activación de proveedores |
| `/entradas` | Registro de entradas y actividad reciente |
| `/salidas` | Registro de salidas y actividad reciente |
| `/kardex` | Movimientos y cortes diarios por producto |
| `/alertas` | Productos activos con stock bajo o crítico |
| `/reportes` | Reportes de inventario y movimientos, exportación XLSX e impresión a PDF |
| `/configuracion` | Estado de conexión y configuración local |

## Acceso

El login valida el usuario en PostgreSQL y protege las rutas de inventario con tokens JWT de duración limitada. Las contraseñas se almacenan con BCrypt. La primera cuenta `ADMIN` se crea una sola vez si `usuario` está vacía, usando `APP_ADMIN_USERNAME`, `APP_ADMIN_NAME` y `APP_ADMIN_PASSWORD`. El frontend no usa credenciales fijas ni un ID de usuario de demostración.

## Reportes

La descarga de Excel crea un archivo `.xlsx` en el navegador. La opción de PDF abre el diálogo de impresión, donde se puede elegir “Guardar como PDF”.
