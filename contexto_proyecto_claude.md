# Contexto del Proyecto: App Financiera MVP

Este documento proporciona una visión integral y detallada del proyecto **App Financiera MVP** (finanzapp-mvp). Está diseñado específicamente para dar contexto a agentes de IA (como Claude Code) que se integren al desarrollo, permitiéndoles comprender rápidamente la arquitectura, el stack tecnológico, las convenciones y el estado actual del proyecto.

---

## 1. Visión General del Proyecto

Es un Dashboard Financiero Full-Stack (MVP) que permite a los usuarios gestionar sus finanzas personales, hacer seguimiento de sus ingresos, gastos, presupuestos y metas de ahorro. El objetivo es ofrecer una experiencia premium con una interfaz de usuario moderna (enfocada en UI/UX) y un backend robusto.

El proyecto está dividido en dos repositorios/carpetas principales:
- **Frontend:** `finance-dashboard-mvp/`
- **Backend:** `finance-dashboard-api-python/`

---

## 2. Stack Tecnológico

### 2.1 Backend (`finance-dashboard-api-python/`)
- **Lenguaje:** Python 3.9+
- **Framework Core:** FastAPI
- **Base de Datos:** PostgreSQL (alojada en **Supabase**)
- **ORM & Migraciones:** SQLAlchemy 2.0 y Alembic
- **Autenticación:** JWT (JSON Web Tokens) y Google OAuth (`google-auth`, `passlib`, `python-jose`)
- **Despliegue:** Render
- **Otras dependencias importantes:** `uvicorn` (Servidor ASGI), `psycopg2-binary` (Driver DB), `apscheduler` (Tareas programadas), `pydantic` (Validación de datos).

### 2.2 Frontend (`finance-dashboard-mvp/`)
- **Lenguaje/Entorno:** JavaScript (ESModules) / Node.js 18+
- **Framework Core:** React 19 empaquetado con Vite
- **Enrutamiento:** React Router DOM v7
- **Estilos:** Tailwind CSS v4 (Vanilla CSS preferido para customizaciones, evitar utilidades genéricas sin diseño)
- **Gráficos:** Recharts
- **Iconos & Animaciones:** Lucide React, Framer Motion
- **Autenticación:** `@react-oauth/google`
- **Notificaciones:** Sonner (Toast)
- **Despliegue:** Vercel

---

## 3. Arquitectura y Configuración

### 3.1 Base de Datos (Supabase)
- El proyecto se conecta a una instancia de PostgreSQL gestionada por Supabase.
- **Importante:** La conexión debe usar el string de conexión adecuado (`DATABASE_URL`) y soportar IPv4/IPv6 según el entorno de Render/Local.

### 3.2 Variables de Entorno
- **Backend (`.env`):** Requiere `DATABASE_URL`, `JWT_SECRET`, `PORT` (usualmente 8000), y `FRONTEND_URL`.
- **Frontend (`.env`):** Requiere `VITE_API_URL` apuntando al backend (ej. `http://localhost:8000/api` en local).

### 3.3 Datos de Prueba
- Existe un usuario semilla para facilitar el desarrollo:
  - **Email:** `demo@demo.com`
  - **Password:** `demo123`
  - *(Contiene cuentas precargadas, presupuestos, ingresos y metas de prueba).*

---

## 4. Funcionalidades Principales (MVP Actual)

1. **Autenticación:** Login/Registro tradicional y mediante Google OAuth.
2. **Dashboard Principal:** Tarjetas KPI (Saldo Total, Ingresos, Gastos, Ahorro Neto) y resúmenes gráficos.
3. **Gestión de Transacciones:** Creación, lectura, actualización y borrado (CRUD) de transacciones categorizadas.
4. **Metas de Ahorro (Saving Goals):** Creación de objetivos de ahorro con seguimiento de progreso.
5. **Presupuestos:** Definición y seguimiento de límites de gasto.
6. **Modo Claro/Oscuro:** Implementación de temas (actualmente presenta bugs).
7. **Diseño Responsivo:** Soporte para escritorio y dispositivos móviles.

---

## 5. Estado Actual: Bugs y Tareas Activas (QA Plan)

Actualmente, el proyecto se encuentra en una fase de estabilización antes de integrar pasarelas de pago (Mercado Pago). El agente debe tener especial cuidado con los siguientes problemas conocidos:

1. **Bug en Modo Oscuro:** El botón de modo oscuro no está cambiando correctamente los colores. Requiere investigar la persistencia del estado en el backend, el Contexto de React y la aplicación de las clases `dark:` en Tailwind.
2. **Bug en Metas de Ahorro:** El botón para "Depositar" o "Agregar fondos" dentro de una meta de ahorro existente no funciona. Falla la conexión con el endpoint del backend para actualizar el `current_amount` o registrar la transacción.
3. **Revisión de Google Auth en Producción:** Verificar el error `origin_mismatch` en Vercel/Render.
4. **Responsividad:** Asegurar que las tarjetas y la barra lateral se adapten 100% en móvil.

---

## 6. Roadmap a Futuro (Ideas y Mejoras)

*Estas características **no** son prioridad inmediata, pero dictan la dirección arquitectónica del código:*
- **UI/UX:** Implementar Glassmorphism avanzado, temas personalizados y widgets arrastrables.
- **Técnico:** Migración progresiva a TypeScript y refactorización del manejo de estado global a TanStack Query. PWA offline.
- **Nuevas Funciones:** Transacciones recurrentes automatizadas, simulador bancario, predicciones con IA y exportación a PDF.

---

## 7. Instrucciones Especiales para el Agente (Claude Code)

1. **Diseño Premium:** La interfaz debe sentirse extremadamente profesional ("Premium UI"). Evita colores genéricos y usa sombras, degradados, fuentes modernas (Inter, Outfit) y bordes sutiles.
2. **Manejo de Errores de Red:** Si ves errores de conexión ("actively refused"), asegúrate de recordar que el backend y frontend deben correr en puertos distintos y estar configurados en los CORS correspondientes.
3. **Scripts de Inicio:**
   - Frontend: `cd finance-dashboard-mvp` && `npm run dev`
   - Backend: `cd finance-dashboard-api-python`, activar `venv` y ejecutar `uvicorn main:app --reload`
4. **Consistencia:** Cuando modifiques o crees nuevos endpoints en Python, asegúrate de actualizar el cliente de Axios/Fetch en React inmediatamente.
