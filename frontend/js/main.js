// ═══════════════════════════════════════════════════════
//   РемонтПро — Main JS
// ═══════════════════════════════════════════════════════

const API_BASE = 'http://localhost:3000/api';

// ── Header scroll effect ─────────────────────────────
window.addEventListener('scroll', () => {
  const header = document.getElementById('siteHeader');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }
});

// ── Burger menu ──────────────────────────────────────
const burger = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
}

// ── Quick callback form ──────────────────────────────
const quickForm = document.getElementById('quickForm');
if (quickForm) {
  quickForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = quickForm.querySelector('button[type="submit"]');
    const name = quickForm.querySelector('[name="name"]').value.trim();
    const phone = quickForm.querySelector('[name="phone"]').value.trim();

    // БАГ ФУНКЦИОНАЛЬНЫЙ #1: Валидация телефона с +7, но placeholder показывает формат с 8
    // Регулярка принимает только +7 формат
    const phoneRegex = /^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;
    if (!phoneRegex.test(phone)) {
      showNotification('Введите телефон в формате +7 (999) 000-00-00', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: name, phone, service: 'Консультация', address: '', area: null })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Заявка принята! Перезвоним в течение 15 минут.', 'success');
        quickForm.reset();
      } else {
        showNotification(data.error || 'Ошибка отправки', 'error');
      }
    } catch {
      showNotification('Сервер недоступен. Позвоните нам напрямую.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Перезвоните мне';
    }
  });
}

// ── Auth helpers ─────────────────────────────────────
function getToken() {
  return localStorage.getItem('rp_token');
}
function setToken(token) {
  localStorage.setItem('rp_token', token);
}
function removeToken() {
  localStorage.removeItem('rp_token');
  localStorage.removeItem('rp_user');
}
function getUser() {
  const raw = localStorage.getItem('rp_user');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

// Update header login button if logged in
function updateAuthUI() {
  const loginBtn = document.getElementById('loginBtn');
  const user = getUser();
  if (loginBtn && user) {
    loginBtn.textContent = user.name.split(' ')[0];
    loginBtn.href = '/pages/admin.html';
  }
}
updateAuthUI();

// ── Notification toast ───────────────────────────────
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    right: 32px;
    background: ${type === 'success' ? '#1a3a28' : type === 'error' ? '#3a1a1a' : '#2a2210'};
    color: ${type === 'success' ? '#5cad7a' : type === 'error' ? '#e05c5c' : '#c8a96e'};
    border: 1px solid ${type === 'success' ? 'rgba(92,173,122,.3)' : type === 'error' ? 'rgba(224,92,92,.3)' : 'rgba(200,169,110,.3)'};
    padding: 14px 20px;
    border-radius: 8px;
    font-family: 'Raleway', sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    animation: slideIn 0.3s ease;
    max-width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,.5);
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes slideIn { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`;
  document.head.appendChild(style);

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── API helper ───────────────────────────────────────
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// Export for use in other pages
window.RP = { API_BASE, apiCall, getToken, setToken, removeToken, getUser, showNotification };
