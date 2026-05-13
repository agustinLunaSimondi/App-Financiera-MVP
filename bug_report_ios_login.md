# Bug Report: Login Bloqueado en iOS — Flash del Dashboard + Redirección Permanente a Login

**Fecha:** 11 de Mayo, 2026  
**Severidad:** 🔴 Crítica — El usuario nunca puede acceder a la app en iOS  
**Plataforma afectada:** iOS Safari / PWA instalada en Home Screen  
**Workaround disponible:** ❌ Ninguno. Reintentar el login no resuelve el problema.

---

## Descripción del Síntoma

Al iniciar sesión en la app desde un iPhone, el dashboard aparece brevemente (~200-500ms) y la app redirige automáticamente de vuelta a `/login`. El problema **persiste en todos los intentos de login sucesivos** — la app nunca llega a cargarse correctamente.

---

## Causa Raíz: Dos Bugs Encadenados

El síntoma es causado por **dos bugs que se potencian entre sí**, ambos en la capa de autenticación/estado. Ninguno alcanza para producir el bloqueo permanente por sí solo; es la combinación la que hace que nunca se resuelva.

---

### 🐛 Bug #1 (Disparador): Race Condition entre `checkAuth()` y `login()`

**Archivo:** `finance-dashboard-mvp/src/contexts/AuthContext.jsx`

Al montar la app, `AuthProvider` lanza un `checkAuth()` asíncrono para verificar si hay una sesión previa. Si el usuario tiene un **token expirado** en `localStorage`, este proceso:

1. Lee el token viejo.
2. Hace `GET /auth/me` al backend (que en Render Free Tier puede tardar 5-15s por cold start).
3. Recibe un `401`.
4. Ejecuta `clearToken()` + `setUser(null)`.

El problema es que el usuario puede completar el formulario de login y hacer submit **mientras este proceso está en vuelo**. La secuencia de estados resultante es:

```
[checkAuth]  Envía GET /auth/me con token viejo ────────────────────────────► recibe 401
                                                                                   │
[login()]    setToken(nuevoToken)  ← _token en memoria = nuevoToken               │
             setUser(user)         ← isAuthenticated = true                        │
                                                                                   │
[PrivateLayout] renderiza Dashboard brevemente ◄───────────────────────────────── │
                                                                                   ▼
                                                              clearToken()  ← _token = null
                                                              setUser(null) ← isAuthenticated = false
                                                              → <Navigate to="/login" />
```

**El resultado**: el token nuevo que acaba de llegar del login es borrado por el `catch` del `checkAuth` que terminó después.

**El código exacto:**

```js
// AuthContext.jsx — línea 40-44
} catch (error) {
    console.warn("Sesión inválida o expirada:", error?.response?.status);
    clearToken();   // ← borra el token recién seteado por login()
    setUser(null);  // ← pisa al usuario autenticado
}
```

---

### 🐛 Bug #2 (Bloqueador): El 2do intento tampoco funciona — `loadData` dispara `auth:invalid`

**Archivos:** `finance-dashboard-mvp/src/contexts/FinanceContext.jsx` + `src/services/client.js`

Incluso si el Bug #1 no ocurriera (o si el usuario reintenta el login), existe un segundo mecanismo que produce el logout:

Cuando `isAuthenticated` cambia a `true`, `FinanceContext` lanza `loadData()`, que hace **7 llamadas API en paralelo** con `Promise.allSettled`. En el momento en que estas requests salen al servidor, el token en la variable `_token` en memoria puede haber sido ya borrado por el `catch` del Bug #1 (que ocurre de forma asíncrona).

```js
// FinanceContext.jsx — línea 39-47
const results = await Promise.allSettled([
    api.getTransactions(filters),   // GET /transactions — usa _token
    api.getBudgets(),               // GET /budgets — usa _token
    api.getAccounts(),              // GET /accounts — usa _token
    api.getCategories(),            // GET /categories — usa _token
    api.getSettings(),              // GET /auth/me — usa _token
    api.getSavingsGoals(),          // GET /savings-goals — usa _token
    api.getRecurring()              // GET /recurring — usa _token
]);
```

