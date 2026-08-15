# App Financiera MVP — Contexto para Claude Code

## Visión General

Dashboard financiero full-stack (MVP) para gestión de finanzas personales: ingresos, gastos, presupuestos y metas de ahorro. Prioridad en UI premium y experiencia de usuario moderna.

## Estructura del Repositorio

```
App-Financiera-MVP/
├── finance-dashboard-mvp/          # Frontend (React + Vite)
└── finance-dashboard-api-python/   # Backend ACTIVO (FastAPI + Python)
```

## Stack Tecnológico

### Frontend (`finance-dashboard-mvp/`)
- React 19, Vite, React Router DOM v7
- Tailwind CSS v4 (preferir CSS vanilla para customizaciones, evitar utilidades sin diseño)
- Recharts (gráficos), Lucide React (iconos), Framer Motion (animaciones)
- Sonner (toasts), @react-oauth/google (Google OAuth)
- Deploy: **Vercel** | Dev: `npm run dev` → puerto 5173

### Backend (`finance-dashboard-api-python/`)
- Python 3.9+, FastAPI, uvicorn
- PostgreSQL en Supabase vía SQLAlchemy 2.0 + Alembic
- JWT + Google OAuth (`python-jose`, `passlib`, `google-auth`)
- APScheduler (tareas recurrentes en background, cada 1h)
- Deploy: **Render** | Dev: activar venv → `uvicorn main:app --reload` → puerto 8000

## Arquitectura del Backend

Todos los routers se montan bajo el prefijo `/api`:

| Módulo | Archivo |
|---|---|
| Auth | `app/modules/auth/auth_routes.py` |
| Accounts | `app/modules/accounts/account_routes.py` |
| Categories | `app/modules/categories/category_routes.py` |
| Transactions | `app/modules/transactions/transaction_routes.py` |
| Budgets | `app/modules/budgets/budget_routes.py` |
| Savings | `app/modules/savings/saving_routes.py` |
| Recurring | `app/modules/recurring/recurring_routes.py` |
| Analytics | `app/modules/analytics/analytics_routes.py` |
| MercadoPago | `app/modules/mercadopago/mp_routes.py` |
| Belvo (open banking) | `app/modules/belvo/belvo_routes.py` |
| Chat (AI) | `app/modules/chat/chat_routes.py` |
| Events (gastos compartidos) | `app/modules/events/event_routes.py` |
| Streaks (gamificación) | `app/modules/streaks/streak_routes.py` |
| Benchmark (comparativa anónima) | `app/modules/benchmark/benchmark_routes.py` |
| Waitlist (captura de emails) | `app/modules/waitlist/waitlist_routes.py` |
| Widgets (embed público) | `app/modules/widgets/widget_routes.py` |
| Reports (export/impuestos) | `app/modules/reports/report_routes.py` |
| Notifications | `app/modules/notifications/` |
| Aki Name (naming AI) | `app/modules/aki_name/aki_name_routes.py` |

Schemas centralizados en `app/schemas.py`. Modelos de DB en `app/database/models.py`.

**Convención de módulos** (mirar `app/modules/streaks/` como referencia):
- `logic.py` → funciones puras, sin DB. Es lo que se testea unitariamente.
- `processor.py` → efectos sobre la DB.
- `{modulo}_routes.py` → router FastAPI, thin.
- Registrar el router en `main.py` con `prefix="/api"`.
- Endpoints públicos (sin auth) usan `@limiter.limit(...)` de `app/core/rate_limit.py` y reciben `request: Request`.

## Testing (Backend)

Suite pytest en `finance-dashboard-api-python/tests/`. Fixtures compartidas en `conftest.py`: `db_session`, `user`, `client`.
Patrón: testear la lógica pura de `logic.py` por separado de los endpoints. Ejemplo de referencia: `tests/test_streaks.py`.

```bash
cd finance-dashboard-api-python && pytest
```

## Arquitectura del Frontend

```
src/
├── App.jsx                     # Enrutamiento principal
├── contexts/
│   ├── AuthContext.jsx         # Estado de autenticación global
│   ├── FinanceContext.jsx      # Estado financiero global
│   └── LanguageContext.jsx     # Internacionalización
├── features/                   # Componentes por dominio
│   ├── accounts/, budgets/, categories/, dashboard/
│   ├── recurring/, savings/, transactions/
│   └── common/ (Layout, Modal, Card, ErrorBoundary)
├── pages/                      # Páginas (una por ruta)
│   ├── DashboardPage.jsx, TransactionsPage.jsx
│   ├── BudgetPage.jsx, SavingsPage.jsx, RecurringPage.jsx
│   ├── CardsPage.jsx, IntegrationsPage.jsx
│   ├── AcademyPage.jsx, HelpPage.jsx, SettingsPage.jsx
│   ├── LoginPage.jsx, RegisterPage.jsx
│   ├── LandingPage.jsx          # Landing pública (copy de marketing + PUV + CTA waitlist)
│   ├── OnboardingPage.jsx, ChatPage.jsx
│   ├── EventsPage.jsx, EventDetailPage.jsx
│   ├── ForgotPasswordPage.jsx, ResetPasswordPage.jsx
│   ├── PrivacyPage.jsx, TermsPage.jsx
│   └── WidgetEmbedPage.jsx      # Render público de widgets embebidos
└── hooks/, lib/, services/, utils/
```

