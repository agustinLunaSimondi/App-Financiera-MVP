# Work Strategy — App Financiera MVP

## 1. Branch Model

```
main          → producción (auto-deploy Vercel prod + Render prod)
develop       → staging    (Vercel Preview URL + Render staging)
feature/*     → trabajo diario → PR → develop
hotfix/*      → fix urgente → PR → main → backmerge → develop
```

**Regla simple:**
- Nunca commitear directo a `main` ni `develop`
- Todo trabajo en `feature/nombre-descriptivo` o `hotfix/descripcion`
- `develop → main` solo cuando staging está verificado

---

## 2. Entornos

| Entorno | Branch | Frontend URL | Backend URL | DB |
|---------|--------|-------------|-------------|-----|
| **Local** | cualquiera | localhost:5173 | localhost:8000 | Supabase (schema dev) |
| **Staging** | develop | Vercel Preview URL | finance-api-staging.onrender.com | Supabase (schema dev) |
| **Producción** | main | app.dominio.com | finance-api-prod.onrender.com | Supabase (schema prod) |

> UAT no necesario todavía. `develop` + Vercel Preview URL cumple esa función. Agregar entorno UAT separado cuando haya QA externo o stakeholders que necesiten aprobar features antes de prod.

---

## 3. Configuración de Servicios

### GitHub — Branch Protection

**`main`:**
- Require pull request before merging
- Require 1 approving review
- Require status checks to pass
- No force push
- No direct commits

**`develop`:**
- Require pull request before merging
- Require status checks to pass

### Vercel

En Project Settings → Git:
- **Production branch:** `main`
- **Preview branches:** `develop` + `feature/*` (automático)

Variables de entorno en Vercel (separadas por environment):
```
# Production
VITE_API_URL = https://finance-api-prod.onrender.com/api

# Preview (staging + feature branches)
VITE_API_URL = https://finance-api-staging.onrender.com/api
```

### Render

Crear 2 services:
- `finance-api-staging` → auto-deploy on push to `develop`
- `finance-api-prod` → auto-deploy on push to `main` (o manual deploy para mayor control)

Cada service tiene sus propias env vars apuntando a la DB correcta.

---

## 4. Flujo de Trabajo Diario

```bash
# 1. Siempre partir de develop actualizado
git checkout develop
git pull origin develop

# 2. Nueva rama para el feature
git checkout -b feature/nombre-feature

# 3. Trabajo normal, commits frecuentes
git add <archivos>
git commit -m "feat: descripcion clara"

# 4. Subir rama
git push origin feature/nombre-feature

# 5. Abrir PR en GitHub → develop
# → Vercel genera Preview URL automáticamente
# → Probar la Preview URL

# 6. Merge a develop → staging se actualiza solo

# 7. Cuando el sprint / conjunto de features está listo:
# Abrir PR develop → main → prod
```

---

## 5. Flujo de Hotfix

```bash
# 1. Partir de main (no develop)
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-del-bug

# 2. Fix + commit
git commit -m "fix: descripcion"

# 3. PR → main
# Merge → prod se actualiza

# 4. CRÍTICO: backmerge a develop
git checkout develop
git merge main
git push origin develop
# (o abrir PR main → develop)
```

---

## 6. Convención de Commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: refactor sin cambio de comportamiento
style:    cambios visuales / CSS
docs:     documentación
chore:    dependencias, config, build
test:     tests
```

Ejemplos:
```
feat: add recurring transaction auto-categorization
fix: iOS Safari strips Authorization header on 307 redirect
refactor: split FinanceContext into domain-specific hooks
```

---

## 7. Pull Request Template

Al abrir un PR incluir:
- **Qué cambia:** descripción en 1-3 líneas
- **Cómo probar:** pasos para verificar en Preview URL
- **Screenshots:** para cambios de UI
- **Checklist:**
  - [ ] Probado local
  - [ ] Probado en Vercel Preview URL
  - [ ] No rompe flujos existentes
  - [ ] Variables de entorno actualizadas si aplica

---

## 8. Debug Local — IDE (Antigravity / VS Code)

Archivos ya configurados en `.vscode/`:

| Archivo | Función |
|---------|---------|
| `launch.json` | Configuraciones de debug (F5) |
| `tasks.json` | Tasks pre-launch (start servers) |

### Cómo usar

**Full Stack (recomendado):**
1. Abrir Command Palette → `Tasks: Run Task` → `start-all`
2. O presionar F5 con configuración "Full Stack (Frontend + Backend)" seleccionada
3. Chrome abre automáticamente en localhost:5173

**Solo backend con debugger Python:**
1. F5 con "Backend (FastAPI)" → breakpoints funcionan en Python

**Solo frontend:**
1. Correr `npm run dev` en terminal
2. F5 con "Frontend (Vite + Chrome)" → Chrome DevTools integrado

### Prerequisitos
- Python extension para VS Code/Antigravity instalada
- Debugger for Chrome / JS Debugger instalado
- venv activado al menos una vez para que el IDE lo detecte

---

## 9. Checklist Antes de PR → main (Producción)

- [ ] Staging (`develop`) funcionando sin errores
- [ ] Flujo principal probado: login → transacción → presupuesto
- [ ] Verificar Vercel Preview URL desde celular (iOS + Android)
- [ ] Sin `console.log` de debug en código
- [ ] Variables de entorno de prod configuradas en Vercel/Render
- [ ] Si hay migración DB: correr en Supabase prod antes del deploy
- [ ] Render health check pasa: `GET /api/health` → 200

---

## 10. Migraciones de DB

```bash
# Generar migración nueva
cd finance-dashboard-api-python
alembic revision --autogenerate -m "descripcion"

# Revisar el archivo generado en alembic/versions/ ANTES de aplicar
# Aplicar en local
alembic upgrade head

# Aplicar en staging (conectar a Supabase dev)
DATABASE_URL=<staging-url> alembic upgrade head

# Aplicar en prod ANTES del deploy de código
DATABASE_URL=<prod-url> alembic upgrade head
# Luego hacer deploy
```

> **Regla:** migración de DB siempre ANTES del deploy de código nuevo que la requiere.

---

## 11. Qué NO hacer

- No commitear `.env` (está en `.gitignore`, verificar siempre)
- No hacer `git push --force` a `main` o `develop`
- No mergear a `main` sin haber probado en staging
- No deployar a prod un viernes a la tarde
- No hardcodear URLs — siempre usar variables de entorno
