# Métricas y KPIs
## Cómo medimos el éxito — con las métricas correctas para una app financiera

---

## Por qué Day-2 retention es la métrica equivocada

Las guías genéricas de validación de apps usan Day-2 retention como la métrica core.
**Para apps de finanzas personales, esto es un error.**

Una app de tracking de gastos tiene un patrón de uso semanal, no diario:
- La gente registra gastos cuando los hace — no necesariamente cada día
- Los días sin gastos no significan abandono — significan que no gastaron
- El valor de la app se percibe semanalmente ("cuánto gasté esta semana")

**Day-2 retention mide hábito diario. El hábito real de esta app es semanal.**

Medir Day-2 te dará falsos negativos y te hará iterar cosas que no son el problema.

---

## Las métricas correctas

### Tier 0: Activación (primeras 24h)

| Métrica | Cómo medir | Target | Señal si falla |
|---|---|---|---|
| Time to first expense | PostHog: tiempo entre signup y primer evento `expense_added` | < 3 min | Onboarding confuso o form con fricción |
| Signup → First expense rate | PostHog funnel | > 60% | Mismo que arriba |
| Onboarding completion | PostHog: % que llegan a paso 3 | > 80% | Algún paso específico abandona |

### Tier 1: Retención (semana 1)

| Métrica | Cómo medir | Target | Señal si falla |
|---|---|---|---|
| Week-1 retention | PostHog: % de usuarios con al menos 1 evento en los 7 días siguientes al signup | > 40% | No ven valor en volver |
| Gastos/usuario activo/semana | SQL: SUM(gastos) / COUNT(usuarios activos en semana) | > 4 | Uso esporádico, no hay hábito |
| Sesiones en semana 1 | PostHog: avg sesiones primeros 7 días | > 3 | Solo probaron una vez |

### Tier 2: Stickiness (mes 1)

| Métrica | Cómo medir | Target | Señal si falla |
|---|---|---|---|
| 30-day retention | PostHog: % usuarios activos en días 25-30 vs día 1 | > 20% | No se formó hábito |
| WAU/MAU ratio | PostHog: usuarios activos en semana / mes | > 0.4 | Uso muy esporádico |
| NPS | Encuesta manual (Google Form en sesión 2) | > 40 | Producto no resuelve el problema |
| Gastos totales registrados/usuario/mes | SQL | > 15 | Uso demasiado light |

### Tier 3: Monetización (desde semana 10+)

| Métrica | Cómo medir | Target |
|---|---|---|
| Free → Premium conversion | Usuarios premium / usuarios con > 30 días activos | > 8% |
| MRR | Stripe/MP: facturación mensual recurrente | $300 → $3.000 → $15.000 |
| Churn mensual premium | Cancelaciones / total premium | < 5% |

---

## Setup PostHog (15 minutos)

### 1. Crear cuenta

Ir a posthog.com → Create account → Free tier (1M eventos/mes gratis).
Crear proyecto "App Financiera Prod" y uno "App Financiera Dev".

### 2. Instalar en el frontend

```bash
cd finance-dashboard-mvp
npm install posthog-js
```

### 3. Inicializar en main.jsx o App.jsx

```javascript
import posthog from 'posthog-js'

posthog.init('phc_TU_API_KEY_AQUI', {
  api_host: 'https://app.posthog.com',
  loaded: (posthog) => {
    if (import.meta.env.DEV) posthog.debug()
  }
})
```

### 4. Identificar usuarios autenticados

En `AuthContext.jsx`, cuando el usuario hace login exitoso:

```javascript
import posthog from 'posthog-js'

// Dentro del handler de login exitoso:
posthog.identify(user.id, {
  email: user.email,
  created_at: user.created_at,
})
```

### 5. Trackear eventos clave

```javascript
import posthog from 'posthog-js'

// Al agregar un gasto:
posthog.capture('expense_added', {
  category: category,
  amount_range: amount > 10000 ? 'high' : amount > 1000 ? 'medium' : 'low',
})

// Al ver una página:
posthog.capture('page_viewed', { page: 'dashboard' })

// Al completar onboarding:
posthog.capture('onboarding_completed')
```

### 6. Configurar el funnel en PostHog

En el dashboard de PostHog:
- Funnels → New Funnel
- Steps: `user_signed_up` → `onboarding_completed` → `expense_added`
- Esto te muestra exactamente dónde se caen los usuarios

---

## Cómo leer los datos

### Verde — vas bien

- Week-1 retention > 40%
- Time to first expense < 3 minutos en el funnel
- Gastos/usuario/semana > 4 y creciendo
- Feedback: usuarios piden features (no preguntan cómo usar lo básico)

### Amarillo — iterar antes de escalar

- Week-1 retention 25-40%
- Time to first expense 3-8 minutos
- Gastos/usuario/semana 2-4
- Feedback: confusión en algún paso específico (señal clara de qué iterar)

### Rojo — no escales, encontrá el problema primero

- Week-1 retention < 25%
- Menos del 50% completan el onboarding
- Gastos/usuario/semana < 2
- Feedback: no entienden para qué es la app, o no vuelven nunca

Si estás en rojo, el problema es uno de estos tres (en orden de probabilidad):
1. Onboarding no transmite el valor → iterar copy y flujo
2. Fricción en el form → reducir campos, mejorar UX
3. No hay razón para volver → agregar algo que muestre valor al volver (summary del día, insight, alerta)

---

## Gates de decisión

### Gate 1 — Semana 4

**Condición:** 100 usuarios externos testearon (no amigos exclusivamente)

| Si... | Entonces... |
|---|---|
| Week-1 retention > 40% Y signup→expense > 60% | Avanzar a Fase 2 (MP integration) |
| Week-1 retention 25-40% | Iterar 2 semanas más, identificar bottleneck específico |
| Week-1 retention < 25% | Investigar: ¿problema de producto, canal, o target? |

### Gate 2 — Semana 8

**Condición:** MP integration implementada o en curso

| Si... | Entonces... |
|---|---|
| 30-day retention > 20% Y MAU creciendo | Avanzar a Fase 4 (monetización) |
| 30-day retention 10-20% | Implementar AI insights, iterar 4 semanas |
| 30-day retention < 10% | Revisar fundamentalmente la propuesta de valor |

### Gate 3 — Semana 12

**Condición:** Monetización implementada

| Si... | Entonces... |
|---|---|
| $300+ MRR Y churn < 5% | Investir en growth (contenido, ads, partnerships) |
| < $300 MRR pero NPS > 40 | Revisar pricing y freemium gates |
| NPS < 40 | No escales — el producto aún no está resuelto |

---

## Loop de iteración (semana 2 en adelante)

```
LUNES: Revisar PostHog — ¿qué pasó en la semana anterior?
       Identificar el metric más lejos de su target.

MARTES: Formular hipótesis — "Si cambio X, debería mejorar Y porque Z"
        Diseñar el cambio más pequeño posible para testear la hipótesis.

MIÉRCOLES-JUEVES: Implementar + deploy.

VIERNES: Compartir con 5 usuarios nuevos. Observar, no explicar.

SIGUIENTE LUNES: Medir si la métrica mejoró.
                 ¿Sí? → Keep. ¿No? → Revert o iterar hipótesis.
```

No cambies dos cosas a la vez — no sabrás qué funcionó.
