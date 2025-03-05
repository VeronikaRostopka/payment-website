const request = require('supertest');
const app = require('../../index');

describe('Admin Panel Tests', () => {
    describe('Card Management', () => {
        it('should list all cards', async () => {
            const res = await request(app)
                .get('/api/cards')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(res.body)).toBeTruthy();
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('id');
                expect(res.body[0]).toHaveProperty('holder');
                expect(res.body[0]).toHaveProperty('number');
                expect(res.body[0]).toHaveProperty('exp');
                expect(res.body[0]).toHaveProperty('cvv');
                expect(res.body[0]).toHaveProperty('page');
            }
        });

        it('should update card status', async () => {
            // First, create a card
            const cardData = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            const createRes = await request(app)
                .post('/api/cards')
                .send(cardData)
                .expect(200);

            const cardId = createRes.body.id;

            // Then update its status
            const res = await request(app)
                .put(`/api/cards/${cardId}/status`)
                .send({ status: 'approved' })
                .expect(200);

            expect(res.body.message).toBe('Status updated');
        });
    });

    describe('QR Code Management', () => {
        it('should get QR code for valid site number', async () => {
            await request(app)
                .get('/qr/1')
                .expect(200);
        });

        it('should reject invalid site number', async () => {
            await request(app)
                .get('/qr/4') // Invalid site number
                .expect(400);
        });

        it('should upload new QR code', async () => {
            // Note: This test requires a real QR code file
            // In a real test, you would use a test file
            await request(app)
                .post('/admin/upload-qr')
                .field('siteNumber', '1')
                .attach('qrCode', 'path/to/test/qr.png')
                .expect(200);
        });
    });
}); 