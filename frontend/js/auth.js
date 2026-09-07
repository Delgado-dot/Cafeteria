/* ============================================================
   auth.js — Inicio de sesión, recuperación de contraseña, sesión
   ============================================================ */

const Auth = {
  current() { return Store.load('int_session', null); },
  set(u) { Store.save('int_session', u); },
  clear() { localStorage.removeItem('int_session'); },

  login(email, password, remember) {
    const user = Store.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return { ok: false, field: 'email', msg: 'Usuario no encontrado.' };
    if (!user.active) return { ok: false, field: 'email', msg: 'Este usuario está desactivado.' };
    if (PASSWORDS[user.email] !== password) return { ok: false, field: 'password', msg: 'Contraseña incorrecta.' };
    const now = new Date();
    user.lastAccess = now.toISOString().slice(0, 10) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    Store.users = Store.users;
    this.set({ id: user.id, name: user.name, email: user.email, role: user.role, cargo: user.cargo, aula: user.aula });
    if (remember) Store.save('int_remember', email);
    logAudit('Inició sesión', user.name);
    return { ok: true, user };
  },

  logout() { this.clear(); logAudit('Cerró sesión', ''); },
};

/* ---------- Render login ---------- */
function renderLogin() {
  const app = $('#app');
  app.innerHTML = `
  <div class="login-screen">
    <div class="login-brand">
      <div class="brand-logo-badge">☕</div>
      <h1>Cafetería INTESUD</h1>
      <p>Instituto Tecnológico Superior Sudamericano — Pedidos en línea para el receso, con delivery interno y gestión de la cafetería.</p>
      <div class="brand-tags">
        <span>📱 Pedidos en línea</span>
        <span>🛵 Delivery interno</span>
        <span>👨‍🏫 Roles y permisos</span>
      </div>
    </div>
    <div class="login-section">
      <div class="login-card">
        <div class="login-head">
          <h2>Iniciar sesión</h2>
          <p>Ingresa con tu cuenta institucional</p>
        </div>

        <form id="loginForm" novalidate>
          <div class="field">
            <label class="label" for="li_email">Usuario o correo</label>
            <div class="input-wrap">
              <span class="leading-ico">👤</span>
              <input class="input" id="li_email" type="text" placeholder="usuario@intesud.edu.ec" autocomplete="username">
              <button type="button" class="clear-ico" id="li_clear" title="Limpiar">✕</button>
            </div>
            <div class="input-err-msg" id="li_emailErr"></div>
          </div>
          <div class="field">
            <label class="label" for="li_pass">Contraseña</label>
            <div class="input-group">
              <input class="input" id="li_pass" type="password" placeholder="••••••••" autocomplete="current-password">
              <button type="button" class="ig-btn" id="li_toggle" title="Mostrar/ocultar">👁</button>
            </div>
            <div class="input-err-msg" id="li_passErr"></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin:10px 0 18px">
            <label class="checkbox-row"><input type="checkbox" id="li_remember"> Recordar sesión</label>
            <a class="small bold" style="color:var(--primary)" href="#" data-link="forgot">¿Olvidaste tu contraseña?</a>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="li_submit">Iniciar sesión</button>
        </form>

        <div class="divider"></div>
        <details class="demo-creds" style="font-size:var(--fs-sm)">
          <summary style="cursor:pointer;color:var(--text-2);font-weight:var(--fw-semibold)">Ver credenciales de demostración</summary>
          <div class="demo-list" style="margin-top:10px;display:grid;gap:8px;color:var(--text-2)">
            <div><b>Usuario institucional</b><br><code style="background:var(--surface-3);padding:1px 6px;border-radius:4px">usuario@intesud.edu.ec</code> / <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px">estudiante123</code></div>
            <div><b>Administradora bar</b><br><code style="background:var(--surface-3);padding:1px 6px;border-radius:4px">adminbar@intesud.edu.ec</code> / <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px">adminbar123</code></div>
            <div><b>Admin desarrollador</b><br><code style="background:var(--surface-3);padding:1px 6px;border-radius:4px">developer@system.local</code> / <code style="background:var(--surface-3);padding:1px 6px;border-radius:4px">developer123</code></div>
          </div>
        </details>
      </div>
    </div>
  </div>`;

  const remembered = Store.load('int_remember', null);
  if (remembered) { $('#li_email').value = remembered; $('#li_remember').checked = true; }
  // enlace recuperar
  const forgotLink = document.querySelector('[data-link="forgot"]');
  if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); setRoute('forgot'); });

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

  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#li_email').value.trim();
    const pass = $('#li_pass').value;
    let valid = true;

    if (!email) { setErr('email', 'Ingresa tu usuario o correo.'); valid = false; }
    if (!pass) { setErr('password', 'Ingresa tu contraseña.'); valid = false; }
    if (!valid) return;

    const btn = $('#li_submit');
    btn.disabled = true; btn.textContent = 'Ingresando...';
    setTimeout(() => {
      const res = Auth.login(email, pass, $('#li_remember').checked);
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
    }, 700);
  });
}

