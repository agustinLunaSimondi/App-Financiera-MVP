# App Financiera MVP — Contexto para Claude Code

## Visión General

Dashboard financiero full-stack (MVP) para gestión de finanzas personales: ingresos, gastos, presupuestos y metas de ahorro. Prioridad en UI premium y experiencia de usuario moderna.

## Estructura del Repositorio

```
App-Financiera-MVP/
├── finance-dashboard-mvp/          # Frontend (React + Vite)
├── finance-dashboard-api-python/   # Backend ACTIVO (FastAPI + Python)
└── finance-dashboard-api/          # Backend legacy (Node.js/Prisma) — ignorar
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

Schemas centralizados en `app/schemas.py`. Modelos de DB en `app/database/models.py`.

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
└── hooks/, lib/, services/, utils/
```

Rutas públicas: `/login`, `/register`  
Rutas privadas (protegidas por `PrivateLayout`): `/`, `/transactions`, `/budget`, `/savings`, `/recurring`, `/cards`, `/integrations`, `/academy`, `/settings`, `/help`

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

1. **Dark mode roto** — El toggle no aplica correctamente las clases `dark:` de Tailwind. Revisar persistencia en AuthContext/FinanceContext y aplicación de clase en el root.
2. **Savings — botón "Depositar" no funciona** — Falla la conexión al endpoint para actualizar `current_amount` o registrar la transacción asociada.
3. **Google OAuth en producción** — Error `origin_mismatch` en Vercel/Render. Verificar orígenes autorizados en Google Console.
4. **Responsividad móvil** — Sidebar y tarjetas no se adaptan 100% en pantallas pequeñas.

## Reglas de Diseño

- **UI Premium**: sombras, degradados, bordes sutiles. Fuentes: Inter, Outfit.
- **Glassmorphism** para cards y overlays.
- Evitar colores genéricos — siempre usar la paleta definida del proyecto.
- Al modificar endpoints en Python, actualizar inmediatamente el cliente Axios/Fetch en React.

## Notas Importantes

- **Backend legacy** (`finance-dashboard-api/`, Node.js): ignorar, no está en uso activo.
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
