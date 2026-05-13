# Hitos de Claude
## Las tareas ejecutables — lo que Claude implementa con Agustín

Este documento es la fuente de verdad de QUÉ hacer ahora.
Antes de tocar cualquier código, Claude debe leer este archivo y verificar qué hito está activo.

---

## Estado de hitos

| Hito | Descripción | Estado | Gate |
|---|---|---|---|
| HITO 1 | Fix bugs críticos | **DONE** ⚠️ Google OAuth requiere config manual en Google Console | App funciona sin errores en prod |
| HITO 2 | PostHog analytics | **ACTIVO** | Funnel visible en PostHog |
| HITO 3 | Onboarding mejorado | Pendiente | < 3 min to first expense |
| HITO 4 | MercadoPago integration | Pendiente | Gate 1 (100 usuarios, 40% W1R) |
| HITO 5 | AI Insights | Pendiente | Gate 2 (30-day retention > 20%) |
| HITO 6 | Voice capture | Pendiente | Después de HITO 5 |
| HITO 7 | Monetización | Pendiente | Gate 3 ($300 MRR potencial) |

---

## HITO 1: Fix bugs críticos

**Objetivo:** App funcionando correctamente en producción. Cero bugs bloqueantes antes de mostrar a usuarios reales.

**Estado:** ACTIVO — empezar aquí.

### Bug 1: Dark mode roto

**Síntoma:** El toggle de dark mode no aplica correctamente las clases `dark:` de Tailwind.

**Archivos a investigar:**
- `finance-dashboard-mvp/src/contexts/AuthContext.jsx` — ¿persiste la preferencia?
- `finance-dashboard-mvp/src/contexts/FinanceContext.jsx` — ¿tiene lógica de tema?
- `finance-dashboard-mvp/index.html` — ¿se aplica clase `dark` al `<html>`?
- `finance-dashboard-mvp/tailwind.config.js` — verificar `darkMode: 'class'`

**Causa probable:** La clase `dark` no se aplica al elemento raíz (`<html>` o `<body>`), o el estado no persiste en localStorage.

**Fix esperado:**
```javascript
// En el toggle de dark mode — debe hacer:
document.documentElement.classList.toggle('dark', isDark)
localStorage.setItem('theme', isDark ? 'dark' : 'light')
```

**DoD:** Toggle funciona, recarga la página y mantiene la preferencia.

---

### Bug 2: Savings — botón "Depositar" no funciona

**Síntoma:** Al hacer clic en "Depositar" en una meta de ahorro, falla silenciosamente o da error.

**Archivos a investigar:**
- `finance-dashboard-mvp/src/features/savings/` — componente del botón
- `finance-dashboard-api-python/app/modules/savings/saving_routes.py` — endpoint
- `finance-dashboard-api-python/app/modules/savings/` — lógica de depósito

**Causa probable:** Falla en la conexión al endpoint para actualizar `current_amount` o al registrar la transacción asociada al depósito.

**Qué revisar en el backend:**
```bash
# Probar el endpoint directamente:
curl -X POST http://localhost:8000/api/savings/{id}/deposit \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**DoD:** Se puede depositar un monto en una meta de ahorro. El `current_amount` se actualiza. Se registra una transacción asociada si el diseño lo requiere.

---

### Bug 3: Google OAuth origin_mismatch en producción

**Síntoma:** En Vercel/Render, Google OAuth devuelve `error=origin_mismatch`.

**Causa:** Los orígenes autorizados en Google Cloud Console no incluyen el dominio de producción.

**Fix:**
1. Ir a Google Cloud Console → Credenciales → OAuth 2.0 Client
2. En "Authorized JavaScript origins" agregar:
   - `https://TU-APP.vercel.app`
   - `https://TU-DOMINIO-CUSTOM.com` (si aplica)
3. En "Authorized redirect URIs" agregar:
   - `https://TU-APP.vercel.app/auth/callback` (o la ruta que use el app)
4. Verificar que `FRONTEND_URL` en Render apunta al dominio correcto

**DoD:** Login con Google funciona desde la URL de producción de Vercel.

---

### Bug 4: Responsividad móvil básica

