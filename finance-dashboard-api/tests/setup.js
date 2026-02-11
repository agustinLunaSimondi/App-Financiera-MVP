require('dotenv').config();
const prisma = require('../src/config/database');

// Después de todos los tests
afterAll(async () => {
    await prisma.$disconnect();
});
