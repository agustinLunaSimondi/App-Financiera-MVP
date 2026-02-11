# 🚀 Roadmap del Finance Dashboard

Este documento detalla las ideas y mejoras planificadas para las siguientes etapas del proyecto. El objetivo es llevar la aplicación de un MVP a una herramienta financiera profesional y visualmente impactante.

## 🎨 Look & Feel (UI/UX)
- **Glassmorphism 2.0**: Refinar el estilo de las tarjetas con bordes más sutiles y reflejos dinámicos.
- **Animaciones Flexibles**: Implementar `framer-motion` para transiciones de página suaves y micro-interacciones en botones y modales.
- **Gráficos Interactivos**: Mejorar la visualización con `Recharts` permitiendo zoom y filtrado dinámico directamente sobre los gráficos.
- **Temas Personalizados**: Permitir al usuario elegir entre diferentes acentos de color además del verde esmeralda.
- **Dashboard Widgets**: Permitir que el usuario reorganice los componentes del dashboard (Drag & Drop).

## 📊 Funcionalidades Avanzadas
- **Transacciones Recurrentes**: Automatizar la creación de gastos fijos (alquiler, suscripciones) de forma mensual o semanal.
- **Predicciones con IA**: Utilizar los datos históricos para predecir el saldo al final del mes.
- **Escaneo de Recibos**: (Integración futura) Permitir subir fotos de tickets para extraer datos automáticamente.
- **Metas de Ahorro**: Crear una sección específica para definir metas (ej: "Vacaciones") y visualizar el progreso.
- **Exportación Profesional**: Generar informes mensuales en formato PDF con gráficos y resúmenes de rendimiento.

## 🛠️ Mejoras Técnicas
- **Tipado con TypeScript**: Migrar el frontend y backend a TypeScript para mayor seguridad.
- **Estado Global con TanStack Query**: Implementar caché avanzada y sincronización automática para evitar recargas innecesarias.
- **Simulador de Bancos**: Crear un servicio que simule la conexión con bancos reales para importar transacciones de prueba.
- **PWA (Progressive Web App)**: Permitir la instalación del dashboard en dispositivos móviles y funcionamiento offline básico.

## 📈 Análisis y Reportes
- **Comparativa Mensual**: Un componente que compare automáticamente el gasto actual con el del mes anterior por categoría.
- **Distribución de Patrimonio**: Ver la suma total de todas las cuentas y la evolución del valor neto en el tiempo.
