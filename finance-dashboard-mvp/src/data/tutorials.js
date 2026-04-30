
export const tutorials = {
    'dashboard-101': {
        title: 'Dashboard 101',
        description: 'Aprende a interpretar tus KPIs, gráficos de ingresos vs gastos y el balance general.',
        badge: 'Básico',
        image: '/tutorials/dashboard-101.png',
        content: [
            {
                type: 'text',
                title: 'Entendiendo el Balance Total',
                text: 'El Balance Total es la suma de todos tus activos menos tus pasivos. Es la métrica más importante de tu salud financiera a largo plazo.'
            },
            {
                type: 'text',
                title: 'Ingresos vs Gastos',
                text: 'El gráfico de flujo de caja te permite ver rápidamente si estás gastando más de lo que ganas. El objetivo es mantener siempre la barra de ingresos por encima de la de gastos.'
            },
            {
                type: 'text',
                title: 'Tus KPIs principales',
                text: 'Los indicadores clave de rendimiento (KPIs) te muestran el ahorro neto del mes y el porcentaje de cumplimiento de tus metas.'
            }
        ]
    },
    'account-management': {
        title: 'Gestión de Cuentas',
        description: 'Cómo vincular tus cuentas bancarias, billeteras digitales y tarjetas para un seguimiento total.',
        badge: 'Esencial',
        image: '/tutorials/accounts.png',
        content: [
            {
                type: 'text',
                title: 'Tipos de Cuentas',
                text: 'Puedes agregar cuentas de Efectivo, Banco, Inversiones o Tarjetas de Crédito. Cada una tiene un comportamiento distinto en el sistema.'
            },
            {
                type: 'text',
                title: 'Conciliación Bancaria',
                text: 'Asegúrate de revisar periódicamente que el saldo en la app coincida con tu saldo real para mantener la precisión de los reportes.'
            }
        ]
    },
    'smart-budgets': {
        title: 'Presupuestos Inteligentes',
        description: 'Configura límites por categoría y recibe alertas cuando estés cerca de superarlos.',
        badge: 'Avanzado',
        image: '/tutorials/budgets.png',
        content: [
            {
                type: 'text',
                title: 'Creación de Presupuestos',
                text: 'Define un monto máximo mensual para categorías como Comida, Transporte o Entretenimiento.'
            },
            {
                type: 'text',
                title: 'Alertas de Consumo',
                text: 'El sistema te notificará cuando alcances el 80% y el 100% de tu presupuesto para evitar sorpresas a fin de mes.'
            }
        ]
    },
    'transactions': {
        title: 'Transacciones',
        description: 'Cómo categorizar gastos, filtrar por fecha y exportar reportes en CSV.',
        image: '/tutorials/transactions.png',
        content: [
            {
                type: 'text',
                title: 'Categorización Automática',
                text: 'FinanzApp intenta categorizar tus gastos automáticamente basándose en tus registros anteriores.'
            },
            {
                type: 'text',
                title: 'Filtros Avanzados',
                text: 'Busca transacciones específicas por nombre, categoría, fecha o rango de montos.'
            }
        ]
    },
    'savings-goals': {
        title: 'Metas de Ahorro',
        description: 'Crea objetivos, define plazos y observa el progreso de tu fondo de emergencia.',
        image: '/tutorials/savings.png',
        content: [
            {
                type: 'text',
                title: 'Fondo de Emergencia',
                text: 'Te recomendamos ahorrar entre 3 y 6 meses de tus gastos fijos como primer objetivo principal.'
            },
            {
                type: 'text',
                title: 'Progreso Visual',
                text: 'Sigue el avance de tus metas con gráficos de porcentaje y fechas estimadas de cumplimiento.'
            }
        ]
    },
    'integrations': {
        title: 'Integraciones',
        description: 'Vincula Mercado Pago y otras plataformas para automatizar tus registros.',
        image: '/tutorials/integrations.png',
        content: [
            {
                type: 'text',
                title: 'Mercado Pago Sync',
                text: 'Sincroniza tus movimientos de Mercado Pago de forma segura para no tener que cargar gastos manuales.'
            },
            {
                type: 'text',
                title: 'Exportación a Excel',
                text: 'Lleva tus datos a donde quieras exportando todo tu historial en formato CSV o Excel.'
            }
        ]
    }
};
