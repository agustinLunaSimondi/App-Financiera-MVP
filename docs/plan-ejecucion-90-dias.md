# Plan de ejecución — 90 días (vida real)

Plan operativo para vos, no para el código. Complementa [`estrategia-mvp-marketing-metas.md`](./estrategia-mvp-marketing-metas.md) (el qué y el porqué); esto es el **cuándo y el cuánto**.

**Punto de partida (2026-08-15):** beta cerrada con amigos. CME = USD 100K/año a 3 años. Bootstrapped, solista, con trabajo/estudio en paralelo.
**Presupuesto asumido:** ~AR$0 en ads. El recurso escaso es tu tiempo, no tu plata.
**Carga realista:** 8–10 h/semana. Si tenés más, mejor; el plan no se rompe si tenés menos, se estira.

---

## La regla que ordena todo

El libro es tajante en una cosa: **el error que mata no es construir mal, es construir algo que nadie quiere.** Ariel y René fracasan por contratar marketing antes de validar.

Traducido a tu situación:

> **No gastes un peso en publicidad hasta tener 10 usuarios activos que no sean amigos tuyos.**

Todo lo de abajo está ordenado para llegar a eso primero.

### Las 3 métricas que miran de verdad

Ignorá todo lo demás por ahora. Estas tres, semana a semana:

| Métrica | Dónde la ves | Meta a día 90 |
|---|---|---|
| **Usuarios activos no-amigos** (entraron ≥2 veces en 7 días) | PostHog | 25 |
| **Activación** (registro → MP conectado → 1ra semana completa) | PostHog, embudo | ≥40% |
| **Señal de precio** (`clicked_subscribe` / `viewed_pricing`) | `/api/growth/pricing-intent/stats` | ≥30 respuestas totales |

Si a día 90 tenés 25 activos y 40% de activación, tenés ajuste Problema/Solución y podés empezar a gastar en adquisición. Si no, el problema es el producto o el segmento — no el marketing.

---

## Fase 1 — Días 1 a 30: salir del círculo de amigos

**Objetivo único: 15 entrevistas con desconocidos + 10 usuarios reales.**

Esta fase se siente incómoda y es la que casi todos saltean. Es la que más importa.

### Semana 1 — Preparar el terreno

- [ ] Aplicar la migración de growth en producción:
  ```bash
  cd finance-dashboard-api-python && alembic upgrade head
  ```
- [ ] Verificar en producción que `/pricing` carga y que `pricing_intent` se registra.
- [ ] Armar el guion de entrevista de deseabilidad (5 pasos, 30 min — está en el resumen del ebook, cap. 2). Escribilo en un doc, no lo improvises.
- [ ] Practicar el guion 2 veces con amigos. **Acá sí sirven los amigos: para practicar, no como datos.**
- [ ] Crear un doc "Insights" donde vas pegando lo que sale de cada entrevista.

### Semana 2 — Reclutar

Meta: **10 conversaciones agendadas.** Es un trabajo de prospección, no de esperar.

- [ ] Escribir en 3 comunidades (aportando valor, no spameando):
  - Reddit: r/merval, r/ArgentinaBenderStyle, r/devsarg
  - Grupos de freelancers/monotributistas en LinkedIn y Facebook
  - Discord/Telegram de finanzas personales AR
- [ ] Post honesto tipo: *"Estoy construyendo una app de finanzas personales pensada para la inflación argentina. Busco 10 personas que me regalen 30 min para contarme cómo llevan sus gastos hoy. No vendo nada."*
- [ ] Mensaje directo a 20 conocidos-de-conocidos (2° grado, no amigos).
- **Regla del libro:** nunca pagues por una entrevista. Si tenés que pagar, no hay interés real.

### Semanas 3 y 4 — Entrevistar

- [ ] 10–15 entrevistas. Ritmo: 3–5 por semana.
- [ ] Grabá y transcribí (con permiso). Tomar notas a mano sesga lo que escuchás.
- [ ] Preguntá por **comportamiento pasado**, nunca por intención futura. "¿Cómo llevaste tus gastos el mes pasado?" ≠ "¿usarías esto?".
- [ ] Al final de cada una: pedí 2 referidos. Es la fuente más barata de la siguiente entrevista.
- [ ] Cerrá cada entrevista invitando a probar la app con su link de referido.

**Gate de fin de fase 1:** ¿al menos 6 de 15 describieron el problema con urgencia real (no "está bueno", sino "esto me pasa y me jode")?
- **Sí** → seguí a fase 2.
- **No** → el segmento o el problema están mal. Volvé a entrevistar con otro perfil antes de construir nada más.

---

## Fase 2 — Días 31 a 60: activación y primer contenido

**Objetivo: que los que entran, se queden. Y abrir el canal orgánico.**

### Instrumentar y arreglar el embudo

- [ ] Armar en PostHog el embudo: `landing_viewed` → `user_signed_up` → `mp_connected` → `onboarding_completed`.
- [ ] Encontrar el paso con mayor caída y arreglar **solo ese**. No optimices los cuatro a la vez.
- [ ] Auditar la landing contra el checklist del cap. 5: velocidad de carga, PUV visible sin scroll, un solo CTA, registro corto.

### Contenido — el canal de largo plazo

Empezá ahora aunque los resultados tarden 3–6 meses. Es el activo que compone.

- [ ] **1 pieza por semana** (4 en total). Temas que ya resolvés con el producto:
  1. "Cómo armar un presupuesto cuando la inflación te cambia los precios cada semana"
  2. "Dólar blue vs. tu sueldo: cuánto perdiste este año sin darte cuenta"
  3. "Por qué tu Excel de gastos deja de servir a los 3 meses"
  4. "Todo lo que gastás en MercadoPago sin registrarlo"