**Síntoma:** Sidebar y tarjetas no se adaptan en pantallas < 768px.

**Archivos a revisar:**
- `finance-dashboard-mvp/src/features/common/Layout/` — sidebar y nav
- `finance-dashboard-mvp/src/pages/DashboardPage.jsx` — grid de tarjetas

**Fix mínimo (no rediseñar, solo funcionar):**
- Sidebar: colapsar a bottom nav o hamburger en mobile
- Cards: `grid-cols-1` en mobile, `grid-cols-2` en tablet, `grid-cols-3+` en desktop
- Inputs: font-size mínimo 16px (evita zoom automático en iOS)

**DoD:** App usable en iPhone 12 (390px) sin scroll horizontal ni elementos cortados.

---

### Verificación completa del HITO 1

Antes de marcar como DONE, hacer este checklist con demo@demo.com en producción:

- [ ] Dark mode toggle funciona y persiste al recargar
- [ ] Login con Google desde la URL de Vercel funciona
- [ ] Se puede crear una meta de ahorro y depositar en ella
- [ ] Dashboard visible en móvil sin problemas
- [ ] Login con email/password funciona
- [ ] Agregar transacción funciona
- [ ] Ver presupuestos funciona

**Marcar HITO 1 como DONE en la tabla de arriba cuando todos los checks pasen.**

---

## HITO 2: PostHog Analytics

**Objetivo:** Visibilidad completa del comportamiento de usuarios. Sin esto, todas las decisiones de producto son a ciegas.

**Prerrequisito:** HITO 1 DONE

**Archivos a crear/modificar:**
- `finance-dashboard-mvp/src/main.jsx` — inicializar PostHog
- `finance-dashboard-mvp/src/contexts/AuthContext.jsx` — identificar usuario
- `finance-dashboard-mvp/src/features/transactions/` — evento expense_added
- `finance-dashboard-mvp/src/pages/` — eventos page_viewed

### Tareas

**2.1 Instalar e inicializar**
```bash
cd finance-dashboard-mvp && npm install posthog-js
```

En `main.jsx`:
```javascript
import posthog from 'posthog-js'
posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
})
```

Agregar en `.env`:
```
VITE_POSTHOG_KEY=phc_TU_KEY
```
En Vercel, agregar como environment variable.

**2.2 Identificar usuarios**

En `AuthContext.jsx`, cuando login sea exitoso:
```javascript
import posthog from 'posthog-js'
posthog.identify(user.id, { email: user.email })
```

Cuando logout:
```javascript
posthog.reset()
```

**2.3 Trackear eventos clave**

Eventos mínimos necesarios (en los componentes correspondientes):

| Evento | Dónde agregarlo | Properties |
|---|---|---|
| `expense_added` | Handler de submit de transacción | `{ category, amount_range }` |
| `savings_deposit_made` | Handler de depósito | `{ amount_range }` |
| `budget_viewed` | BudgetPage al montar | ninguna |
| `onboarding_completed` | Al terminar el onboarding (HITO 3) | ninguna |
| `page_viewed` | Cada page principal | `{ page: 'dashboard' }` |

**2.4 Configurar funnel en PostHog**

Una vez que haya datos (invitar 5 usuarios a probar):
- Funnels → New Funnel
- Steps: Login → `expense_added`
- Medir conversion rate

**DoD:**
- [ ] PostHog inicializado en producción (Vercel)
- [ ] Cuando usuario agrega un gasto, aparece en PostHog Live Events en < 5 segundos
- [ ] Funnel básico configurado
- [ ] Usuarios identificados con su ID (no anónimos)

---

## HITO 3: Onboarding mejorado

**Objetivo:** Reducir fricción del primer uso. Usuarios nuevos llegan a su primer gasto en < 3 minutos.

**Prerrequisito:** HITO 2 DONE (necesitamos medir para saber si mejoró)

**Archivos a crear/modificar:**
- `finance-dashboard-mvp/src/pages/` — nueva página de onboarding o flow
- `finance-dashboard-mvp/src/App.jsx` — agregar ruta `/onboarding`
- `finance-dashboard-mvp/src/contexts/AuthContext.jsx` — detectar si es primer login

