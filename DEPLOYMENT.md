# Deployment & Entornos

## Branches y entornos

| Branch    | Destino Vercel              | Destino Render    | Supabase   | Uso                                    |
|-----------|-----------------------------|-------------------|------------|----------------------------------------|
| `main`    | Production                  | `finance-dashboard-api` | Prod | Estable. Solo merges desde `develop`. |
| `develop` | Preview (alias estable)     | Mismo Render (*)  | Prod (*)   | Integración antes de prod.             |
| `feat/*`  | Preview (URL única por PR)  | — (sin backend)   | —          | Trabajo en progreso.                   |

(*) En el plan **liviano** el backend y la DB son compartidos entre `develop` y `main`. La separación real (Render dev service + Supabase project aparte) se hace cuando aparezca un cambio que pueda romper datos de producción.

## Flujo de trabajo

```
feat/mi-feature  ──PR──▶  develop  ──PR──▶  main  (auto-deploy a prod)
                          (Preview              (Production)
                           Deployment)
```

1. Crear branch desde `develop`: `git checkout develop && git pull && git checkout -b feat/x`
2. Push y abrir PR contra `develop`. Vercel genera un Preview con URL única.
3. Probar el Preview. Mergear a `develop`.
4. Cuando `develop` esté estable, PR `develop → main`. Mergear → deploy automático a producción.

## Variables de entorno

### Vercel (Frontend)

Configurar por **environment target** en *Project Settings → Environment Variables*:

| Variable                | Production                              | Preview                                  | Development |
|-------------------------|-----------------------------------------|------------------------------------------|-------------|
| `VITE_API_URL`          | `https://finance-api-9fe5.onrender.com/api/` | (mismo por ahora; mover a backend dev si se crea) | `http://localhost:8000/api/` |
| `VITE_GOOGLE_CLIENT_ID` | ID de prod                              | mismo (agregar origin Preview en Google) | mismo       |
| `VITE_POSTHOG_KEY`      | key de prod                             | key de dev (idealmente proyecto aparte)  | key de dev  |

### Render (Backend)

| Variable           | Valor recomendado                                                                                       |
|--------------------|---------------------------------------------------------------------------------------------------------|
| `DATABASE_URL`     | Pooler de Supabase **puerto 6543** (transaction mode). Ver `.env.example`.                              |
| `JWT_SECRET`       | String aleatorio largo (≥ 64 chars).                                                                    |
| `FRONTEND_URL`     | Lista separada por comas: `https://app-financiera-mvp-jteg.vercel.app,https://app-financiera-mvp-jteg-git-develop-agustinlunasimondis-projects.vercel.app` |
| `MP_REDIRECT_URI`  | `https://<dominio-prod>/integrations/mercadopago/callback`                                              |
| `PYTHON_VERSION`   | `3.11.0`                                                                                                |

## Checklist al promover `develop → main`

- [ ] Migraciones de Alembic incluidas y probadas (`alembic upgrade head` en local con DB de dev)
- [ ] `VITE_API_URL` apunta al backend correcto en Preview
- [ ] CORS de Render incluye el dominio de la nueva URL Preview si cambió
- [ ] Build local pasa: `cd finance-dashboard-mvp && npm run build`
- [ ] Si tocaste endpoints públicos (waitlist, login): probar el flujo end-to-end en Preview antes de mergear

## Notas operativas

- **Latencia Render Ohio ↔ Supabase São Paulo:** ~140ms por roundtrip. Cada request DB se paga este RTT. Considerar migrar Supabase a `us-east-1` (Virginia) si el volumen crece — implica export/import del proyecto, no es in-place.
- **APScheduler de recurring:** vive en el proceso web. En Render free duerme con el dyno → mover a Render Cron Job cuando se pueda.
- **Pool de conexiones:** `pool_size=5, max_overflow=5` por worker × `-w 2` workers = hasta 20 conexiones. Supabase free aguanta 60 directas vía pooler.
