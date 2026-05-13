# Roadmap Técnico
## Qué construimos, en qué orden, y por qué

**Stack real de este proyecto:**
- Frontend: React 19 + Vite + React Router DOM v7 → Deploy Vercel (puerto 5173)
- Backend: FastAPI + Python 3.9+ + SQLAlchemy 2.0 → Deploy Render (puerto 8000)
- DB: PostgreSQL via Supabase (conexión directa, no Supabase client JS)
- Auth: JWT + Google OAuth (`python-jose`, `passlib`, `google-auth`)
- Scheduler: APScheduler (ya en producción, corre cada 1h)
- Frontend state: AuthContext + FinanceContext (React Context)

Todo código nuevo debe seguir este stack. No usar Supabase JS client, no usar Next.js, no usar TypeScript (el front es JSX).

---

## Fase 0: Deuda Técnica (Semana 1-2)

**Objetivo:** App funcionando correctamente en producción antes de mostrarla a nadie.

**Entry criteria:** Estado actual (bugs conocidos activos)
**Exit criteria:** demo@demo.com funciona perfecto en mobile + desktop, sin bugs bloqueantes

### Tareas

| Tarea | Archivo principal | Prioridad |
|---|---|---|
| Fix dark mode toggle | `AuthContext.jsx` o `FinanceContext.jsx` + `index.html` | Crítica |
| Fix Savings "Depositar" | `finance-dashboard-api-python/app/modules/savings/` + frontend | Crítica |
| Fix Google OAuth origin_mismatch | Google Console + `.env` Render/Vercel | Crítica |
| Responsividad sidebar + tarjetas | Componentes en `features/common/Layout` | Alta |

Ver HITOS_CLAUDE.md → HITO 1 para tareas detalladas.

---

## Fase 1: Analytics + Onboarding (Semana 2-4)

**Objetivo:** Saber exactamente qué hacen los usuarios y reducir fricción del primer uso.

**Entry criteria:** Fase 0 completa (cero bugs bloqueantes)
**Exit criteria:** PostHog mostrando funnel real con 100+ usuarios externos, onboarding < 3 minutos

### PostHog (no analytics custom)

PostHog free tier soporta 1M eventos/mes. Setup en 15 minutos.
No construir tablas custom para analytics — es tiempo perdido para un MVP.

```bash
# En finance-dashboard-mvp/
npm install posthog-js
```

Eventos a trackear desde el frontend (React):
- `user_signed_up`
- `user_logged_in`
- `expense_added` (con properties: category, amount_range)
- `onboarding_step_viewed` (step: 1, 2, 3)
- `page_viewed` (page: dashboard, transactions, savings, budget)
- `savings_deposit_attempted`
- `mp_connect_clicked` (cuando implementemos MP)

### Onboarding simplificado

Flow para usuarios nuevos:
```
Registro exitoso
    ↓
Paso 1: "Bienvenido — FinanzApp trackea tus gastos automáticamente"
    ↓
Paso 2: "Agregá tu primer gasto" (form ultra simple)
    ↓
Paso 3: "¡Listo! Volvé mañana para ver tus insights"
    → Redirect a dashboard
```

El form de primer gasto debe tener 3 campos máximo: monto, categoría (botones emoji), descripción opcional.

Ver HITOS_CLAUDE.md → HITO 2 y HITO 3.

---

## Fase 2: MercadoPago Integration (Semana 4-8)

**Objetivo:** Auto-importar transacciones de MP. Esto es el diferenciador central.

**Entry criteria:** 100+ usuarios externos testeando, 40%+ week-1 retention validada
**Exit criteria:** Usuario puede conectar MP y ver sus transacciones importadas y categorizadas

### Arquitectura de la integración

```
Usuario autoriza OAuth en MP
    ↓
Backend FastAPI recibe access_token de MP
    ↓
GET /v1/payments/search?access_token=... (API MP)
    ↓
Parse transacciones → auto-categorización con reglas
    ↓
Insert en tabla transactions (ya existe en DB)
    ↓
APScheduler sync cada 24h automático
```

### Endpoints nuevos en FastAPI

```
POST /api/mercadopago/connect        → Inicia OAuth flow
GET  /api/mercadopago/callback       → Recibe code, intercambia por token
POST /api/mercadopago/sync           → Sync manual
GET  /api/mercadopago/status         → ¿Está conectado?
```

