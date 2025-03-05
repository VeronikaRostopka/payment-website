const { server } = require('../index');

beforeAll(async () => {
  // Додаткові налаштування перед запуском всіх тестів
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Закриваємо сервер після всіх тестів
  if (server && server.close) {
    await new Promise((resolve) => server.close(resolve));
  }
}); 