- [ ] Publicar en el blog/landing (indexable, SEO) **y** recortarlo para Twitter/LinkedIn/Reddit.
- [ ] Cada pieza cierra con un CTA suave a la app.

### Activar el motor viral

- [ ] Mandar un email/mensaje a todos los usuarios activos avisando del programa de referidos.
- [ ] Medir: ¿cuántos copian el link? ¿cuántos referidos califican?
- [ ] Si nadie comparte, el problema no es el incentivo — es que el producto todavía no gusta lo suficiente. Es una señal, no un fracaso del feature.

**Gate de fin de fase 2:** ≥15 usuarios activos no-amigos y activación ≥30%.

---

## Fase 3 — Días 61 a 90: validar precio

**Objetivo: saber si alguien pagaría, y cuánto — sin construir cobro.**

- [ ] Dirigir tráfico a `/pricing` desde: la app (banner sutil), los posts de contenido y las entrevistas.
- [ ] Juntar **30+ respuestas** entre `clicked_subscribe` y `rejected_price`.
- [ ] Leer el campo `feedback` de los que rechazaron. **Esa es la data más valiosa de todo el trimestre** — es la única que te dice *por qué* no.
- [ ] Si la conversión a `clicked_subscribe` supera ~15%, **subí el precio** y volvé a medir. La regla del libro: si no hay resistencia, el precio está bajo.
- [ ] Si está por debajo de ~5%, el problema es la propuesta de valor del plan Premium, no el número.

### Entrevistas de viabilidad (5–8)

Con usuarios que ya usan la app:

- [ ] Mostrales el plan Premium y **proponé un precio concreto**. Nunca preguntes "¿cuánto pagarías?" — siempre subestiman.
- [ ] Observá la reacción física/inmediata, no la respuesta educada.
- [ ] Pedí un compromiso real: *"¿te anoto para cuando lo lancemos?"* Un sí verbal vale poco; un email dejado vale más.

**Gate de fin de fase 3 — la decisión de los 90 días:**

| Resultado | Qué hacer |
|---|---|
| 25+ activos y señal de precio clara | Construir el cobro (MercadoPago suscripciones) y recién ahí probar ads con presupuesto chico |
| 25+ activos pero nadie pagaría | El producto gusta pero no captura valor. Revisar qué feature sí sería premium — quizá no es AI Insights |
| <10 activos | No hay ajuste Problema/Solución. Volver a fase 1 con otro segmento. **No gastar en ads.** |

---

## Ritmo semanal sostenible

Lo que no es sostenible no se ejecuta. Bloqueá esto en el calendario:

| Momento | Bloque | Tiempo |
|---|---|---|
| Lunes | Revisar las 3 métricas. Anotar el número, aunque sea feo. | 30 min |
| Mar/Jue | Entrevistas o prospección | 2 h |
| Miércoles | Escribir la pieza de contenido de la semana | 2 h |
| Fin de semana | Código: arreglar **lo que las entrevistas señalaron** | 3–4 h |

**Regla de oro:** el bloque de código va *después* del de entrevistas, no antes. Si invertís el orden, terminás construyendo lo que se te ocurrió a vos en vez de lo que te pidieron.

### Chequeo mensual (1 h, último domingo)

1. ¿Las 3 métricas subieron, bajaron o quedaron igual?
2. ¿Qué aprendí este mes que no sabía el mes pasado?
3. ¿Qué construí que nadie usó? (mirar PostHog, ser honesto)
4. ¿Sigo hablando con el segmento correcto?

---

## Los 5 errores a evitar (del libro, aplicados a vos)

1. **Contratar/pagar marketing antes de validar.** El error de Ariel y René. Es el más caro.
2. **Construir features nuevas en vez de conseguir usuarios.** Es más cómodo programar que hablar con gente. Programar se *siente* productivo aunque no mueva ninguna métrica. Cuidado con esto: es tu sesgo más probable siendo ingeniero.
3. **Tomar el entusiasmo de amigos como validación.** Te van a decir que está genial. No es data.
4. **Preguntar el precio en vez de proponerlo.** Siempre subestiman.
5. **Perder el foco del segmento.** "Para todos los que quieran ahorrar" no es un segmento. El tuyo es: freelancer/profesional urbano argentino, 22–40, usuario intensivo de MercadoPago, harto del Excel.

---

## Qué ya está construido y listo para usar

La infraestructura técnica de este plan ya está en el código (sesión del 2026-08-15):

- **Atribución UTM** — `?utm_source=...` se captura al aterrizar y se guarda con el usuario. Ya podés medir CAC por canal. Usá links etiquetados en **todo** lo que publiques: `?utm_source=reddit&utm_medium=organic&utm_campaign=post-inflacion`.
- **Referidos** — código único por usuario, link compartible, recompensas por tiers (1/3/5 referidos → 1/3/6 meses Premium). Visible en Settings.
- **Pricing page** (`/pricing`) — mide intención de pago sin cobrar. Para cambiar el precio del experimento, tocá `PRICE_USD` / `PRICE_ARS` / `VARIANT` en `PricingPage.jsx`: queda registrado con cada respuesta, así podés comparar conversión entre precios.
- **Entitlements** — el gating premium está listo (`require_premium`), sin cobro todavía. Cuando valides, solo enchufás el pago.

---

## Fuente

Frameworks de [`ebook-emprendedor-resumen.md`](./ebook-emprendedor-resumen.md) — *El Camino del Emprendedor Orientado al Éxito*, Catalina García Poitevin, ITBA (2023), CC BY-NC-SA 3.0.
