# Plan de QA y Bugfixing (Previo a Mercado Pago)

Este documento es una guía de tareas para revisar y reparar bugs reportados o funcionalidades incompletas. El objetivo es estabilizar completamente el MVP antes de integrar la sincronización avanzada con Mercado Pago.

## Lista de Tareas para Claude (Bugfixing)

### 1. Interfaz y Experiencia de Usuario (UI/UX)
- [ ] **Modo Oscuro (Dark Mode):** 
  - Investigar por qué el botón o interruptor de modo oscuro no cambia los colores del tema.
  - Revisar si el estado de `dark_mode` en el backend se guarda y si Tailwind (clases `dark:`) o el Contexto de Tema en React están operando correctamente en toda la app.
- [ ] **Responsividad (Opcional pero recomendado):**
  - Chequear que las tarjetas del Dashboard, la barra lateral expandible y la sección de academia se adapten al 100% en dispositivos móviles.

### 2. Funciones Ocultas o Rotas
- [ ] **Ahorros / Objetivos (Saving Goals):** 
  - **Error Reportado:** El botón para hacer un depósito dentro de los objetivos no está funcionando después de que se establece uno y se hace clic en él.
  - **Acción requerida:** Rastrear el botón de "Agregar fondos" o "Depositar" en el Dashboard o la sección de Metas. Asegurar que abra un Modal y pegue contra el endpoint correcto del backend para sumar al `current_amount` o registre una transacción dedicada a ese ID.
- [ ] **Operatividad General de Transacciones:**
  - Chequear la estabilidad global de creación, lectura y borrado de transacciones sueltas.

### 3. Autenticación Google en la Nube
- [ ] Revisión del Estado de `origin_mismatch`:
  - Validar que habiendo corregido las URLs oficiales en Google Cloud Console, todo fluya sin fallos en producción (Vercel -> Render -> Supabase).

---

> **Aviso para uso:** Se ha cargado un usuario Seed listo para probar. 
> Email: `demo@demo.com` | Password: `demo123`
> *(Contiene cuentas precargadas, presupuestos, ingresos y objetivos de prueba).*
