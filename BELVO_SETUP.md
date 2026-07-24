# Setup Belvo (bancos y billeteras)

Checklist para activar la integración Belvo (PR [#28](https://github.com/agustinLunaSimondi/App-Financiera-MVP/pull/28), merge a `develop`).

## 1. Cuenta Belvo
- Crear cuenta en [dashboard.belvo.com](https://dashboard.belvo.com)
- Sacar `secret_id` / `secret_password` de **sandbox** (gratis, para probar)

## 2. Variables de entorno (backend, `.env`)
```
BELVO_SECRET_ID=""
BELVO_SECRET_PASSWORD=""
BELVO_ENV="sandbox"
BELVO_WEBHOOK_SECRET=""   # inventar un string random largo
```
Configurar igual en Render (env vars del servicio backend) cuando se promueva a un ambiente desplegado.

## 3. Migración de base de datos
No se corrió automáticamente — requiere confirmación explícita porque toca la DB real:
```bash
cd finance-dashboard-api-python
alembic upgrade head
```
Crea la tabla `belvo_connections`.

## 4. Webhook en dashboard de Belvo
- Registrar URL: `https://tu-backend.onrender.com/api/belvo/webhook`
- Configurar el mismo valor de `BELVO_WEBHOOK_SECRET` ahí (lo manda como header `Belvo-Webhook-Secret`)
- ⚠️ **Pendiente de confirmar**: no se consultó documentación en vivo de Belvo en esta sesión. Verificar en docs.belvo.com si el mecanismo real de verificación de webhooks es un secreto simple en header (como se implementó) o una firma HMAC sobre el payload. Si es HMAC, hay que ajustar `belvo_routes.py::handle_webhook`.

## 5. Probar el flujo completo
- Backend + frontend corriendo localmente (o en el ambiente donde se probó)
- Ir a `/integrations` → botón "Conectar banco o billetera"
- Usar una institución de prueba del sandbox de Belvo (ofrecen bancos fake con credenciales fijas en su doc, ej. "Erebor")
- Verificar que aparezcan transacciones importadas y la cuenta nueva en el dashboard

## 6. Producción (después de validar en sandbox)
- Sacar credenciales `production` en Belvo (tiene costo por conexión activa — confirmar pricing actual)
- Cambiar `BELVO_ENV=production` en el `.env` de producción
- Registrar el webhook de producción con su propia URL y secreto

## Referencia técnica
- Plan original: `.claude/PRPs/plans/completed/belvo-integration.plan.md`
- Reporte de implementación: `.claude/PRPs/reports/belvo-integration-report.md`
- Módulo: `finance-dashboard-api-python/app/modules/belvo/`
- Tests: `finance-dashboard-api-python/tests/test_belvo.py`
