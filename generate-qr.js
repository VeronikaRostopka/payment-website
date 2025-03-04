const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const sites = [
    { number: 1, url: 'https://localhost:3000/payment1' },
    { number: 2, url: 'https://localhost:3000/payment2' },
    { number: 3, url: 'https://localhost:3000/payment3' }
];

async function generateQR() {
    for (const site of sites) {
        const filePath = path.join(__dirname, 'public', 'qr_codes', `сайт${site.number}.png`);
        try {
            await QRCode.toFile(filePath, site.url);
            console.log(`Created QR code for site ${site.number}`);
        } catch (err) {
            console.error(`Error creating QR code for site ${site.number}:`, err);
        }
    }
}

generateQR(); 