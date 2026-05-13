# App Financiera — Índice Maestro
## Guía de referencia para Claude y para Agustín

**Versión:** 2.0 — Mayo 2026
**Stack real:** React 19 + Vite | FastAPI Python | PostgreSQL (Supabase) | Vercel + Render

---

## Visión en una línea

Asistente financiero personal con IA para jóvenes de Latam, integrado con MercadoPago.

---

## Los documentos

| Documento | Propósito | Leer cuando... |
|---|---|---|
| `VISION_NEGOCIO.md` | Por qué esto es un negocio real | Querés entender el "para qué" antes de codear |
| `ROADMAP_TECNICO.md` | Qué construimos y en qué orden | Querés priorizar o sequenciar trabajo |
| `METRICAS_Y_KPIS.md` | Cómo medimos éxito (con PostHog) | Tenés dudas sobre una métrica o querés leer los datos |
| `HITOS_CLAUDE.md` | Las tareas ejecutables — lo que Claude hace | **Siempre que vayas a codear algo** |

---

## Estado actual

### Semana 13/05/2026

**Fase:** 0 — Deuda técnica activa
**Lo que bloquea mostrar esto a usuarios reales:**

- [ ] Dark mode roto (toggle no aplica clases `dark:`)
- [ ] Savings — botón "Depositar" no funciona
- [ ] Google OAuth `origin_mismatch` en producción (Vercel/Render)
- [ ] Responsividad móvil básica (sidebar + tarjetas)

**Hito activo:** HITO 1 (fix bugs críticos)
**Próximo hito:** HITO 2 (PostHog analytics)
**Gate de decisión Fase 1:** Semana 4 — 100 usuarios reales, 40%+ week-1 retention

---

## La secuencia correcta

```
Bugs críticos
    ↓
Analytics reales (PostHog)
    ↓
Usuarios reales (no amigos)
    ↓
Medir → Iterar
    ↓
MercadoPago integration (el moat)
    ↓
AI features (el diferenciador)
    ↓
Monetización
```

No escales lo que no validaste.
No validés con amigos — sesgo de selección garantizado.
No construyas features nuevas antes de medir retención de las que ya existen.

---

## Regla operativa para Claude

Antes de tocar cualquier feature nueva, Claude debe:
1. Leer `HITOS_CLAUDE.md` y verificar qué hito está activo
2. Verificar que el hito anterior está marcado como DONE
3. Si hay un bug bloqueante → siempre va primero

Si el usuario pide algo que no está en el hito activo, Claude puede:
- Hacerlo si es un bug crítico
- Proponer agregarlo al roadmap si es una feature nueva
- Nunca simplemente ignorar el roadmap
