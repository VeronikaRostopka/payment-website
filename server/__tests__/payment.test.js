const request = require('supertest');
const app = require('../index');

describe('Payment Gateway Tests', () => {
    describe('Card Validation', () => {
        it('should validate card number (16 digits)', async () => {
            const invalidCard = {
                holder: 'John Doe',
                number: '123', // Invalid: less than 16 digits
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard);
            
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'number')).toBeTruthy();
        });

        it('should validate expiration date (MM/YY format)', async () => {
            const invalidCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '13/25', // Invalid: month > 12
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard);
            
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'exp')).toBeTruthy();
        });

        it('should validate CVV (3 digits)', async () => {
            const invalidCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '12', // Invalid: less than 3 digits
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard);
            
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'cvv')).toBeTruthy();
        });

        it('should validate card holder name (2-100 chars)', async () => {
            const invalidCard = {
                holder: 'J', // Invalid: too short
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(invalidCard);
            
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'holder')).toBeTruthy();
        });

        it('should accept valid card data', async () => {
            const validCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(validCard);
            
            expect(res.status).toBe(200);
            expect(res.body.id).toBeDefined();
        });
    });

    describe('Card Processing', () => {
        it('should store card data and return ID', async () => {
            const cardData = {
                holder: 'John Smith',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(cardData);
            
            expect(res.status).toBe(200);
            expect(res.body.id).toBeDefined();
            expect(typeof res.body.id).toBe('number');
        });

        it('should retrieve stored card data', async () => {
            // First, create a card
            const cardData = {
                holder: 'Jane Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const createRes = await request(app)
                .post('/api/cards')
                .send(cardData);

            // Then try to retrieve it
            const res = await request(app)
                .get('/api/cards');
            
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBeTruthy();
            expect(res.body.some(card => card.holder === 'Jane Doe')).toBeTruthy();
        });
    });
}); 