Si alguna de estas requests sale con `_token = null` (porque `clearToken()` del Bug #1 ya corrió), llega al backend **sin Authorization header** y recibe un `401`. El interceptor de `client.js` lo captura:

```js
// client.js — línea 68-75
if (!skipPerRequest && !skipByPath) {
    clearToken();
    emitAuthInvalid();  // ← dispara el evento global
}
```

`AuthContext` escucha este evento y ejecuta:

```js
// AuthContext.jsx — línea 59-64
const onInvalid = () => {
    clearToken();
    setUser(null);  // ← segundo logout, esta vez definitivo
};
```

Esto produce un **segundo ciclo de logout** incluso si el primer login parecía haber funcionado. Como en iOS el backend tarda más en responder (Render cold start), la ventana de tiempo en que esto ocurre es mucho mayor que en desktop, haciendo el bug permanente.

**Por qué nunca se resuelve:** En cada intento de login, si hay un token expirado en memoria o localStorage, el Bug #1 rompe el estado. El Bug #2 luego actúa como un "seguro" que cierra cualquier sesión que haya podido sobrevivir, porque alguna de las 7 requests de `loadData` inevitablemente sale sin token válido durante la ventana de la race condition.

---

## Diagrama Completo del Flujo Fallido

```
App carga en iOS
      │
      ├─► AuthContext monta → checkAuth() inicia (GET /auth/me, token viejo)
      │         │
      │   [5-15s cold start en Render]
      │         │
      ├─► Usuario completa login form → login() llama POST /auth/login
      │         │
      │         ├── setToken(nuevo)  → _token = nuevo ✓
      │         ├── setUser(user)    → isAuthenticated = true ✓
      │         │
      │   [FinanceContext detecta isAuthenticated=true → loadData() inicia]
      │         │
      │         ├── 7 requests salen, algunas con _token=nuevo, algunas quizá sin token
      │         │
      │   [checkAuth() finalmente recibe el 401]
      │         │
      │         ├── clearToken()  → _token = null ← BORRA TOKEN NUEVO
      │         ├── setUser(null) → isAuthenticated = false
      │         │
      │   [requests de loadData sin token → reciben 401]
      │         │
      │         └── emitAuthInvalid() → setUser(null) [2do logout]
      │
      └─► <Navigate to="/login" /> ← usuario bloqueado permanentemente
```

---

## Archivos Afectados

| Archivo | Rol en el Bug |
|---|---|
| `src/contexts/AuthContext.jsx` | **Bug #1**: `catch` de `checkAuth` pisa el estado de `login()`. Sin protección contra race condition. |
| `src/contexts/FinanceContext.jsx` | **Bug #2**: `loadData` con 7 requests paralelas en el momento en que el token puede estar siendo borrado. |
| `src/services/client.js` | **Bug #2**: El interceptor 401 emite `auth:invalid` para endpoints core, lo que cierra la sesión si alguna request de `loadData` sale sin token. |
| `src/services/tokenStore.js` | ✅ Correcto. El fallback en memoria ya está implementado. No requiere cambios. |

---

## Solución Propuesta

### Fix #1 — `AuthContext.jsx`: Invalidar `checkAuth` cuando `login()` es invocado

Agregar un `useRef` que actúa como "bandera de cancelación" para el `catch` de `checkAuth`:

```jsx
// AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import client from '../services/client';
import { getToken, setToken, clearToken, AUTH_INVALID_EVENT } from '../services/tokenStore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

const LoadingShell = ({ slow }) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" aria-label="Cargando" />
        {slow && (
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
                Despertando el servidor… esto puede tardar unos segundos la primera vez.
            </p>
        )}
    </div>
);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [slowConnection, setSlowConnection] = useState(false);

    // ✅ NUEVO: ref para cancelar el efecto de checkAuth si el usuario hace login activo
    const checkAuthCancelledRef = useRef(false);

    useEffect(() => {
        checkAuthCancelledRef.current = false;
        const slowTimer = setTimeout(() => setSlowConnection(true), 5000);

        const checkAuth = async () => {
            const token = getToken();
            if (token) {
                try {
                    const res = await client.get('/auth/me', { __skipAuthRedirect: true });
                    // ✅ Solo actualizar si el usuario no hizo login activo mientras tanto
                    if (!checkAuthCancelledRef.current) {
                        setUser(res.data);
                    }
                } catch (error) {
                    console.warn("Sesión inválida o expirada:", error?.response?.status);
                    // ✅ Solo limpiar si no hubo un login activo
                    if (!checkAuthCancelledRef.current) {
                        clearToken();
                        setUser(null);
                    }
                }
            }
            clearTimeout(slowTimer);
            setSlowConnection(false);
            // ✅ Solo poner loading=false si nadie más ya lo hizo
            if (!checkAuthCancelledRef.current) {
                setLoading(false);
            }
        };
        checkAuth();

        return () => {
            checkAuthCancelledRef.current = true;
            clearTimeout(slowTimer);
        };
    }, []);

    useEffect(() => {
        const onInvalid = () => {
            clearToken();
            setUser(null);
        };
        window.addEventListener(AUTH_INVALID_EVENT, onInvalid);
        return () => window.removeEventListener(AUTH_INVALID_EVENT, onInvalid);
    }, []);

    const login = useCallback(async (email, password) => {
        // ✅ Cancelar checkAuth antes de setear el nuevo estado
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/login', { email, password });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false); // ✅ Asegurar que loading no quede bloqueado en true
        return user;
    }, []);

    const loginWithGoogle = useCallback(async (credential) => {
        // ✅ Mismo fix para Google OAuth
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/google', { credential });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        return user;
    }, []);

    const register = useCallback(async (name, email, password) => {
        // ✅ Mismo fix para registro
        checkAuthCancelledRef.current = true;
        const res = await client.post('/auth/register', { name, email, password });
        const { token, user } = res.data;
        setToken(token);
        setUser(user);
        setLoading(false);
        return user;
    }, []);

    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);

    const value = {
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        isAuthenticated: !!user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingShell slow={slowConnection} /> : children}
        </AuthContext.Provider>
    );
}
```

### Fix #2 — `FinanceContext.jsx`: No disparar `loadData` hasta que el token esté confirmado

Agregar una verificación de token antes de lanzar las requests, para evitar que salgan sin Authorization header:

```js
// FinanceContext.jsx — dentro de loadData, al inicio de la función
const loadData = useCallback(async () => {
    // ✅ NUEVO: verificar que hay token antes de hacer requests
    // Previene el caso donde isAuthenticated=true pero _token ya fue borrado
    // por la race condition de checkAuth
    const { getToken } = await import('../services/tokenStore');
    if (!getToken()) {
        console.warn('[FinanceContext] loadData abortado: no hay token disponible');
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    // ... resto igual
}, [filters]);
```

---

## Verificación Post-Fix

Para confirmar que los fixes funcionan, probar el siguiente escenario en iOS:

1. Cerrar sesión (deja token expirado en localStorage).
2. Forzar un cold start del backend (no usarlo por 15+ minutos).
3. Abrir la app en Safari iOS.
4. Ser redirigido a `/login` — verificar que el spinner de loading aparece y desaparece normalmente.
5. Completar el login durante los primeros 3 segundos (antes de que checkAuth termine).
6. **Resultado esperado con el fix:** el dashboard carga normalmente y permanece estable.

---

## Notas Adicionales

- **Bug #3 (Performance):** `loadData` en `FinanceContext` tiene `filters` como dependencia de `useCallback`, lo que genera una nueva referencia de función cada vez que cambian los filtros. Esto hace que el `useEffect([isAuthenticated, loadData])` se re-ejecute en cada cambio de filtro, duplicando las requests. Es un bug de performance separado, no urgente, pero vale la pena corregirlo en la misma sesión de trabajo.

- `tokenStore.js` ya tiene implementado el fallback en memoria para iOS ITP/Private Mode. **No necesita cambios.**

- `client.js` tiene correctamente configurada la flag `__skipAuthRedirect` y el blocklist de endpoints de MercadoPago. **No necesita cambios.**
