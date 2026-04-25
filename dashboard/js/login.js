// ===== FORM STATE =====
let currentTab = 'login';

function switchTab(tab) {
  currentTab = tab;
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('tab-register').classList.remove('active');

  if (tab === 'login') {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('tab-login').classList.add('active');
  } else if (tab === 'register') {
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('tab-register').classList.add('active');
  } else if (tab === 'forgot') {
    document.getElementById('forgot-form').classList.remove('hidden');
  }
  hideAlert();
}

function showAlert(msg, type = 'error') {
  const box = document.getElementById('alert-box');
  const msgEl = document.getElementById('alert-message');
  box.className = `alert ${type}`;
  msgEl.textContent = msg;
}

function hideAlert() {
  document.getElementById('alert-box').className = 'alert hidden';
}

function togglePassword(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text'; btn.textContent = '🙈';
  } else {
    input.type = 'password'; btn.textContent = '👁';
  }
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled = loading;
  text.style.opacity = loading ? '0' : '1';
  spinner.classList.toggle('hidden', !loading);
}

// ===== PASSWORD STRENGTH =====
document.getElementById('reg-password')?.addEventListener('input', function () {
  const val = this.value;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const fill = document.getElementById('pw-fill');
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#6366f1'];
  const widths = ['25%', '50%', '75%', '100%'];
  fill.style.width = score ? widths[score - 1] : '0';
  fill.style.background = score ? colors[score - 1] : '';
});

// ===== LOGIN =====
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAlert('Please fill in all fields.');
    return;
  }

  setLoading('login-btn', true);
  try {
    const data = await apiFetch('/university-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    Auth.setSession(data.token, data.user);
    showAlert('Login successful! Redirecting…', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    const msg = err.data?.error || 'Login failed. Please check your credentials.';
    showAlert(msg);
  } finally {
    setLoading('login-btn', false);
  }
});

// ===== REGISTER =====
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const firstName = document.getElementById('reg-first').value.trim();
  const lastName  = document.getElementById('reg-last').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;

  if (!firstName || !lastName || !email || !password) {
    showAlert('Please fill in all fields.');
    return;
  }

  setLoading('register-btn', true);
  try {
    const data = await apiFetch('/university-auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password })
    });

    showAlert(`Registration successful! Verify your email to continue. (Dev token: ${data.verificationToken?.slice(0,12)}…)`, 'success');
    setTimeout(() => switchTab('login'), 3000);
  } catch (err) {
    const errors = err.data?.errors;
    const msg = errors ? errors.map(e => e.msg).join(' | ') : (err.data?.error || 'Registration failed.');
    showAlert(msg);
  } finally {
    setLoading('register-btn', false);
  }
});

// ===== FORGOT PASSWORD =====
document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showAlert('Please enter your email.'); return; }

  setLoading('forgot-btn', true);
  try {
    const data = await apiFetch('/university-auth/password-reset-request', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    showAlert(data.message || 'Reset link sent!', 'success');
  } catch (err) {
    showAlert(err.data?.error || 'Something went wrong.');
  } finally {
    setLoading('forgot-btn', false);
  }
});

// Redirect if already logged in
if (Auth.isLoggedIn()) window.location.href = 'dashboard.html';
