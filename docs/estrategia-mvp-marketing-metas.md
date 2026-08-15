# Estrategia MVP — Marketing, Metas y Captura de Valor

Aplicación de los frameworks de [`ebook-emprendedor-resumen.md`](./ebook-emprendedor-resumen.md) (ITBA Entrepreneur Program) al proyecto App-Financiera-MVP. Documento vivo — actualizar cuando cambien etapa, pricing o métricas reales.

**Snapshot de contexto (2026-08-15):**
- Etapa de tracción: **Beta cerrada / amigos** (sin usuarios externos reales aún).
- Criterio Mínimo de Éxito (CME): **reemplazar un sueldo ≈ USD 100K/año a 3 años**.
- Producto: dashboard financiero personal, Argentina. Backend FastAPI + React. Ya integrado: MercadoPago (OAuth, solo lectura, auto-sync de transacciones), panel de inflación (IPC/dólar blue), presupuestos, recurrentes automáticas, sistema de streaks/badges (gamificación), AcademyPage (contenido educativo), landing page ya escrita con PUV clara.

---

## 1. Diagnóstico con el framework del libro

### Dónde estás en la hoja de ruta (Intro del libro)

```
1. Lean Canvas          → hecho implícitamente (el código lo demuestra)
2. Estresar riesgos      → parcial
3. Ajuste Problema/Solución → EN CURSO (beta con amigos no cuenta como validado)
4. Ajuste Producto/Mercado  → NO ALCANZADO todavía
5. Ajuste Estrategia Comercial → PREMATURO hacerlo ahora
```

**Punto crítico:** el libro es explícito — *"no usar familiares/amigos como entrevistados"* (sirven solo para practicar el guion). Ariel y René, los protagonistas del libro, fracasan justamente por contratar marketing antes de validar con extraños. Beta con amigos = todavía no hay ajuste Problema/Solución confirmado. Esto no significa parar de pensar en marketing (lo pediste, y está bien planear), pero sí significa: **antes de gastar en adquisición paga, conseguí 10-15 entrevistas/usuarios de gente que NO te conoce.**

### Ventaja Única de Poder (VUP) — Cap. 1 y 6

Tu VUP más defendible, según los criterios del libro (información privilegiada + contra-posicionamiento):

- **Contexto argentino nativo**: panel de inflación (IPC/dólar blue) — algo que ninguna app "gringa" (Mint, YNAB, etc.) puede replicar sin rediseñar todo su producto para una economía de alta inflación. Esto es **contra-posicionamiento real**: para un competidor extranjero, meterse en este nicho les rompe su propuesta de valor global.
- **MercadoPago auto-sync**: acceso a un rail de pagos que domina el mercado argentino. Barrera de integración real, no trivial de copiar rápido.
- **Conocimiento del usuario argentino** (vos mismo como emprendedor local) — la fuente de VUP más citada por los emprendedores entrevistados en el libro.

Lo que **no** es tu VUP (no lo vendas como diferencial defendible): tener buen diseño, ser gratis al principio, o "trabajar más duro". Son copiables.

### Modelo Kano aplicado a tus features actuales

| Feature | Categoría Kano hoy | Implicancia |
|---|---|---|
| MP auto-sync | Imprescindible (básica) | Sin esto no competís, pero tampoco vende sola — los bancos ya lo tienen |
| Panel inflación IPC/dólar blue | **Fascinante** | Tu mayor arma de marketing/diferenciación *ahora*. Vida útil finita: en 2-3 años deja de sorprender. Explotalo mientras dure. |
| Recurrentes automáticas | Deseable | Suma, no vende sola |
| Presupuestos vivos (alerta 80%) | Deseable | Retención, no adquisición |
| Streaks/badges | Deseable → Fascinante para el segmento gamer/habit-tracker | Motor de retención ("pegajoso") |
| AI Insights (marcado "soon" en el código) | **Fascinante, candidata a premium** | Tu gancho de monetización más natural — ya está pre-anunciado en la landing |

---

## 2. Metas — framework CME → SOM (Cap. 7)

Fórmula del libro: **SOM = CME / ARPC** (enfoque "abajo hacia arriba", el que recomiendan por sobre TAM→SAM→SOM porque no depende de estimaciones optimistas de participación de mercado).

