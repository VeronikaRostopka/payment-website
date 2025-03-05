const request = require('supertest');
const app = require('../../index');

describe('OTP Tests', () => {
    let cardId;

    beforeAll(async () => {
        // Створюємо тестову картку
        const validCard = {
            holder: 'John Doe',
            number: '4111111111111111',
            exp: '12/25',
            cvv: '123'
        };

        const res = await request(app)
            .post('/api/cards')
            .send(validCard);
        
        cardId = res.body.id;
    });

    describe('OTP Validation', () => {
        it('should validate OTP length (6-8 digits)', async () => {
            const invalidOtp = {
                code: '12345', // Invalid: less than 6 digits
                cardId: cardId
            };

            const res = await request(app)
                .post('/api/otp')
                .send(invalidOtp)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'code')).toBeTruthy();
        });

        it('should validate OTP format (only digits)', async () => {
            const invalidOtp = {
                code: '123abc', // Invalid: contains letters
                cardId: cardId
            };

            const res = await request(app)
                .post('/api/otp')
                .send(invalidOtp)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'code')).toBeTruthy();
        });

        it('should accept valid OTP', async () => {
            const validOtp = {
                code: '123456',
                cardId: cardId
            };

            const res = await request(app)
                .post('/api/otp')
                .send(validOtp)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.status).toBe('success');
        });
    });

    describe('OTP Flow', () => {
        it('should handle OTP request', async () => {
            const res = await request(app)
                .post(`/api/cards/${cardId}/request-otp`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.message).toBe('OTP requested');
        });

        it('should handle OTP confirmation', async () => {
            const res = await request(app)
                .post(`/api/cards/${cardId}/confirm-otp`)
                .send({ code: '123456' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.status).toBe('confirmed');
        });

        it('should handle OTP rejection', async () => {
            const res = await request(app)
                .post(`/api/cards/${cardId}/reject-otp`)
                .send({ code: '123456' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.status).toBe('rejected');
        });
    });
}); 