/* ============================================================
   RECUPERACIÓN DE CONTRASEÑA (simulada, 5 pasos)
   Estados cubiertos: vacío, usuario inexistente, código incorrecto,
   código expirado, contraseña inválida, éxito
   ============================================================ */
const RECOVERY_CODE = '2024';
let _recoverySentAt = 0;

function renderForgot() {
  const app = $('#app');
  app.innerHTML = `
  <div class="login-screen">
    <div class="login-brand">
      <div class="brand-logo-badge">🔐</div>
      <h1>Recuperar contraseña</h1>
      <p>Código de verificación de demostración: <b style="letter-spacing:2px">${RECOVERY_CODE}</b></p>
    </div>
    <div class="login-section">
      <div class="login-card">
        <div class="login-head">
          <div id="recoverStepInd"></div>
          <h2 style="margin-top:16px" id="recoverTitle"></h2>
          <p id="recoverSub"></p>
        </div>
        <div id="recoverBody"></div>
      </div>
    </div>
  </div>`;
  recoverStep(1);
}

function recoverStepInd(step) {
  const steps = ['Correo', 'Código', 'Nueva contraseña', '¡Listo!'];
  return steps.map((s, i) => {
    const n = i + 1;
    const cls = n < step ? 'done' : n === step ? 'current' : '';
    return `<span class="badge ${cls === 'done' ? 'badge-success' : cls === 'current' ? 'badge-primary' : 'badge-outline'}" style="margin-right:6px">${n}. ${s}</span>`;
  }).join('');
}

