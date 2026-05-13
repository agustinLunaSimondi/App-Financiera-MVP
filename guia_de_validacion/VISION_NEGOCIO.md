# Visión y Modelo de Negocio
## Por qué esto puede ser un negocio real — no solo un proyecto

---

## El problema

Los jóvenes argentinos (18-30) no saben en qué gastan su plata.
No porque no les importe — sino porque registrarlo a mano es una molestia que abandonan en la primera semana.

Apps genéricas no funcionan porque:
- Están en inglés o español neutro
- No integran MercadoPago (donde va el 80% del gasto diario de un argentino)
- No contextualizan inflación
- Piden demasiada fricción para el primer uso

La inflación hace esto crítico: en Argentina, saber exactamente a dónde va cada peso no es un lujo — es supervivencia financiera básica.

---

## El usuario objetivo

### Perfil primario: Agus — 22 años, AMBA

- Usa MercadoPago para el 80% de sus pagos (transferencias, QR, compras online)
- Tiene ingresos propios pero termina el mes sin saber cómo
- Intentó Excel, YNAB, otra app — lo dejó en menos de 2 semanas
- Tiene smartphone, activo en TikTok e Instagram
- Habla de "quedar en cero a fin de mes" como algo normal y resignado
- **Pagaría $3-5 USD/mes por algo que realmente funcione sin que tenga que cargar todo a mano**

### Perfil secundario: Caro — 27 años, trabaja en relación de dependencia

- Sueldo fijo, quiere ahorrar pero no sabe por dónde empezar
- Usa tarjeta de débito + MP + Uala
- Tiene una meta concreta: viaje, fondo de emergencia, dejar de vivir al límite
- Busca un número: "¿Cuánto puedo gastar esta semana sin complicarme?"

---

## Competencia real

| Competidor | Fortaleza | Debilidad para nuestro usuario |
|---|---|---|
| YNAB | Metodología sólida, community | $15/mes, inglés, sin MP, sobre-complicado |
| Fintual | Fuerte en inversiones | No trackea gastos del día a día |
| Money Manager | Completo | UX de 2015, sin AI, sin MP |
| Spendee | UX linda | No integra MP, euro-centrado |
| Excel propio | Gratis | Fricción altísima, se abandona en días |
| Wallet by BudgetBakers | Completo | Sin MP, sin AI, sin español arg |

**Conclusión:** Nadie tiene las tres cosas juntas: integración MP + AI + contexto argentino.

---

## Nuestros diferenciadores (en orden de importancia)

### 1. Integración MercadoPago — el moat real

La mayoría de los gastos de jóvenes argentinos pasan por MercadoPago.
Si conectamos la cuenta de MP via OAuth y leemos las transacciones, **la carga de gastos se vuelve casi automática**.
El usuario solo revisa y corrige categorías — 30 segundos por día en lugar de 5 minutos de carga manual.

Esto es:
- Difícil de replicar para un competidor internacional (requiere conocer el mercado local)
- Potencialmente el único diferenciador que necesitamos para alcanzar retención real

**Riesgo:** MP puede restringir acceso a su API para terceros. Mitigación: construir valor sin MP primero, la integración es bonus no base.

### 2. AI que habla como argentino

Insights contextualizados para inflación y vida real argentina.
No "You spent 20% more on food" — sino "Gastaste $15.000 más en comida esta semana comparado con tu promedio. Si seguís así, el mes sale $60.000 más caro."

La IA debe entender categorías locales: kiosco, almacén, SUBE, ARCA, monotributo, etc.

### 3. Captura por voz en español rioplatense

"Gasté ochocientos en el kiosco de la esquina" → registrado.
Menor fricción = mayor hábito = mejor retención.

---

## Modelo de monetización

### Tier Gratis (siempre disponible)
- Registro y tracking manual de gastos
- Hasta 3 meses de historial
- Categorías básicas
- Dashboard simple de gastos del mes

### Tier Premium — $3 USD/mes (o ~3.500 ARS indexado a inflación)
- Conexión MercadoPago (auto-import de transacciones)
- Historial ilimitado
- AI insights semanales automáticos
- Captura por voz
- Presupuestos con alertas
- Metas de ahorro con predicciones
- Export a Excel/CSV

### Hipótesis de unit economics

| Métrica | Hipótesis |
|---|---|
| CAC orgánico (contenido, word-of-mouth) | < $5 USD |
| LTV (Premium 12 meses de retención media) | $36 USD |
| LTV/CAC | > 7:1 — viable |

### Gates de monetización

- **100 usuarios premium = $300 MRR** → validación inicial de willingness to pay
- **1.000 usuarios premium = $3.000 MRR** → break-even equipo pequeño
- **5.000 usuarios premium = $15.000 MRR** → negocio real, posibilidad de inversión

---

## Go-to-Market

### Fase 1 (ahora → semana 8): Early adopters reales

No usar solo amigos. El sesgo de selección destruye la señal.

Canales específicos:
- Grupos de Telegram de finanzas personales Argentina (r/FinanzasPersonalesAR)
- Discord de comunidades tech/startup Argentina
- Grupos universitarios UBA/UTN/UNSAM (finanzas, economía, ingeniería)
- Reddit: r/argentina → posts genuinos sobre "cómo trackear gastos con inflación"

Target: 100 usuarios que no te conocen personalmente.

### Fase 2 (semana 8+): Contenido orgánico

- TikTok/Reels cortos: "¿Sabés en qué gastás tu plata?" — demo real de la app
- El momento de conectar MercadoPago y ver todos tus gastos importados solos es **muy viralmente filmable**
- SEO: "app de gastos para argentinos", "cómo ahorrar con inflación argentina"

### Fase 3 (si valida, semana 12+): Paid + partnerships

- Instagram/TikTok ads ($50-100 de test)
- Contacto con influencers de finanzas personales en Argentina (hay varios con 50k-200k seguidores)
- Explorar partnership formal con MercadoPago (Devex program) — ambicioso, pero la trayectoria que queremos

---

## Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
|---|---|---|
| MercadoPago restringe API para terceros | Alto | Construir valor sin MP primero. Si llega, es bonus. |
| Regulación BCRA/CNV para datos financieros | Medio | Consultar abogado antes de monetizar y antes de escalar |
| Competidor bien financiado lanza integración MP | Medio | Velocidad + comunidad + brand local. El primero en hacerlo bien gana. |
| Usuarios no pagan — esperan que sea gratis | Medio | Demostrar valor antes de pedir pago. Free tier real, no demo. |
| Inflación destruye precio en ARS | Bajo | Cobrar en USD o indexar explícitamente. |

---

## North Star Metric

**Gastos registrados por usuario activo por semana.**

Si este número sube consistentemente, todo lo demás (retención, LTV, NPS, word-of-mouth) tiende a subir con él.
Si está estancado en 1-2 gastos/semana, ninguna feature nueva va a salvar el producto — hay que iterar el core.

Target a Semana 4: > 4 gastos/usuario activo/semana.
