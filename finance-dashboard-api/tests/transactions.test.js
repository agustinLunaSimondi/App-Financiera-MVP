const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

describe('Transactions Endpoints', () => {
    let testUser = {
        email: `tx_test_${Date.now()}@example.com`,
        password: 'password123',
        name: 'Tx Test User'
    };
    let token = '';
    let accountId = '';
    let categoryId = '';
    let transactionId = '';

    beforeAll(async () => {
        // Register and Login
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        token = regRes.body.token;

        // Create a test account
        const accRes = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Test Account',
                type: 'CHECKING',
                balance: 1000
            });
        accountId = accRes.body.id;

        // Get a default category (Alimentación)
        const cats = await prisma.category.findMany({
            where: { userId: regRes.body.user.id, name: 'Alimentación' }
        });
        categoryId = cats[0].id;
    });

    afterAll(async () => {
        // Clean up
        await prisma.user.deleteMany({ where: { email: testUser.email } });
        await prisma.$disconnect();
    });

    it('should create a new transaction', async () => {
        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                accountId,
                categoryId,
                amount: -50.5,
                description: 'Cena de prueba',
                date: new Date().toISOString()
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        transactionId = res.body.id;
    });

    it('should list transactions', async () => {
        const res = await request(app)
            .get('/api/transactions')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body.transactions)).toBeTruthy();
        expect(res.body.transactions.length).toBeGreaterThan(0);
    });

    it('should update a transaction', async () => {
        const res = await request(app)
            .put(`/api/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                description: 'Cena de prueba actualizada',
                amount: -60
            });

        expect(res.statusCode).toEqual(200);
        expect(Number(res.body.amount)).toEqual(-60);
    });

    it('should delete a transaction', async () => {
        const res = await request(app)
            .delete(`/api/transactions/${transactionId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(204);
    });
});