function recoverStep(step, ctx = { email: '' }) {
  const body = $('#recoverBody');
  const title = $('#recoverTitle');
  const sub = $('#recoverSub');
  const ind = $('#recoverStepInd');
  if (!body) return;
  ind.innerHTML = recoverStepInd(step);

  const errBox = (id) => `<div class="input-err-msg" id="${id}"></div>`;

  if (step === 1) {
    title.textContent = 'Ingresa tu correo';
    sub.textContent = 'Te enviaremos un código de verificación (simulado).';
    body.innerHTML = `
      <div class="alert info" style="margin-bottom:14px;padding:10px 12px"><span class="a-ico">ℹ️</span><div class="small">Ingresa tu correo institucional. Si existe, recibirás un código de 4 dígitos.</div></div>
      <div class="field">
        <label class="label">Usuario o correo</label>
        <input class="input" type="text" id="rvEmail" placeholder="usuario@intesud.edu.ec">
        ${errBox('rvEmailErr')}
      </div>
      <button class="btn btn-primary btn-block" id="rvNext">Enviar código</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" id="rvBackLogin">← Volver al login</button>`;
    $('#rvBackLogin').onclick = () => route('login');
    $('#rvNext').onclick = () => {
      const email = $('#rvEmail').value.trim();
      const err = $('#rvEmailErr');
      const inp = $('#rvEmail');
      if (!email) { err.textContent = 'Ingresa tu usuario o correo.'; inp.classList.add('err'); return; }
      inp.classList.remove('err'); err.textContent = '';
      if (!/^\S+@\S+\.\S+$/.test(email) && !Store.users.find((u) => (u.username||u.email).toLowerCase() === email.toLowerCase())) {
        err.textContent = 'Formato de correo inválido.'; inp.classList.add('err'); return;
      }
      if (!Store.users.find((u) => u.email.toLowerCase() === email.toLowerCase() || (u.username && u.username.toLowerCase()===email.toLowerCase()))) {
        err.textContent = 'Usuario inexistente. Verifica el correo.'; inp.classList.add('err'); toast('Usuario inexistente.', 'error'); return;
      }
      _recoverySentAt = Date.now();
      toast('Código enviado: ' + RECOVERY_CODE + ' (válido 5 min)', 'success');
      recoverStep(2, { email });
    };
  } else if (step === 2) {
    title.textContent = 'Código de verificación';
    sub.textContent = 'Ingresa el código de 4 dígitos enviado a tu correo.';
    const remaining = _recoverySentAt ? Math.max(0, 300 - Math.floor((Date.now()-_recoverySentAt)/1000)) : 300;
    body.innerHTML = `
      <div class="alert ${remaining<30?'warning':'info'}" style="margin-bottom:14px;padding:10px 12px"><span class="a-ico">${remaining<30?'⏱':'ℹ️'}</span><div class="small">Código enviado a <b>${esc(ctx.email)}</b> · Caduca en <b>${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}</b>. Demo: <b>${RECOVERY_CODE}</b></div></div>
      <div class="field">
        <label class="label">Código de verificación</label>
        <input class="input" type="text" id="rvCode" inputmode="numeric" maxlength="4" placeholder="••••">
        ${errBox('rvCodeErr')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" id="rvVerify">Validar código</button>
        <button class="btn btn-outline" id="rvResend">Reenviar</button>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:10px" id="rvBack1">← Cambiar correo</button>`;
    $('#rvResend').onclick = () => { _recoverySentAt = Date.now(); toast('Nuevo código: ' + RECOVERY_CODE, 'success'); recoverStep(2, ctx); };
    $('#rvBack1').onclick = () => recoverStep(1, ctx);
    $('#rvVerify').onclick = () => {
      const code = $('#rvCode').value.trim();
      const err = $('#rvCodeErr');
      const inp = $('#rvCode');
      if (!code) { err.textContent = 'El código no puede estar vacío.'; inp.classList.add('err'); toast('Campos vacíos.', 'warning'); return; }
      if (Date.now() - _recoverySentAt > 300000) { err.textContent = 'Código expirado. Solicita uno nuevo.'; inp.classList.add('err'); toast('Código expirado.', 'error'); return; }
      if (code !== RECOVERY_CODE) { err.textContent = 'Código incorrecto. Verifica e intenta de nuevo.'; inp.classList.add('err'); toast('Código incorrecto.', 'error'); return; }
      inp.classList.remove('err'); recoverStep(3, ctx);
    };
  } else if (step === 3) {
    title.textContent = 'Nueva contraseña';
    sub.textContent = 'Crea tu nueva contraseña (mínimo 6 caracteres, sin espacios).';
    body.innerHTML = `
      <div class="field">
        <label class="label">Nueva contraseña</label>
        <input class="input" type="password" id="rvP1" placeholder="••••••">
        ${errBox('rvP1Err')}
        <div class="tiny muted" style="margin-top:6px">Mínimo 6 caracteres, sin espacios al inicio/final.</div>
      </div>
      <div class="field">
        <label class="label">Confirmar contraseña</label>
        <input class="input" type="password" id="rvP2" placeholder="••••••">
        ${errBox('rvP2Err')}
      </div>
      <button class="btn btn-primary btn-block" id="rvSave">Guardar nueva contraseña</button>
      <button class="btn btn-ghost btn-block" style="margin-top:8px" id="rvBack2">← Volver</button>`;
    $('#rvBack2').onclick = () => recoverStep(2, ctx);
    $('#rvSave').onclick = () => {
      const p1 = $('#rvP1').value; const p2 = $('#rvP2').value;
      const e1 = $('#rvP1Err'); const e2 = $('#rvP2Err');
      const i1 = $('#rvP1'); const i2 = $('#rvP2');
      e1.textContent = ''; e2.textContent = ''; i1.classList.remove('err'); i2.classList.remove('err');
      if (!p1 || !p2) { if(!p1){e1.textContent='Campo vacío.';i1.classList.add('err');} if(!p2){e2.textContent='Campo vacío.';i2.classList.add('err');} toast('Campos vacíos.', 'warning'); return; }
      if (p1.length < 6) { e1.textContent = 'Contraseña inválida: mínimo 6 caracteres.'; i1.classList.add('err'); toast('Contraseña inválida.', 'error'); return; }
      if (/\s/.test(p1)) { e1.textContent = 'La contraseña no debe contener espacios.'; i1.classList.add('err'); return; }
      if (p1 !== p2) { e2.textContent = 'Las contraseñas no coinciden.'; i2.classList.add('err'); toast('Las contraseñas no coinciden.', 'error'); return; }
      PASSWORDS[ctx.email] = p1;
      toast('Contraseña actualizada con éxito.', 'success');
      recoverStep(4, ctx);
    };
  } else if (step === 4) {
    title.textContent = '¡Contraseña actualizada!';
    sub.textContent = 'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.';
    body.innerHTML = `
      <div class="alert success" style="margin-bottom:16px;padding:12px"><span class="a-ico">✅</span><div><b>Recuperación exitosa.</b> Usa tu nueva contraseña para ingresar.</div></div>
      <div class="empty-state" style="padding:12px 0"><div class="es-ico">🎉</div><h3>¡Listo!</h3><p>Tu acceso ha sido restablecido.</p></div>
      <button class="btn btn-primary btn-block" id="rvDone">Ir a iniciar sesión</button>`;
    $('#rvDone').onclick = () => route('login');
  }
}