### Tareas

**3.1 Detectar primer login**

En backend, agregar campo `onboarding_completed: bool` a tabla `users` (o en Supabase directamente).
En AuthContext, después del login: `if !user.onboarding_completed → redirect to /onboarding`.

**3.2 Crear página de onboarding (3 pasos)**

Paso 1 — Bienvenida:
```
"Hola, [nombre]. Bienvenido a tu asistente financiero."
Subtítulo: "Vamos a ver en qué gastás tu plata — en menos de 2 minutos."
[Botón: Empezar]
```

Paso 2 — Primer gasto (form ultra simple):
```
"¿En qué gastaste plata hoy?"
- Input grande: monto en pesos
- 7 botones de categoría (emoji grid): 🍔 🚗 🎮 🛍️ 💡 💊 📌
- Descripción: opcional, placeholder "ej: almuerzo en el trabajo"
[Botón: Guardar mi primer gasto]
```

Paso 3 — Confirmación:
```
"¡Perfecto! Registraste tu primer gasto."
Mostrar mini-resumen: "Gastaste $X en [categoría]"
"Volvé mañana y en una semana te mostramos tus patrones de gasto."
[Botón: Ir al dashboard]
```

**3.3 Marcar onboarding como completo**

Al terminar paso 3:
- PUT `/api/auth/onboarding-complete` en el backend
- `posthog.capture('onboarding_completed')`
- Redirect a `/`

**DoD:**
- [ ] Usuario nuevo ve el flow de onboarding en su primer login
- [ ] Usuarios que ya tienen cuenta NO ven el onboarding (solo nuevos)
- [ ] PostHog muestra el funnel login → onboarding_step_1 → onboarding_completed → expense_added
- [ ] Time to first expense < 3 minutos medido en PostHog (sessión recording)

---

## HITO 4: MercadoPago Integration

**Objetivo:** Auto-importar transacciones de MercadoPago. Este es el diferenciador central del producto.

**Prerrequisito:** Gate 1 validado — 100 usuarios externos, Week-1 retention > 40%

**¿Por qué esperar el Gate 1?**
La integración con MP es trabajo significativo (OAuth, API, categorización, sync). Si la app no retiene usuarios sin MP, agregar MP no lo va a salvar — el problema está en el onboarding o el core. MP es el acelerador, no el salvavidas.

**Archivos a crear/modificar:**
- `finance-dashboard-api-python/app/modules/mercadopago/mp_routes.py` — expandir
- `finance-dashboard-api-python/app/modules/mercadopago/mp_service.py` — lógica
- `finance-dashboard-api-python/app/database/models.py` — tabla mp_tokens
- `finance-dashboard-mvp/src/pages/IntegrationsPage.jsx` — UI de conexión

### Tareas

**4.1 Tabla para tokens de MP**

```sql
CREATE TABLE mp_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  mp_user_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Migration Alembic: `alembic revision --autogenerate -m "add mp_tokens"` → `alembic upgrade head`

**4.2 OAuth flow en FastAPI**

```python
# GET /api/mercadopago/connect
# Retorna URL de autorización de MP
# Redirect URL: https://tu-app.com/api/mercadopago/callback

