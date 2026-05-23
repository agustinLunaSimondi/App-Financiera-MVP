# Vuelto — Product Roadmap

> Backlog de ideas de producto identificadas en la auditoría del 2026-05-22.
> Numeración mantiene la del audit original (#51-65) para trazabilidad.
> Continuamos desde acá en la próxima sesión.

---

## 🚀 Quick wins — alto impacto, bajo esfuerzo (1-3 días c/u)

### #54 — Predicción de fin de mes

**Pitch corto:** convierte el dashboard de "qué pasó" a "qué va a pasar".

**UX preview:**
> *"A día 15 ya gastaste $45k de tus $80k de presupuesto. Si seguís a este ritmo vas a cerrar el mes en $90k. Estás 12% por encima de tu promedio."*

**Cómo se ve:**
- Nuevo KPI en el Dashboard: "Proyección fin de mes"
- Alerta naranja si la proyección supera el budget total mensual
- Sub-line con comparación contra promedio histórico

**Implementación:**
- Algoritmo: `proyeccion = gasto_a_la_fecha * (dias_del_mes / dia_actual)`
- Mejora opcional: ponderar por día de la semana (los fines de semana se gasta más)
- Ubicación: `src/utils/calculations.js` + `src/features/dashboard/components/KPICard.jsx`

**Esfuerzo:** ~30 líneas frontend. Backend opcional.

**Métrica de éxito:** % de usuarios que tocan el KPI de proyección en su primera semana.

---

### #61 — Detección de suscripciones recurrentes

**Pitch corto:** la gente no sabe cuánto gasta en subs. Verlo junto = shock + retention.

**UX preview:**
> *Banner en /recurring: "Detectamos 4 gastos recurrentes no marcados:*
> *- Netflix $4.5k/mes*
> *- Spotify $2.5k/mes*
> *- Apple $1.2k/mes*
> *- GitHub $7k/mes (USD)*
> *Total: $15.2k/mes. [Convertir todas en recurrentes] [Una por una]"*

**Implementación:**
- Endpoint `GET /api/recurring/suggestions`
- Algoritmo: agrupar transacciones por `description` normalizada (lowercase, sin números). Si hay 3+ ocurrencias con intervalo de ~30 días (±5 días) y monto similar (±10%), proponer como subscripción.
- UI: banner en `/recurring` con modal de revisión
- Endpoint `POST /api/recurring/from-suggestion` para convertir en bloque

**Esfuerzo:** ~80 líneas backend + 1 componente frontend.

**Métrica de éxito:** # de suscripciones convertidas por usuario.

---

### #53 — Toggle "ajustar por inflación"

**Pitch corto:** NINGUNA app de finanzas argentina hace esto. Mata a la competencia.

**UX preview:**
> Switch global en el dashboard:
> `[ Pesos nominales ] [ Pesos constantes (mayo 2026) ]`
>
> Al activarlo, todos los gráficos históricos se reexpresan. Ese gasto de $5k de hace un año aparece como "$12k en pesos de hoy".

**Implementación:**
- Backend ya tiene `inflation-context` con IPC histórico
- Crear endpoint `GET /api/analytics/ipc-series?months=12` que devuelva el array de factores
- Frontend: utility `adjustForInflation(amount, txDate, factorSeries, baseDate)`
- Context global `InflationModeContext` que propaga el flag a todos los charts
- Persistir preferencia en localStorage

**Esfuerzo:** ~60 líneas + propagar el flag por componentes.

**Métrica de éxito:** % de usuarios AR que activan el toggle al menos una vez.

---

## 🎯 Diferenciadores reales — esfuerzo medio (~1 semana c/u)

### #51 — Aki proactivo (notificaciones inteligentes)

**UX preview:**
> Push o email los lunes 9am:
> *"Hola Agus — gastaste 65% de tu budget de Comida y estás solo a día 12. Te quedan ~$15k para 18 días. Sugerencia: cocinar más en casa esta semana."*

**Triggers a detectar:**
- Budget en riesgo (>70% gastado en <60% del período)
- Gasto inusual (>2x el promedio histórico de esa categoría)
- Ingreso recibido sin asignar a metas/budgets
- Meta de ahorro en riesgo (deadline cerca, % bajo)

**Implementación:**
- Nuevo módulo `app/modules/notifications/`
- APScheduler job que corre cada día a las 9am
- Plantillas de mail (Jinja2 o similar)
- Envío vía Gmail MCP (ya conectado) o SendGrid
- Tabla `notifications` con histórico para no spamear

**Esfuerzo:** ~3 días.

---

### #52 — Snapshot semanal por email

**UX preview:**
> Mail los domingos 10am, HTML con:
> - Top 3 gastos de la semana
> - % cambio vs semana anterior
> - Qué metas avanzaron
> - 1 insight de Aki ("Esta semana gastaste 40% más en Delivery que el promedio")

**Implementación:**
- Subset más simple de #51
- Template HTML único
- Job semanal

**Esfuerzo:** ~2 días.

---

### #56 — Goals con auto-deposit por regla

**Pitch corto:** automatiza "ahorrar primero, gastar después" — el core de cualquier sistema de wealth building.

**UX preview:**
> Form en cada meta:
> *"☐ Auto-depósito al recibir ingresos de [Sueldo ▼], depositar [10] % automáticamente"*
>
> Después: cada vez que entra un Sueldo, el 10% se mueve a la meta sin que el user haga nada. Notification: "Depositado $25k en 'Vacaciones' automáticamente."

**Implementación:**
- Tabla `goal_rules` (id, goal_id, trigger_category_id, percentage_or_fixed_amount, active)
- Hook en `transaction_routes.create_transaction` que matchea categoría y ejecuta el depósito
- Endpoint CRUD `/api/goals/{id}/rules`
- UI: sección "Reglas de ahorro automático" en cada meta

**Esfuerzo:** ~2 días.

---

### #55 — Categorización automática con embeddings

**Pitch corto:** elimina el bottleneck #1 de adopción — el trabajo manual de categorizar.

**UX preview:**
> Después de sincronizar MP: modal "Aki revisó tus transacciones nuevas y sugiere:
> - 12 tx de 'PEDIDOSYA' → Delivery
> - 4 tx de 'UBER *TRIP' → Apps de transporte
> - 8 tx de 'OPENAI' → Servicios USD
>
> [Aceptar todo] [Revisar una por una]"

**Implementación:**
- Tabla `transaction_embeddings` (tx_id, embedding vector)
- Job que genera embeddings de transacciones históricas categorizadas (Gemini `text-embedding-004`)
- Para nuevas tx sin categoría: similarity search (coseno) contra embeddings históricos
- Si top-match tiene score > 0.85, sugerir; si está entre 0.7 y 0.85, dejar como "sugerencia con confianza media"
- Endpoint `POST /api/transactions/auto-categorize` que devuelve sugerencias para tx sin categoría

**Esfuerzo:** ~3 días.

---

## 🏗️ Big bets — alto esfuerzo, transformacionales (2+ semanas)

### #58 — Splitwise lite (gastos compartidos)

**Pitch corto:** vertical entera. La gente NO abandona Splitwise hoy — vos podés ser su reemplazo + budget + savings + AI.

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

## 💡 Engagement / producto — esfuerzo bajo-medio

### #59 — Análisis comparativo anonimizado

**UX preview:**
> Aki: *"Estás gastando $35k/mes en Delivery. Eso es 2.3x el promedio de usuarios de tu edad y zona."*

**Implementación:**
- Cron diario que precalcula agregados por bucket (edad × geo × categoría)
- Mínimo N=50 users por bucket para no leakear info
- Endpoint `GET /api/insights/benchmark/{category}` que devuelve percentiles
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

## 🎁 Recomendaciones de combo

### Combo "Wow inmediato" (2 semanas)
- Semana 1: **#54** (predicción) + **#61** (detección subs)
- Semana 2: **#53** (toggle inflación) + **#62** (streaks)

**Resultado:** dashboard transformado, feature diferenciador AR, hábito diario.

### Combo "Monetización" (3 semanas)
- **#56** (auto-deposit) + **#63** (AFIP) + **#65** (viaje)

**Resultado:** tres features que justifican un tier Premium pago.

### Combo "Viralización" (2-3 semanas)
- **#58** (Splitwise lite) + **#64** (widget) + **#61** (subs)

**Resultado:** invitaciones orgánicas, screenshots compartibles, exposición pública.

---

## 📊 Cómo medir cada uno

Cada feature lanzada necesita su evento en PostHog. Sugiero el esquema:

```
{feature}_viewed     — primera vez que el user ve el componente
{feature}_engaged    — interactuó (click, toggle, etc.)
{feature}_completed  — completó el flow (creó la regla, aceptó la sugerencia, etc.)
```

Ej. para #61:
- `subscriptions_suggestion_viewed`
- `subscriptions_suggestion_engaged` (abrió el modal)
- `subscriptions_suggestion_converted` (con `count` como prop)

Con ese funnel determinás qué features tienen tracción y cuáles cortar.

---

## 🚫 Lo que dejé fuera (intencionalmente)

- **Crypto / wallets web3** — fuera del positioning AR de finanzas personales.
- **Préstamos / crédito** — requiere licencia BCRA, no escala MVP.
- **Inversiones (compra de FCI/CEDEAR)** — alcance gigante, mejor partner con un broker.
- **Cuenta bancaria propia** — fintech regulada, NO es por donde empezar.

---

## Próxima sesión: cómo arrancar

1. Releer este doc.
2. Elegir feature (yo voy a sugerir #54 + #61 + #53 como combo inicial).
3. Diseño breve: data model, endpoints, UI sketch en ASCII.
4. Implementación.
5. Tests.
6. PostHog events para medir.

**Estado actual del repo (post-auditoría 2026-05-22):**
- 50 fixes técnicos aplicados (auditoría #1-50)
- Backend tests: 11/11 ✓
- Frontend tests: 7/7 ✓
- Build OK
- Listo para sumar features sin deuda técnica encima.
