# Despliegue en la nube

## Estado actual

El proyecto incluye el login real, contraseñas BCrypt, tokens JWT, protección de las rutas de inventario, migración del esquema con Flyway y el manifiesto `render.yaml`. La base se crea desde una instancia vacía; el administrador inicial se crea solo si no hay usuarios y su contraseña llega mediante una variable secreta.

Esta carpeta no tiene `.git` ni está conectada a un repositorio remoto. Render necesita que el repositorio se suba y se conecte para aplicar el Blueprint. La publicación real y la transferencia de los datos locales todavía requieren el repositorio y acceso a la base local/exportación.

## Servicios en Render

`render.yaml` declara tres recursos en Ohio:

- **PostgreSQL 17 privado**. La lista de IP vacía bloquea conexiones públicas y permite la red privada de Render.
- **Backend Docker**, con comprobación `/api/health/ready`, esquema Flyway y llave de firma JWT generada por Render.
- **Frontend estático**, con rutas SPA y URL de API definida durante la compilación.

Con los planes mínimos pagados actuales, el backend cuesta US$7/mes y PostgreSQL US$6/mes; el frontend estático no tiene costo. Presupuesta desde US$13/mes y confirma el total en [Render Pricing](https://render.com/pricing) antes de crear servicios: el almacenamiento o uso adicional puede cambiar el importe. La base gratuita expira después de 30 días, así que el Blueprint usa el plan pagado para conservar los datos ([límites del plan gratuito](https://render.com/docs/free)).

## Variables del backend

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP asignado por la plataforma. |
| `SPRING_DATASOURCE_URL` | URL JDBC privada, con formato `jdbc:postgresql://host:5432/electromarket`. |
| `SPRING_DATASOURCE_USERNAME` | Usuario de base de datos de aplicación. |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña inyectada como secreto de la plataforma. |
| `APP_CORS_ALLOWED_ORIGINS` | Dominio HTTPS del frontend, sin ruta ni barra final. |
| `JPA_SHOW_SQL` | Mantener `false` en producción. |
| `JWT_SECRET` | Render lo genera como secreto Base64 de 32 bytes. |
| `JWT_TTL_MINUTES` | Duración del token; el Blueprint define 480 minutos. |
| `APP_ADMIN_USERNAME` | Usuario inicial, solo se usa si la tabla está vacía. |
| `APP_ADMIN_NAME` | Nombre para la cuenta inicial. |
| `APP_ADMIN_PASSWORD` | Secreto solicitado al crear el Blueprint; mínimo 12 bytes UTF-8. |

No incluyas secretos en archivos versionados, Docker build args, imágenes ni logs. Hibernate mantiene `ddl-auto=validate`. Flyway crea el esquema v3 en una base vacía; si ya existe un esquema sin historial Flyway, lo marca como línea base v1 y conserva los datos.

## Migrar la base local

1. Confirma que la base local está en esquema versión 3 según [database/README.md](database/README.md).
2. Haz un respaldo en formato PostgreSQL custom. El comando pedirá la contraseña:

   ```powershell
   pg_dump -Fc -h localhost -p 5432 -U postgres -d electromarket -f electromarket-backup.dump
   ```

3. Primero crea solo PostgreSQL usando `render-database.yaml`. Antes de ejecutar el respaldo, añade temporalmente tu IP pública a la lista de acceso de la base en Render y usa su URL externa con SSL.
4. Restaura el respaldo en esa base vacía. En PowerShell activa SSL para la conexión externa, ejecuta la restauración y luego quita tu IP de la lista:

   ```powershell
   $env:PGSSLMODE = 'require'
   pg_restore --no-owner --no-privileges -h <host-externo> -p <puerto> -U <usuario> -d <base> electromarket-backup.dump
   Remove-Item Env:PGSSLMODE
   ```

   `pg_restore` solicitará la contraseña. La API en Ohio usará la conexión privada.

5. Conecta el mismo repositorio con `render.yaml`. Render asociará la base existente y agregará backend y frontend. Flyway marcará el esquema importado como línea base v1 sin recrear las tablas.
6. Comprueba `/api/health/ready`, el login y las operaciones. Mantén el respaldo local hasta confirmar que la aplicación desplegada muestra los mismos datos.

No restaures sobre una base con datos sin crear y verificar primero otro respaldo. `script_electromarket.sql` es solo para una base nueva y vacía.

## Publicación

1. Si no vas a importar datos, sube esta carpeta a un repositorio Git, conecta Render y crea un Blueprint desde `render.yaml`.
2. Si sí vas a importar datos, sigue primero el procedimiento anterior con `render-database.yaml`; después conecta el mismo repo mediante `render.yaml`.
3. Establece `APP_ADMIN_PASSWORD` como secreto cuando Render lo solicite. Render genera `JWT_SECRET`, crea el esquema en una base vacía, despliega la API y compila la web.
4. Comprueba el login, operaciones, reportes y respaldos antes de usar datos reales.

Si la base importada ya tiene usuarios, el bootstrap no los reemplaza. Sus contraseñas deben estar codificadas con BCrypt para permitir el login; cambia cualquier contraseña heredada en texto plano antes de restaurar datos reales.
