const puppeteer = require('puppeteer');
const { server } = require('../index');

describe('Visual Tests', () => {
    let browser;
    let page;
    let serverInstance;

    beforeAll(async () => {
        // Запускаємо браузер у видимому режимі
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100 // Сповільнюємо дії для кращої візуалізації
        });
        page = await browser.newPage();
        
        // Встановлюємо розмір вікна
        await page.setViewport({ width: 1366, height: 768 });
        
        // Запускаємо сервер
        serverInstance = server.listen(3000);
    });

    afterAll(async () => {
        await browser.close();
        serverInstance.close();
    });

    describe('Payment Pages', () => {
        it('should display payment form on page 1', async () => {
            await page.goto('http://localhost:3000/payment1');
            await page.waitForTimeout(2000); // Чекаємо 2 секунди для візуального огляду

            // Заповнюємо форму
            await page.type('#cardHolder', 'John Doe');
            await page.waitForTimeout(500);
            
            await page.type('#cardNumber', '4111111111111111');
            await page.waitForTimeout(500);
            
            await page.type('#expDate', '12/25');
            await page.waitForTimeout(500);
            
            await page.type('#cvv', '123');
            await page.waitForTimeout(500);

            // Натискаємо кнопку
            await page.click('button[type="submit"]');
            await page.waitForTimeout(2000);
        }, 30000);

        it('should display payment form on page 2', async () => {
            await page.goto('http://localhost:3000/payment2');
            await page.waitForTimeout(2000);

            // Заповнюємо форму
            await page.type('#cardHolder', 'Jane Smith');
            await page.waitForTimeout(500);
            
            await page.type('#cardNumber', '4111111111111111');
            await page.waitForTimeout(500);
            
            await page.type('#expDate', '12/25');
            await page.waitForTimeout(500);
            
            await page.type('#cvv', '123');
            await page.waitForTimeout(500);

            // Натискаємо кнопку
            await page.click('button[type="submit"]');
            await page.waitForTimeout(2000);
        }, 30000);

        it('should display payment form on page 3', async () => {
            await page.goto('http://localhost:3000/payment3');
            await page.waitForTimeout(2000);

            // Заповнюємо форму
            await page.type('#cardHolder', 'Bob Wilson');
            await page.waitForTimeout(500);
            
            await page.type('#cardNumber', '4111111111111111');
            await page.waitForTimeout(500);
            
            await page.type('#expDate', '12/25');
            await page.waitForTimeout(500);
            
            await page.type('#cvv', '123');
            await page.waitForTimeout(500);

            // Натискаємо кнопку
            await page.click('button[type="submit"]');
            await page.waitForTimeout(2000);
        }, 30000);
    });

    describe('Admin Panel', () => {
        it('should display admin panel with submitted cards', async () => {
            await page.goto('http://localhost:3000/admin');
            await page.waitForTimeout(5000); // Даємо час для завантаження даних

            // Перевіряємо наявність карток
            await page.waitForSelector('.card-item', { timeout: 10000 });
            await page.waitForTimeout(2000);

            // Натискаємо кнопку approve для першої картки
            const approveButtons = await page.$$('.approve-button');
            if (approveButtons.length > 0) {
                await approveButtons[0].click();
                await page.waitForTimeout(2000);
            }
        }, 30000);

        it('should test chat functionality', async () => {
            // Відкриваємо чат
            await page.waitForSelector('.chat-button', { timeout: 5000 });
            await page.click('.chat-button');
            await page.waitForTimeout(1000);

            // Вводимо повідомлення
            await page.type('.chat-input', 'Test message from admin');
            await page.waitForTimeout(500);

            // Відправляємо повідомлення
            await page.click('.send-message');
            await page.waitForTimeout(2000);
        }, 30000);
    });
}); 