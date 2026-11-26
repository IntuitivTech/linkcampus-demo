/* LinkCampus web client. Vanilla JS, no build step. */
'use strict';
const state = { me: null, meta: null, badges: { messages: 0, notifications: 0, requests: 0 }, devCode: null, cleanup: null };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener nofollow">$1</a>')
  .replace(/(^|[\s(])#([\p{L}\p{N}_]{2,30})/gu, '$1<a class="tag-link" href="#/tag/$2">#$2</a>');
const go = h => { if (location.hash === h) route(); else location.hash = h; };

// ---------------------------------------------------------------- icons
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.1 4.4 1.8 5 4.4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  groups: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  mentor: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10.5V16c2.5 2.5 9.5 2.5 12 0v-5.5"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M10.8 7.2 6.2 15.8M13.2 7.2l4.6 8.6M7.5 18h9"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.3C2 7.2 4.3 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3 0 5.3 2.7 4.3 6.2-1.5 4.7-9 9.3-9 9.3z"/>',
  comment: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const icon = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${P[n] || ''}</svg>`;
// Official LinkCampus wordmark: navy version for light screens, light version for dark screens.
const logo = (on = 'auto') => `<span class="logo ${on === 'dark' ? 'on-dark' : ''}"><img class="logo-l" src="logo-light.png" alt="LinkCampus" width="520" height="119"><img class="logo-d" src="logo-dark.png" alt="LinkCampus" width="520" height="119"></span>`;
const VERIFIED = '<svg class="verified" viewBox="0 0 24 24" aria-label="Verified"><path fill="#2B8BFF" d="m12 1 2.6 2.2 3.4-.4.9 3.3 3 1.7-1.2 3.2 1.2 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.3 13 2.1 9.8l3-1.7.9-3.3 3.4.4z"/><path d="m7.5 12 3 3 6-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------------------------------------------------------------- helpers
async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api' + path, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-LC': '1' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith('/auth') && state.me) { state.me = null; go('#/login'); }
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}
function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}
const fail = e => toast(e.message, 'error');
async function busy(btn, fn) {
  if (btn) { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span>'; }
  try { return await fn(); } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = btn.dataset.label; } }
}
const formObj = f => Object.fromEntries(new FormData(f).entries());
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const initials = n => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const av = (u, s = 40) => u?.avatar
  ? `<img class="av" src="${esc(u.avatar)}" alt="" width="${s}" height="${s}" loading="lazy" style="width:${s}px;height:${s}px">`
  : `<span class="av" aria-hidden="true" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .38)}px;background:${esc(u?.color || '#2B8BFF')}">${esc(initials(u?.name))}</span>`;
const roleTag = u => `<span class="role ${esc(u.role)}">${u.role === 'alumni' ? 'Alumni' : u.role === 'mentor' ? 'Mentor' : 'Student'}</span>`;
const uname = u => `<a href="#/u/${u.id}" class="name">${esc(u.name)}</a>${u.verified ? VERIFIED : ''}`;
const empty = (emoji, title, text, cta = '') => `<div class="empty"><div class="big">${emoji}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${cta ? `<div style="margin-top:14px">${cta}</div>` : ''}</div>`;
const loading = () => '<div class="loading"><div class="spinner"></div></div>';

function modal(html, onMount, onClose) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  let closed = false;
  const close = () => { if (closed) return; closed = true; bg.remove(); document.removeEventListener('keydown', key); onClose && onClose(); };
  const key = e => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', key);
  document.body.appendChild(bg);
  onMount && onMount(bg.querySelector('.modal'), close);
  const f = bg.querySelector('input,textarea,select'); if (f && matchMedia('(min-width:861px)').matches) f.focus();
  return close;
}
function confirmBox(text, okLabel = 'Confirm', danger = true) {
  return new Promise(res => {
    modal(`<h2>Are you sure?</h2><p class="muted">${esc(text)}</p><div class="row" style="justify-content:flex-end;margin-top:20px">
      <button class="btn ghost" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="ok">${esc(okLabel)}</button></div>`,
      (m, close) => { $('#ok', m).onclick = () => { res(true); close(); }; }, () => res(false));
  });
}

// ---------------------------------------------------------------- boot & routing
async function boot() {
  try { state.meta = await api('/meta'); } catch { $('#app').innerHTML = empty('⚠️', 'Cannot reach LinkCampus', 'Check your connection and reload.'); return; }
  await loadMe();
  window.addEventListener('hashchange', route);
  route();
  setInterval(refreshBadges, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshBadges(); });
}
async function loadMe() { try { state.me = (await api('/me')).user; } catch { state.me = null; } }
async function refreshBadges() {
  if (!state.me?.verified || !state.me?.onboarded || document.hidden) return;
  try { state.badges = await api('/badges'); paintBadges(); } catch {}
}
function paintBadges() {
  const b = state.badges;
  $$('[data-badge]').forEach(el => {
    const n = el.dataset.badge === 'more' ? b.requests : b[el.dataset.badge];
    let s = el.querySelector('.badge');
    if (n > 0) { if (!s) { s = document.createElement('span'); s.className = 'badge'; el.appendChild(s); } s.textContent = n > 99 ? '99+' : n; }
    else if (s) s.remove();
  });
  document.title = (b.messages + b.notifications > 0 ? `(${b.messages + b.notifications}) ` : '') + 'LinkCampus';
}

