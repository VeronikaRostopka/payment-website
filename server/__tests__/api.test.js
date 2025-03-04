const request = require('supertest');
const app = require('../index');

describe('Payment API Tests', () => {
    describe('GET /api/cards', () => {
        it('should return 200 OK with cards array', async () => {
            const res = await request(app)
                .get('/api/cards')
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(Array.isArray(res.body)).toBeTruthy();
        });
    });

    describe('POST /api/cards', () => {
        it('should validate card data', async () => {
            const invalidCard = {
                holder: 'Jo', // Too short
                number: '123', // Invalid number
                exp: '13/25', // Invalid month
                cvv: '12' // Invalid CVV
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.length).toBeGreaterThan(0);
        });

        it('should accept valid card data', async () => {
            const validCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(validCard)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.id).toBeDefined();
        });
    });
}); 