const request = require('supertest');
const app = require('../index');

describe('Security Tests', () => {
    describe('Input Validation', () => {
        it('should sanitize XSS in card holder name', async () => {
            const maliciousCard = {
                holder: '<script>alert("XSS")</script>John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(maliciousCard);

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'holder')).toBeTruthy();
        });

        it('should prevent SQL injection in card number', async () => {
            const maliciousCard = {
                holder: 'John Doe',
                number: "' OR '1'='1",
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(maliciousCard);

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
            expect(res.body.errors.some(e => e.path === 'number')).toBeTruthy();
        });
    });

    describe('Rate Limiting', () => {
        it('should limit repeated requests', async () => {
            const requests = Array(101).fill().map(() => 
                request(app)
                    .get('/api/cards')
            );

            const results = await Promise.all(requests);
            const lastRequest = results[results.length - 1];
            
            expect(lastRequest.status).toBe(429); // Too Many Requests
        });
    });

    describe('Security Headers', () => {
        it('should set security headers', async () => {
            const res = await request(app)
                .get('/');

            expect(res.headers).toHaveProperty('x-frame-options');
            expect(res.headers).toHaveProperty('x-content-type-options');
            expect(res.headers).toHaveProperty('x-xss-protection');
            expect(res.headers).toHaveProperty('content-security-policy');
        });

        it('should set strict CSP headers', async () => {
            const res = await request(app)
                .get('/');

            const csp = res.headers['content-security-policy'];
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src 'self'");
            expect(csp).toContain("style-src 'self'");
        });
    });

    describe('CSRF Protection', () => {
        it('should reject requests without CSRF token', async () => {
            const cardData = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            const res = await request(app)
                .post('/api/cards')
                .send(cardData);

            expect(res.status).toBe(403); // Forbidden due to missing CSRF token
        });
    });

    describe('Session Security', () => {
        it('should set secure session cookie', async () => {
            const res = await request(app)
                .get('/');

            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies.some(cookie => 
                cookie.includes('Secure') && 
                cookie.includes('HttpOnly')
            )).toBeTruthy();
        });
    });
}); 