El módulo `app/modules/mercadopago/mp_routes.py` ya existe — hay que expandirlo.

### Reglas de auto-categorización (v1 — heurísticas simples)

| Keyword en descripción MP | Categoría |
|---|---|
| "RAPPI", "PEDIDOSYA", "MCDONALD" | Comida |
| "YPF", "SHELL", "AXION", "SUBE" | Transporte |
| "NETFLIX", "SPOTIFY", "STEAM" | Entretenimiento |
| "FARMACITY", "FARMACIA" | Salud |
| "MERCADOLIBRE" | Compras |
| Default | Otros |

En Fase 3 esto se reemplaza con clasificación por Claude API.

Ver HITOS_CLAUDE.md → HITO 4.

---

## Fase 3: AI Features (Semana 8-12)

**Objetivo:** Hacer la app inteligente — insights accionables y captura por voz.

**Entry criteria:** MP integration funcionando, 30-day retention > 20%
**Exit criteria:** AI insights activos para todos los usuarios premium, voz funcionando

### 3.1 AI Insights semanales

Usar Claude API (claude-haiku-4-5 para costo) para generar insights personalizados:

```python
# En backend — task recurrente via APScheduler
prompt = f"""
Analizá estos gastos del usuario de la última semana:
{gastos_json}

Generá 3 insights concisos y accionables en español argentino.
Contexto: inflación mensual ~5%, usuario argentino.
Formato: lista de 3 frases cortas, cada una con una acción concreta.
"""
```

Guardar en tabla `ai_insights` con timestamp, mostrar en dashboard.

### 3.2 Captura por voz

```
Usuario toca botón micrófono
    ↓
Graba audio en el browser (MediaRecorder API)
    ↓
POST /api/voice/parse (audio blob)
    ↓
Backend: Whisper API → transcripción
    ↓
Claude API → extraer { monto, categoría, descripción }
    ↓
Retorna al frontend para confirmación
    ↓
Usuario confirma → POST /api/transactions
```

Herramientas: `openai` SDK (para Whisper) + `anthropic` SDK (para parse).

### 3.3 Categorización automática con IA (replace reglas heurísticas)

Usar Claude Haiku para categorizar descripción de transacciones MP.
Input: "PEDIDOSYA*BURGUER 1234"
Output: { categoria: "comida", confianza: 0.95 }

Ver HITOS_CLAUDE.md → HITO 5 y HITO 6.

---

## Fase 4: Monetización (Semana 10-14)

**Objetivo:** Que alguien pague.

**Entry criteria:** 500+ MAU, 20%+ 30-day retention, usuarios pidiendo activamente features premium
**Exit criteria:** Primer usuario paga. $300+ MRR.

### Premium gates

Features a gatear:
- Conexión MercadoPago (solo premium)
- Historial > 3 meses (solo premium)
- AI insights semanales (solo premium)
- Captura por voz (solo premium)
- Export Excel/CSV (solo premium)

### Pago

Opciones en orden de prioridad:
1. **MercadoPago Subscriptions** — paradójico pero apropiado para Argentina, manejo de ARS
2. **Stripe** — mejor para cobrar en USD, más fácil de integrar para otras regiones Latam
3. **Lemon Squeezy** — alternativa simple si Stripe da problemas

Implementar como módulo independiente en FastAPI: `app/modules/billing/`.

Ver HITOS_CLAUDE.md → HITO 7.

---

## Dependencias entre fases

```
Fase 0 (bugs) ──────────────────────────────────────────────────────── BLOQUEANTE
    │
    ▼
Fase 1 (analytics + onboarding) ─────────────────────────────────────── REQUERIDA
    │
    ├─────────────────────────────────┐
    ▼                                 ▼
Fase 2 (MP integration)          Fase 3 (AI) ← pueden ir en paralelo si hay
    │                                 │         tiempo/energía
    └─────────────┬───────────────────┘
                  ▼
             Fase 4 (monetización) ── requiere Fase 2 O Fase 3 completada

```

No arrancar Fase 2 sin tener métricas reales de Fase 1.
No arrancar Fase 4 sin tener valor demostrado para cobrar.