Rutas públicas: `/login`, `/register`, `/` (landing), `/privacy`, `/terms`, `/forgot-password`, `/reset-password`, embed de widgets  
Rutas privadas (protegidas por `PrivateLayout`): `/dashboard`, `/transactions`, `/budget`, `/savings`, `/recurring`, `/cards`, `/integrations`, `/academy`, `/settings`, `/help`, `/events`, `/chat`

## Analytics y Growth

- **PostHog** vía `src/services/analytics.js` — wrapper con eventos tipados (objeto `analytics`). Si `VITE_POSTHOG_KEY` no está seteada, todos los métodos son no-ops silenciosos.
- Al agregar un evento nuevo: definirlo como método tipado en el objeto `analytics`, nunca llamar `posthog.capture()` suelto desde un componente.
- Nunca enviar montos exactos — usar el helper `amountRange()`.
- **Sentry** configurado en `src/services/sentry.js`.
- Consentimiento de tracking: `VITE_ANALYTICS_CONSENT_REQUIRED` (default `false`, opt-in implícito para AR; poner `true` para UE).

## Estrategia de Negocio

Documentos de referencia en `docs/` — leerlos antes de tomar decisiones de producto, pricing o marketing:
- `docs/estrategia-mvp-marketing-metas.md` — CME, metas de tracción, VUP, pricing, canales de adquisición.
- `docs/ebook-emprendedor-resumen.md` — frameworks de referencia (AARRR, CAC/LTV, Kano, modelos de ingresos).

## Variables de Entorno

**Backend (`.env`):** `DATABASE_URL`, `JWT_SECRET`, `PORT` (8000), `FRONTEND_URL`  
**Frontend (`.env`):** `VITE_API_URL` → `http://localhost:8000/api` en local

## Usuario de Prueba

- Email: `demo@demo.com` | Password: `demo123`
- Contiene datos precargados: cuentas, presupuestos, ingresos, metas

## Comandos de Inicio

```bash
# Frontend
cd finance-dashboard-mvp && npm run dev

# Backend
cd finance-dashboard-api-python
# Windows: .\venv\Scripts\activate
# Unix: source venv/bin/activate
uvicorn main:app --reload
```

## Bugs Conocidos (a resolver)

1. ~~**Dark mode roto**~~ — **RESUELTO** (2026-05-24)
2. ~~**Savings — botón "Depositar" no funciona**~~ — **RESUELTO** (2026-05-24)
3. **Google OAuth en producción** — Error `origin_mismatch` en Vercel/Render. Verificar orígenes autorizados en Google Console. ⚠️ aún pendiente
4. ~~**Responsividad móvil**~~ — **RESUELTO** (2026-05-24, iOS zoom + grid + safe-area)

## Reglas de Diseño

- **UI Premium**: sombras, degradados, bordes sutiles. Fuentes: Inter, Outfit.
- **Glassmorphism** para cards y overlays.
- Evitar colores genéricos — siempre usar la paleta definida del proyecto.
- Al modificar endpoints en Python, actualizar inmediatamente el cliente Axios/Fetch en React.

## Notas Importantes

- Los CORS del backend leen `FRONTEND_URL` del `.env` y siempre incluyen `localhost:5173`.
- El scheduler de APScheduler procesa transacciones recurrentes cada hora automáticamente.
- Al agregar migraciones de DB usar Alembic: `alembic revision --autogenerate -m "descripcion"` → `alembic upgrade head`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## MCP Tools: token-savior (Symbol Navigation + Persistent Memory)

**MANDATORY: Use token-savior FIRST for codebase navigation.** Indexes every symbol (functions, classes, imports, call graph) and maintains persistent memory across sessions (SQLite WAL + FTS5 + vector embeddings). Reduces injected characters by 97% vs raw file reads.

### Tools & Patterns

| Tool | Use when |
| ------ | ---------- |
| `find_symbol` | Locate function/class by name across both frontend + backend |
| `get_function_source` | Retrieve function source + call context (who calls it, what it calls) |
| `get_class_source` | Retrieve class definition + method list |
| `get_dependencies` | Map module/file dependencies (imports, exports) |
| `query_memory` | Search session history (bugfixes, decisions, patterns from prior sessions) |

### Workflow

1. **Symbol first**: `find_symbol("functionName")` before reading files
2. **Context second**: `get_function_source()` returns source + callers/callees
3. **Memory search**: Start session with `query_memory("prior decisions")` to load prior context
4. **Fall back**: Use graph tools (`detect_changes`, `get_review_context`) only when symbol tools don't cover your need

Token Savior auto-compacts session decisions, bugfixes, and architectural choices into searchable memory. Each session loads prior sessions' deltas at startup — no re-reading old conversations.
