const { Pool } = require('pg');
require('dotenv').config();

async function listUsers() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const res = await pool.query('SELECT email FROM users LIMIT 5');
        console.log('EMAILS:', res.rows.map(r => r.email));
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await pool.end();
    }
}
listUsers();
