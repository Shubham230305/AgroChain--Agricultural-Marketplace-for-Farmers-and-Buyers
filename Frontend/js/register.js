// AgroChain Registration Script - Real API Integration

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect
    const user = getUser();
    if (getToken() && user) {
        if (user.role === 'farmer') {
            window.location.href = 'farmer-dashboard.html';
        } else {
            window.location.href = 'buyer-dashboard.html';
        }
        return;
    }

    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');
    const registerBtnText = document.getElementById('registerBtnText');
    const registerAlert = document.getElementById('registerAlert');

    function showAlert(message, type = 'error') {
        if (!registerAlert) return;
        registerAlert.textContent = message;
        registerAlert.className = `alert-box alert-${type}`;
        registerAlert.style.display = 'block';
    }

    function clearAlert() {
        if (registerAlert) {
            registerAlert.style.display = 'none';
            registerAlert.textContent = '';
        }
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const role = document.querySelector('input[name="role"]:checked')?.value || 'buyer';
        const location = document.getElementById('location').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!name) {
            showAlert('Please enter your full name');
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showAlert('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match');
            return;
        }

        // Set button loading state
        registerBtn.disabled = true;
        registerBtnText.textContent = 'Creating Account...';

        try {
            const res = await apiCall('/auth/register', {
                method: 'POST',
                body: {
                    name,
                    email,
                    phone: phone || undefined,
                    role,
                    location,
                    password
                }
            });

            if (res.success && res.token && res.user) {
                setAuth(res.token, res.user);
                showToast('Account registered successfully! Redirecting...', 'success');

                setTimeout(() => {
                    if (res.user.role === 'farmer') {
                        window.location.href = 'farmer-dashboard.html';
                    } else {
                        window.location.href = 'buyer-dashboard.html';
                    }
                }, 1000);
            } else {
                showAlert(res.message || 'Registration failed');
                registerBtn.disabled = false;
                registerBtnText.textContent = 'Create Account';
            }
        } catch (err) {
            showAlert(err.message || 'Registration failed. Please try again.');
            registerBtn.disabled = false;
            registerBtnText.textContent = 'Create Account';
        }
    });
});
