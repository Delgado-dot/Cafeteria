/* ============================================================
   auth.js — Inicio de sesión, recuperación de contraseña, sesión (API real)
   ============================================================ */

const Auth = {
  // Obtener usuario actual desde localStorage
  current() {
    return Store.load('int_session', null);
  },
  
  // Guardar usuario actual
  set(u) {
    Store.save('int_session', u);
  },
  
  // Limpiar sesión
  clear() {
    localStorage.removeItem('int_session');
    ApiClient.clearTokens();
  },
  
  // Login contra el backend real
  async login(usernameOrEmail, password, remember) {
    try {
      // Intentar login con el backend
      const response = await ApiClient.post(API_ENDPOINTS.auth.login, {
        username: usernameOrEmail,
        password: password,
      }, false); // No incluir autorización en login
      
      if (!response.ok) {
        // Manejar errores del servidor
        const errorMsg = response.data?.detail || response.data?.password?.[0] || response.data?.username?.[0] || response.error || 'Error al iniciar sesión';
        return { ok: false, field: 'email', msg: errorMsg };
      }
      
      // Guardar tokens JWT
      if (response.data.access) ApiClient.setToken(response.data.access);
      if (response.data.refresh) ApiClient.setRefreshToken(response.data.refresh);
      
      // Obtener información del usuario autenticado
      const meResponse = await ApiClient.get(API_ENDPOINTS.auth.me);
      if (!meResponse.ok) {
        return { ok: false, field: 'email', msg: 'Error al obtener información del usuario' };
      }
      
      const user = meResponse.data;
      const sessionData = {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim() || user.username,
        username: user.username,
        email: user.email,
        role: user.role,
        cargo: user.cargo,
        aula: user.aula,
        avatar: user.avatar,
      };
      
      this.set(sessionData);
      if (remember) Store.save('int_remember', usernameOrEmail);
      
      return { ok: true, user: sessionData };
    } catch (error) {
      return { ok: false, field: 'email', msg: error.message || 'Error de conexión' };
    }
  },
  
  // Logout
  logout() {
    this.clear();
  },
};

/* ---------- Iconos compartidos con Admin Bar ---------- */
const AUTH_ICO = {
  cup: (w = 18) => `<i class="bx bx-coffee" aria-hidden="true" style="font-size:${w}px"></i>`,
  user: '<i class="bx bx-user" aria-hidden="true"></i>',
  eye: '<i class="bx bx-show" aria-hidden="true"></i>',
  phone: '<i class="bx bx-phone" aria-hidden="true"></i>',
  scooter: '<i class="bx bx-cycling" aria-hidden="true"></i>',
  roles: '<i class="bx bx-group" aria-hidden="true"></i>',
  lock: (w = 18) => `<i class="bx bx-lock-alt" aria-hidden="true" style="font-size:${w}px"></i>`,
  done: '<i class="bx bx-check-circle" aria-hidden="true" style="font-size:44px;color:var(--success)"></i>',
};
window.AUTH_ICO = AUTH_ICO;

