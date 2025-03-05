const request = require('supertest');
const app = require('../../index');

describe('Security Tests', () => {
    describe('CSRF Protection', () => {
        it('should reject requests without CSRF token', async () => {
            const cardData = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            await request(app)
                .post('/api/cards')
                .send(cardData)
                .expect(403); // Should be rejected without CSRF token
        });
    });

    describe('XSS Protection', () => {
        it('should sanitize card holder name with potential XSS', async () => {
            const cardData = {
                holder: '<script>alert("XSS")</script>John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(cardData)
                .expect(400);

            // The sanitized name should not contain script tags
            expect(res.body.sanitizedHolder).not.toContain('<script>');
        });
    });

    describe('Rate Limiting', () => {
        it('should limit repeated requests', async () => {
            const attempts = Array(101).fill().map(() => 
                request(app)
                    .get('/api/cards')
                    .expect('Content-Type', /json/)
            );

            const results = await Promise.all(attempts);
            
            // The last request should be rate limited
            expect(results[100].status).toBe(429);
        });
    });

    describe('Security Headers', () => {
        it('should have security headers', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers).toHaveProperty('x-frame-options', 'DENY');
            expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(res.headers).toHaveProperty('x-xss-protection', '1; mode=block');
            expect(res.headers).toHaveProperty('content-security-policy');
        });
    });
}); 