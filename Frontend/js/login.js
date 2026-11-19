// AgroChain Login Script - Real API Integration

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to appropriate dashboard
    const user = getUser();
    if (getToken() && user) {
        if (user.role === 'farmer') {
            window.location.href = 'farmer-dashboard.html';
        } else {
            window.location.href = 'buyer-dashboard.html';
        }
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const loginInput = document.getElementById('loginInput');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginAlert = document.getElementById('loginAlert');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            if (togglePasswordIcon) {
                togglePasswordIcon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
            togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        });
    }

    // Helper to display alert box
    function showAlert(message, type = 'error') {
        if (!loginAlert) return;
        loginAlert.textContent = message;
        loginAlert.className = `alert-box alert-${type}`;
        loginAlert.style.display = 'block';
    }

    function clearAlert() {
        if (loginAlert) {
            loginAlert.style.display = 'none';
            loginAlert.textContent = '';
        }
    }

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const identifier = loginInput.value.trim();
        const password = passwordInput.value;

        if (!identifier || !password) {
            showAlert('Please enter both email/phone and password');
            return;
        }

        // Set button loading state
        loginBtn.disabled = true;
        loginBtnText.textContent = 'Signing in...';

        try {
            const res = await apiCall('/auth/login', {
                method: 'POST',
                body: {
                    loginInput: identifier,
                    password: password
                }
            });

            if (res.success && res.token && res.user) {
                setAuth(res.token, res.user);
                showToast(`Welcome back, ${res.user.name}!`, 'success');

                setTimeout(() => {
                    if (res.user.role === 'farmer') {
                        window.location.href = 'farmer-dashboard.html';
                    } else {
                        window.location.href = 'buyer-dashboard.html';
                    }
                }, 800);
            } else {
                showAlert(res.message || 'Login failed. Please check your credentials.');
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Sign In';
            }
        } catch (err) {
            showAlert(err.message || 'Invalid email or password');
            loginBtn.disabled = false;
            loginBtnText.textContent = 'Sign In';
        }
    });
});