/* ---------- Render login ---------- */
function renderLogin() {
  const app = $('#app');
  app.innerHTML = `
  <div class="login-screen login-screen--auth">
    <div class="login-layout">
      <div class="login-mascot" aria-hidden="true">
        <img src="assets/images/panda-login.png" alt="">
      </div>
      <div class="login-section">
        <div class="login-card">
          <div class="login-head login-brand-head">
            <img class="login-logo" src="assets/bar-intesud-logo.png" alt="Logo BAR INTESUD">
            <h2>Iniciar sesión</h2>
            <p>Ingresa con tu cuenta institucional</p>
          </div>

          <form id="loginForm" novalidate>
            <div class="field">
              <label class="label" for="li_email">Usuario o correo</label>
              <div class="input-wrap">
                <span class="leading-ico">${AUTH_ICO.user}</span>
                <input class="input" id="li_email" type="text" placeholder="usuario@intesud.edu.ec" autocomplete="username">
                <button type="button" class="clear-ico" id="li_clear" title="Limpiar" aria-label="Limpiar">&times;</button>
              </div>
              <div class="input-err-msg" id="li_emailErr"></div>
            </div>
            <div class="field">
              <label class="label" for="li_pass">Contraseña</label>
              <div class="input-group">
                <input class="input" id="li_pass" type="password" placeholder="••••••••" autocomplete="current-password">
                <button type="button" class="ig-btn" id="li_toggle" title="Mostrar/ocultar" aria-label="Mostrar u ocultar contraseña">${AUTH_ICO.eye}</button>
              </div>
              <div class="input-err-msg" id="li_passErr"></div>
            </div>
            <div class="login-options">
              <label class="checkbox-row"><input type="checkbox" id="li_remember"> Recordar sesión</label>
              <a class="small bold" style="color:var(--primary)" href="#" data-link="forgot">¿Olvidaste tu contraseña?</a>
            </div>
            <button type="submit" class="btn btn-primary btn-lg btn-block" id="li_submit">Iniciar sesión</button>
          </form>
        </div>
      </div>
    </div>
  </div>`;

  const remembered = Store.load('int_remember', null);
  if (remembered) { $('#li_email').value = remembered; $('#li_remember').checked = true; }

  const setErr = (field, msg) => {
    const inp = $('#li_' + field); const err = $('#li_' + field + 'Err');
    if (inp) inp.classList.toggle('err', !!msg);
    err.textContent = msg || '';
  };

  $('#li_email').addEventListener('input', () => setErr('email', ''));
  $('#li_pass').addEventListener('input', () => setErr('password', ''));
  $('#li_toggle').addEventListener('click', () => {
    const p = $('#li_pass'); p.type = p.type === 'password' ? 'text' : 'password';
  });
  $('#li_clear').addEventListener('click', () => { $('#li_email').value = ''; setErr('email', ''); });

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#li_email').value.trim();
    const pass = $('#li_pass').value;
    let valid = true;

    if (!email) { setErr('email', 'Ingresa tu usuario o correo.'); valid = false; }
    if (!pass) { setErr('password', 'Ingresa tu contraseña.'); valid = false; }
    if (!valid) return;

    const btn = $('#li_submit');
    btn.disabled = true; btn.textContent = 'Ingresando...';
    
    try {
      const res = await Auth.login(email, pass, $('#li_remember').checked);
      if (res.ok) {
        toast('¡Bienvenido, ' + res.user.name + '!', 'success');
        // Redirección por rol: cada perfil aterriza en su propia interfaz.
        const dest = res.user.role === 'adminbar' ? 'adminbar/dashboard'
          : res.user.role === 'admindev' ? 'admindev/dashboard' : 'home';
        setTimeout(() => route(dest), 400);
      } else {
        setErr(res.field, res.msg);
        toast(res.msg, 'error');
        btn.disabled = false; btn.textContent = 'Iniciar sesión';
      }
    } catch (error) {
      setErr('email', 'Error de conexión con el servidor');
      toast('Error de conexión. Verifica que el servidor esté disponible.', 'error');
      btn.disabled = false; btn.textContent = 'Iniciar sesión';
    }
  });
}

/* ============================================================
   RECUPERACIÓN DE CONTRASEÑA
   ============================================================ */

function renderForgot() {
  const app = $('#app');
  app.innerHTML = `
  <div class="login-screen">
    <div class="login-brand">
      <div class="brand-logo-badge"><img src="assets/bar-intesud-logo.png" alt="Logo BAR INTESUD"></div>
      <h1>Recuperar contraseña</h1>
      <p>Funcionalidad en desarrollo</p>
    </div>
    <div class="login-section">
      <div class="login-card">
        <div class="login-head">
          <h2>Contacta al administrador</h2>
          <p>Para recuperar tu contraseña, comunícate con el administrador de la cafetería.</p>
        </div>
        <button class="btn btn-primary btn-block" id="backBtn">Volver al login</button>
      </div>
    </div>
  </div>`;
  
  $('#backBtn').onclick = () => route('login');
}