CME fijado: **USD 100.000/año a 3 años.**

No tenés pricing validado todavía (la app es gratis hoy). Con el catálogo de 21 modelos de ingresos del libro, el mejor fit para este producto es **Freemium + Suscripción**:
- Encaja con un producto de uso habitual (streaks ya empuja hábito diario/semanal).
- Baja fricción de entrada (necesaria para el segmento "recién migra de Excel").
- AI Insights ya está anunciado como feature futura — paywall natural.

**Escenarios de pricing a validar** (nunca le preguntes al cliente cuánto pagaría — proponé un precio, mirá si hay resistencia, subí si no la hay):

| Precio mensual (equiv. USD) | ARPC anual | Clientes pagos necesarios para CME |
|---|---|---|
| USD 3 | USD 36 | ~2.780 |
| USD 5 | USD 60 | ~1.670 |
| USD 8 | USD 96 | ~1.040 |
| USD 12 | USD 144 | ~695 |

Recomendación para arrancar a testear: **franja USD 5–8/mes equivalente**, atado a un valor de referencia estable (ARS al dólar blue del día, no un número fijo en pesos) — esto además es una historia de venta coherente con tu propio producto: *"tu suscripción no pierde poder de compra por la inflación, como sí tu plata en el banco."* Encaja con la estrategia "empezar accesible y subir a segmentos premium" del libro (vs. empezar caro tipo Tesla).

### Hitos "ahora / siguiente / después" (Cap. 7)

| Horizonte | Meta de tracción | Foco |
|---|---|---|
| **Ahora** (0–6 meses) | 10-15 entrevistas con extraños (no amigos) del segmento objetivo + 10 usuarios reales activos no-amigos | Cerrar ajuste Problema/Solución. Cero gasto en marketing pago. |
| **Siguiente** (6–18 meses) | Escalar a 100 usuarios activos (regla 10X). Lanzar paywall de AI Insights. Primeros clientes pagos (validar pricing real). | Ajuste Producto/Mercado. Instrumentar AARRR. |
| **Después** (18–36 meses) | Alcanzar ~1.000-1.700 clientes pagos (según pricing validado) = CME cumplido | Ajuste Estrategia Comercial. Recién acá evaluar canales pagos, si ROI ≥ 3x lo justifica. |

---

## 3. Captura de valor del cliente (Cap. 3 y 7)

### Reglas de pricing del libro (aplicables ya, en entrevistas)

- Nunca preguntes "¿cuánto pagarías?" — subestiman siempre. Proponé un precio concreto y observá la reacción.
- Pricing por **valor percibido**, no por costo de desarrollo. Tu valor percibido = plata que el usuario deja de perder por desorden financiero + tiempo que no gasta en Excel + ansiedad que evita por no saber cuánto vale su plata en un contexto inflacionario.
- Freemium: la capa gratis (dashboard básico + MP sync + presupuestos) es tu motor de **adquisición** (PLG); la capa paga (AI Insights, panel de inflación avanzado, multi-cuenta, exportables) es tu motor de **captura de valor**.
- Evitá descuentos — no generan lealtad. Un trial con límite de tiempo sí es aceptable (ej. "AI Insights gratis 14 días").
- Una mejora de 1% en precio percibido puede valer +11% en ingresos — no hay apuro en bajar precio, hay que mejorar la propuesta de valor comunicada.

### Métricas de sostenibilidad a instrumentar ya (aunque sean chicas)

```
CAC = gasto total marketing+ventas del período / clientes nuevos del período
LTV simple = ARPC × margen(%) × (1 / churn mensual)
ROI = LTV / CAC        objetivo: ROI ≥ 3x
churn mensual = bajas del mes / clientes al inicio del mes × 100
```

Con canal 100% orgánico al inicio, tu CAC es ~$0 en plata pero no en tiempo — igual medilo (costo de oportunidad de tu tiempo cuenta como costo real, según el libro).

---

## 4. Estrategia de marketing y adquisición (Cap. 5) — para DESPUÉS de validar

