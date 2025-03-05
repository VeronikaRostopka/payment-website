const io = require('socket.io-client');
const app = require('../../index');
const http = require('http');

describe('WebSocket Tests', () => {
    let server;
    let clientSocket;
    let adminSocket;

    beforeAll((done) => {
        server = http.createServer(app);
        server.listen(() => {
            const port = server.address().port;
            clientSocket = io(`http://localhost:${port}`);
            adminSocket = io(`http://localhost:${port}`);
            done();
        });
    });

    afterAll(() => {
        server.close();
        clientSocket.close();
        adminSocket.close();
    });

    describe('Chat Functionality', () => {
        it('should receive initial cards on connection', (done) => {
            clientSocket.on('initial_cards', (data) => {
                expect(Array.isArray(data)).toBeTruthy();
                done();
            });
        });

        it('should update all clients when new card is added', (done) => {
            const cardData = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            adminSocket.on('cards_update', (data) => {
                expect(Array.isArray(data)).toBeTruthy();
                expect(data.some(card => card.holder === 'John Doe')).toBeTruthy();
                done();
            });

            clientSocket.emit('new_card', cardData);
        });

        it('should update status for all clients', (done) => {
            const statusData = {
                id: 1,
                status: 'approved'
            };

            clientSocket.on('cards_update', (data) => {
                expect(Array.isArray(data)).toBeTruthy();
                expect(data.some(card => card.id === 1 && card.status === 'approved')).toBeTruthy();
                done();
            });

            adminSocket.emit('update_status', statusData);
        });
    });

    describe('Real-time Updates', () => {
        it('should maintain connection for extended period', (done) => {
            let messageCount = 0;
            const expectedMessages = 5;
            
            clientSocket.on('ping', () => {
                messageCount++;
                if (messageCount === expectedMessages) {
                    done();
                }
            });

            // Send 5 ping messages with 1 second interval
            let sent = 0;
            const interval = setInterval(() => {
                if (sent < expectedMessages) {
                    adminSocket.emit('ping');
                    sent++;
                } else {
                    clearInterval(interval);
                }
            }, 1000);
        }, 6000); // Test timeout after 6 seconds
    });
}); 