// AgroChain Authoritative Authentication & API Client
// Single source of truth for frontend authentication and API communication

const API_BASE = (window.location.origin && window.location.origin.startsWith('http'))
  ? `${window.location.origin}/api`
  : 'http://localhost:8000/api';

// Retrieve stored JWT token
function getToken() {
  return localStorage.getItem('agrochain_token');
}

// Retrieve stored user object
function getUser() {
  try {
    const raw = localStorage.getItem('agrochain_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Save authentication session
function setAuth(token, user) {
  if (token) localStorage.setItem('agrochain_token', token);
  if (user) localStorage.setItem('agrochain_user', JSON.stringify(user));
}

// Clear authentication session (Logout)
function logout() {
  localStorage.removeItem('agrochain_token');
  localStorage.removeItem('agrochain_user');
  window.location.href = 'login.html';
}

// Check if currently authenticated
function isAuthenticated() {
  return !!getToken();
}

// Route protection guard
function requireAuth(requiredRole = null) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    logout();
    return false;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    // Redirect to the user's appropriate dashboard
    if (user.role === 'farmer') {
      window.location.href = 'farmer-dashboard.html';
    } else {
      window.location.href = 'buyer-dashboard.html';
    }
    return false;
  }

  return true;
}

// Universal API request helper
async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: typeof options.body === 'string' ? options.body : JSON.stringify(options.body) } : {})
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
        // Token expired or invalid
        logout();
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${options.method || 'GET'} ${url}]:`, err.message);
    throw err;
  }
}

// Universal Toast notification helper
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: '#2e7d32',
    error: '#d32f2f',
    warning: '#ed6c02',
    info: '#0288d1'
  };

  toast.style.cssText = `
    padding: 12px 20px;
    background-color: ${bgColors[type] || bgColors.info};
    color: white;
    border-radius: 6px;
    font-family: 'Poppins', sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
    animation: fadeIn 0.3s ease-in-out;
  `;

  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  toast.innerHTML = `<i class="fas ${iconMap[type] || 'fa-info-circle'}"></i> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
