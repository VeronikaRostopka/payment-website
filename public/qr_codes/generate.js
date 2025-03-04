const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file:${path.join(__dirname, 'placeholder.html')}`);
    
    // Чекаємо генерації QR-кодів
    await page.waitForSelector('canvas');
    
    // Зберігаємо кожен QR-код як PNG
    for (let i = 1; i <= 3; i++) {
        const element = await page.$(`#qr${i}`);
        await element.screenshot({
            path: path.join(__dirname, `сайт${i}.png`),
            omitBackground: true
        });
        console.log(`Saved QR code ${i}`);
    }
    
    await browser.close();
})(); 