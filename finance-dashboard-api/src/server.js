const app = require('./app');
const dotenv = require('dotenv');

dotenv.config();

const { processRecurringTransactions } = require('./services/recurringProcessor');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 API corriendo en http://localhost:${PORT}`);
    console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);

    // Iniciar procesamiento de transacciones recurrentes
    processRecurringTransactions();

    // Ejecutar cada hora
    setInterval(processRecurringTransactions, 60 * 60 * 1000);
});
