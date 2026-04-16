# App Financiera MVP

Este es el MVP (Producto Viable Mínimo) de la Aplicación Financiera. Está dividido en dos partes principales:
- **Backend**: API construida con Python y FastAPI, utilizando SQLAlchemy para la conexión con la base de datos (Supabase - PostgreSQL).
- **Frontend**: Interfaz de usuario construida con React y Vite.

## Estructura del Proyecto

- `finance-dashboard-api-python/`: Contiene el código fuente del backend.
- `finance-dashboard-mvp/`: Contiene el código fuente del frontend.

## Requisitos Previos

- Python 3.9+
- Node.js 18+ (y npm)
- Cuenta y proyecto en Supabase (para la base de datos PostgreSQL)

---

## 🚀 Cómo Iniciar el Backend

El backend se encarga de manejar la lógica de negocio, la conexión a la base de datos y proveer los endpoints de la API.

1. **Abrir una terminal** y navegar a la carpeta del backend:
   ```bash
   cd finance-dashboard-api-python
   ```

2. **Crear y activar un entorno virtual** (recomendado):
   ```bash
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   ```

3. **Instalar las dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar Variables de Entorno**:
   Asegúrate de que existe un archivo `.env` en la carpeta `finance-dashboard-api-python` con la siguiente estructura (reemplaza con tu string de base de datos):
   ```env
   DATABASE_URL="postgresql://postgres.[tu-id]:[tu-password]@[tu-host]:5432/postgres"
   JWT_SECRET="un_secreto_seguro_para_jwt"
   PORT=8000
   FRONTEND_URL="http://localhost:5173"
   ```

5. **Iniciar el servidor local**:
   ```bash
   uvicorn main:app --reload
   ```
   *El backend estará corriendo en: `http://localhost:8000`*

   *(Nota: Puedes ejecutar `python test_api.py` en otra terminal, solo mientras el servidor FastAPI esté corriendo, para verificar que la API funcione correctamente).*

---

## 🎨 Cómo Iniciar el Frontend

El frontend ofrece la interfaz visual donde los usuarios pueden iniciar sesión y ver su panel financiero.

1. **Abrir una nueva terminal** (manteniendo el backend corriendo) y navegar a la carpeta del frontend:
   ```bash
   cd finance-dashboard-mvp
   ```

2. **Instalar las dependencias**:
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno**:
   Asegúrate de que existe un archivo `.env` en la carpeta `finance-dashboard-mvp`:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

4. **Ejecutar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   *El frontend estará corriendo en: `http://localhost:5173` (o un puerto similar, la consola te avisará).*

## ✅ Diagnóstico de Errores Comunes

- **"No connection could be made because the target machine actively refused it"**: Este error indica que el frontend o los tests están intentando comunicarse con el backend (puerto 8000), pero el servidor FastAPI no está corriendo. Recuerda ejecutar `uvicorn main:app --reload` antes.
- **Errores de CORS**: Asegúrate de que el backend tiene en `FRONTEND_URL` el puerto correcto en el que está corriendo el frontend (comúnmente `5173`).
- **Error conectando a Supabase**: Revisa que la `DATABASE_URL` del backend no utilice puertos u hosts incompatibles y que tengas habilitada la versión IPv4 si tu red lo requiere.
