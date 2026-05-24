# Vuelto — Product Roadmap

> Backlog de ideas de producto identificadas en la auditoría del 2026-05-22.
> Numeración mantiene la del audit original (#51-65) para trazabilidad.
> Última actualización: 2026-05-23 (post-engagement).

---

## ✅ Implementado (commits `64d0407` y `4bb612a`)

### #54 — Predicción de fin de mes ✅
- `projectMonthEndSpend()`, `calculateMonthlyBudgetTotal()`,
  `calculateHistoricalMonthlyExpenseAverage()` en `src/utils/calculations.js`.
- Componente `ProjectionCard.jsx` en el Dashboard — vira a tono naranja si la
  proyección supera el budget mensual total, sub-line con delta vs. promedio
  histórico, sólo se muestra con filtro "Este mes".
- Evento PostHog `projection_viewed` con `{exceeds_budget, days_elapsed}`.
- Tests: 6 casos vitest cubriendo proyección, budget total, promedio histórico.

### #61 — Detección de suscripciones recurrentes ✅
- Backend: `recurring_suggestions.py` (lógica pura testeable). Endpoints
  `GET /api/recurring/suggestions` y `POST /api/recurring/from-suggestion`.
  Excluye descripciones que ya tienen un recurring activo. Al convertir,
  linkea las TX históricas (`recurring_id`) para que dejen de aparecer.
- Frontend: `SubscriptionSuggestionsBanner.jsx` en `/recurring` con modal de
  revisión (checkbox por sugerencia, default todas tildadas, salteo automático
  si falta categoría/cuenta detectada).
- Eventos PostHog: `subscriptions_suggestion_viewed`, `_engaged`, `_converted`.
- Tests: 9 casos pytest (normalización, mínimos, intervalos, montos,
  ya-linkeadas, ingresos, agrupamiento, tolerancia).
- Seed: `seed_subscriptions_test_user.py` genera `subs-test@vuelto.app /
  Subs2025!` con 5 patrones detectables + ruido.

### #51 — Aki proactivo (notificaciones inteligentes) ✅
- `app/modules/notifications/triggers.py` con detectores puros:
  - `detect_budget_at_risk` — >70% gastado en <60% del mes.
  - `detect_unusual_spend` — gasto >2x el promedio de 90 días de esa categoría.
  - `detect_goal_at_risk` — deadline <30 días y progreso <60%.
- `notifications/processor.py` con `run_daily_smart_alerts()` que arma
  candidatos por usuario y emite email por cada uno. Idempotente vía
  tabla `notifications` con `(user_id, dedup_key)` único.
- Scheduler APScheduler: cron `hour=12 UTC` (9am ART) diario.
- Toggle por user: `User.email_smart_alerts` (default True).
- Templates HTML inline en `app/core/email_templates.py`.
- Tests: 8 casos pytest cubriendo cada trigger.
- **Pendiente**: detector "ingreso recibido sin asignar a metas/budgets" —
  spec lo lista pero no quedó implementado en esta tanda.

### #52 — Snapshot semanal por email ✅
- `notifications/processor.py::run_weekly_snapshots()` arma:
  - Top 3 categorías de gasto de la semana.
  - Delta % vs. semana anterior.
  - Slot para metas que avanzaron (vacío hasta que trackeemos depósitos por
    semana — TODO menor).
- Scheduler APScheduler: cron `day_of_week='sun' hour=13 UTC` (10am ART).
- Toggle por user: `User.email_weekly_snapshot` (default True).
- Template HTML responsivo en `email_templates.py::render_weekly_snapshot`.

### #55 — Categorización automática con embeddings ✅
- `app/modules/transactions/embeddings.py`:
  - Cliente para Gemini `text-embedding-004`.
  - Tabla `transaction_embeddings` como cache (no recalcula).
  - Similitud coseno en Python contra TX históricas categorizadas (top-1
    match con confianza ≥0.70 para sugerencia, ≥0.85 confianza alta).
- Endpoints `POST /api/transactions/auto-categorize` y `/accept-categorizations`.
- Frontend: botón "Sugerencias de Aki" en TransactionsPage → modal con
  checkboxes (default tildadas) y monto de confianza por sugerencia.

### #56 — Goals con auto-deposit por regla ✅
- Tabla `goal_rules` (porcentaje O monto fijo — exclusivos). Endpoints CRUD
  anidados bajo `/savings-goals/{id}/rules`.
- Hook en `transaction_routes.create_transaction` que llama
  `apply_auto_deposit_rules` — solo dispara para ingresos (amount > 0),
  busca reglas activas que matcheen la categoría, calcula depósito,
  suma a `goal.current_amount`.
- Frontend: ícono ⚡ en cada `SavingGoalCard` → `GoalRulesModal` con form
  (categoría trigger + modo % o fijo), toggle activar/pausar, eliminar.
- Tests: 4 casos pytest (% match, monto fijo, ignora gastos, inactivas).

### Extras del 2026-05-23
- **TransactionsPage**: filtro Ingresos/Egresos/Todos (pill toggle) +
  quickfilter Este mes / 7 días / Año / Todo (mismo patrón del Dashboard).
- **CORS dev**: backend acepta 5173/5174/5175 por default — soluciona el
  `Network Error` cuando Vite salta de puerto.
- **Email infra**: adapter `app/core/email.py` con Resend, fallback log-only
  para dev sin `RESEND_API_KEY`.
- **Migración Alembic** `f4a5b6c7d8e9_diferenciadores_reales` aplicada.

---

## 💡 Engagement / producto — **shipeado 2026-05-23**

Bloque completo movido a producción tras esta tanda (5 features, 45 tests
nuevos). Migración `a7b8c9d0e1f2_engagement_layer` aplicada.

### #62 — Streaks "Día sin gasto" ✅
- Lógica pura en `app/modules/streaks/logic.py` (StreakState + evaluate_day).
  Reglas: gastos manuales rompen la racha; suscripciones recurrentes e
  ingresos no la rompen.
- Tabla `user_streaks` (current/longest/last_zero_day/last_evaluated_on).
- Endpoint `GET /api/streaks/me` con catch-up greedy de hasta 7 días.
- Job APScheduler `nightly_streaks` cron 9 UTC (6am ART).
- Frontend: `StreakPill.jsx` en el sidebar, con badges 🌱 7d / 🌳 30d /
  🏆 90d y contador de "faltan X para el próximo".
- Tests: 10 casos (zero-day, recurring ignored, badges, processor, endpoint).

### #59 — Benchmark anónimo ✅
- Tabla `benchmark_aggregates` (age_range × geo_region × category, period
  monthly). `MIN_BUCKET_SIZE=50` para k-anonymity.
- Columnas nuevas en `users`: `benchmark_opt_in`, `age_range`, `geo_region`.
- Endpoints: `GET/PUT /api/benchmark/prefs`, `GET /api/benchmark/me`
  (devuelve hasta 6 comparaciones con percentiles 25/50/75 + posición
  above/below/average).
- Job APScheduler `daily_benchmark` 10:30 UTC.
- Frontend: `BenchmarkCard.jsx` en el dashboard — si no opt-in, form de
  activación pidiendo age/geo; si opt-in, lista de categorías comparadas.
- Tests: 9 casos (percentiles, k-anonymity, demo invalida, endpoints).

### #60 — Modo envelopes (Dave Ramsey) ✅
- Columna `users.budget_mode` con valores `'standard'` (default) | `'envelopes'`.
- Lógica en `app/modules/budgets/envelopes.py` (pura, testeable).
- Endpoints nuevos: `GET/PUT /api/budgets/mode` y `GET /api/budgets/envelopes`
  (estado de cada sobre del mes).
- Hook en `create_transaction`: si el user está en `envelopes` y el monto
  excede el remanente del mes para esa categoría, retorna **409 con
  `code: envelope_empty`** y el frontend muestra el mensaje del backend
  (parser ya soporta `detail.message`).
- Frontend: `EnvelopesPanel.jsx` en `/budget` con toggle de modo + grid de
  chips por sobre (vacíos en rojo, llenos en violeta).
- Tests: 8 casos (status, charge ok/bloqueado, ingreso ignorado, endpoint 409,
  toggle mode).

### #63 — Reporte AFIP (PDF + Excel) ✅
- Columna nueva `categories.tax_deductible` (default false).
- `app/modules/reports/tax_report.py`:
  - `collect_deductible_transactions` filtra solo categorías marcadas.
  - `render_pdf_summary` con reportlab (resumen agrupado por categoría +
    total + nota legal).
  - `render_excel_detail` con openpyxl (columnas Fecha/Descripción/Categoría/
    Total + CUIT/Neto/IVA 21%/Otros vacías para el contador).
- Endpoints: `GET /api/reports/deductible-categories`, `POST
  /api/reports/tax-deductible` (devuelve Response con `Content-Disposition`).
- Frontend: `TaxReportSection.jsx` en Settings — checkbox por categoría de
  gasto + selector fecha + formato PDF/Excel + descarga automática.
- Evento PostHog `tax_report_generated` con `{format, tx_count}`.
- Tests: 9 casos (collect, filter, PDF magic bytes, Excel magic bytes,
  endpoints, validación de rango).

### #64 — Dashboard widget embed ✅
- Tabla `public_widgets` (token URL-safe 24 bytes, rotable, expiración opt).
- Tipos: `balance` (total de cuentas), `goal` (progreso meta específica),
  `month_spend` (gasto del mes actual).
- Endpoints autenticados: `GET/POST /api/widgets`, `DELETE /api/widgets/{id}`,
  `POST /api/widgets/{id}/rotate`.
- Endpoint público: `GET /api/widgets/public/{token}` — sin auth, expone solo
  agregados (nunca tx individuales).
- Ruta frontend pública `/widget/:token` (sin sidebar, sin layout) renderiza
  3 mockups según tipo.
- Frontend: `WidgetsSection.jsx` en Settings — crear/listar/rotar/eliminar
  + snippet copiable `<iframe src="…">`.
- Tests: 9 casos (create, ownership, públicos por tipo, rotación, expiración).

---

## ✅ Bloque anterior

---

## 🚀 Quick wins — pendientes

### #53 — Toggle "ajustar por inflación" 🟡

**Por qué quedó pendiente**: requiere pensar cómo se actualiza el dataset de
IPC (manual vs. job vs. API externa) y decidir el comportamiento off-line.

**Pitch corto:** NINGUNA app de finanzas argentina hace esto. Mata a la
competencia.

**UX preview:**
> Switch global en el dashboard:
> `[ Pesos nominales ] [ Pesos constantes (mayo 2026) ]`
>
> Al activarlo, todos los gráficos históricos se reexpresan. Ese gasto de $5k
> de hace un año aparece como "$12k en pesos de hoy".

**Implementación pendiente:**
- Backend ya tiene `inflation-context` con IPC histórico (`/api/analytics/inflation-context`).
- Endpoint `GET /api/analytics/ipc-series?months=12` que devuelva el array
  de factores.
- Frontend: utility `adjustForInflation(amount, txDate, factorSeries, baseDate)`.
- Context global `InflationModeContext` que propaga el flag a todos los charts.
- Persistir preferencia en localStorage.
- **Decisión abierta**: ¿de dónde sale el IPC? BCRA scrape mensual / input
  manual del admin / API externa (datos.gob.ar). Hablar antes de implementar.

**Esfuerzo:** ~60 líneas + propagar el flag por componentes.

**Métrica de éxito:** % de usuarios AR que activan el toggle al menos una vez.

---

## 🏗️ Big bets — alto esfuerzo, transformacionales (2+ semanas)

### #58 — Splitwise lite (gastos compartidos)

**Pitch corto:** vertical entera. La gente NO abandona Splitwise hoy — vos
podés ser su reemplazo + budget + savings + AI.

**UX preview:**
> *Pareja: Agus + Sole*
> *Esta semana:*
> *- Agus pagó $25k de Supermercado + $8k de Luz = $33k*
> *- Sole pagó $40k de Alquiler*
> *Sole le debe a Agus $1.5k para quedar parejos.*
> *[Settle up ahora]*

**Implementación:**
- Modelo: `Partnership` (id, name, type='couple'|'roommates'|'group')
- `PartnershipMember` (partnership_id, user_id, share_percentage)
- `Transaction.shared_with` (relación many-to-many con Partnership)
- Invitaciones vía email con magic link
- Settle-up: genera transacciones internas que balancean

**Esfuerzo:** ~2 semanas (modelo + invitaciones + settle logic + UI).

---

### #57 — Conectores adicionales

**Prioridad sugerida:**
1. **Naranja X** — tienen API pública decente
2. **Brubank** — fintech, OAuth posible
3. **Banco Galicia / Santander** — más resistencia, posiblemente scraping con permiso

**Implementación por banco:**
- Replica del patrón Mercado Pago (`mp_service.py` + `mp_routes.py`)
- Conector como módulo independiente bajo `app/modules/integrations/{banco}/`

**Esfuerzo:** ~1 semana por conector.

---

### #65 — Modo "viaje" multi-moneda

**UX preview:**
> *Settings: "Activar modo viaje" → Destino: Brasil, moneda: BRL*
> *Mientras esté activo, todas las tx se guardan en BRL y se convierten a ARS al tipo de cambio del día.*
> *Al volver: resumen "Tu viaje a Brasil costó R$8,500 (ARS 1.8M). Categorías: Comida 35%, Hotel 28%, Tours 22%, Otros 15%."*

**Implementación:**
- `User.travel_mode` (flag) + `User.travel_currency`
- `Transaction.original_amount` + `Transaction.original_currency` (nuevos campos)
- API de tipo de cambio (BCRA o exchangerate.host)
- Resumen post-viaje generado al desactivar el modo
- Etiqueta visual "✈️ Viaje" en cada tx del período

**Esfuerzo:** ~1.5 semanas.

---

## 💡 Engagement / producto — bloque shipeado, ver sección arriba ✅

> Las cinco features de esta sección (#59, #60, #62, #63, #64) están en
> producción tras la tanda 2026-05-23. Las specs originales se mantienen
> abajo para referencia histórica.

### #59 — Análisis comparativo anonimizado

**UX preview:**
> Aki: *"Estás gastando $35k/mes en Delivery. Eso es 2.3x el promedio de usuarios de tu edad y zona."*

**Implementación:**
- Cron diario que precalcula agregados por bucket (edad × geo × categoría)
- Mínimo N=50 users por bucket para no leakear info
- Endpoint `GET /api/insights/benchmark/{category}` que devuelva percentiles
- UI: card en dashboard "Tu lugar en el ranking"

**⚠️ Privacidad:** copy claro sobre cómo se agregan los datos. Probablemente requiere opt-in.

**Esfuerzo:** ~3 días.

---

### #60 — Modo "envelopes" (Dave Ramsey)

**UX preview:**
> *"Repartiste tu sueldo de $300k en 6 sobres. Tu sobre 'Salidas' ($30k) está vacío desde el 22 — no podés cargar más gastos ahí hasta el 1 del mes."*

**Implementación:**
- Feature flag por usuario: `budget_mode = 'standard' | 'envelopes'`
- En modo envelopes, el `create_transaction` rechaza con 409 si la categoría está en sobre vacío
- UI: visualización tipo "sobres físicos" en lugar de barras de progreso

**Esfuerzo:** ~1 semana.

---

### #62 — "Día sin tarjeta" — gamificación

**UX preview:**
> Banner en dashboard: *"🔥 5 días seguidos sin gastos no esenciales"*
> Badges desbloqueables: 🌱 7 días, 🌳 30 días, 🏆 90 días
> Streak counter siempre visible

**Implementación:**
- Job nocturno que computa streaks por user
- Tabla `user_streaks` (user_id, current_streak, longest_streak, last_zero_day_at)
- "Día sin gasto" = solo transacciones recurrentes (sueldo, suscripciones), nada manual
- UI: pill animado en el sidebar + sección de badges

**Esfuerzo:** ~2 días. ROI altísimo por la poca línea.

---

### #63 — Exportación para contador (formato AFIP)

**Pitch corto:** monetizable directo. Freelancers/monotributistas pagan por esto.

**UX preview:**
> *Settings → Reportes → "Reporte para contador"*
> *Período: [Mayo 2026]*
> *Categorías deducibles: [Servicios, Honorarios, Insumos, Internet]*
> *Formato: [PDF Resumen] [Excel detallado con CUIT/IVA discriminado]*
> *[Generar y descargar]*

**Implementación:**
- En settings, el user marca qué categorías considerar deducibles
- Endpoint `POST /api/reports/tax-deductible` con filtros
- Generación de PDF con ReportLab o WeasyPrint (Python)
- Excel con openpyxl

**Esfuerzo:** ~4 días.

**Modelo de negocio:** Premium feature ($X/mes o $Y por reporte generado).

---

### #64 — Dashboard widget embed

**UX preview:**
> *User copia: `<iframe src="https://vuelto.app/widget/abc123" />`*
> *Lo pega en Notion → ve su balance / meta en vivo sin login*

**Implementación:**
- User genera un widget token desde Settings
- Tabla `public_widgets` (token, user_id, type, config_json, expires_at)
- Ruta `/widget/{token}` (sin auth) renderiza la vista
- Tipos: "balance total", "progreso meta X", "gastos del mes"
- Token rotable por seguridad

**Esfuerzo:** ~3 días.

**Por qué wow:** marketing viral gratis. Cada widget en una página pública es exposición.

---

## 🎁 Recomendaciones de combo (actualizadas)

### Combo "Monetización" — ahora más realista
- **#63** (AFIP) + **#65** (viaje) + **#53** (toggle inflación)

**Por qué**: tres features que justifican un tier Premium pago y compiten
directo con apps internacionales en el contexto AR.

### Combo "Viralización"
- **#58** (Splitwise lite) + **#64** (widget) — el detector de subs (#61) ya
  está en producción.

**Resultado:** invitaciones orgánicas, screenshots compartibles, exposición pública.

### Combo "Engagement diario"
- **#62** (streaks) + **#59** (benchmark anónimo)

**Resultado:** dos toques diarios al producto sin pedirle nada al user.

---

## 📊 Cómo medir cada uno

Cada feature lanzada necesita su evento en PostHog. Sugiero el esquema:

```
{feature}_viewed     — primera vez que el user ve el componente
{feature}_engaged    — interactuó (click, toggle, etc.)
{feature}_completed  — completó el flow (creó la regla, aceptó la sugerencia, etc.)
```

Eventos ya tracked (post 2026-05-23):
- `projection_viewed` (#54)
- `subscriptions_suggestion_{viewed,engaged,converted}` (#61)
- `goal_auto_deposit_applied` (#56)

Próximos a sumar: tracking de Aki proactivo (open de email vía pixel + click
en CTA), uso del filtro tipo en TX, modal de auto-categorización.

Eventos del bloque engagement (2026-05-23):
- `budget_mode_changed` (#60)
- `tax_report_generated` (#63)
- Streaks (#62), benchmark (#59) y widgets (#64) todavía sin eventos
  PostHog dedicados — agregar en próxima tanda cuando definamos qué
  funnel queremos medir.

---

## 🚫 Lo que dejé fuera (intencionalmente)

- **Crypto / wallets web3** — fuera del positioning AR de finanzas personales.
- **Préstamos / crédito** — requiere licencia BCRA, no escala MVP.
- **Inversiones (compra de FCI/CEDEAR)** — alcance gigante, mejor partner con un broker.
- **Cuenta bancaria propia** — fintech regulada, NO es por donde empezar.

---

## Próxima sesión: cómo arrancar

1. Aplicar la migración Alembic pendiente: `alembic upgrade head`.
2. Decidir cómo se alimenta el IPC para #53 (toggle inflación).
3. Configurar `RESEND_API_KEY` en `.env` cuando quieras probar #51/#52 con
   mails reales (sino el adapter loguea solo).
4. Elegir próximo bloque: yo sugiero el combo **#62 streaks + #59 benchmark**
   por bajo esfuerzo y altísimo engagement diario, o ir directo al
   monetizable **#63 AFIP** si querés cerrar el primer tier Premium.

**Estado actual del repo (post-engagement 2026-05-23):**
- **77/77 tests backend ✓** (45 nuevos: 10 streaks, 9 benchmark, 8 envelopes,
  9 tax_report, 9 widgets).
- 13/13 tests frontend ✓.
- Build Vite OK (1.4 MB bundle — chunking pendiente).
- Migración `a7b8c9d0e1f2_engagement_layer` aplicada.
- Quick wins #54 + #61 ✅
- Diferenciadores reales #51, #52, #55, #56 ✅
- Engagement #59, #60, #62, #63, #64 ✅
- Pendientes en quick wins: #53 (toggle inflación) — decisión abierta sobre datos IPC.
- Big bets pendientes: #58 Splitwise lite, #57 Conectores adicionales,
  #65 modo viaje.
- Sin deuda técnica nueva.