Vas a usar los **3 motores de crecimiento** del libro. Dado que sos bootstrapped y estás pre-PMF, priorizá pagado = 0 por ahora:

### Motor pegajoso (retención) — ya tenés la base
- Streaks/badges ya construidos: explotalos como gancho de marketing ("no rompas tu racha") vía notificaciones/email.
- Presupuestos con alerta 80%: mensaje de valor recurrente, motivo de apertura frecuente de la app.

### Motor viral (referidos) — falta construir
- Programa de referidos simple: invitá a un amigo → ambos desbloquean AI Insights gratis 1 mes. Dado que el streak/gamificación ya existe, un leaderboard entre amigos ("¿quién ahorra más este mes?") es una extensión natural y barata de construir.

### Motor pagado — recién cuando haya ROI ≥ 3x validado con orgánico
No metas presupuesto de ads todavía. Cuando llegue el momento: Instagram/TikTok Ads segmentado Argentina 22-40 años, y Google Ads con intención de búsqueda tipo "app para controlar gastos argentina" / "alternativa a Excel gastos".

### Canales orgánicos a activar YA (costo = tiempo, no plata)

1. **AcademyPage como motor de contenido/SEO**: ya existe la sección. Publicar contenido educativo indexable (afuera de la app, en blog/landing) sobre temas que tu propio producto resuelve: "cómo armar un presupuesto con inflación del X% mensual", "qué es el dólar blue y cómo te afecta", "por qué tu Excel de gastos deja de servir". Esto alimenta SEO orgánico de largo plazo y refuerza tu VUP de contexto local.
2. **Comunidades de nicho** (gratis, alto intent): foros/grupos de finanzas personales Argentina (Reddit r/merval, r/ArgentinaEconomics, Discord/Telegram de inversores retail, grupos de freelancers en LinkedIn), foros de fintech Argentina. Participar aportando valor, no spam — mencionar la app solo cuando encaje orgánicamente.
3. **Micro-finfluencers argentinos**: en esta etapa, barter/afiliados (no pago fijo) — les das acceso premium gratis a cambio de mención genuina. Baja el CAC a casi cero.
4. **Landing page — auditoría con el checklist del libro** (Cap. 5): verificar velocidad de carga, diseño responsive, PUV visible antes de hacer scroll, un solo CTA claro. Tu landing actual ya tiene buena estructura de PUV (dolor → features → cómo funciona) — falta confirmar que el checkout/registro tenga el mínimo de pasos posible.

### Segmento de adoptadores tempranos (a quién dirigir todo lo anterior)

Ya está bien definido en tu propia landing: freelancers/profesionales urbanos 22-40 años en Argentina, usuarios activos de MercadoPago, frustrados con Excel o con apps extranjeras que no entienden inflación/dólar blue. **No lo diluyas** — el libro insiste: mercado inicial chico y específico > mercado grande y genérico, porque acelera el aprendizaje.

---

## 5. Checklist inmediato (próximas 2 semanas)

- [ ] Reclutar 10 entrevistados **que no sean amigos** (comunidades de nicho del punto 4) — guion de deseabilidad (5 pasos, Cap. 2)
- [ ] En esas mismas entrevistas, testear reacción a un precio propuesto (no preguntar "¿cuánto pagarías?") — guion de viabilidad (5 pasos, Cap. 2)
- [ ] Auditar landing page contra el checklist del Cap. 5 (velocidad, PUV pre-scroll, CTA único, checkout corto)
- [ ] Instrumentar analítica básica: cuántos completan registro → conectan MP → llegan al dashboard (tu propio embudo AARRR de 3 pasos)
- [ ] Publicar el primer contenido de Academy pensado para SEO/adquisición orgánica, no solo como feature interna
- [ ] Diseñar el paywall de AI Insights (aunque el feature en sí tarde, el "coming soon con lista de espera" ya sirve para medir interés/willingness to pay)

---

## Fuente

Frameworks tomados de [`ebook-emprendedor-resumen.md`](./ebook-emprendedor-resumen.md) — resumen derivado de *El Camino del Emprendedor Orientado al Éxito*, Catalina García Poitevin, ITBA Entrepreneur Program (2023), CC BY-NC-SA 3.0.