# GET /api/mercadopago/callback?code=...
# Intercambia code por access_token
# Guarda en mp_tokens
# Redirect a frontend
```

Credenciales necesarias en `.env` del backend:
```
MP_CLIENT_ID=...
MP_CLIENT_SECRET=...
MP_REDIRECT_URI=https://tu-render-app.com/api/mercadopago/callback
```

**4.3 Sync de transacciones**

```python
# GET /v1/payments/search?access_token=TOKEN
# Filtrar: status=approved, date_from=últimos 30 días
# Para cada payment: crear transaction si no existe (deduplicar por MP payment_id)
# Auto-categorizar con reglas heurísticas (ver ROADMAP_TECNICO.md)
```

**4.4 Sync automático via APScheduler**

El scheduler ya existe en el backend. Agregar job:
```python
scheduler.add_job(sync_all_mp_users, 'interval', hours=24)
```

**4.5 UI en IntegrationsPage.jsx**

Estado desconectado:
```
[Logo MP] MercadoPago — Importá tus gastos automáticamente
[Botón: Conectar MercadoPago]
```

Estado conectado:
```
[Logo MP] Conectado — Último sync: hace 2 horas
X transacciones importadas este mes
[Botón: Sincronizar ahora] [Botón: Desconectar]
```

**DoD:**
- [ ] Usuario puede conectar su cuenta de MP via OAuth
- [ ] Transacciones de los últimos 30 días se importan con categoría asignada
- [ ] Sync automático cada 24h funciona
- [ ] Transacciones importadas aparecen en la página de transacciones
- [ ] Usuario puede editar la categoría de una transacción importada
- [ ] PostHog: evento `mp_connected` trackeado

---

## HITO 5: AI Insights

**Objetivo:** La app le dice al usuario cosas útiles y accionables sobre sus gastos — sin que el usuario tenga que analizarlo.

**Prerrequisito:** Gate 2 — 30-day retention > 20%. Y HITO 4 preferentemente (más datos = mejores insights).

**Herramientas:**
- `anthropic` SDK en el backend (ya debería estar, si no: `pip install anthropic`)
- Usar `claude-haiku-4-5-20251001` (más barato, suficientemente bueno para insights)
- Caching de prompts donde sea posible para reducir costos

**Archivos a crear/modificar:**
- `finance-dashboard-api-python/app/modules/analytics/analytics_routes.py` — endpoints
- `finance-dashboard-api-python/app/modules/analytics/ai_insights_service.py` — lógica
- `finance-dashboard-api-python/app/database/models.py` — tabla ai_insights
- `finance-dashboard-mvp/src/pages/DashboardPage.jsx` — mostrar insights

### Tareas

**5.1 Tabla ai_insights**

```sql
CREATE TABLE ai_insights (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  week_start DATE NOT NULL,
  insights JSONB NOT NULL,  -- [{"text": "...", "type": "warning|tip|positive"}]
  generated_at TIMESTAMP DEFAULT NOW()
);
```

**5.2 Servicio de generación de insights**

```python
import anthropic

def generate_weekly_insights(user_id: int, transactions: list) -> list:
    client = anthropic.Anthropic()
    
    transactions_summary = format_for_prompt(transactions)
    
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Analizá estos gastos de un usuario argentino de la última semana:

{transactions_summary}

Generá exactamente 3 insights en español argentino (tuteando). 
Cada insight debe ser: conciso (max 2 oraciones), accionable y específico a estos datos.
Contexto: inflación ~5% mensual en Argentina.

Formato JSON:
[
  {{"text": "...", "type": "warning|tip|positive"}},
  ...
]

Solo devolvé el JSON, sin texto extra."""
        }]
    )
    
    return json.loads(response.content[0].text)
```

**5.3 Job semanal en APScheduler**

Cada domingo a las 20:00 (cuando la gente revisa la semana):
```python
scheduler.add_job(generate_insights_for_all_users, 'cron', 
                  day_of_week='sun', hour=20)
```

**5.4 Endpoint para obtener insights**

```
GET /api/analytics/insights → Retorna los últimos insights del usuario autenticado
```

**5.5 Card de insights en Dashboard**

```
[Insights de la semana]

⚠️  Gastaste $15.000 más en delivery que la semana pasada.
💡  Tu categoría más cara fue "Comida" (42% de tus gastos).
✅  Ahorraste $8.000 vs tu promedio mensual en transporte.
```

**DoD:**
- [ ] Insights se generan semanalmente para usuarios activos
- [ ] Insights visibles en el dashboard
- [ ] Lenguaje en español argentino correcto
- [ ] Costo de API < $0.01 por usuario por semana (haiku es muy barato)
- [ ] PostHog: evento `insights_viewed` trackeado

---

## HITO 6: Captura por voz

**Objetivo:** El usuario puede registrar un gasto diciendo una frase. Máxima reducción de fricción.

**Prerrequisito:** HITO 5 DONE. Tener claves de OpenAI API (Whisper) y Anthropic API.

**Archivos a crear/modificar:**
- `finance-dashboard-mvp/src/features/transactions/VoiceCapture.jsx` — componente
- `finance-dashboard-api-python/app/modules/transactions/transaction_routes.py` — endpoint de voz

### Tareas

**6.1 Componente de grabación en frontend**

```javascript
// VoiceCapture.jsx
// Botón micrófono → MediaRecorder API → blob de audio
// Enviar a POST /api/transactions/voice
// Mostrar loading → mostrar resultado parseado
// Usuario confirma → POST /api/transactions (normal)
```

**6.2 Endpoint de parsing en backend**

```python
@router.post("/transactions/voice")
async def parse_voice_expense(audio: UploadFile, current_user: User = Depends(get_current_user)):
    # 1. Transcribir con Whisper
    import openai
    client = openai.OpenAI()
    transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio.file,
        language="es"
    )
    
    # 2. Parsear con Claude
    import anthropic
    claude = anthropic.Anthropic()
    response = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": f"""Del siguiente texto en español argentino, extraé:
