const fs = require('fs');
require('dotenv').config();

async function main() {
    const log = [];
    log.push('--- DIAGNOSTIC LOG ---');
    log.push('CWD: ' + process.cwd());
    log.push('DATABASE_URL exists: ' + !!process.env.DATABASE_URL);

    if (process.env.DATABASE_URL) {
        // Mask password
        const sanitized = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
        log.push('DATABASE_URL value: ' + sanitized);
    } else {
        log.push('ERROR: DATABASE_URL MISSING');
    }

    try {
        const { PrismaClient } = require('@prisma/client');
        log.push('PrismaClient imported');
        const prisma = new PrismaClient();
        log.push('Connecting...');
        await prisma.$connect();
        log.push('✅ CONNECTION SUCCESSFUL');
        await prisma.$disconnect();
    } catch (e) {
        log.push('❌ CONNECTION ERROR: ' + e.message);
        log.push('Stack: ' + e.stack);
    }

    fs.writeFileSync('test-db.log', log.join('\n'));
    console.log('Log written to test-db.log');
}

main().catch(e => {
    fs.writeFileSync('test-db.log', 'CRASH: ' + e.message);
    console.error(e);
});
