const { server, app } = require('../index');

beforeAll(async () => {
  // Налаштування тестового середовища
  process.env.NODE_ENV = 'test';
  
  // Вимикаємо CSRF для тестів
  if (process.env.NODE_ENV === 'test') {
    app.use((req, res, next) => {
      req.csrfToken = () => 'test-token';
      next();
    });
  }
});

afterAll(async () => {
  // Закриваємо сервер після всіх тестів
  if (server && server.close) {
    await new Promise((resolve) => server.close(resolve));
  }
}); 