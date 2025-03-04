const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');

// Конфигурация хранилища для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/qr_codes'));
    },
    filename: function (req, file, cb) {
        // Сохраняем файл с оригинальным именем
        cb(null, file.originalname);
    }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Неверный тип файла. Разрешены только изображения.'), false);
    }
};

// Настройка multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Ограничение 5MB
    }
});

// Функция для проверки существования QR-кода
const checkQRCode = (siteNumber) => {
    const qrPath = path.join(__dirname, 'public/qr_codes', `сайт${siteNumber}.png`);
    return fs.existsSync(qrPath);
};

// Функция для оптимизации изображения
const optimizeImage = async (filePath) => {
    try {
        await sharp(filePath)
            .resize(300, 300, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 }
            })
            .png({ quality: 80 })
            .toFile(filePath + '.optimized');
        
        // Заменяем оригинальный файл оптимизированным
        fs.unlinkSync(filePath);
        fs.renameSync(filePath + '.optimized', filePath);
    } catch (error) {
        console.error('Ошибка оптимизации изображения:', error);
        throw error;
    }
};

module.exports = {
    upload,
    checkQRCode,
    optimizeImage
}; 