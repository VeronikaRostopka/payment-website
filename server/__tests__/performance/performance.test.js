const request = require('supertest');
const app = require('../../index');

describe('Performance Tests', () => {
    describe('Response Time Tests', () => {
        it('should respond to GET /api/cards within 200ms', async () => {
            const start = Date.now();
            await request(app).get('/api/cards');
            const end = Date.now();
            const responseTime = end - start;
            
            expect(responseTime).toBeLessThan(200);
        });

        it('should respond to POST /api/cards within 500ms', async () => {
            const cardData = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const start = Date.now();
            await request(app).post('/api/cards').send(cardData);
            const end = Date.now();
            const responseTime = end - start;
            
            expect(responseTime).toBeLessThan(500);
        });
    });

    describe('Load Tests', () => {
        it('should handle 50 simultaneous GET requests', async () => {
            const requests = Array(50).fill().map(() => 
                request(app).get('/api/cards')
            );

            const start = Date.now();
            const responses = await Promise.all(requests);
            const end = Date.now();
            
            const totalTime = end - start;
            const avgResponseTime = totalTime / 50;

            expect(avgResponseTime).toBeLessThan(100);
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        it('should handle 20 simultaneous POST requests', async () => {
            const cardData = {
                holder: 'Test User',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const requests = Array(20).fill().map(() => 
                request(app).post('/api/cards').send(cardData)
            );

            const start = Date.now();
            const responses = await Promise.all(requests);
            const end = Date.now();
            
            const totalTime = end - start;
            const avgResponseTime = totalTime / 20;

            expect(avgResponseTime).toBeLessThan(200);
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });
    });

    describe('Memory Usage Tests', () => {
        it('should maintain stable memory usage during heavy load', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Generate heavy load
            const requests = Array(100).fill().map(() => 
                request(app).get('/api/cards')
            );
            
            await Promise.all(requests);
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be less than 50MB
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });
}); 