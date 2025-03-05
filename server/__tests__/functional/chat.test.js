const io = require('socket.io-client');
const app = require('../../index');
const http = require('http');

describe('Chat Tests', () => {
    let server;
    let adminSocket;
    let userSocket;
    const PORT = 3001;

    beforeAll((done) => {
        server = http.createServer(app);
        server.listen(PORT, () => {
            // Підключення адміністратора
            adminSocket = io(`http://localhost:${PORT}`, {
                query: { role: 'admin' }
            });

            // Підключення користувача
            userSocket = io(`http://localhost:${PORT}`, {
                query: { role: 'user' }
            });

            done();
        });
    });

    afterAll((done) => {
        adminSocket.close();
        userSocket.close();
        server.close(done);
    });

    describe('Chat Functionality', () => {
        it('should allow admin to send messages', (done) => {
            const testMessage = 'Test message from admin';

            userSocket.on('chat message', (message) => {
                expect(message).toBe(testMessage);
                done();
            });

            adminSocket.emit('chat message', testMessage);
        });

        it('should not allow user to send messages', (done) => {
            const testMessage = 'Test message from user';
            let messageReceived = false;

            adminSocket.on('chat message', () => {
                messageReceived = true;
            });

            userSocket.emit('chat message', testMessage);

            // Перевіряємо через 1 секунду, що повідомлення не було отримано
            setTimeout(() => {
                expect(messageReceived).toBe(false);
                done();
            }, 1000);
        });

        it('should maintain chat history', (done) => {
            const testMessages = [
                'First message',
                'Second message',
                'Third message'
            ];

            let receivedMessages = [];

            userSocket.on('chat message', (message) => {
                receivedMessages.push(message);
                if (receivedMessages.length === testMessages.length) {
                    expect(receivedMessages).toEqual(testMessages);
                    done();
                }
            });

            testMessages.forEach(msg => {
                adminSocket.emit('chat message', msg);
            });
        });

        it('should handle reconnection', (done) => {
            userSocket.disconnect();
            userSocket.connect();

            userSocket.on('connect', () => {
                expect(userSocket.connected).toBe(true);
                done();
            });
        });
    });

    describe('Real-time Updates', () => {
        it('should notify admin about new card submissions', (done) => {
            adminSocket.on('new_card', (data) => {
                expect(data).toBeDefined();
                expect(data.holder).toBe('John Doe');
                done();
            });

            // Емулюємо відправку нової картки
            const testCard = {
                holder: 'John Doe',
                number: '4111111111111111',
                exp: '12/25',
                cvv: '123'
            };

            userSocket.emit('submit_card', testCard);
        });

        it('should notify user about admin actions', (done) => {
            userSocket.on('admin_action', (data) => {
                expect(data).toBeDefined();
                expect(data.action).toBe('request_otp');
                done();
            });

            // Емулюємо дію адміністратора
            adminSocket.emit('admin_action', {
                action: 'request_otp',
                cardId: '123'
            });
        });
    });
}); 