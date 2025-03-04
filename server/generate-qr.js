const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function generateQRCodes() {
    const sites = [
        { number: 1, url: 'https://localhost:3000/payment1' },
        { number: 2, url: 'https://localhost:3000/payment2' },
        { number: 3, url: 'https://localhost:3000/payment3' }
    ];

    for (const site of sites) {
        const filePath = path.join(__dirname, '..', 'public', 'qr_codes', `сайт${site.number}.png`);
        try {
            await QRCode.toFile(filePath, site.url, {
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                },
                width: 300,
                margin: 1
            });
            console.log(`QR код для сайту ${site.number} створено: ${filePath}`);
        } catch (err) {
            console.error(`Помилка створення QR коду для сайту ${site.number}:`, err);
        }
    }
}

generateQRCodes(); 