- monto (número)
- categoría (una de: comida, transporte, entretenimiento, compras, servicios, salud, otro)
- descripción (texto corto)

Texto: "{transcription.text}"

Responder solo JSON: {{"monto": 0, "categoria": "", "descripcion": ""}}"""
        }]
    )
    
    return json.loads(response.content[0].text)
```

**6.3 Flow en el frontend**

```
[🎤 Botón] → Grabando... → Procesando... 
→ Card: "Escuché: $800 en comida — almuerzo"
→ [Confirmar] [Editar] [Cancelar]
→ Si Confirmar → guardar transacción
```

**DoD:**
- [ ] "Gasté ochocientos en el almuerzo" → gasto de $800 en categoría comida guardado
- [ ] Usuario puede editar antes de confirmar
- [ ] Error handling: audio no reconocido, monto no detectado
- [ ] Funciona en mobile (iOS Safari + Chrome Android)
- [ ] PostHog: evento `voice_capture_used` trackeado

---

## HITO 7: Monetización

**Objetivo:** Primer usuario paga. Validar willingness to pay con dinero real.

**Prerrequisito:** Gate 3 — 500+ MAU activos, evidencia de usuarios queriendo features premium.

**No implementar antes del prerrequisito.** Un paywall prematuro mata la adopción.

### Tareas

**7.1 Definir tier gates en el backend**

```python
# En cada endpoint de feature premium:
if not current_user.is_premium:
    raise HTTPException(status_code=402, detail="Esta feature requiere Premium")
```

Features a gatear (mínimo viable):
- `/api/mercadopago/connect` → premium
- `/api/analytics/insights` → premium
- `/api/transactions/voice` → premium

**7.2 Integración de pagos**

Opción recomendada: **MercadoPago Subscriptions** (para Argentina/Latam)
- Crear plan de suscripción en MP: $3 USD/mes indexado o precio en ARS
- Endpoint: `POST /api/billing/subscribe`
- Webhook: `POST /api/billing/webhook` → actualizar `user.is_premium`

Alternativa: **Stripe** (para cobrar en USD, mejor para expandir Latam)

**7.3 UI de upgrade**

- Banner no intrusivo en features premium: "Esta feature es Premium — desde $3/mes"
- Página `/settings` o `/billing` con detalle de plan y botón de upgrade
- Email automático a usuarios activos > 14 días (con SendGrid free tier)

**DoD:**
- [ ] Al menos 1 usuario pagó y tiene acceso premium
- [ ] Webhook de MP/Stripe actualiza correctamente el estado premium
- [ ] Usuario premium ve todas las features desbloqueadas
- [ ] Usuario free ve CTAs claros hacia premium sin bloquear el uso básico
- [ ] MRR visible (aunque sea $3)

---

## Notas para Claude

- Si el usuario pide una feature que no está en el hito activo → preguntá si querés re-priorizar o agregarlo al roadmap primero
- Si encontrás un bug que no está listado y es crítico → arreglarlo primero, luego documentar
- Siempre verificar con demo@demo.com en producción antes de marcar cualquier hito como DONE
- Los gates de decisión son reales — no avanzar al siguiente hito si no se cumplieron
- Actualizar la tabla de estado al inicio de este documento cuando completes un hito
