const API_BASE = localStorage.getItem('inventario.apiBase') || 'http://127.0.0.1:3000/api';
const SESSION_KEY = 'inventario.session';
const $ = (id) => document.getElementById(id);
const forms = { login: $('loginForm'), forgot: $('forgotForm') };

function alertMessage(message, type = 'error') {
  const element = $('authAlert');
  element.textContent = message;
  element.className = `alert ${type}`;
  element.hidden = false;
}

function clearAlert() {
  $('authAlert').hidden = true;
}

function validationMessage(data) {
  if (data.detail) return data.detail;
  return Object.values(data)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .join(' ');
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
  } catch {
    throw new Error('No fue posible conectar con Django. Comprueba que el backend esté iniciado.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(validationMessage(data) || `La solicitud falló (HTTP ${response.status}).`);
  }
  return data;
}

function setMode(mode) {
  clearAlert();
  Object.values(forms).forEach((form) => { form.hidden = true; });
  forms[mode].hidden = false;
  $('showForgot').hidden = mode !== 'login';
  $('showLogin').hidden = mode === 'login';
  $('authFooterText').hidden = mode === 'forgot';
  $('authTitle').textContent = mode === 'login'
    ? 'Bienvenido de nuevo'
    : 'Recuperar contraseña';
  $('authSubtitle').textContent = mode === 'login'
    ? 'Ingresa tus credenciales para continuar.'
    : 'Te enviaremos instrucciones si el correo está registrado.';
}

function saveSession(data, email) {
  if (!data.token || data.token === 'demo-token' || !data.user) {
    throw new Error('El servidor no devolvió una sesión válida. Inténtalo de nuevo.');
  }
  const user = data.user;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: data.token,
    user: {
      id: user.id,
      nombre: user.nombre || user.name || email.split('@')[0],
      email: user.email || email,
      rol: user.rol || user.role || 'Empleado',
      is_staff: Boolean(user.is_staff)
    }
  }));
}

$('showForgot').addEventListener('click', () => setMode('forgot'));
$('showLogin').addEventListener('click', () => setMode('login'));
$('togglePassword').addEventListener('click', () => {
  const password = $('loginPassword');
  password.type = password.type === 'password' ? 'text' : 'password';
  $('togglePassword').textContent = password.type === 'password' ? 'Mostrar' : 'Ocultar';
});

forms.login.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();
  const email = $('loginEmail').value.trim().toLowerCase();
  const password = $('loginPassword').value;
  const button = $('loginSubmit');
  button.disabled = true;
  button.textContent = 'Validando…';
  try {
    const data = await request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    saveSession(data, email);
    window.location.href = 'index.html';
  } catch (error) {
    alertMessage(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Iniciar sesión <span aria-hidden="true">→</span>';
  }
});

forms.forgot.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAlert();
  try {
    const data = await request('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email: $('forgotEmail').value.trim().toLowerCase() })
    });
    alertMessage(data.detail || 'Si el correo está registrado, recibirás instrucciones.', 'success');
  } catch (error) {
    alertMessage(error.message);
  }
});

$('year').textContent = new Date().getFullYear();
