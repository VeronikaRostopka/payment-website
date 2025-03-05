const request = require('supertest');
const { app } = require('../../index');

describe('Enhanced Security Tests', () => {
    describe('Headers Security', () => {
        it('should have secure headers', async () => {
            const res = await request(app)
                .get('/');
            
            expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(res.headers).toHaveProperty('x-frame-options', 'deny');
            expect(res.headers).toHaveProperty('x-xss-protection', '1; mode=block');
        });
    });

    describe('Input Validation', () => {
        it('should reject XSS attempts', async () => {
            const maliciousData = {
                holder: '<script>alert("xss")</script>John',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(maliciousData);

            expect(res.status).toBe(400);
        });

        it('should reject SQL injection attempts', async () => {
            const maliciousData = {
                holder: "Robert'); DROP TABLE cards; --",
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(maliciousData);

            expect(res.status).toBe(400);
        });
    });

    describe('Rate Limiting', () => {
        it('should limit repeated requests', async () => {
            const requests = Array(101).fill().map(() => 
                request(app).get('/api/cards')
            );

            const results = await Promise.all(requests);
            const lastResponse = results[results.length - 1];

            expect(lastResponse.status).toBe(429);
        });
    });

    describe('CSRF Protection', () => {
        it('should reject requests without CSRF token', async () => {
            const res = await request(app)
                .post('/api/cards')
                .send({
                    holder: 'John Doe',
                    number: '4111111111111111',
                    exp: '12/25',
                    cvv: '123'
                });

            expect(res.status).toBe(403);
        });
    });
}); 