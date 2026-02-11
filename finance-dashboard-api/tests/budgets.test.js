const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

describe('Budgets Endpoints', () => {
    let testUser = {
        email: `budget_test_${Date.now()}@example.com`,
        password: 'password123',
        name: 'Budget Test User'
    };
    let token = '';
    let categoryId = '';
    let budgetId = '';

    beforeAll(async () => {
        // Register and Login
        const regRes = await request(app).post('/api/auth/register').send(testUser);
        token = regRes.body.token;

        // Get a default category
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

    it('should create a new budget', async () => {
        const res = await request(app)
            .post('/api/budgets')
            .set('Authorization', `Bearer ${token}`)
            .send({
                categoryId,
                amount: 500,
                period: 'MONTHLY',
                startDate: new Date().toISOString()
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        budgetId = res.body.id;
    });

    it('should list budgets', async () => {
        const res = await request(app)
            .get('/api/budgets')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should update a budget', async () => {
        const res = await request(app)
            .put(`/api/budgets/${budgetId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                amount: 600
            });

        expect(res.statusCode).toEqual(200);
        expect(Number(res.body.amount)).toEqual(600);
    });

    it('should delete a budget', async () => {
        const res = await request(app)
            .delete(`/api/budgets/${budgetId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(204);
    });
});
