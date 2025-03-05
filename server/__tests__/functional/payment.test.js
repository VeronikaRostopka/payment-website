const request = require('supertest');
const app = require('../../index');

describe('Payment Gateway Tests', () => {
    describe('Card Validation', () => {
        it('should validate card number (16 digits)', async () => {
            const invalidCard = {
                holder: 'John Doe',
                number: '123', // Invalid: less than 16 digits
                exp: '12/25',
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'number')).toBeTruthy();
        });

        it('should validate expiration date (MM/YY format)', async () => {
            const invalidCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '13/25', // Invalid: month > 12
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'exp')).toBeTruthy();
        });

        it('should validate CVV (3 digits)', async () => {
            const invalidCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '12' // Invalid: less than 3 digits
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'cvv')).toBeTruthy();
        });

        it('should validate card holder name (2-100 chars)', async () => {
            const invalidCard = {
                holder: 'J', // Invalid: too short
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'holder')).toBeTruthy();
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