const ROUTES = [
  [/^#\/login$/, viewLogin, 'public'], [/^#\/signup$/, viewSignup, 'public'], [/^#\/forgot$/, viewForgot, 'public'],
  [/^#\/verify$/, viewVerify, 'verify'], [/^#\/welcome$/, viewOnboarding, 'onboard'],
  [/^#\/(feed)?$/, viewFeed], [/^#\/post\/(\d+)$/, viewPost], [/^#\/people$/, viewPeople], [/^#\/u\/(\d+)$/, viewProfile],
  [/^#\/network$/, viewNetwork], [/^#\/messages(?:\/(\d+))?$/, viewMessages], [/^#\/mentors$/, viewMentors],
  [/^#\/groups$/, viewGroups], [/^#\/groups\/(\d+)$/, viewGroup], [/^#\/opportunities$/, viewOpps],
  [/^#\/notifications$/, viewNotifications], [/^#\/settings$/, viewSettings], [/^#\/admin$/, viewAdmin],
];

function route() {
  if (state.cleanup) { state.cleanup(); state.cleanup = null; }
  $$('.modal-bg').forEach(m => m.remove());
  const h = location.hash || '#/';
  const me = state.me;
  const match = ROUTES.find(([re]) => re.test(h));
  if (!me) { if (!match || match[2] !== 'public') return go('#/login'); return match[1](...h.match(match[0]).slice(1)); }
  if (!me.verified) { if (h !== '#/verify') return go('#/verify'); return viewVerify(); }
  if (!me.onboarded) { if (h !== '#/welcome') return go('#/welcome'); return viewOnboarding(); }
  if (!match || match[2]) return go('#/feed');
  shell(h);
  window.scrollTo(0, 0);
  match[1](...h.match(match[0]).slice(1));
  refreshBadges();
}

// ---------------------------------------------------------------- shell
const NAV = [
  ['#/feed', 'home', 'Home'], ['#/people', 'people', 'People'], ['#/network', 'network', 'Network', 'requests'],
  ['#/messages', 'chat', 'Messages', 'messages'], ['#/mentors', 'mentor', 'Mentors'], ['#/groups', 'groups', 'Groups'],
  ['#/opportunities', 'brief', 'Opportunities'], ['#/notifications', 'bell', 'Notifications', 'notifications'],
];
function shell(h) {
  const me = state.me;
  const active = href => h === href || (href !== '#/feed' && h.startsWith(href)) || (href === '#/feed' && (h === '#/' || h.startsWith('#/post')));
  if (!$('.shell')) {
    $('#app').innerHTML = `<div class="shell">
      <nav class="side" aria-label="Main">
        <a href="#/feed">${logo()}</a>
        ${NAV.map(([href, ic, label, b]) => `<a class="nav-a" href="${href}" ${b ? `data-badge="${b}"` : ''}>${icon(ic)}<span>${label}</span></a>`).join('')}
        ${me.isAdmin ? `<a class="nav-a" href="#/admin">${icon('shield')}<span>Admin</span></a>` : ''}
        <a class="nav-a" href="#/settings">${icon('settings')}<span>Settings</span></a>
        <a class="me" href="#/u/${me.id}">${av(me, 36)}<div class="grow"><div style="font-weight:700;font-size:14px" class="me-name">${esc(me.name)}</div><div class="tiny muted">View profile</div></div></a>
      </nav>
      <div>
        <header class="topbar"><a href="#/feed">${logo()}</a><div class="row" style="gap:2px">
          <a class="btn icon" href="#/people" aria-label="Search">${icon('search')}</a>
          <a class="btn icon" href="#/notifications" aria-label="Notifications" data-badge="notifications" style="position:relative">${icon('bell')}</a></div></header>
        <main class="main" id="main"></main>
      </div>
      <nav class="tabbar" aria-label="Tabs">
        <a href="#/feed" data-tab="#/feed">${icon('home')}Home</a>
        <a href="#/people" data-tab="#/people">${icon('people')}People</a>
        <a href="#/messages" data-tab="#/messages" data-badge="messages">${icon('chat')}Messages</a>
        <a href="#/groups" data-tab="#/groups">${icon('groups')}Groups</a>
        <button data-act="more" data-badge="more">${icon('more')}More</button>
      </nav></div>`;
  }
  $$('.nav-a').forEach(a => a.classList.toggle('on', active(a.getAttribute('href'))));
  $$('.tabbar [data-tab]').forEach(a => a.classList.toggle('on', active(a.dataset.tab)));
  $('.tabbar [data-act="more"]').classList.toggle('on', ['#/mentors', '#/opportunities', '#/network', '#/settings', '#/admin', '#/notifications'].some(x => h.startsWith(x)) || h.startsWith('#/u/'));
  $('#main').innerHTML = loading();
  paintBadges();
}
const main = () => $('#main');

// ---------------------------------------------------------------- auth views
function authLayout(inner) {
  $('#app').innerHTML = `<div class="auth">
    <section class="auth-hero"><div>${logo('dark')}</div>
      <div><h1>Your campus, <span class="grad">finally connected.</span></h1>
      <p>The verified network linking students with the peers, alumni and mentors who can actually help.</p>
      <div class="auth-points"><div><span class="dot"></span>Verified members only</div><div><span class="dot"></span>Mentorship from alumni who have been there</div><div><span class="dot"></span>Internships and projects shared first</div></div></div>
      <p class="small" style="color:#7F92B8">© ${new Date().getFullYear()} LinkCampus</p></section>
    <section class="auth-main"><div class="auth-card">${inner}</div></section></div>`;
}

function viewLogin() {
  authLayout(`<h1>Welcome back</h1><p class="sub">Log in to your LinkCampus account.</p>
    <form id="f"><div id="err"></div>
      <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="pw">Password</label><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required></div>
      <div class="row between" style="margin-bottom:16px"><span></span><a href="#/forgot" class="small">Forgot password?</a></div>
      <button class="btn primary block" type="submit">Log in</button></form>
    <p class="muted small" style="text-align:center;margin-top:18px">New here? <a href="#/signup">Create an account</a></p>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try { await api('/auth/login', { method: 'POST', body: formObj(e.target) }); await loadMe(); go('#/feed'); }
      catch (err) { $('#err').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
    });
  };
}

function uniDatalist() {
  const names = [...new Set([...state.meta.universities.map(u => u.name), ...state.meta.suggestions])];
  return `<datalist id="unis">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
}
function viewSignup() {
  const M = state.meta;
  authLayout(`<h1>Join LinkCampus</h1><p class="sub">Free for the founding cohort.</p>
    <form id="f"><div id="err"></div>
      <div class="field"><label>I am a</label><div class="seg" id="roles">
        <button type="button" data-r="student" class="on">Student</button><button type="button" data-r="alumni">Alumni</button><button type="button" data-r="mentor">Mentor</button></div></div>
      <input type="hidden" name="role" value="student">
      <div class="field"><label for="name">Full name</label><input class="input" id="name" name="name" autocomplete="name" required maxlength="80"></div>
      <div class="field"><label for="uni">University</label><input class="input" id="uni" name="university" list="unis" required maxlength="120" autocomplete="organization" placeholder="Start typing your university">
        ${uniDatalist()}</div>
      <div class="field"><label for="email" id="email-l">Student email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="pw">Password</label><input class="input" id="pw" name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"></div>
      <label class="check"><input type="checkbox" name="ageConfirm" required> I am ${M.minAge} or older.</label>
      <label class="check"><input type="checkbox" name="terms" required> I agree to the <a href="https://linkcampus.io/terms.html" target="_blank">Terms</a> and <a href="https://linkcampus.io/privacy.html" target="_blank">Privacy Policy</a>.</label>
      <button class="btn primary block" type="submit" style="margin-top:6px">Create account</button></form>
    <p class="muted small" style="text-align:center;margin-top:18px">Already a member? <a href="#/login">Log in</a></p>`);
  $$('#roles button').forEach(b => b.onclick = () => {
    $$('#roles button').forEach(x => x.classList.toggle('on', x === b));
    $('[name=role]').value = b.dataset.r;
    $('#email-l').textContent = b.dataset.r === 'student' ? 'Student email' : 'Email';
  });
  $('#f').onsubmit = async e => {
    e.preventDefault();
    const body = formObj(e.target); body.ageConfirm = !!body.ageConfirm; body.terms = !!body.terms;
    await busy(e.submitter, async () => {
      try { const r = await api('/auth/signup', { method: 'POST', body }); state.devCode = r.devCode; await loadMe(); go('#/verify'); }
      catch (err) { $('#err').innerHTML = `<div class="err">${esc(err.message)}</div>`; $('#err').scrollIntoView({ block: 'center' }); }
    });
  };
}

function viewVerify() {
  authLayout(`<h1>Check your email</h1><p class="sub">We sent a 6-digit code to <b>${esc(state.me.email)}</b>. Enter it to verify your account.</p>
    <form id="f"><div id="err"></div>${state.devCode ? `<div class="note">Dev mode, no email provider set up yet. Your code is <b>${esc(state.devCode)}</b>.</div>` : ''}
      <div class="field"><input class="input code-input" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required placeholder="••••••"></div>
      <button class="btn primary block" type="submit">Verify</button></form>
    <div class="row between small" style="margin-top:18px"><button class="btn ghost sm" id="resend">Resend code</button><button class="btn ghost sm" data-act="logout">Use another account</button></div>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try { await api('/auth/verify', { method: 'POST', body: formObj(e.target) }); state.devCode = null; await loadMe(); go('#/welcome'); }
      catch (err) { $('#err').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
    });
  };
  $('#resend').onclick = e => busy(e.currentTarget, async () => {
    try { const r = await api('/auth/resend', { method: 'POST' }); if (r.devCode) { state.devCode = r.devCode; viewVerify(); } toast('New code sent.'); } catch (err) { fail(err); }
  });
}

function viewForgot() {
  let email = '';
  const step1 = () => {
    authLayout(`<h1>Reset password</h1><p class="sub">Enter your email and we'll send you a reset code.</p>
      <form id="f"><div id="err"></div><div class="field"><label>Email</label><input class="input" name="email" type="email" required></div>
      <button class="btn primary block">Send code</button></form><p class="small" style="text-align:center;margin-top:18px"><a href="#/login">Back to log in</a></p>`);
    $('#f').onsubmit = async e => {
      e.preventDefault(); email = formObj(e.target).email;
      await busy(e.submitter, async () => { try { const r = await api('/auth/forgot', { method: 'POST', body: { email } }); step2(r.devCode); } catch (err) { $('#err').innerHTML = `<div class="err">${esc(err.message)}</div>`; } });
    };
  };
  const step2 = dev => {
    authLayout(`<h1>Enter your code</h1><p class="sub">If an account exists for <b>${esc(email)}</b>, a code is on its way.</p>
      <form id="f"><div id="err"></div>${dev ? `<div class="note">Dev mode code: <b>${esc(dev)}</b></div>` : ''}
      <div class="field"><label>6-digit code</label><input class="input code-input" name="code" inputmode="numeric" maxlength="6" required></div>
      <div class="field"><label>New password</label><input class="input" name="password" type="password" minlength="8" autocomplete="new-password" required></div>
      <button class="btn primary block">Reset password</button></form>`);
    $('#f').onsubmit = async e => {
      e.preventDefault();
      await busy(e.submitter, async () => {
        try { await api('/auth/reset', { method: 'POST', body: { ...formObj(e.target), email } }); await loadMe(); toast('Password updated.'); go('#/feed'); }
        catch (err) { $('#err').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
      });
    };
  };
  step1();
}

// ---------------------------------------------------------------- onboarding
function profileFields(me, { compact = false } = {}) {
  const nonStudent = me.role !== 'student';
  return `
    ${compact ? `<div class="field"><label>Full name</label><input class="input" name="name" value="${esc(me.name)}" required maxlength="80"></div>
      <div class="field"><label>University</label><input class="input" name="university" list="unis" maxlength="120" value="${esc(me.campusName)}" required>${uniDatalist()}</div>` : ''}
    <div class="field"><label>Headline</label><input class="input" name="headline" maxlength="140" value="${esc(me.headline)}" placeholder="${nonStudent ? 'e.g. Front Office Manager at a 5* hotel' : 'e.g. Aspiring revenue manager'}"></div>
    <div class="field"><label>${nonStudent ? 'Degree and graduation year' : 'Programme'}</label><input class="input" name="degree" maxlength="120" value="${esc(me.degree)}" placeholder="${nonStudent ? 'e.g. BSc Hospitality Management (2021)' : 'e.g. BSc Hospitality Management'}"></div>
    ${nonStudent ? `<div class="field"><label>Company</label><input class="input" name="company" maxlength="120" value="${esc(me.company)}"></div>`
      : `<div class="field"><label>Year</label><select class="input" name="year">${['', '1st year', '2nd year', '3rd year', '4th year', 'Master', 'Exchange'].map(y => `<option ${y === me.year ? 'selected' : ''} value="${y}">${y || 'Select'}</option>`).join('')}</select></div>`}`;
}
function interestPicker(selected) {
  return `<div class="chips" id="interests">${state.meta.interests.map(i => `<button type="button" class="chip click ${selected.includes(i) ? 'on' : ''}" data-i="${esc(i)}">${esc(i)}</button>`).join('')}</div>`;
}
const bindInterests = root => $$('#interests .chip', root).forEach(c => c.onclick = () => c.classList.toggle('on'));
const readInterests = root => $$('#interests .chip.on', root).map(c => c.dataset.i);
function mentorFields(me) {
  if (me.role === 'student') return '';
  return `<div class="card flat" style="margin-bottom:14px"><label class="check" style="margin:0"><input type="checkbox" name="mentorOpen" ${me.mentorOpen ? 'checked' : ''}>
    <span><b>Open to mentoring students</b><br><span class="muted small">Students can send you mentorship requests. You choose who to accept.</span></span></label>
    <div class="field" style="margin:12px 0 0"><label>What can you help with?</label><input class="input" name="mentorTopics" maxlength="300" value="${esc(me.mentorTopics)}" placeholder="e.g. First job, interviews, F&B careers"></div>
    <div class="field" style="margin:12px 0 0"><label>Max active mentees</label><input class="input" type="number" min="1" max="20" name="mentorCapacity" value="${esc(me.mentorCapacity || 3)}"></div></div>`;
}

function viewOnboarding() {
  const me = state.me; let step = 0; const data = {};
  const wrap = inner => { $('#app').innerHTML = `<div class="onb"><div style="margin-bottom:26px">${logo()}</div><div class="steps">${[0, 1, 2].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>${inner}</div>`; };
  const render = () => {
    if (step === 0) {
      wrap(`<h1>Welcome, ${esc(me.name.split(' ')[0])} 👋</h1><p class="muted" style="margin:6px 0 22px">Let's set up your profile so the right people can find you.</p>
        <form id="f">${profileFields({ ...me, ...data })}<button class="btn primary block">Continue</button></form>`);
      $('#f').onsubmit = e => { e.preventDefault(); Object.assign(data, formObj(e.target)); step = 1; render(); };
    } else if (step === 1) {
      wrap(`<h1>What are you into?</h1><p class="muted" style="margin:6px 0 22px">Pick at least 3. We use these to match you with people and groups.</p>
        <div id="err"></div>${interestPicker(data.interests || me.interests)}
        <div class="row" style="margin-top:26px"><button class="btn ghost" id="back">Back</button><button class="btn primary grow" id="next">Continue</button></div>`);
      bindInterests($('#app'));
      $('#back').onclick = () => { step = 0; render(); };
      $('#next').onclick = () => { const i = readInterests($('#app')); if (i.length < 3) { $('#err').innerHTML = '<div class="err">Pick at least 3 interests.</div>'; return; } data.interests = i; step = 2; render(); };
    } else {
      wrap(`<h1>${me.role === 'student' ? 'What are you looking for?' : 'How do you want to help?'}</h1><p class="muted" style="margin:6px 0 22px">One line is enough. You can change this later.</p>
        <form id="f"><div id="err"></div>
        <div class="field"><label>Looking for</label><input class="input" name="lookingFor" maxlength="300" value="${esc(data.lookingFor || me.lookingFor)}" placeholder="${me.role === 'student' ? 'e.g. A summer internship, a study group, a mentor in F&B' : 'e.g. Helping students land their first role'}"></div>
        <div class="field"><label>Short bio</label><textarea class="input" name="bio" maxlength="1000" placeholder="A few sentences about you">${esc(data.bio || me.bio)}</textarea></div>
        ${mentorFields(me)}
        <div class="row"><button type="button" class="btn ghost" id="back">Back</button><button class="btn primary grow">Finish</button></div></form>`);
      $('#back').onclick = () => { step = 1; render(); };
      $('#f').onsubmit = async e => {
        e.preventDefault(); const f = formObj(e.target);
        Object.assign(data, f, { mentorOpen: !!f.mentorOpen });
        await busy(e.submitter, async () => {
          try { await api('/me', { method: 'PUT', body: data }); await loadMe(); state.meta = await api('/meta'); toast('Profile ready. Welcome to LinkCampus!'); go('#/feed'); }
          catch (err) { $('#err').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
        });
      };
    }
    window.scrollTo(0, 0);
  };
  render();
}

// ---------------------------------------------------------------- posts
function postCard(p) {
  return `<article class="card post" data-post="${p.id}">
    <div class="post-head">${av(p.author, 42)}<div class="grow"><div>${uname(p.author)} <span class="muted small">· ${ago(p.createdAt)}</span></div>
      <div class="tiny muted">${roleTag(p.author)} ${p.group ? `in <a href="#/groups/${p.group.id}">${esc(p.group.name)}</a>` : esc(p.author.headline || '')}</div></div>
      ${p.mine || state.me.isAdmin ? `<button class="btn icon" data-act="delpost" data-id="${p.id}" aria-label="Delete">${icon('trash')}</button>` : `<button class="btn icon" data-act="report" data-type="post" data-id="${p.id}" aria-label="Report">${icon('flag')}</button>`}
    </div>
    <div class="post-body">${linkify(p.body)}</div>
    <div class="post-actions">
      <button class="act ${p.liked ? 'on' : ''}" data-act="like" data-id="${p.id}">${icon('heart', p.liked ? 'fill="currentColor"' : '')}<span>${p.likes || ''}</span></button>
      <button class="act" data-act="comments" data-id="${p.id}">${icon('comment')}<span>${p.comments || ''}</span></button>
    </div><div class="comments" hidden></div></article>`;
}
function composer({ groupId, placeholder = 'Share something with the network…' } = {}) {
  return `<form class="card composer" id="composer"><div class="row" style="align-items:flex-start">${av(state.me, 42)}
    <textarea class="grow" name="body" maxlength="3000" placeholder="${esc(placeholder)}" rows="2"></textarea></div>
    <div class="row between" style="margin-top:8px"><span class="tiny muted">Visible to verified members${groupId ? ' of this group' : ''}</span><button class="btn primary sm" disabled>Post</button></div></form>`;
}
function bindComposer(onPost, groupId) {
  const f = $('#composer'); if (!f) return;
  const ta = $('textarea', f), btn = $('button', f);
  ta.oninput = () => { btn.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 300) + 'px'; };
  f.onsubmit = async e => {
    e.preventDefault();
    await busy(btn, async () => {
      try { const r = await api('/posts', { method: 'POST', body: { body: ta.value, groupId } }); ta.value = ''; onPost(r.post); toast('Posted.'); }
      catch (err) { fail(err); }
    });
    btn.disabled = !ta.value.trim();
  };
}
async function loadComments(postEl, id) {
  const box = $('.comments', postEl); box.hidden = false; box.innerHTML = loading();
  const { comments } = await api(`/posts/${id}/comments`);
  box.innerHTML = comments.map(c => `<div class="comment">${av(c.author, 30)}<div class="bubble"><div class="row between"><span>${uname(c.author)} <span class="tiny muted">${ago(c.createdAt)}</span></span>
      ${c.mine || state.me.isAdmin ? `<button class="act" style="padding:2px" data-act="delcomment" data-id="${c.id}" aria-label="Delete">${icon('trash', 'width="14" height="14"')}</button>` : `<button class="act" style="padding:2px" data-act="report" data-type="comment" data-id="${c.id}" aria-label="Report">${icon('flag', 'width="14" height="14"')}</button>`}</div>
      <div style="white-space:pre-wrap">${linkify(c.body)}</div></div></div>`).join('') +
    `<form class="row cform">${av(state.me, 30)}<input class="input grow" name="body" maxlength="1000" placeholder="Write a comment…" autocomplete="off"><button class="btn primary sm">Send</button></form>`;
  $('.cform', box).onsubmit = async e => {
    e.preventDefault(); const body = e.target.body.value.trim(); if (!body) return;
    await busy(e.submitter, async () => {
      try {
        await api(`/posts/${id}/comments`, { method: 'POST', body: { body } });
        const cnt = $('[data-act=comments] span', postEl); cnt.textContent = (Number(cnt.textContent) || 0) + 1;
        await loadComments(postEl, id);
      } catch (err) { fail(err); }
    });
  };
}
async function feedList(el, query, emptyHtml) {
  let before = null, done = false;
  const load = async () => {
    const { posts } = await api(`/posts?${query}${before ? `&before=${before}` : ''}`);
    if (!before && !posts.length) { el.innerHTML = emptyHtml; return; }
    if (!before) el.innerHTML = '';
    $('.more-btn', el)?.remove();
    el.insertAdjacentHTML('beforeend', posts.map(postCard).join(''));
    if (posts.length === 30) { before = posts[posts.length - 1].id; el.insertAdjacentHTML('beforeend', '<div class="more-btn" style="text-align:center;margin-top:14px"><button class="btn ghost">Load more</button></div>'); $('.more-btn button', el).onclick = e => busy(e.target, load); }
    else done = true;
  };
  await load().catch(err => { el.innerHTML = empty('⚠️', 'Could not load posts', err.message); });
  return { prepend: p => { if (!$('.post', el)) el.innerHTML = ''; el.insertAdjacentHTML('afterbegin', postCard(p)); }, done };
}

// ---------------------------------------------------------------- views
async function sidebarSuggestions() {
  const { users } = await api('/users/suggested');
  if (!users.length) return '';
  return `<div class="card"><h3 style="margin-bottom:6px">People you may know</h3><div class="list">${users.map(u => `<div class="list-item">${av(u, 38)}
    <div class="grow"><div class="small">${uname(u)}</div><div class="tiny muted">${u.shared.length ? `${u.shared.length} shared interest${u.shared.length > 1 ? 's' : ''}` : esc(u.headline || u.campusName)}</div></div>
    ${connectBtn(u)}</div>`).join('')}</div><a href="#/people" class="small" style="display:block;margin-top:8px">See all people</a></div>`;
}
function connectBtn(u, cls = 'sm') {
  const s = u.connection?.status || 'none';
  if (s === 'connected') return `<a class="btn ${cls}" href="#/messages/${u.id}">Message</a>`;
  if (s === 'outgoing') return `<button class="btn ghost ${cls}" disabled>Pending</button>`;
  if (s === 'incoming') return `<button class="btn green ${cls}" data-act="connect" data-id="${u.id}">Accept</button>`;
  return `<button class="btn primary ${cls}" data-act="connect" data-id="${u.id}">Connect</button>`;
}

async function viewFeed() {
  const tab = sessionStorage.getItem('feedTab') || 'all';
  main().innerHTML = `<div class="cols"><div>
      <div class="page-head"><div><h1>Home</h1><p class="muted">What's happening across your network</p></div></div>
      ${composer()}
      <div class="tabs" style="margin-top:16px"><button class="tab ${tab === 'all' ? 'on' : ''}" data-t="all">Everything</button><button class="tab ${tab === 'campus' ? 'on' : ''}" data-t="campus">My university</button></div>
      <div id="feed">${loading()}</div></div>
    <aside id="aside"></aside></div>`;
  $$('.tab[data-t]').forEach(t => t.onclick = () => { sessionStorage.setItem('feedTab', t.dataset.t); viewFeed(); });
  const feed = await feedList($('#feed'), `scope=${tab}`, empty('✨', 'Nothing here yet', 'Be the first to post. Ask a question, share a win, or find a study partner.'));
  bindComposer(p => feed.prepend(p));
  sidebarSuggestions().then(h => { if ($('#aside')) $('#aside').innerHTML = h + `<div class="card"><h3>Quick links</h3><div class="stack small" style="margin-top:10px">
    <a href="#/mentors">${state.me.role === 'student' ? 'Find a mentor' : 'Your mentees'}</a><a href="#/opportunities">Browse opportunities</a><a href="#/groups">Join a group</a></div></div>`; }).catch(() => {});
}

async function viewPost(id) {
  try {
    const { post } = await api('/posts/' + id);
    main().innerHTML = `<div class="narrow"><a href="#/feed" class="btn ghost sm" style="margin-bottom:14px">${icon('back', 'width="16" height="16"')} Back</a>${postCard(post)}</div>`;
    loadComments($('.post'), id);
  } catch (err) { main().innerHTML = empty('🫥', 'Post not available', err.message); }
}

async function viewPeople() {
  const M = state.meta;
  const q = JSON.parse(sessionStorage.getItem('peopleQ') || '{}');
  main().innerHTML = `<div class="page-head"><div><h1>People</h1><p class="muted">Find students, alumni and mentors. Best matches first.</p></div></div>
    <div class="filters"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search name, company, interest…" value="${esc(q.q || '')}"></div>
      <select class="input" id="role"><option value="">Everyone</option><option value="student">Students</option><option value="alumni">Alumni</option><option value="mentor">Mentors</option></select>
      <select class="input" id="interest"><option value="">Any interest</option>${M.interests.map(i => `<option>${esc(i)}</option>`).join('')}</select>
      ${M.universities.length > 1 ? `<select class="input" id="campus"><option value="">All universities</option>${M.universities.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${c.members})</option>`).join('')}</select>` : ''}</div>
    <div id="res">${loading()}</div>`;
  ['role', 'interest', 'campus'].forEach(k => { if ($('#' + k)) $('#' + k).value = q[k] || ''; });
  let timer;
  const load = async () => {
    const params = { q: $('#q').value, role: $('#role').value, interest: $('#interest').value, campus: $('#campus')?.value || '' };
    sessionStorage.setItem('peopleQ', JSON.stringify(params));
    const { users } = await api('/users?' + new URLSearchParams(params));
    if (!$('#res')) return;
    $('#res').innerHTML = users.length ? `<div class="grid">${users.map(personCard).join('')}</div>` : empty('🔎', 'No one found', 'Try a different search or filter.');
  };
  $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
  $$('.filters select').forEach(s => s.onchange = load);
  load().catch(fail);
}
function personCard(u) {
  return `<div class="card person"><div class="top">${av(u, 52)}<div class="grow"><div>${uname(u)}</div><div class="tiny">${roleTag(u)} ${u.mentorOpen ? '<span class="role mentor">Mentoring</span>' : ''}</div></div></div>
    <div class="head">${esc(u.headline || u.degree || u.campusName)}</div>
    ${u.shared?.length ? `<div class="chips">${u.shared.slice(0, 3).map(i => `<span class="chip shared">${esc(i)}</span>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:auto"><a class="btn ghost sm grow" href="#/u/${u.id}">View</a>${connectBtn(u)}</div></div>`;
}

async function viewProfile(id) {
  id = Number(id);
  let d;
  try { d = await api('/users/' + id); } catch (err) { main().innerHTML = empty('🫥', 'Profile not found', err.message); return; }
  const u = d.user, mine = u.id === state.me.id, s = u.connection?.status;
  let actions = '';
  if (mine) actions = `<a class="btn ghost" href="#/settings">Edit profile</a>`;
  else {
    actions = connectBtn(u, '');
    if (d.canMessage && s !== 'connected') actions += `<a class="btn" href="#/messages/${u.id}">Message</a>`;
    if (u.mentorOpen && state.me.role === 'student') {
      const ms = d.mentorship?.status;
      actions += ms === 'pending' ? `<button class="btn ghost" disabled>Mentorship requested</button>` : ms === 'accepted' ? `<span class="chip shared">Your mentor</span>`
        : `<button class="btn green" data-act="askmentor" data-id="${u.id}" data-name="${esc(u.name)}">Ask for mentorship</button>`;
    }
    if (s === 'connected') actions += `<button class="btn ghost" data-act="unconnect" data-id="${u.connection.id}">Remove</button>`;
    if (s === 'outgoing') actions += `<button class="btn ghost" data-act="unconnect" data-id="${u.connection.id}">Withdraw</button>`;
    actions += `<button class="btn icon" data-act="report" data-type="user" data-id="${u.id}" aria-label="Report">${icon('flag')}</button>`;
  }
  main().innerHTML = `<div class="cols"><div>
    <div class="card"><div class="cover"></div><div class="profile-top">${av(u, 96)}<div class="grow" style="padding-bottom:6px"></div></div>
      <h1 style="margin-top:10px">${esc(u.name)}${u.verified ? VERIFIED : ''}</h1>
      <p style="margin-top:4px">${esc(u.headline)}</p>
      <div class="row wrap small muted" style="margin-top:8px">${roleTag(u)} <span>${esc(u.campusName)}</span>${u.company ? `<span>· ${esc(u.company)}</span>` : ''}
        <span>· <b style="color:var(--text)">${d.connectionCount}</b> connections</span>${!mine && d.mutualCount ? `<span>· ${d.mutualCount} mutual</span>` : ''}</div>
      <div class="row wrap" style="margin-top:16px">${actions}</div></div>
    ${u.bio ? `<div class="card"><h3>About</h3><p style="margin-top:8px;white-space:pre-wrap">${linkify(u.bio)}</p></div>` : ''}
    ${u.mentorOpen ? `<div class="card" style="border-color:color-mix(in srgb,#7C5CFF 40%,var(--line))"><h3>🎓 Open to mentoring</h3><p class="muted" style="margin-top:6px">${esc(u.mentorTopics || 'Happy to help students with career questions.')}</p></div>` : ''}
    <h2 style="margin:22px 0 12px">Posts</h2><div id="uposts">${loading()}</div></div>
    <aside><div class="card"><dl class="kv">
      ${u.degree ? `<dt>Programme</dt><dd>${esc(u.degree)}</dd>` : ''}${u.year ? `<dt>Year</dt><dd>${esc(u.year)}</dd>` : ''}
      ${u.lookingFor ? `<dt>Looking for</dt><dd>${esc(u.lookingFor)}</dd>` : ''}<dt>Joined</dt><dd>${new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</dd></dl>
      ${u.interests.length ? `<h3 style="margin:16px 0 8px">Interests</h3><div class="chips">${u.interests.map(i => `<span class="chip ${d.shared.includes(i) && !mine ? 'shared' : ''}">${esc(i)}</span>`).join('')}</div>` : ''}</div></aside></div>`;
  feedList($('#uposts'), `user=${u.id}`, `<div class="card">${empty('📝', 'No posts yet', mine ? 'Share your first update from Home.' : 'Nothing shared yet.')}</div>`);
}

async function viewNetwork() {
  const d = await api('/connections');
  const item = (c, btns) => `<div class="list-item">${av(c.user, 44)}<div class="grow"><div>${uname(c.user)}</div><div class="small muted">${esc(c.user.headline || c.user.campusName)}</div></div><div class="row">${btns}</div></div>`;
  main().innerHTML = `<div class="page-head"><div><h1>Network</h1><p class="muted">${d.connections.length} connection${d.connections.length === 1 ? '' : 's'}</p></div><a class="btn primary" href="#/people">${icon('plus', 'width="18" height="18"')} Find people</a></div>
    ${d.incoming.length ? `<div class="card"><h3>Requests (${d.incoming.length})</h3><div class="list">${d.incoming.map(c => item(c, `<button class="btn ghost sm" data-act="decline" data-id="${c.id}">Ignore</button><button class="btn primary sm" data-act="accept" data-id="${c.id}">Accept</button>`)).join('')}</div></div>` : ''}
    <div class="card"><h3>Connections</h3>${d.connections.length ? `<div class="list">${d.connections.map(c => item(c, `<a class="btn sm" href="#/messages/${c.user.id}">Message</a>`)).join('')}</div>` : empty('🤝', 'No connections yet', 'Connect with classmates, alumni and mentors to start messaging.', '<a class="btn primary" href="#/people">Find people</a>')}</div>
    ${d.outgoing.length ? `<div class="card"><h3>Sent requests</h3><div class="list">${d.outgoing.map(c => item(c, `<button class="btn ghost sm" data-act="unconnect" data-id="${c.id}">Withdraw</button>`)).join('')}</div></div>` : ''}`;
}

async function viewMessages(userId) {
  main().innerHTML = `<div class="msgs ${userId ? 'has-thread' : ''}"><div class="conv-list" id="convs">${loading()}</div><div class="thread" id="thread">
    ${userId ? loading() : `<div style="margin:auto">${empty('💬', 'Your messages', 'Pick a conversation, or message a connection from their profile.')}</div>`}</div></div>`;
  const loadConvs = async () => {
    const { conversations } = await api('/conversations');
    if (!$('#convs')) return;
    $('#convs').innerHTML = `<div style="padding:14px 14px 8px"><h2>Messages</h2></div>` + (conversations.length ? conversations.map(c => `<a class="conv ${String(c.user.id) === userId ? 'on' : ''} ${c.unread ? 'unread' : ''}" href="#/messages/${c.user.id}">
      ${av(c.user, 44)}<div class="grow"><div class="row between"><b class="small">${esc(c.user.name)}</b><span class="tiny muted">${ago(c.last.createdAt)}</span></div>
      <div class="last">${c.last.fromMe ? 'You: ' : ''}${esc(c.last.body)}</div></div>${c.unread ? `<span class="badge">${c.unread}</span>` : ''}</a>`).join('')
      : `<div style="padding:0 14px">${empty('📭', 'No conversations', 'Connect with someone to start chatting.', '<a class="btn primary sm" href="#/network">Your network</a>')}</div>`);
  };
  loadConvs().catch(fail);
  if (!userId) return;
  let lastId = 0, lastDay = '';
  const renderMsgs = (msgs, append) => {
    const body = $('#tbody'); if (!body) return;
    const html = msgs.map(m => {
      const day = new Date(m.createdAt).toDateString();
      const sep = day !== lastDay ? `<div class="bub-time">${new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</div>` : '';
      lastDay = day; lastId = Math.max(lastId, m.id);
      return sep + `<div class="bub ${m.fromMe ? 'me' : 'them'}" title="${new Date(m.createdAt).toLocaleString()}">${linkify(m.body)}</div>`;
    }).join('');
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    if (append) body.insertAdjacentHTML('beforeend', html); else body.innerHTML = html || `<div style="margin:auto">${empty('👋', 'Say hello', 'This is the start of your conversation.')}</div>`;
    if (!append || atBottom) body.scrollTop = body.scrollHeight;
  };
  try {
    const d = await api(`/messages/${userId}`);
    $('#thread').innerHTML = `<div class="thread-head"><a href="#/messages" class="btn icon" aria-label="Back">${icon('back')}</a>${av(d.user, 38)}
      <div class="grow"><a href="#/u/${d.user.id}"><b style="color:var(--text)">${esc(d.user.name)}</b></a><div class="tiny muted">${esc(d.user.headline || d.user.campusName)}</div></div>
      <button class="btn icon" data-act="report" data-type="user" data-id="${d.user.id}" aria-label="Report">${icon('flag')}</button></div>
      <div class="thread-body" id="tbody"></div>
      ${d.canMessage ? `<form class="thread-input" id="send"><textarea class="input grow" name="body" rows="1" maxlength="4000" placeholder="Write a message…"></textarea><button class="btn primary" aria-label="Send" style="border-radius:50%;width:42px;height:42px;padding:0">${icon('send', 'width="18" height="18"')}</button></form>`
        : `<div class="note" style="margin:10px">You can message ${esc(d.user.name)} once you're connected. ${connectBtn(d.user)}</div>`}`;
    renderMsgs(d.messages, false);
    loadConvs();
    const f = $('#send');
    if (f) {
      const ta = $('textarea', f);
      ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; };
      ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(min-width:861px)').matches) { e.preventDefault(); f.requestSubmit(); } };
      f.onsubmit = async e => {
        e.preventDefault(); const body = ta.value.trim(); if (!body) return;
        ta.value = ''; ta.style.height = 'auto';
        try { await api(`/messages/${userId}`, { method: 'POST', body: { body } }); await poll(); loadConvs(); }
        catch (err) { ta.value = body; fail(err); }
      };
    }
    let polling = false;
    const poll = async () => { if (polling) return; polling = true; try { const d2 = await api(`/messages/${userId}?after=${lastId}`); if (d2.messages.length) { renderMsgs(d2.messages, true); } } finally { polling = false; } };
    const iv = setInterval(() => { if (!document.hidden) poll().catch(() => {}); }, 4000);
    state.cleanup = () => clearInterval(iv);
  } catch (err) { $('#thread').innerHTML = empty('🫥', 'Conversation unavailable', err.message); }
}

async function viewMentors() {
  const me = state.me, tab = sessionStorage.getItem('mentorTab') || (me.role === 'student' ? 'find' : 'requests');
  main().innerHTML = `<div class="page-head"><div><h1>Mentors</h1><p class="muted">${me.role === 'student' ? 'Alumni and professionals who give an hour to help.' : 'Help the students following your path.'}</p></div>
    ${me.role !== 'student' && !me.mentorOpen ? `<a class="btn green" href="#/settings">Start mentoring</a>` : ''}</div>
    <div class="tabs"><button class="tab ${tab === 'find' ? 'on' : ''}" data-t="find">Find mentors</button><button class="tab ${tab === 'requests' ? 'on' : ''}" data-t="requests">Requests</button></div><div id="mc">${loading()}</div>`;
  $$('.tab').forEach(t => t.onclick = () => { sessionStorage.setItem('mentorTab', t.dataset.t); viewMentors(); });
  if (tab === 'find') {
    const { users } = await api('/users?mentors=1');
    $('#mc').innerHTML = users.length ? `<div class="grid">${users.map(u => `<div class="card person"><div class="top">${av(u, 52)}<div class="grow"><div>${uname(u)}</div><div class="tiny">${roleTag(u)}</div></div></div>
      <div class="head">${esc(u.headline)}</div><div class="small"><b>Can help with:</b> <span class="muted">${esc(u.mentorTopics || 'General career advice')}</span></div>
      <div class="row" style="margin-top:auto"><a class="btn ghost sm grow" href="#/u/${u.id}">Profile</a>${me.role === 'student' ? `<button class="btn green sm" data-act="askmentor" data-id="${u.id}" data-name="${esc(u.name)}">Ask</button>` : ''}</div></div>`).join('')}</div>`
      : empty('🎓', 'No mentors yet', 'Mentors appear here as alumni open their calendars. Check back soon.');
    return;
  }
  const { incoming, outgoing } = await api('/mentorship');
  const statusChip = s => `<span class="chip ${s === 'accepted' ? 'shared' : ''}">${s[0].toUpperCase() + s.slice(1)}</span>`;
  const row = (r, other, btns) => `<div class="card"><div class="row">${av(other, 44)}<div class="grow"><div>${uname(other)}</div><div class="tiny muted">${ago(r.createdAt)} · ${esc(r.topic)}</div></div>${statusChip(r.status)}</div>
    <p style="margin-top:10px;white-space:pre-wrap" class="small">${esc(r.message)}</p>${btns ? `<div class="row wrap" style="margin-top:12px">${btns}</div>` : ''}</div>`;
  $('#mc').innerHTML = (me.role !== 'student' ? `<h3 style="margin-bottom:10px">Incoming</h3>${incoming.length ? incoming.map(r => row(r, r.student,
      r.status === 'pending' ? `<button class="btn ghost sm" data-act="mentor" data-a="decline" data-id="${r.id}">Decline</button><button class="btn green sm" data-act="mentor" data-a="accept" data-id="${r.id}">Accept</button>`
        : r.status === 'accepted' ? `<a class="btn sm" href="#/messages/${r.student.id}">Message</a><button class="btn ghost sm" data-act="mentor" data-a="complete" data-id="${r.id}">Mark completed</button>` : '')).join('')
      : `<div class="card">${empty('📬', 'No requests yet', me.mentorOpen ? 'Students will find you in the mentor directory.' : 'Turn on mentoring in Settings so students can find you.')}</div>`}<div style="height:18px"></div>` : '')
    + `<h3 style="margin-bottom:10px">Sent</h3>${outgoing.length ? outgoing.map(r => row(r, r.mentor,
      r.status === 'pending' ? `<button class="btn ghost sm" data-act="mentor" data-a="cancel" data-id="${r.id}">Cancel request</button>` : r.status === 'accepted' ? `<a class="btn sm" href="#/messages/${r.mentor.id}">Message</a>` : '')).join('')
      : `<div class="card">${empty('🧭', 'No requests sent', 'Find a mentor and ask for an hour of their time.')}</div>`}`;
}

async function viewGroups() {
  main().innerHTML = `<div class="page-head"><div><h1>Groups</h1><p class="muted">Study groups, societies and interest circles.</p></div><button class="btn primary" data-act="newgroup">${icon('plus', 'width="18" height="18"')} New group</button></div>
    <div class="filters"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search groups"></div></div><div id="gl">${loading()}</div>`;
  let timer;
  const load = async () => {
    const { groups } = await api('/groups?q=' + encodeURIComponent($('#q').value));
    if (!$('#gl')) return;
    $('#gl').innerHTML = groups.length ? `<div class="grid">${groups.map(g => `<div class="card person"><div class="row between"><span class="type">${esc(g.category)}</span>${g.joined ? '<span class="chip shared">Joined</span>' : ''}</div>
      <a href="#/groups/${g.id}"><h3 style="color:var(--text)">${esc(g.name)}</h3></a><div class="head">${esc(g.description || 'No description yet.')}</div>
      <div class="row between" style="margin-top:auto"><span class="small muted">${g.members} member${g.members === 1 ? '' : 's'}</span>
      ${g.joined ? `<a class="btn sm" href="#/groups/${g.id}">Open</a>` : `<button class="btn primary sm" data-act="join" data-id="${g.id}">Join</button>`}</div></div>`).join('')}</div>`
      : empty('🧩', 'No groups found', 'Start one. Study groups fill up fast before exams.', '<button class="btn primary" data-act="newgroup">Create a group</button>');
  };
  $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
  load().catch(fail);
}

async function viewGroup(id) {
  let d; try { d = await api('/groups/' + id); } catch (err) { main().innerHTML = empty('🫥', 'Group not found', err.message); return; }
  const g = d.group;
  main().innerHTML = `<div class="cols"><div>
    <div class="card"><div class="cover" style="height:80px"></div><div style="margin-top:14px" class="row between wrap"><span class="type">${esc(g.category)}</span><span class="small muted">${esc(g.campusName)}</span></div>
      <h1 style="margin-top:8px">${esc(g.name)}</h1><p class="muted" style="margin-top:6px;white-space:pre-wrap">${esc(g.description)}</p>
      <div class="row wrap" style="margin-top:14px"><span class="small"><b>${g.members}</b> member${g.members === 1 ? '' : 's'}</span><span class="grow"></span>
      ${g.joined ? `<button class="btn ghost sm" data-act="leave" data-id="${g.id}">Leave</button>` : `<button class="btn primary" data-act="join" data-id="${g.id}">Join group</button>`}
      ${g.owner || state.me.isAdmin ? `<button class="btn danger sm" data-act="delgroup" data-id="${g.id}">Delete</button>` : `<button class="btn icon" data-act="report" data-type="group" data-id="${g.id}" aria-label="Report">${icon('flag')}</button>`}</div></div>
    <div style="height:14px"></div>${g.joined ? composer({ groupId: g.id, placeholder: `Post in ${g.name}…` }) : ''}
    <div id="gposts" style="margin-top:14px">${g.joined ? loading() : `<div class="card">${empty('🔒', 'Join to see posts', 'Group discussions are visible to members.')}</div>`}</div></div>
    <aside><div class="card"><h3>Members</h3><div class="list" style="margin-top:6px">${d.members.map(u => `<div class="list-item">${av(u, 34)}<div class="grow small">${uname(u)}<div class="tiny muted">${esc(u.headline || '')}</div></div></div>`).join('')}</div></div></aside></div>`;
  if (g.joined) {
    const feed = await feedList($('#gposts'), `group=${g.id}`, `<div class="card">${empty('💬', 'No posts yet', 'Kick off the conversation.')}</div>`);
    bindComposer(p => feed.prepend(p), g.id);
  }
}

async function viewOpps() {
  const f = JSON.parse(sessionStorage.getItem('oppF') || '{"type":""}');
  main().innerHTML = `<div class="page-head"><div><h1>Opportunities</h1><p class="muted">Internships, jobs and projects shared in the network first.</p></div><button class="btn primary" data-act="newopp">${icon('plus', 'width="18" height="18"')} Post</button></div>
    <div class="tabs" id="otabs"></div><div class="filters"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search title, company, location"></div></div><div id="ol">${loading()}</div>`;
  let timer, types = ['Internship', 'Job', 'Project', 'Event', 'Scholarship'];
  const tabs = () => { $('#otabs').innerHTML = [['', 'All'], ...types.map(t => [t, t + 's']), ['saved', 'Saved']].map(([v, l]) => `<button class="tab ${f.type === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
    $$('#otabs .tab').forEach(t => t.onclick = () => { f.type = t.dataset.v; sessionStorage.setItem('oppF', JSON.stringify(f)); tabs(); load(); }); };
  const load = async () => {
    const params = new URLSearchParams({ q: $('#q').value, ...(f.type === 'saved' ? { saved: '1' } : { type: f.type }) });
    const d = await api('/opportunities?' + params); types = d.types;
    if (!$('#ol')) return;
    $('#ol').innerHTML = d.opportunities.length ? d.opportunities.map(oppCard).join('') : empty(f.type === 'saved' ? '🔖' : '💼', f.type === 'saved' ? 'Nothing saved' : 'No opportunities yet', f.type === 'saved' ? 'Tap the bookmark on any listing to save it.' : 'Alumni and partners post here first. Know of one? Share it.');
  };
  tabs();
  $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
  load().catch(fail);
}
function oppCard(o) {
  return `<div class="card opp" data-opp="${o.id}"><div class="row" style="align-items:flex-start"><div class="grow"><span class="type">${esc(o.type)}</span><h3 style="margin-top:8px">${esc(o.title)}</h3><div class="small" style="font-weight:600">${esc(o.org)}</div></div>
    <button class="btn icon" data-act="save" data-id="${o.id}" aria-label="Save" style="color:${o.saved ? 'var(--blue)' : 'inherit'}">${icon('bookmark', o.saved ? 'fill="currentColor"' : '')}</button></div>
    <div class="meta">${o.location ? `<span>📍 ${esc(o.location)}</span>` : ''}${o.deadline ? `<span>⏳ Apply by ${fmtDate(o.deadline)}</span>` : ''}<span>Shared by <a href="#/u/${o.poster.id}">${esc(o.poster.name)}</a> · ${ago(o.createdAt)}</span></div>
    <div class="desc">${linkify(o.description)}</div>
    <div class="row wrap" style="margin-top:14px">${o.link ? `<button class="btn primary sm" data-act="apply" data-id="${o.id}" data-link="${esc(o.link)}">Apply ${icon('external', 'width="15" height="15"')}</button>` : ''}
      ${o.mine ? `<span class="small muted">${o.views} views · ${o.clicks} apply clicks</span><span class="grow"></span><button class="btn danger sm" data-act="delopp" data-id="${o.id}">Remove</button>`
        : `<span class="grow"></span><button class="btn icon" data-act="report" data-type="opportunity" data-id="${o.id}" aria-label="Report">${icon('flag')}</button>`}</div></div>`;
}

async function viewNotifications() {
  const { notifications } = await api('/notifications');
  const ic = { connection: 'people', like: 'heart', comment: 'comment', mentor: 'mentor', group: 'groups' };
  main().innerHTML = `<div class="narrow"><div class="page-head"><h1>Notifications</h1></div><div class="card" style="padding:8px">
    ${notifications.length ? notifications.map(n => `<a class="notif ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/feed')}"><span class="ic">${icon(ic[n.type] || 'bell')}</span><div class="grow"><div>${esc(n.text)}</div><div class="tiny muted">${ago(n.createdAt)}</div></div></a>`).join('')
      : empty('🔔', 'All caught up', 'Connection requests, comments and mentorship updates show up here.')}</div></div>`;
  if (notifications.some(n => !n.read)) { await api('/notifications/read', { method: 'POST' }).catch(() => {}); state.badges.notifications = 0; paintBadges(); }
}

async function viewSettings() {
  const me = state.me;
  main().innerHTML = `<div class="narrow"><div class="page-head"><div><h1>Settings</h1><p class="muted">${esc(me.email)}</p></div></div>
    <form class="card" id="pf"><h2>Profile</h2><div style="height:12px"></div>
      ${profileFields(me, { compact: true })}
      <div class="field"><label>Looking for</label><input class="input" name="lookingFor" maxlength="300" value="${esc(me.lookingFor)}"></div>
      <div class="field"><label>Bio</label><textarea class="input" name="bio" maxlength="1000">${esc(me.bio)}</textarea></div>
      <div class="field"><label>Interests</label>${interestPicker(me.interests)}</div>
      ${mentorFields(me)}
      <button class="btn primary">Save profile</button></form>
    <form class="card" id="pw"><h2>Password</h2><div style="height:12px"></div>
      <div class="field"><label>Current password</label><input class="input" type="password" name="current" autocomplete="current-password" required></div>
      <div class="field"><label>New password</label><input class="input" type="password" name="password" minlength="8" autocomplete="new-password" required></div>
      <button class="btn">Change password</button></form>
    <div class="card"><h2>Your data</h2><p class="muted small" style="margin:6px 0 14px">Download everything we hold about you, or delete your account permanently.</p>
      <div class="row wrap"><button class="btn" id="export">Download my data</button><button class="btn danger" id="del">Delete account</button></div></div>
    <div class="card"><div class="row between"><div><h3>Log out</h3><p class="small muted">Signed in as ${esc(me.name)}</p></div><button class="btn ghost" data-act="logout">${icon('logout', 'width="18" height="18"')} Log out</button></div></div>
    <p class="tiny muted" style="text-align:center;margin-top:18px"><a href="https://linkcampus.io/privacy.html" target="_blank">Privacy</a> · <a href="https://linkcampus.io/terms.html" target="_blank">Terms</a> · <a href="mailto:hello@linkcampus.io">Contact</a></p></div>`;
  bindInterests($('#pf'));
  $('#pf').onsubmit = async e => {
    e.preventDefault(); const f = formObj(e.target);
    const body = { ...f, interests: readInterests($('#pf')), mentorOpen: !!f.mentorOpen };
    await busy(e.submitter, async () => { try { await api('/me', { method: 'PUT', body }); await loadMe(); $('.me-name') && ($('.me-name').textContent = state.me.name); toast('Profile saved.'); state.meta = await api('/meta'); } catch (err) { fail(err); } });
  };
  $('#pw').onsubmit = async e => {
    e.preventDefault();
    await busy(e.submitter, async () => { try { await api('/me/password', { method: 'POST', body: formObj(e.target) }); e.target.reset(); toast('Password changed.'); } catch (err) { fail(err); } });
  };
  $('#export').onclick = e => busy(e.currentTarget, async () => {
    const data = await api('/me/export');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'linkcampus-data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#del').onclick = () => modal(`<h2>Delete account</h2><p class="muted">This permanently deletes your profile, posts, messages and connections. It can't be undone.</p>
    <form id="df" style="margin-top:16px"><div class="field"><label>Confirm with your password</label><input class="input" type="password" name="password" required></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn danger">Delete forever</button></div></form>`, (m, close) => {
    $('#df', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api('/me', { method: 'DELETE', body: formObj(e.target) }); close(); state.me = null; toast('Your account was deleted.'); go('#/login'); } catch (err) { fail(err); } }); };
  });
}

async function viewAdmin() {
  if (!state.me.isAdmin) return go('#/feed');
  const [s, r] = await Promise.all([api('/admin/stats'), api('/admin/reports')]);
  const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
  main().innerHTML = `<div class="page-head"><div><h1>Admin</h1><p class="muted">Moderation and network health</p></div></div>
    <div class="stats">${stat(s.users, 'Members')}${stat(s.verified, 'Verified')}${stat(s.newUsers7d, 'New in 7 days')}${stat(s.connections, 'Connections')}${stat(s.messages, 'Messages')}${stat(s.posts, 'Posts')}${stat(s.groups, 'Groups')}${stat(s.opportunities, 'Opportunities')}${stat(s.mentorships, 'Mentorships')}${stat(s.openReports, 'Open reports')}</div>
    <h2 style="margin:24px 0 12px">Open reports</h2>
    ${r.reports.length ? r.reports.map(x => `<div class="card"><div class="row between wrap"><span class="type">${esc(x.targetType)} #${x.targetId}</span><span class="tiny muted">${ago(x.createdAt)} by ${esc(x.reporter?.name || 'deleted user')}</span></div>
      <p style="margin-top:10px"><b>Reason:</b> ${esc(x.reason)}</p><p class="small muted" style="margin-top:6px;white-space:pre-wrap">${x.target ? esc(x.target.text) : '<i>Already removed</i>'}</p>
      <div class="row wrap" style="margin-top:12px"><button class="btn ghost sm" data-act="resolve" data-a="dismiss" data-id="${x.id}">Dismiss</button>
      ${x.targetType !== 'user' && x.target ? `<button class="btn sm" data-act="resolve" data-a="remove" data-id="${x.id}">Remove content</button>` : ''}
      ${x.target?.userId ? `<button class="btn danger sm" data-act="resolve" data-a="ban" data-id="${x.id}">Ban author</button>` : ''}</div></div>`).join('') : `<div class="card">${empty('✅', 'No open reports', 'The network is behaving.')}</div>`}
    <h2 style="margin:24px 0 12px">Members</h2><div class="filters"><div class="search">${icon('search')}<input class="input" id="uq" placeholder="Search name or email"></div></div><div class="card" id="ul"></div>`;
  let timer;
  const loadUsers = async () => {
    const { users } = await api('/admin/users?q=' + encodeURIComponent($('#uq').value));
    $('#ul').innerHTML = `<div class="list">${users.map(u => `<div class="list-item">${av(u, 36)}<div class="grow"><div class="small">${uname(u)} ${u.isAdmin ? '<span class="chip">Admin</span>' : ''}</div><div class="tiny muted">${esc(u.email)} · ${esc(u.role)}${u.verified ? '' : ' · unverified'}</div></div>
      ${u.id !== state.me.id ? `<button class="btn ${u.banned ? '' : 'danger'} sm" data-act="ban" data-id="${u.id}" data-b="${u.banned ? 0 : 1}">${u.banned ? 'Unban' : 'Ban'}</button>` : ''}</div>`).join('')}</div>`;
  };
  $('#uq').oninput = () => { clearTimeout(timer); timer = setTimeout(loadUsers, 250); };
  loadUsers();
}

// ---------------------------------------------------------------- actions (event delegation)
const ACT = {
  async like(b) {
    const r = await api(`/posts/${b.dataset.id}/like`, { method: 'POST' });
    b.classList.toggle('on', r.liked); b.innerHTML = icon('heart', r.liked ? 'fill="currentColor"' : '') + `<span>${r.likes || ''}</span>`;
  },
  async comments(b) { const p = b.closest('.post'); const box = $('.comments', p); if (!box.hidden) { box.hidden = true; return; } await loadComments(p, b.dataset.id); $('.cform input', p)?.focus(); },
  async delpost(b) { if (!await confirmBox('Delete this post?', 'Delete')) return; await api(`/posts/${b.dataset.id}`, { method: 'DELETE' }); b.closest('.post').remove(); toast('Post deleted.'); },
  async delcomment(b) { if (!await confirmBox('Delete this comment?', 'Delete')) return; await api(`/comments/${b.dataset.id}`, { method: 'DELETE' }); const p = b.closest('.post'); const c = $('[data-act=comments] span', p); c.textContent = Math.max(0, (Number(c.textContent) || 1) - 1) || ''; loadComments(p, p.dataset.post); },
  report(b) {
    modal(`<h2>Report</h2><p class="muted small">Tell us what's wrong. Reports are confidential and reviewed by the LinkCampus team.</p>
      <form id="rf" style="margin-top:14px"><div class="field">${['Spam or scam', 'Harassment or bullying', 'Inappropriate content', 'Fake profile', 'Something else'].map((r, i) => `<label class="check"><input type="radio" name="reason" value="${r}" ${i ? '' : 'checked'}> ${r}</label>`).join('')}</div>
      <div class="field"><textarea class="input" name="detail" maxlength="400" placeholder="Details (optional)"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn danger">Send report</button></div></form>`, (m, close) => {
      $('#rf', m).onsubmit = async e => { e.preventDefault(); const f = formObj(e.target);
        await busy(e.submitter, async () => { try { await api('/reports', { method: 'POST', body: { targetType: b.dataset.type, targetId: b.dataset.id, reason: f.reason + (f.detail ? ': ' + f.detail : '') } }); close(); toast('Thanks. We will review it.'); } catch (err) { fail(err); } }); };
    });
  },
  async connect(b) {
    const r = await api('/connections', { method: 'POST', body: { userId: b.dataset.id } });
    if (r.status === 'connected') { b.outerHTML = `<a class="btn ${b.classList.contains('sm') ? 'sm' : ''}" href="#/messages/${b.dataset.id}">Message</a>`; toast('Connected!'); }
    else { b.textContent = 'Pending'; b.className = 'btn ghost ' + (b.classList.contains('sm') ? 'sm' : ''); b.removeAttribute('data-act'); setTimeout(() => { b.disabled = true; }); toast('Request sent.'); }
  },
  async accept(b) { await api(`/connections/${b.dataset.id}/accept`, { method: 'POST' }); toast('Connected!'); route(); },
  async decline(b) { await api(`/connections/${b.dataset.id}/decline`, { method: 'POST' }); route(); },
  async unconnect(b) { if (!await confirmBox('Remove this connection?', 'Remove')) return; await api(`/connections/${b.dataset.id}`, { method: 'DELETE' }); route(); },
  askmentor(b) {
    modal(`<h2>Ask ${esc(b.dataset.name)} for mentorship</h2><p class="muted small">Be specific. Mentors say yes more often to a clear, short ask.</p>
      <form id="mf" style="margin-top:14px"><div class="field"><label>Topic</label><input class="input" name="topic" maxlength="120" required placeholder="e.g. Preparing for my first internship interview"></div>
      <div class="field"><label>Message</label><textarea class="input" name="message" maxlength="1000" required placeholder="Introduce yourself and what you'd like help with."></textarea></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn green">Send request</button></div></form>`, (m, close) => {
      $('#mf', m).onsubmit = async e => { e.preventDefault();
        await busy(e.submitter, async () => { try { await api('/mentorship', { method: 'POST', body: { ...formObj(e.target), mentorId: b.dataset.id } }); close(); toast('Request sent.'); b.outerHTML = '<button class="btn ghost sm" disabled>Requested</button>'; } catch (err) { fail(err); } }); };
    });
  },
  async mentor(b) {
    if (b.dataset.a === 'decline' && !await confirmBox('Decline this request? The student will be told you can\'t take it right now.', 'Decline')) return;
    await api(`/mentorship/${b.dataset.id}/${b.dataset.a}`, { method: 'POST' }); toast('Updated.'); route();
  },
  async join(b) { await api(`/groups/${b.dataset.id}/join`, { method: 'POST' }); toast('Joined.'); go('#/groups/' + b.dataset.id); },
  async leave(b) { if (!await confirmBox('Leave this group?', 'Leave')) return; await api(`/groups/${b.dataset.id}/leave`, { method: 'POST' }); route(); },
  async delgroup(b) { if (!await confirmBox('Delete this group and all its posts?', 'Delete')) return; await api(`/groups/${b.dataset.id}`, { method: 'DELETE' }); go('#/groups'); },
  newgroup() {
    modal(`<h2>Create a group</h2><form id="gf"><div class="field"><label>Name</label><input class="input" name="name" maxlength="80" required></div>
      <div class="field"><label>Type</label><select class="input" name="category">${['Study group', 'Society', 'Interest', 'Career', 'Social'].map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Description</label><textarea class="input" name="description" maxlength="600" placeholder="What's it for? When do you meet?"></textarea></div>
      <div class="field"><label>Open to</label><select class="input" name="campus"><option value="all">Everyone, any university</option><option value="mine">Only my university</option></select></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Create</button></div></form>`, (m, close) => {
      $('#gf', m).onsubmit = async e => { e.preventDefault();
        await busy(e.submitter, async () => { try { const r = await api('/groups', { method: 'POST', body: formObj(e.target) }); close(); toast('Group created.'); go('#/groups/' + r.id); } catch (err) { fail(err); } }); };
    });
  },
  newopp() {
    modal(`<h2>Share an opportunity</h2><form id="of"><div class="field"><label>Type</label><select class="input" name="type">${['Internship', 'Job', 'Project', 'Event', 'Scholarship'].map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Title</label><input class="input" name="title" maxlength="120" required placeholder="e.g. F&B Management Intern"></div>
      <div class="field"><label>Organisation</label><input class="input" name="org" maxlength="120" required></div>
      <div class="row"><div class="field grow"><label>Location</label><input class="input" name="location" maxlength="120" placeholder="City / remote"></div><div class="field grow"><label>Apply by</label><input class="input" type="date" name="deadline"></div></div>
      <div class="field"><label>Description</label><textarea class="input" name="description" maxlength="3000" required placeholder="Role, requirements, dates, pay"></textarea></div>
      <div class="field"><label>Apply link or email</label><input class="input" name="link" maxlength="500" placeholder="https://… or mailto:…"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Publish</button></div></form>`, (m, close) => {
      $('#of', m).onsubmit = async e => { e.preventDefault(); const f = formObj(e.target);
        if (f.link && !/^(https?:|mailto:)/i.test(f.link)) f.link = f.link.includes('@') ? 'mailto:' + f.link : 'https://' + f.link;
        await busy(e.submitter, async () => { try { await api('/opportunities', { method: 'POST', body: f }); close(); toast('Published.'); sessionStorage.setItem('oppF', '{"type":""}'); go('#/opportunities'); } catch (err) { fail(err); } }); };
    });
  },
  async save(b) { const r = await api(`/opportunities/${b.dataset.id}/save`, { method: 'POST' }); b.style.color = r.saved ? 'var(--blue)' : 'inherit'; b.innerHTML = icon('bookmark', r.saved ? 'fill="currentColor"' : ''); toast(r.saved ? 'Saved.' : 'Removed from saved.'); },
  apply(b) { api(`/opportunities/${b.dataset.id}/click`, { method: 'POST' }).catch(() => {}); const l = b.dataset.link; if (/^mailto:/i.test(l)) location.href = l; else window.open(l, '_blank', 'noopener'); },
  async delopp(b) { if (!await confirmBox('Remove this listing?', 'Remove')) return; await api(`/opportunities/${b.dataset.id}`, { method: 'DELETE' }); b.closest('.opp').remove(); toast('Removed.'); },
  async resolve(b) { if (b.dataset.a === 'ban' && !await confirmBox('Ban this user? They will be logged out and blocked.', 'Ban')) return; await api(`/admin/reports/${b.dataset.id}/resolve`, { method: 'POST', body: { action: b.dataset.a } }); toast('Resolved.'); route(); },
  async ban(b) { await api(`/admin/users/${b.dataset.id}/ban`, { method: 'POST', body: { banned: b.dataset.b === '1' } }); toast('Updated.'); route(); },
  async logout() { await api('/auth/logout', { method: 'POST' }).catch(() => {}); state.me = null; state.badges = { messages: 0, notifications: 0, requests: 0 }; $('#app').innerHTML = ''; go('#/login'); },
  more() {
    const me = state.me, b = state.badges;
    modal(`<div class="row" style="margin-bottom:10px">${av(me, 48)}<div class="grow"><b>${esc(me.name)}</b><div class="small muted">${esc(me.campusName)}</div></div><a class="btn sm" href="#/u/${me.id}" data-close>Profile</a></div>
      <div class="menu-sheet">
        <a href="#/network" data-close>${icon('network')}Network ${b.requests ? `<span class="badge">${b.requests}</span>` : ''}</a>
        <a href="#/mentors" data-close>${icon('mentor')}Mentors</a>
        <a href="#/opportunities" data-close>${icon('brief')}Opportunities</a>
        <a href="#/notifications" data-close>${icon('bell')}Notifications ${b.notifications ? `<span class="badge">${b.notifications}</span>` : ''}</a>
        ${me.isAdmin ? `<a href="#/admin" data-close>${icon('shield')}Admin</a>` : ''}
        <a href="#/settings" data-close>${icon('settings')}Settings</a>
        <button data-act="logout" data-close>${icon('logout')}Log out</button></div>`);
  },
};
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  e.preventDefault();
  if (el.tagName === 'A' && el.dataset.close) return;
  try { el.disabled = true; await fn(el); } catch (err) { fail(err); } finally { if (el.isConnected) el.disabled = false; }
});
// let links inside the More sheet close it AND navigate
document.addEventListener('click', e => { const a = e.target.closest('a[data-close]'); if (a) setTimeout(() => $$('.modal-bg').forEach(m => m.remove()), 0); });

// boot() is called at the end of app-plus.js, after the extra views are registered.
