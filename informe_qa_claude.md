# Informe de QA Funcionalidad - FinanzApp MVP

Este informe documenta los errores de funcionalidad detectados durante la revisión de QA de la aplicación web ejecutándose en modo local. Este informe debe ser compartido con Claude Code para que proceda con los respectivos arreglos en el código.

## Resumen de la Ejecución

- **Frontend:** Ejecutado en `http://localhost:5173/`
- **Backend:** Ejecutado en `http://localhost:8000/`
- **Usuario de pruebas:** `demo@demo.com` / `demo123`

## Bugs Críticos Encontrados

### 1. Bloqueo en Transacciones y Presupuestos (Carga Infinita)

- **Problema:** En los formularios para crear **Transacciones** o **Presupuestos**, los selectores de "Categoría" y "Cuenta" se quedan bloqueados en el estado de **"Cargando categorías..."** indefinidamente.
- **Impacto:** Bloquea por completo el "Core" de la aplicación. No es posible crear transacciones ni presupuestos porque estos campos son obligatorios.
- **Fallo Secundario:** Al intentar la creación manual de una categoría como solución rápida (escribiendo un nuevo nombre), el sistema arroja el mensaje genérico **"Error al crear la categoría"**.

### 2. Error 422 en Metas de Ahorro (Savings Goals)

- **Problema:** Al intentar crear una "Nueva Meta", luego de completar el formulario y dar click en "Añadir Meta", la petición falla silenciosamente en la UI y el backend devuelve un error **422 (Unprocessable Entity)**.
- **Impacto:** Impide la creación de metas. Esto además hace imposible probar el bug previamente conocido ("el botón de depositar fondos en un objetivo existente no funciona") ya que ni siquiera es posible crear un objetivo nuevo en una base de datos fresca.
- **Causa probable:** Desajuste entre el payload que envía el frontend y el esquema de validación Pydantic que espera el endpoint `POST /api/savings-goals/`.

### 3. Claves de Internacionalización (i18n) Visibles

- **Problema:** Múltiples textos de la interfaz no se están traduciendo y se muestra la clave cruda del diccionario de traducciones.
- **Ejemplos detectados:**
  - `sidebar.recurring` (visible en el menú lateral)
  - `dashboard.online` (visible en el encabezado del panel de control)

### 4. Valores Quemados en Login

- **Problema:** Al cargar la pantalla de inicio de sesión, el input del email viene precargado con el valor "quemado" `joselito@gmail.com`.
- **Impacto:** Experiencia de usuario (UX) deficiente; obliga al usuario a borrar manualmente ese correo antes de poder ingresar sus credenciales reales o las credenciales de demo (`demo@demo.com`).

---

> **Prioridad para Claude Code:** Se recomienda atacar de inmediato el problema de la **carga infinita de categorías/cuentas** y el **error 422 en las metas de ahorro**, ya que estos dos bugs bloquean más del 60% de la funcionalidad activa del MVP.
