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
const xss = require('xss');
const compression = require('compression');
const { upload, checkQRCode, optimizeImage } = require('./qr-handler');

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
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(csrf({ cookie: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // ограничение на 100 запросов с одного IP
});
app.use(limiter);

// Роуты для QR-кодов
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

        // Оптимизируем загруженное изображение
        await optimizeImage(req.file.path);
        
        res.json({ message: 'QR-код успешно загружен' });
    } catch (error) {
        logger.error('Ошибка загрузки QR-кода:', error);
        res.status(500).json({ error: 'Ошибка при загрузке QR-кода' });
    }
});

// ... остальной код сервера ...

// Запуск сервера
const PORT = process.env.PORT || 3000;
const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app);

server.listen(PORT, () => {
    logger.info(`Сервер запущен на порту ${PORT}`);
});