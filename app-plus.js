/* LinkCampus client, part 2: uploads, events, reviews, applications, search, invites, university dashboard,
   security settings, live updates, tour, analytics consent and the upgraded profile, feed, groups and messages.
   Loaded after app.js; replaces some of its views and starts the app. */
'use strict';
const DEMO = !!window.__LC_DEMO;
Object.assign(P, {
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8c-2-4-6-4-6-1 0 1 1 1 6 1zm0 0c2-4 6-4 6-1 0 1-1 1-6 1z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  paperclip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.6 8.6a2 2 0 0 1-2.8-2.8L15 7.5"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
});
const STATUS_LABEL = { submitted: 'Submitted', reviewing: 'In review', shortlisted: 'Shortlisted', accepted: 'Accepted', declined: 'Not selected' };
const stars = (n, size = 14) => `<span class="stars" aria-label="${n} out of 5 stars">${[1, 2, 3, 4, 5].map(i => icon('star', `width="${size}" height="${size}" class="${i <= Math.round(n) ? 'on' : ''}"`)).join('')}</span>`;
const dt = s => s ? new Date(s).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const chipList = (arr, cls = '') => (arr || []).map(x => `<span class="chip ${cls}">${esc(x)}</span>`).join('');
const selectChips = (id, options, selected) => `<div class="chips" id="${id}">${options.map(o => `<button type="button" class="chip click ${selected.includes(o) ? 'on' : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
const bindChips = (root, id) => $$(`#${id} .chip`, root).forEach(c => c.onclick = () => c.classList.toggle('on'));
const readChips = (root, id) => $$(`#${id} .chip.on`, root).map(c => c.dataset.v);
const firstName = n => (n || '').split(' ')[0];

// ---------------------------------------------------------------- uploads
function pickFile(accept) {
  return new Promise(resolve => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = () => resolve(i.files[0] || null); i.click();
  });
}
async function imageDataUrl(file, max, square) {
  const url = URL.createObjectURL(file); const img = new Image();
  try { await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('That image could not be opened.')); img.src = url; }); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
  const sc = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement('canvas'); c.width = Math.round(sw * sc); c.height = Math.round(sh * sc);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', square ? 0.86 : 0.82);
}
async function upload(kind, file) {
  if (!file) return null;
  let dataUrl;
  if (kind === 'cv') {
    if (file.type !== 'application/pdf') throw new Error('Upload your CV as a PDF.');
    if (file.size > 3e6) throw new Error('Your CV is too large (max 3 MB).');
    dataUrl = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(file); });
  } else {
    if (!/^image\//.test(file.type)) throw new Error('Choose an image file.');
    dataUrl = await imageDataUrl(file, kind === 'avatar' ? 400 : 1600, kind === 'avatar');
  }
  return api('/files', { method: 'POST', body: { kind, dataUrl, name: file.name } });
}

// ---------------------------------------------------------------- accessible modal (focus trap, focus return)
modal = function (html, onMount, onClose) {
  const opener = document.activeElement;
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
  const box = bg.firstElementChild;
  let closed = false;
  const close = () => { if (closed) return; closed = true; bg.remove(); document.removeEventListener('keydown', key); onClose && onClose(); if (opener && opener.isConnected) opener.focus(); };
  const key = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = $$('a[href],button:not([disabled]),input:not([type=hidden]),select,textarea,[tabindex="0"]', box).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', key);
  document.body.appendChild(bg);
  onMount && onMount(box, close);
  const h = box.querySelector('h2'); if (h) { h.id = h.id || 'm-title-' + Date.now(); box.setAttribute('aria-labelledby', h.id); }
  const f = box.querySelector('input:not([type=hidden]),textarea,select');
  (f && matchMedia('(min-width:861px)').matches ? f : box).focus();
  return close;
};

// ---------------------------------------------------------------- celebrations
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#2B8BFF', '#16B87A', '#5fd0ff', '#7cf0c2', '#F2A516'];
  box.innerHTML = Array.from({ length: 60 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${cols[i % 5]};animation-delay:${Math.random() * .4}s;--dx:${(Math.random() - .5) * 200}px;--r:${Math.random() * 720}deg"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}

// ---------------------------------------------------------------- live updates (server-sent events)
const live = { es: null, ok: false, handlers: new Set() };
function startLive() {
  if (DEMO || live.es || !window.EventSource || !state.me) return;
  try {
    live.es = new EventSource('/api/stream');
    live.es.onopen = () => { live.ok = true; };
    live.es.onerror = () => { live.ok = false; };
    live.es.onmessage = e => {
      let ev; try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.type === 'message' || ev.type === 'notification') refreshBadges();
      live.handlers.forEach(h => { try { h(ev); } catch {} });
    };
  } catch { live.es = null; }
}
function stopLive() { if (live.es) { live.es.close(); live.es = null; live.ok = false; } }

// ---------------------------------------------------------------- shell additions
NAV.splice(1, 0, ['#/search', 'search', 'Search']);
NAV.splice(NAV.findIndex(n => n[0] === '#/groups') + 1, 0, ['#/events', 'cal', 'Events']);
NAV.splice(NAV.findIndex(n => n[0] === '#/opportunities') + 1, 0, ['#/reviews', 'star', 'Reviews']);
const baseShell = shell;
shell = function (h) {
  const fresh = !$('.shell');
  baseShell(h);
  if (fresh) {
    const extra = [['#/invite', 'gift', 'Invite friends']];
    if (state.me.uniStaff || state.me.isAdmin) extra.push(['#/university', 'chart', 'University']);
    const settings = $('.side a[href="#/settings"]');
    settings.insertAdjacentHTML('beforebegin', extra.map(([href, ic, label]) => `<a class="nav-a" href="${href}">${icon(ic)}<span>${label}</span></a>`).join(''));
    const skip = document.createElement('a'); skip.href = '#main'; skip.className = 'skip'; skip.textContent = 'Skip to content';
    skip.onclick = e => { e.preventDefault(); $('#main').focus(); };
    $('.shell').prepend(skip); $('#main').setAttribute('tabindex', '-1');
    $('.topbar a[href="#/people"]').setAttribute('href', '#/search');
    const meLink = $('.side .me'); if (meLink) meLink.querySelector('.av').outerHTML = av(state.me, 36);
  }
  $$('.nav-a').forEach(a => { const on = a.classList.contains('on') || h.startsWith(a.getAttribute('href') + '/') || h.startsWith(a.getAttribute('href') + '?') || h === a.getAttribute('href'); a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  $('.tabbar [data-act="more"]').classList.toggle('on', ['#/events', '#/reviews', '#/invite', '#/university', '#/applications', '#/saved', '#/search', '#/tag'].some(x => h.startsWith(x)) || $('.tabbar [data-act="more"]').classList.contains('on'));
};
ACT.more = function () {
  const me = state.me, b = state.badges;
  const link = (href, ic, label, badge) => `<a href="${href}" data-close>${icon(ic)}${label}${badge ? `<span class="badge">${badge}</span>` : ''}</a>`;
  modal(`<div class="row" style="margin-bottom:10px">${av(me, 48)}<div class="grow"><b>${esc(me.name)}</b><div class="small muted">${esc(me.campusName)}</div></div><a class="btn sm" href="#/u/${me.id}" data-close>Profile</a></div>
    <div class="menu-sheet">
      ${link('#/search', 'search', 'Search')}${link('#/network', 'network', 'Network', b.requests)}${link('#/mentors', 'mentor', 'Mentors')}
      ${link('#/events', 'cal', 'Events')}${link('#/opportunities', 'brief', 'Opportunities')}${link('#/applications', 'file', 'My applications')}
      ${link('#/reviews', 'star', 'Internship reviews')}${link('#/saved', 'bookmark', 'Saved posts')}${link('#/notifications', 'bell', 'Notifications', b.notifications)}
      ${link('#/invite', 'gift', 'Invite friends')}${me.uniStaff || me.isAdmin ? link('#/university', 'chart', 'University dashboard') : ''}
      ${me.isAdmin ? link('#/admin', 'shield', 'Admin') : ''}${link('#/settings', 'settings', 'Settings')}
      <button data-act="logout" data-close>${icon('logout')}Log out</button></div>`);
};
const baseLogout = ACT.logout;
ACT.logout = async b => { stopLive(); try { window.posthog && posthog.reset(); } catch {} return baseLogout(b); };

// ---------------------------------------------------------------- auth: two-factor login, invite links
viewLogin = function () {
  authLayout(`<h1>Welcome back</h1><p class="sub">Log in to your LinkCampus account.</p>
    <form id="f"><div id="err"></div>
      <div id="step1"><div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="pw">Password</label><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required></div>
      <div class="row between" style="margin-bottom:16px"><span></span><a href="#/forgot" class="small">Forgot password?</a></div></div>
      <div id="step2" hidden><div class="note">Open your authenticator app and enter the 6-digit code for LinkCampus.</div>
      <div class="field"><label for="totp">Authenticator code</label><input class="input code-input" id="totp" name="totp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div></div>
      <button class="btn primary block" type="submit">Log in</button></form>
    <p class="muted small" style="text-align:center;margin-top:18px">New here? <a href="#/signup">Create an account</a></p>`);
  $('#f').onsubmit = async e => {
    e.preventDefault();
    await busy(e.submitter, async () => {
      try {
        const body = formObj(e.target); if (!body.totp) delete body.totp;
        const r = await api('/auth/login', { method: 'POST', body });
        if (r.twoFactor) { $('#step1').hidden = true; $('#step2').hidden = false; $('#totp').required = true; $('#totp').focus(); $('#err').innerHTML = ''; return; }
        await loadMe(); go('#/feed');
      } catch (err) { $('#err').innerHTML = `<div class="err" role="alert">${esc(err.message)}</div>`; }
    });
  };
};
const baseSignup = viewSignup;
viewSignup = function () {
  const m = /[?&]ref=([A-Za-z0-9]{4,20})/.exec(location.hash);
  if (m) { try { sessionStorage.setItem('lc_ref', m[1]); } catch {} }
  let ref = null; try { ref = sessionStorage.getItem('lc_ref'); } catch {}
  baseSignup();
  if (ref) {
    $('#f').insertAdjacentHTML('beforeend', `<input type="hidden" name="ref" value="${esc(ref)}">`);
    $('#f').insertAdjacentHTML('afterbegin', `<div class="note">${icon('gift', 'width="16" height="16" style="vertical-align:-3px"')} A friend invited you. Welcome!</div>`);
  }
};

// ---------------------------------------------------------------- feed: images, edit, pin, save
postCard = function (p) {
  const canPin = state.me.isAdmin || (p.group && state.manageGroups && state.manageGroups.has(p.group.id));
  return `<article class="card post ${p.pinned ? 'pinned' : ''}" data-post="${p.id}">
    ${p.pinned ? `<div class="pin-label">${icon('pin', 'width="13" height="13"')} Pinned</div>` : ''}
    <div class="post-head">${av(p.author, 42)}<div class="grow"><div>${uname(p.author)} <span class="muted small">· ${ago(p.createdAt)}${p.edited ? ' · edited' : ''}</span></div>
      <div class="tiny muted">${roleTag(p.author)} ${p.group ? `in <a href="#/groups/${p.group.id}">${esc(p.group.name)}</a>` : esc(p.author.headline || '')}</div></div>
      <button class="btn icon" data-act="postmenu" data-id="${p.id}" data-mine="${p.mine ? 1 : ''}" data-pin="${canPin ? 1 : ''}" data-pinned="${p.pinned ? 1 : ''}" aria-label="Post options">${icon('more')}</button>
    </div>
    <div class="post-body">${linkify(p.body)}</div>
    ${p.image ? `<button class="post-img" data-act="viewimg" data-src="${esc(p.image)}" aria-label="Open image"><img src="${esc(p.image)}" alt="Image shared by ${esc(p.author.name)}" loading="lazy"></button>` : ''}
    <div class="post-actions">
      <button class="act ${p.liked ? 'on' : ''}" data-act="like" data-id="${p.id}" aria-label="Like">${icon('heart', p.liked ? 'fill="currentColor"' : '')}<span>${p.likes || ''}</span></button>
      <button class="act" data-act="comments" data-id="${p.id}" aria-label="Comments">${icon('comment')}<span>${p.comments || ''}</span></button>
      <span class="grow"></span>
      <button class="act ${p.saved ? 'saved' : ''}" data-act="savepost" data-id="${p.id}" aria-label="${p.saved ? 'Unsave' : 'Save'} post">${icon('bookmark', p.saved ? 'fill="currentColor"' : '')}</button>
    </div><div class="comments" hidden></div></article>`;
};
composer = function ({ groupId, placeholder = 'Share something with the network…' } = {}) {
  return `<form class="card composer" id="composer"><div class="row" style="align-items:flex-start">${av(state.me, 42)}
    <label class="grow"><span class="sr-only">Write a post</span><textarea name="body" maxlength="3000" placeholder="${esc(placeholder)}" rows="2"></textarea></label></div>
    <div class="composer-img" hidden><img alt="Attached image"><button type="button" class="btn icon" data-x aria-label="Remove image">${icon('x')}</button></div>
    <div class="row between" style="margin-top:8px"><div class="row" style="gap:4px"><button type="button" class="btn icon" data-img aria-label="Add a photo">${icon('image')}</button>
      <span class="tiny muted">Visible to verified members${groupId ? ' of this group' : ''} · use #tags</span></div><button class="btn primary sm" disabled>Post</button></div></form>`;
};
bindComposer = function (onPost, groupId) {
  const f = $('#composer'); if (!f) return;
  const ta = $('textarea', f), btn = $('button.primary', f), box = $('.composer-img', f);
  let imageId = null;
  const sync = () => { btn.disabled = !ta.value.trim(); };
  ta.oninput = () => { sync(); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 300) + 'px'; };
  $('[data-img]', f).onclick = async e => {
    const file = await pickFile('image/*'); if (!file) return;
    await busy(e.currentTarget, async () => {
      try { const r = await upload('image', file); imageId = r.id; $('img', box).src = r.url; box.hidden = false; ta.focus(); } catch (err) { fail(err); }
    });
  };
  $('[data-x]', f).onclick = () => { imageId = null; box.hidden = true; };
  f.onsubmit = async e => {
    e.preventDefault();
    await busy(btn, async () => {
      try { const r = await api('/posts', { method: 'POST', body: { body: ta.value, groupId, imageId } }); ta.value = ''; imageId = null; box.hidden = true; onPost(r.post); toast('Posted.'); }
      catch (err) { fail(err); }
    });
    sync();
  };
};
Object.assign(ACT, {
  async savepost(b) {
    const r = await api(`/posts/${b.dataset.id}/save`, { method: 'POST' });
    b.classList.toggle('saved', r.saved); b.innerHTML = icon('bookmark', r.saved ? 'fill="currentColor"' : '');
    toast(r.saved ? 'Saved. Find it under Saved posts.' : 'Removed from saved.');
  },
  viewimg(b) { modal(`<img src="${esc(b.dataset.src)}" alt="" style="width:100%;border-radius:12px;display:block"><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-close>Close</button></div>`); },
  postmenu(b) {
    const card = b.closest('.post'), id = b.dataset.id;
    const items = [];
    if (b.dataset.mine) items.push(['edit', 'edit', 'Edit post']);
    if (b.dataset.pin) items.push(['pin', 'pin', b.dataset.pinned ? 'Unpin' : 'Pin to top']);
    if (b.dataset.mine || state.me.isAdmin) items.push(['trash', 'delete', 'Delete post']);
    if (!b.dataset.mine) items.push(['flag', 'report', 'Report post']);
    modal(`<h2>Post options</h2><div class="menu-sheet">${items.map(([ic, a, l]) => `<button data-m="${a}">${icon(ic)}${l}</button>`).join('')}</div>`, (m, close) => {
      m.addEventListener('click', async e => {
        const a = e.target.closest('[data-m]')?.dataset.m; if (!a) return; close();
        try {
          if (a === 'delete') { if (!await confirmBox('Delete this post?', 'Delete')) return; await api(`/posts/${id}`, { method: 'DELETE' }); card.remove(); toast('Post deleted.'); }
          if (a === 'pin') { const r = await api(`/posts/${id}/pin`, { method: 'POST' }); toast(r.pinned ? 'Pinned to the top.' : 'Unpinned.'); route(); }
          if (a === 'report') ACT.report({ dataset: { type: 'post', id } });
          if (a === 'edit') {
            const text = $('.post-body', card).textContent;
            modal(`<h2>Edit post</h2><form id="ef"><textarea class="input" name="body" maxlength="3000" required style="min-height:140px">${esc(text)}</textarea>
              <div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (m2, close2) => {
              $('#ef', m2).onsubmit = async ev => { ev.preventDefault(); await busy(ev.submitter, async () => { try { await api(`/posts/${id}`, { method: 'PUT', body: formObj(ev.target) }); close2(); toast('Post updated.'); const r = await api(`/posts/${id}`); card.outerHTML = postCard(r.post); } catch (err) { fail(err); } }); };
            });
          }
        } catch (err) { fail(err); }
      });
    });
  },
});
async function viewTag(tag) {
  main().innerHTML = `<div class="narrow"><div class="page-head"><div><h1>#${esc(tag)}</h1><p class="muted">Posts tagged #${esc(tag)}</p></div></div><div id="tl">${loading()}</div></div>`;
  feedList($('#tl'), `tag=${encodeURIComponent(tag)}`, `<div class="card">${empty('#', 'No posts with this tag yet', 'Use it in a post to start the conversation.')}</div>`);
}
async function viewSaved() {
  main().innerHTML = `<div class="narrow"><div class="page-head"><div><h1>Saved posts</h1><p class="muted">Only you can see what you saved.</p></div></div><div id="sl">${loading()}</div></div>`;
  feedList($('#sl'), 'saved=1', `<div class="card">${empty('🔖', 'Nothing saved yet', 'Tap the bookmark on any post to keep it here.')}</div>`);
}
const baseSugg = sidebarSuggestions;
sidebarSuggestions = async function () {
  const [sugg, extra] = await Promise.all([baseSugg().catch(() => ''), (async () => {
    let html = '';
    try {
      const { events } = await api('/events?campus=mine');
      if (events.length) html += `<div class="card"><h3 style="margin-bottom:6px">Upcoming events</h3>${events.slice(0, 3).map(eventRow).join('')}<a href="#/events" class="small" style="display:block;margin-top:8px">All events</a></div>`;
    } catch {}
    if (DEMO && state.meta.waitlistUrl) html += `<div class="card demo-cta"><h3>Like what you see?</h3><p class="small muted" style="margin:6px 0 12px">This is a demo. Join the waitlist to get founding-member access when LinkCampus launches.</p><a class="btn green sm" href="${esc(state.meta.waitlistUrl)}" target="_blank" rel="noopener">Join the waitlist</a></div>`;
    html += `<div class="card invite-card"><h3>Grow your campus network</h3><p class="small muted" style="margin:6px 0 12px">Invite classmates and alumni. Every friend makes LinkCampus more useful for you.</p><a class="btn primary sm" href="#/invite">${icon('gift', 'width="16" height="16"')} Invite friends</a></div>`;
    return html;
  })()]);
  return extra + sugg;
};
const baseFeed = viewFeed;
viewFeed = async function () { await baseFeed(); maybeTour(); };

// ---------------------------------------------------------------- people: filters for open-to and tandems
const basePersonCard = personCard;
personCard = function (u) {
  const html = basePersonCard(u);
  const extra = (u.openTo || []).slice(0, 2).map(o => `<span class="chip open">${esc(o)}</span>`).join('');
  return extra ? html.replace('<div class="head">', `<div class="chips">${extra}</div><div class="head">`) : html;
};
const basePeople = viewPeople;
viewPeople = async function () {
  await basePeople();
  const f = $('.filters'); if (!f || $('#openTo')) return;
  f.insertAdjacentHTML('beforeend', `<select class="input" id="openTo" aria-label="Open to"><option value="">Open to anything</option>${state.meta.openTo.map(o => `<option>${esc(o)}</option>`).join('')}</select>
    <label class="check tandem" title="People who speak a language you're learning and want to learn one you speak"><input type="checkbox" id="tandem"> Language tandems</label>`);
  const reload = async () => {
    const params = { q: $('#q').value, role: $('#role').value, interest: $('#interest').value, campus: $('#campus')?.value || '', openTo: $('#openTo').value, tandem: $('#tandem').checked ? '1' : '' };
    const { users, total } = await api('/users?' + new URLSearchParams(params));
    $('#res').innerHTML = users.length ? `<p class="small muted" style="margin:-6px 0 12px">${total} ${total === 1 ? 'person' : 'people'}</p><div class="grid">${users.map(personCard).join('')}</div>`
      : empty('🔎', 'No one found', $('#tandem').checked ? 'Add the languages you speak and learn in Settings to find tandem partners.' : 'Try a different search or filter.');
  };
  $('#openTo').onchange = reload; $('#tandem').onchange = reload;
};

// ---------------------------------------------------------------- profile
viewProfile = async function (id) {
  id = Number(id);
  let d;
  try { d = await api('/users/' + id); } catch (err) { main().innerHTML = empty('🫥', 'Profile not found', err.message); return; }
  const u = d.user, mine = u.id === state.me.id, s = u.connection?.status;
  let actions = '';
  if (mine) actions = `<a class="btn ghost" href="#/settings">Edit profile</a>${u.publicProfile && !DEMO ? `<button class="btn ghost" data-act="copy" data-text="${esc(location.origin + '/p/' + u.id)}">Copy public link</button>` : ''}`;
  else if (d.blocked) actions = `<button class="btn ghost" data-act="unblock" data-id="${u.id}">Unblock</button>`;
  else {
    actions = connectBtn(u, '');
    if (d.canMessage && s !== 'connected') actions += `<a class="btn" href="#/messages/${u.id}">Message</a>`;
    if (u.mentorOpen && state.me.role === 'student') {
      const ms = d.mentorship?.status;
      actions += ms === 'pending' ? `<button class="btn ghost" disabled>Mentorship requested</button>` : ms === 'accepted' ? `<span class="chip shared">Your mentor</span>`
        : `<button class="btn green" data-act="askmentor" data-id="${u.id}" data-name="${esc(u.name)}">Ask for mentorship</button>`;
    }
    if (u.role !== 'student' && state.me.role !== 'student') actions += `<button class="btn ghost" data-act="vouch" data-id="${u.id}">${d.vouchedByMe ? 'Vouched ✓' : 'Vouch'}</button>`;
    actions += `<button class="btn icon" data-act="profilemenu" data-id="${u.id}" data-name="${esc(u.name)}" data-conn="${s === 'connected' || s === 'outgoing' ? u.connection.id : ''}" data-st="${s}" aria-label="More options">${icon('more')}</button>`;
  }
  const ms = d.mentorStats || {};
  main().innerHTML = `<div class="cols"><div>
    <div class="card profile-card"><div class="cover"></div><div class="profile-top">${av(u, 104)}</div>
      <h1 style="margin-top:10px">${esc(u.name)}${u.verified ? VERIFIED : ''}</h1>
      <p style="margin-top:4px">${esc(u.headline)}</p>
      <div class="row wrap small muted" style="margin-top:8px">${roleTag(u)} <span>${esc(u.campusName)}</span>${u.company ? `<span>· ${esc(u.company)}</span>` : ''}
        <span>· <b style="color:var(--text)">${d.connectionCount}</b> connections</span>${!mine && d.mutualCount ? `<span>· ${d.mutualCount} mutual</span>` : ''}
        ${u.vouches ? `<span class="chip shared" title="Verified graduates who vouched for this person">${icon('check', 'width="13" height="13"')} Vouched by ${u.vouches}</span>` : ''}</div>
      ${u.openTo.length ? `<div class="chips" style="margin-top:12px">${u.openTo.map(o => `<span class="chip open">Open to: ${esc(o)}</span>`).join('')}</div>` : ''}
      <div class="row wrap" style="margin-top:16px">${actions}</div></div>
    ${u.bio ? `<div class="card"><h3>About</h3><p style="margin-top:8px;white-space:pre-wrap">${linkify(u.bio)}</p></div>` : ''}
    ${u.experience ? `<div class="card"><h3>Experience</h3><p style="margin-top:8px;white-space:pre-wrap">${linkify(u.experience)}</p></div>` : ''}
    ${u.mentorOpen ? `<div class="card mentor-card"><div class="row between wrap"><h3>🎓 Open to mentoring</h3>${ms.ratings ? `<span class="row" style="gap:6px">${stars(ms.avg)}<span class="small muted">${ms.avg} · ${ms.ratings} rating${ms.ratings > 1 ? 's' : ''}</span></span>` : ''}</div>
      <p class="muted" style="margin-top:6px">${esc(u.mentorTopics || 'Happy to help students with career questions.')}</p>
      ${u.mentorAvailability ? `<p class="small" style="margin-top:6px"><b>Availability:</b> ${esc(u.mentorAvailability)}</p>` : ''}
      ${ms.sessions ? `<p class="tiny muted" style="margin-top:6px">${ms.sessions} mentorship${ms.sessions > 1 ? 's' : ''} on LinkCampus</p>` : ''}</div>` : ''}
    <h2 style="margin:22px 0 12px">Posts</h2><div id="uposts">${loading()}</div></div>
    <aside><div class="card"><dl class="kv">
      ${u.degree ? `<dt>Programme</dt><dd>${esc(u.degree)}</dd>` : ''}${u.year ? `<dt>Year</dt><dd>${esc(u.year)}</dd>` : ''}
      ${u.lookingFor ? `<dt>Looking for</dt><dd>${esc(u.lookingFor)}</dd>` : ''}
      ${u.langsSpeak.length ? `<dt>Speaks</dt><dd>${esc(u.langsSpeak.join(', '))}</dd>` : ''}${u.langsLearn.length ? `<dt>Learning</dt><dd>${esc(u.langsLearn.join(', '))}</dd>` : ''}
      <dt>Joined</dt><dd>${new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</dd></dl>
      ${u.skills ? `<h3 style="margin:16px 0 8px">Skills</h3><div class="chips">${chipList(u.skills.split(',').map(x => x.trim()).filter(Boolean))}</div>` : ''}
      ${u.interests.length ? `<h3 style="margin:16px 0 8px">Interests</h3><div class="chips">${u.interests.map(i => `<span class="chip ${d.shared.includes(i) && !mine ? 'shared' : ''}">${esc(i)}</span>`).join('')}</div>` : ''}
      ${d.cv ? `<a class="btn ghost block" style="margin-top:16px" href="${esc(d.cv)}" target="_blank" rel="noopener">${icon('file', 'width="16" height="16"')} View CV</a>` : ''}</div></aside></div>`;
  feedList($('#uposts'), `user=${u.id}`, `<div class="card">${empty('📝', 'No posts yet', mine ? 'Share your first update from Home.' : 'Nothing shared yet.')}</div>`);
};
Object.assign(ACT, {
  async copy(b) { try { await navigator.clipboard.writeText(b.dataset.text); toast('Link copied.'); } catch { modal(`<h2>Copy this link</h2><input class="input" readonly value="${esc(b.dataset.text)}" onfocus="this.select()"><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>Done</button></div>`); } },
  async vouch(b) { const r = await api(`/users/${b.dataset.id}/vouch`, { method: 'POST' }); toast(r.vouched ? 'Thanks for vouching.' : 'Vouch removed.'); route(); },
  async unblock(b) { await api(`/users/${b.dataset.id}/block`, { method: 'DELETE' }); toast('Unblocked.'); route(); },
  profilemenu(b) {
    const items = [];
    if (b.dataset.conn) items.push(['x', 'remove', b.dataset.st === 'connected' ? 'Remove connection' : 'Withdraw request']);
    items.push(['lock', 'block', `Block ${firstName(b.dataset.name)}`], ['flag', 'report', 'Report profile']);
    modal(`<h2>${esc(b.dataset.name)}</h2><div class="menu-sheet">${items.map(([ic, a, l]) => `<button data-m="${a}">${icon(ic)}${l}</button>`).join('')}</div>`, (m, close) => {
      m.addEventListener('click', async e => {
        const a = e.target.closest('[data-m]')?.dataset.m; if (!a) return; close();
        try {
          if (a === 'remove') { if (!await confirmBox('Remove this connection?', 'Remove')) return; await api(`/connections/${b.dataset.conn}`, { method: 'DELETE' }); route(); }
          if (a === 'block') { if (!await confirmBox(`${firstName(b.dataset.name)} won't be able to see your profile or message you, and you won't see their posts. They aren't told.`, 'Block')) return; await api(`/users/${b.dataset.id}/block`, { method: 'POST' }); toast('Blocked.'); route(); }
          if (a === 'report') ACT.report({ dataset: { type: 'user', id: b.dataset.id } });
        } catch (err) { fail(err); }
      });
    });
  },
  connect(b) {
    const send = async note => {
      const r = await api('/connections', { method: 'POST', body: { userId: b.dataset.id, note } });
      if (r.status === 'connected') { b.outerHTML = `<a class="btn ${b.classList.contains('sm') ? 'sm' : ''}" href="#/messages/${b.dataset.id}">Message</a>`; toast('Connected!'); if (r.first) confetti(); }
      else { b.textContent = 'Pending'; b.className = 'btn ghost ' + (b.classList.contains('sm') ? 'sm' : ''); b.removeAttribute('data-act'); setTimeout(() => { b.disabled = true; }); toast('Request sent.'); }
    };
    if (b.textContent.trim() === 'Accept') return send('');
    modal(`<h2>Connect</h2><p class="muted small">Add a short note so they know why you'd like to connect. It's optional, but people accept more often.</p>
      <form id="cf" style="margin-top:12px"><textarea class="input" name="note" maxlength="300" placeholder="e.g. Hi! I'm in the 2nd year at SHL and would love to hear about your path into revenue management."></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Send request</button></div></form>`, (m, close) => {
      $('#cf', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await send(formObj(e.target).note); close(); } catch (err) { fail(err); } }); };
    });
  },
  async accept(b) { const r = await api(`/connections/${b.dataset.id}/accept`, { method: 'POST' }); toast('Connected!'); if (r.first) confetti(); route(); },
});

// ---------------------------------------------------------------- network: show request notes
const baseNetwork = viewNetwork;
viewNetwork = async function () {
  await baseNetwork();
  const d = await api('/connections');
  for (const c of d.incoming) if (c.note) {
    const btn = $(`[data-act="accept"][data-id="${c.id}"]`);
    btn && btn.closest('.list-item').insertAdjacentHTML('afterend', `<p class="small req-note">“${esc(c.note)}”</p>`);
  }
};

// ---------------------------------------------------------------- messages: photos, seen, typing, live
viewMessages = async function (userId) {
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
  const onLive = ev => { if (ev.type === 'message' && String(ev.from) !== userId) loadConvs(); };
  live.handlers.add(onLive);
  loadConvs().catch(fail);
  if (!userId) { state.cleanup = () => live.handlers.delete(onLive); return; }
  let lastId = 0, lastDay = '', imageId = null, typingTimer, lastTypingSent = 0;
  const renderMsgs = (msgs, append) => {
    const body = $('#tbody'); if (!body) return;
    const html = msgs.map(m => {
      const day = new Date(m.createdAt).toDateString();
      const sep = day !== lastDay ? `<div class="bub-time">${new Date(m.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</div>` : '';
      lastDay = day; lastId = Math.max(lastId, m.id);
      return sep + `<div class="bub ${m.fromMe ? 'me' : 'them'} ${m.image ? 'has-img' : ''}" title="${new Date(m.createdAt).toLocaleString()}">${m.image ? `<button class="bub-img" data-act="viewimg" data-src="${esc(m.image)}" aria-label="Open photo"><img src="${esc(m.image)}" alt="Photo" loading="lazy"></button>` : ''}${m.body ? linkify(m.body) : ''}</div>`;
    }).join('');
    const atBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    if (append) body.insertAdjacentHTML('beforeend', html); else body.innerHTML = html || `<div style="margin:auto">${empty('👋', 'Say hello', 'This is the start of your conversation.')}</div>`;
    if (!append || atBottom) body.scrollTop = body.scrollHeight;
  };
  const showSeen = seen => { const el = $('#seen'); if (el) el.textContent = seen && seen.read ? 'Seen' : ''; };
  try {
    const d = await api(`/messages/${userId}`);
    $('#thread').innerHTML = `<div class="thread-head"><a href="#/messages" class="btn icon" aria-label="Back to conversations">${icon('back')}</a>${av(d.user, 38)}
      <div class="grow"><a href="#/u/${d.user.id}"><b style="color:var(--text)">${esc(d.user.name)}</b></a><div class="tiny muted" id="tstatus">${esc(d.user.headline || d.user.campusName)}</div></div>
      <button class="btn icon" data-act="report" data-type="user" data-id="${d.user.id}" aria-label="Report">${icon('flag')}</button></div>
      <div class="thread-body" id="tbody" aria-live="polite"></div><div class="seen tiny muted" id="seen"></div>
      ${d.canMessage ? `<div class="thread-attach" id="tattach" hidden><img alt="Photo to send"><button type="button" class="btn icon" id="tx" aria-label="Remove photo">${icon('x')}</button></div>
      <form class="thread-input" id="send"><button type="button" class="btn icon" id="tphoto" aria-label="Send a photo">${icon('image')}</button><label class="grow"><span class="sr-only">Message</span><textarea class="input" name="body" rows="1" maxlength="4000" placeholder="Write a message…" style="width:100%"></textarea></label><button class="btn primary" aria-label="Send" style="border-radius:50%;width:42px;height:42px;padding:0">${icon('send', 'width="18" height="18"')}</button></form>`
        : `<div class="note" style="margin:10px">You can message ${esc(d.user.name)} once you're connected. ${connectBtn(d.user)}</div>`}`;
    renderMsgs(d.messages, false); showSeen(d.seen);
    loadConvs();
    let polling = false;
    const poll = async () => {
      if (polling) return; polling = true;
      try { const d2 = await api(`/messages/${userId}?after=${lastId}`); if (d2.messages.length) renderMsgs(d2.messages, true); showSeen(d2.seen); } finally { polling = false; }
    };
    const f = $('#send');
    if (f) {
      const ta = $('textarea', f), att = $('#tattach');
      ta.oninput = () => {
        ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
        if (!DEMO && Date.now() - lastTypingSent > 3000) { lastTypingSent = Date.now(); api(`/typing/${userId}`, { method: 'POST' }).catch(() => {}); }
      };
      ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(min-width:861px)').matches) { e.preventDefault(); f.requestSubmit(); } };
      $('#tphoto').onclick = async e => {
        const file = await pickFile('image/*'); if (!file) return;
        await busy(e.currentTarget, async () => { try { const r = await upload('image', file); imageId = r.id; $('img', att).src = r.url; att.hidden = false; } catch (err) { fail(err); } });
      };
      $('#tx').onclick = () => { imageId = null; att.hidden = true; };
      f.onsubmit = async e => {
        e.preventDefault(); const body = ta.value.trim(); if (!body && !imageId) return;
        const img = imageId; ta.value = ''; ta.style.height = 'auto'; imageId = null; att.hidden = true;
        try { await api(`/messages/${userId}`, { method: 'POST', body: { body, imageId: img } }); await poll(); loadConvs(); }
        catch (err) { ta.value = body; fail(err); }
      };
    }
    const onThread = ev => {
      if (String(ev.from) !== userId) return;
      if (ev.type === 'message') { poll(); const st = $('#tstatus'); if (st) st.textContent = d.user.headline || d.user.campusName; }
      if (ev.type === 'read') poll();
      if (ev.type === 'typing') { const st = $('#tstatus'); if (st) { st.textContent = 'typing…'; clearTimeout(typingTimer); typingTimer = setTimeout(() => { st.textContent = d.user.headline || d.user.campusName; }, 4000); } }
    };
    live.handlers.add(onThread);
    const iv = setInterval(() => { if (!document.hidden && !live.ok) poll().catch(() => {}); }, 4000);
    state.cleanup = () => { clearInterval(iv); live.handlers.delete(onThread); live.handlers.delete(onLive); };
  } catch (err) { $('#thread').innerHTML = empty('🫥', 'Conversation unavailable', err.message); state.cleanup = () => live.handlers.delete(onLive); }
};

// ---------------------------------------------------------------- groups: private, requests, roles, events
const baseGroups = viewGroups;
viewGroups = async function () {
  await baseGroups();
  const mark = async () => {
    const { groups } = await api('/groups?q=' + encodeURIComponent($('#q')?.value || ''));
    for (const g of groups) {
      const card = $(`[data-act="join"][data-id="${g.id}"]`)?.closest('.card') || $(`a[href="#/groups/${g.id}"]`)?.closest('.card');
      if (!card) continue;
      if (g.private && !$('.lock', card)) $('.type', card).insertAdjacentHTML('afterend', `<span class="chip lock">${icon('lock', 'width="12" height="12"')} Private</span>`);
      if (g.pending) { const btn = $('[data-act="join"]', card); if (btn) btn.outerHTML = '<button class="btn ghost sm" disabled>Requested</button>'; }
    }
  };
  setTimeout(() => mark().catch(() => {}), 300);
};
ACT.join = async b => {
  const r = await api(`/groups/${b.dataset.id}/join`, { method: 'POST' });
  if (r.pending) { toast('Request sent. A group admin will approve it.'); b.outerHTML = '<button class="btn ghost sm" disabled>Requested</button>'; return; }
  toast('Joined.'); go('#/groups/' + b.dataset.id);
};
ACT.newgroup = () => {
  modal(`<h2>Create a group</h2><form id="gf"><div class="field"><label for="gn">Name</label><input class="input" id="gn" name="name" maxlength="80" required></div>
    <div class="field"><label for="gc">Type</label><select class="input" id="gc" name="category">${['Study group', 'Society', 'Interest', 'Career', 'Social'].map(c => `<option>${c}</option>`).join('')}</select></div>
    <div class="field"><label for="gd">Description</label><textarea class="input" id="gd" name="description" maxlength="600" placeholder="What's it for? When do you meet?"></textarea></div>
    <div class="field"><label for="go">Open to</label><select class="input" id="go" name="campus"><option value="all">Everyone, any university</option><option value="mine">Only my university</option></select></div>
    <label class="check"><input type="checkbox" name="private"> <span><b>Private group</b><br><span class="small muted">People ask to join and you approve them. Posts and events are members-only.</span></span></label>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Create</button></div></form>`, (m, close) => {
    $('#gf', m).onsubmit = async e => { e.preventDefault(); const body = formObj(e.target); body.private = !!body.private;
      await busy(e.submitter, async () => { try { const r = await api('/groups', { method: 'POST', body }); close(); toast('Group created.'); go('#/groups/' + r.id); } catch (err) { fail(err); } }); };
  });
};
viewGroup = async function (id) {
  let d; try { d = await api('/groups/' + id); } catch (err) { main().innerHTML = empty('🫥', 'Group not found', err.message); return; }
  const g = d.group;
  state.manageGroups = state.manageGroups || new Set();
  d.canManage ? state.manageGroups.add(g.id) : state.manageGroups.delete(g.id);
  const locked = g.private && !g.joined && !state.me.isAdmin;
  const memberRow = u => `<div class="list-item">${av(u, 34)}<div class="grow small">${uname(u)}<div class="tiny muted">${u.groupRole === 'admin' ? 'Owner' : u.groupRole === 'moderator' ? 'Moderator' : esc(u.headline || '')}</div></div>
    ${d.canManage && u.id !== state.me.id && u.groupRole !== 'admin' ? `<button class="btn icon" data-act="membermenu" data-g="${g.id}" data-id="${u.id}" data-name="${esc(u.name)}" data-role="${u.groupRole}" aria-label="Manage ${esc(u.name)}">${icon('more')}</button>` : ''}</div>`;
  main().innerHTML = `<div class="cols"><div>
    <div class="card"><div class="cover" style="height:80px"></div><div style="margin-top:14px" class="row between wrap"><span class="row" style="gap:6px"><span class="type">${esc(g.category)}</span>${g.private ? `<span class="chip lock">${icon('lock', 'width="12" height="12"')} Private</span>` : ''}</span><span class="small muted">${esc(g.campusName)}</span></div>
      <h1 style="margin-top:8px">${esc(g.name)}</h1><p class="muted" style="margin-top:6px;white-space:pre-wrap">${esc(g.description)}</p>
      <div class="row wrap" style="margin-top:14px"><span class="small"><b>${g.members}</b> member${g.members === 1 ? '' : 's'}</span><span class="grow"></span>
      ${g.joined ? `<button class="btn ghost sm" data-act="newevent" data-group="${g.id}">${icon('cal', 'width="16" height="16"')} New event</button>${g.owner ? '' : `<button class="btn ghost sm" data-act="leave" data-id="${g.id}">Leave</button>`}`
        : g.pending ? '<button class="btn ghost" disabled>Request sent</button>' : `<button class="btn primary" data-act="join" data-id="${g.id}">${g.private ? 'Ask to join' : 'Join group'}</button>`}
      ${d.canManage ? `<button class="btn ghost sm" data-act="editgroup" data-id="${g.id}" data-desc="${esc(g.description)}" data-private="${g.private ? 1 : ''}">${icon('edit', 'width="16" height="16"')} Edit</button>` : ''}
      ${g.owner || state.me.isAdmin ? `<button class="btn danger sm" data-act="delgroup" data-id="${g.id}">Delete</button>` : `<button class="btn icon" data-act="report" data-type="group" data-id="${g.id}" aria-label="Report">${icon('flag')}</button>`}</div></div>
    ${d.requests.length ? `<div class="card"><h3>Join requests (${d.requests.length})</h3><div class="list">${d.requests.map(u => `<div class="list-item">${av(u, 36)}<div class="grow small">${uname(u)}<div class="tiny muted">${esc(u.headline || u.campusName)}</div></div>
      <button class="btn ghost sm" data-act="grpreq" data-g="${g.id}" data-id="${u.id}" data-a="decline">Decline</button><button class="btn primary sm" data-act="grpreq" data-g="${g.id}" data-id="${u.id}" data-a="approve">Approve</button></div>`).join('')}</div></div>` : ''}
    <div id="gevents"></div>
    <div style="height:14px"></div>${g.joined ? composer({ groupId: g.id, placeholder: `Post in ${g.name}…` }) : ''}
    <div id="gposts" style="margin-top:14px">${g.joined || !g.private ? loading() : `<div class="card">${empty('🔒', 'Private group', 'Ask to join to see posts and events.')}</div>`}</div></div>
    <aside><div class="card"><h3>Members</h3><div class="list" style="margin-top:6px">${locked ? '<p class="small muted" style="padding:10px 0">Visible to members.</p>' : d.members.map(memberRow).join('')}</div></div></aside></div>`;
  if (!locked) {
    api(`/events?group=${g.id}`).then(({ events }) => { if (events.length && $('#gevents')) $('#gevents').innerHTML = `<div class="card"><h3 style="margin-bottom:8px">Upcoming in this group</h3>${events.map(eventRow).join('')}</div>`; }).catch(() => {});
    if (g.joined || !g.private) {
      if (g.joined) { const feed = await feedList($('#gposts'), `group=${g.id}`, `<div class="card">${empty('💬', 'No posts yet', 'Kick off the conversation.')}</div>`); bindComposer(p => feed.prepend(p), g.id); }
      else feedList($('#gposts'), `group=${g.id}`, `<div class="card">${empty('💬', 'No posts yet', 'Join to start the conversation.')}</div>`);
    }
  }
};
Object.assign(ACT, {
  async grpreq(b) { await api(`/groups/${b.dataset.g}/requests/${b.dataset.id}/${b.dataset.a}`, { method: 'POST' }); toast(b.dataset.a === 'approve' ? 'Approved.' : 'Declined.'); route(); },
  editgroup(b) {
    modal(`<h2>Edit group</h2><form id="eg"><div class="field"><label for="egd">Description</label><textarea class="input" id="egd" name="description" maxlength="600">${esc(b.dataset.desc)}</textarea></div>
      <label class="check"><input type="checkbox" name="private" ${b.dataset.private ? 'checked' : ''}> <span><b>Private group</b><br><span class="small muted">New members need approval; posts are members-only.</span></span></label>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (m, close) => {
      $('#eg', m).onsubmit = async e => { e.preventDefault(); const body = formObj(e.target); body.private = !!body.private;
        await busy(e.submitter, async () => { try { await api(`/groups/${b.dataset.id}`, { method: 'PUT', body }); close(); toast('Saved.'); route(); } catch (err) { fail(err); } }); };
    });
  },
  membermenu(b) {
    const mod = b.dataset.role === 'moderator';
    modal(`<h2>${esc(b.dataset.name)}</h2><div class="menu-sheet"><button data-m="role">${icon('shield')}${mod ? 'Remove moderator role' : 'Make moderator'}</button><button data-m="remove">${icon('x')}Remove from group</button></div>`, (m, close) => {
      m.addEventListener('click', async e => {
        const a = e.target.closest('[data-m]')?.dataset.m; if (!a) return; close();
        try {
          if (a === 'role') { await api(`/groups/${b.dataset.g}/members/${b.dataset.id}/role`, { method: 'POST', body: { role: mod ? 'member' : 'moderator' } }); toast('Role updated.'); }
          if (a === 'remove') { if (!await confirmBox(`Remove ${b.dataset.name} from the group?`, 'Remove')) return; await api(`/groups/${b.dataset.g}/members/${b.dataset.id}`, { method: 'DELETE' }); toast('Removed.'); }
          route();
        } catch (err) { fail(err); }
      });
    });
  },
});

// ---------------------------------------------------------------- events
function eventRow(e) {
  const d = new Date(e.startsAt);
  return `<a class="event-row" href="#/events/${e.id}"><span class="date-badge"><b>${d.getDate()}</b>${d.toLocaleString(undefined, { month: 'short' })}</span>
    <div class="grow"><div style="font-weight:700">${esc(e.title)}</div><div class="small muted">${esc(dt(e.startsAt))}${e.location ? ' · ' + esc(e.location) : ''}${e.onlineLink ? ' · Online' : ''}</div>
    <div class="tiny muted">${e.going} going${e.capacity ? ` of ${e.capacity}` : ''}${e.group ? ` · ${esc(e.group.name)}` : ''}</div></div>
    ${e.goingMe ? '<span class="chip shared">Going</span>' : e.full ? '<span class="chip">Full</span>' : ''}</a>`;
}
async function viewEvents() {
  const tab = (() => { try { return sessionStorage.getItem('evTab') || 'upcoming'; } catch { return 'upcoming'; } })();
  main().innerHTML = `<div class="narrow"><div class="page-head"><div><h1>Events</h1><p class="muted">Career fairs, tastings, talks and meetups.</p></div><button class="btn primary" data-act="newevent">${icon('plus', 'width="18" height="18"')} New event</button></div>
    <div class="tabs">${[['upcoming', 'Upcoming'], ['mine', 'My events'], ['past', 'Past']].map(([v, l]) => `<button class="tab ${tab === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div><div id="el" class="card">${loading()}</div></div>`;
  $$('.tab[data-v]').forEach(t => t.onclick = () => { try { sessionStorage.setItem('evTab', t.dataset.v); } catch {} viewEvents(); });
  const { events } = await api('/events?scope=' + tab);
  $('#el').innerHTML = events.length ? events.map(eventRow).join('') : empty('📅', tab === 'mine' ? 'No events yet' : 'Nothing planned yet', 'Create the first one. Study sessions and socials fill up fast.', '<button class="btn primary" data-act="newevent">Create an event</button>');
}
async function viewEvent(id) {
  let d; try { d = await api('/events/' + id); } catch (err) { main().innerHTML = empty('📅', 'Event not available', err.message); return; }
  const e = d.event;
  main().innerHTML = `<div class="narrow"><a href="#/events" class="btn ghost sm" style="margin-bottom:14px">${icon('back', 'width="16" height="16"')} All events</a>
    <div class="card"><div class="row" style="gap:14px;align-items:flex-start"><span class="date-badge big"><b>${new Date(e.startsAt).getDate()}</b>${new Date(e.startsAt).toLocaleString(undefined, { month: 'short' })}</span>
      <div class="grow"><h1>${esc(e.title)}</h1><p class="muted" style="margin-top:6px">${esc(dt(e.startsAt))}${e.endsAt ? ' – ' + esc(new Date(e.endsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })) : ''}</p>
      ${e.location ? `<p class="small" style="margin-top:4px">📍 ${esc(e.location)}</p>` : ''}${e.onlineLink ? `<p class="small" style="margin-top:4px">💻 <a href="${esc(e.onlineLink)}" target="_blank" rel="noopener">Join online</a></p>` : ''}
      <p class="small muted" style="margin-top:4px">Hosted by <a href="#/u/${e.host.id}">${esc(e.host.name)}</a>${e.group ? ` in <a href="#/groups/${e.group.id}">${esc(e.group.name)}</a>` : ''} · ${esc(e.campusName)}</p></div></div>
      ${e.description ? `<p style="margin-top:16px;white-space:pre-wrap">${linkify(e.description)}</p>` : ''}
      <div class="row wrap" style="margin-top:18px">
        ${e.goingMe ? `<button class="btn green" data-act="rsvp" data-id="${e.id}">${icon('check', 'width="16" height="16"')} You're going</button>` : e.full ? '<button class="btn ghost" disabled>Event is full</button>' : `<button class="btn primary" data-act="rsvp" data-id="${e.id}">I'm going</button>`}
        <button class="btn ghost" data-act="ics" data-id="${e.id}">${icon('cal', 'width="16" height="16"')} Add to calendar</button>
        <span class="grow"></span>${e.mine || state.me.isAdmin ? `<button class="btn danger sm" data-act="delevent" data-id="${e.id}">Cancel event</button>` : `<button class="btn icon" data-act="report" data-type="event" data-id="${e.id}" aria-label="Report">${icon('flag')}</button>`}</div></div>
    <div class="card"><h3>${e.going} going${e.capacity ? ` · ${Math.max(0, e.capacity - e.going)} spots left` : ''}</h3><div class="avatars" style="margin-top:12px">${e.attendees.map(u => `<a href="#/u/${u.id}" title="${esc(u.name)}">${av(u, 40)}</a>`).join('')}</div></div></div>`;
  state.lastEvent = e;
}
function icsFor(e) {
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => { const d = new Date(s); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
  const end = e.endsAt || new Date(new Date(e.startsAt).getTime() + 2 * 3600e3).toISOString();
  const clean = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LinkCampus//Events//EN', 'BEGIN:VEVENT', `UID:event-${e.id}@linkcampus.io`, `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(e.startsAt)}`, `DTEND:${fmt(end)}`, `SUMMARY:${clean(e.title)}`, `DESCRIPTION:${clean((e.description || '') + (e.onlineLink ? '\nOnline: ' + e.onlineLink : ''))}`,
    `LOCATION:${clean(e.location || e.onlineLink)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
Object.assign(ACT, {
  async rsvp(b) { const r = await api(`/events/${b.dataset.id}/rsvp`, { method: 'POST' }); toast(r.going ? "You're going! Add it to your calendar." : 'RSVP removed.'); route(); },
  async delevent(b) { if (!await confirmBox('Cancel this event? Everyone going will be told.', 'Cancel event')) return; await api(`/events/${b.dataset.id}`, { method: 'DELETE' }); toast('Event cancelled.'); go('#/events'); },
  ics(b) {
    const e = state.lastEvent; if (!e) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([icsFor(e)], { type: 'text/calendar' }));
    a.download = e.title.replace(/[^\w -]/g, '').slice(0, 40) + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Calendar file downloaded. Open it to add the event.');
  },
  newevent(b) {
    const groupId = b.dataset.group || '';
    const t = new Date(Date.now() + 864e5); t.setMinutes(0);
    const local = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    modal(`<h2>New event</h2><form id="evf"><div class="field"><label for="et">Title</label><input class="input" id="et" name="title" maxlength="120" required placeholder="e.g. Wine tasting with alumni"></div>
      <div class="row wrap"><div class="field grow"><label for="es">Starts</label><input class="input" id="es" type="datetime-local" name="startsAt" required value="${local(t)}"></div>
      <div class="field grow"><label for="ee">Ends (optional)</label><input class="input" id="ee" type="datetime-local" name="endsAt"></div></div>
      <div class="field"><label for="el2">Location</label><input class="input" id="el2" name="location" maxlength="160" placeholder="Room, venue or city"></div>
      <div class="field"><label for="eo">Online link (optional)</label><input class="input" id="eo" name="onlineLink" maxlength="300" placeholder="https://…"></div>
      <div class="row wrap"><div class="field grow"><label for="ec">Max people (0 = no limit)</label><input class="input" id="ec" type="number" min="0" name="capacity" value="0"></div>
      <div class="field grow"><label for="ew">Open to</label><select class="input" id="ew" name="campus"><option value="all">Everyone</option><option value="mine">My university</option></select></div></div>
      <div class="field"><label for="ed">Details</label><textarea class="input" id="ed" name="description" maxlength="2000"></textarea></div>
      <input type="hidden" name="groupId" value="${esc(groupId)}">
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Create event</button></div></form>`, (m, close) => {
      $('#evf', m).onsubmit = async e => { e.preventDefault();
        await busy(e.submitter, async () => { try { const r = await api('/events', { method: 'POST', body: formObj(e.target) }); close(); toast('Event created.'); go('#/events/' + r.id); } catch (err) { fail(err); } }); };
    });
  },
});

// ---------------------------------------------------------------- opportunities: apply, featured, side jobs, applications
viewOpps = async function () {
  let f; try { f = JSON.parse(sessionStorage.getItem('oppF') || '{"type":""}'); } catch { f = { type: '' }; }
  const types = state.meta.oppTypes || ['Internship', 'Job', 'Side job', 'Project', 'Event', 'Scholarship'];
  main().innerHTML = `<div class="page-head"><div><h1>Opportunities</h1><p class="muted">Internships, jobs, side jobs and projects shared in the network first.</p></div>
    <div class="row"><a class="btn ghost" href="#/applications">My applications</a><button class="btn primary" data-act="newopp">${icon('plus', 'width="18" height="18"')} Post</button></div></div>
    <div class="tabs" id="otabs"></div><div class="filters"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search title, company, location" aria-label="Search opportunities"></div></div><div id="ol">${loading()}</div>`;
  let timer;
  const tabs = () => { $('#otabs').innerHTML = [['', 'All'], ...types.map(t => [t, t.endsWith('s') ? t : t + 's']), ['saved', 'Saved']].map(([v, l]) => `<button class="tab ${f.type === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
    $$('#otabs .tab').forEach(t => t.onclick = () => { f.type = t.dataset.v; try { sessionStorage.setItem('oppF', JSON.stringify(f)); } catch {} tabs(); load(); }); };
  const load = async () => {
    const params = new URLSearchParams({ q: $('#q').value, ...(f.type === 'saved' ? { saved: '1' } : { type: f.type }) });
    const d = await api('/opportunities?' + params);
    if (!$('#ol')) return;
    $('#ol').innerHTML = d.opportunities.length ? d.opportunities.map(oppCard).join('') : empty(f.type === 'saved' ? '🔖' : '💼', f.type === 'saved' ? 'Nothing saved' : 'No opportunities yet', f.type === 'saved' ? 'Tap the bookmark on any listing to save it.' : 'Alumni and partners post here first. Know of one? Share it.');
  };
  tabs();
  $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
  load().catch(fail);
};
oppCard = function (o) {
  return `<div class="card opp ${o.featured ? 'featured' : ''}" data-opp="${o.id}"><div class="row" style="align-items:flex-start"><div class="grow"><span class="row" style="gap:6px"><span class="type">${esc(o.type)}</span>${o.featured ? '<span class="chip feat">★ Featured</span>' : ''}${o.applied ? `<span class="chip shared">${STATUS_LABEL[o.applied]}</span>` : ''}</span>
    <h3 style="margin-top:8px">${esc(o.title)}</h3><div class="small" style="font-weight:600">${esc(o.org)}</div></div>
    <button class="btn icon" data-act="save" data-id="${o.id}" aria-label="${o.saved ? 'Unsave' : 'Save'}" style="color:${o.saved ? 'var(--blue)' : 'inherit'}">${icon('bookmark', o.saved ? 'fill="currentColor"' : '')}</button></div>
    <div class="meta">${o.location ? `<span>📍 ${esc(o.location)}</span>` : ''}${o.deadline ? `<span>⏳ Apply by ${fmtDate(o.deadline)}</span>` : ''}<span>Shared by <a href="#/u/${o.poster.id}">${esc(o.poster.name)}</a> · ${ago(o.createdAt)}</span></div>
    <div class="desc">${linkify(o.description)}</div>
    <div class="row wrap" style="margin-top:14px">
      ${o.mine ? `<a class="btn primary sm" href="#/applications/${o.id}">${o.applications} application${o.applications === 1 ? '' : 's'}</a><span class="small muted">${o.views} views · ${o.clicks} link clicks</span>`
        : o.applied ? '' : `<button class="btn primary sm" data-act="apply2" data-id="${o.id}" data-title="${esc(o.title)}" data-org="${esc(o.org)}">Apply with profile</button>`}
      ${o.link && !o.mine ? `<button class="btn ghost sm" data-act="apply" data-id="${o.id}" data-link="${esc(o.link)}">Company link ${icon('external', 'width="15" height="15"')}</button>` : ''}
      <span class="grow"></span>
      ${state.me.isAdmin ? `<button class="btn ghost sm" data-act="feature" data-id="${o.id}">${o.featured ? 'Unfeature' : 'Feature'}</button>` : ''}
      ${o.mine || state.me.isAdmin ? `<button class="btn danger sm" data-act="delopp" data-id="${o.id}">Remove</button>` : `<button class="btn icon" data-act="report" data-type="opportunity" data-id="${o.id}" aria-label="Report">${icon('flag')}</button>`}</div></div>`;
};
Object.assign(ACT, {
  async feature(b) { const r = await api(`/opportunities/${b.dataset.id}/feature`, { method: 'POST' }); toast(r.featured ? 'Featured at the top.' : 'No longer featured.'); route(); },
  apply2(b) {
    const me = state.me;
    modal(`<h2>Apply: ${esc(b.dataset.title)}</h2><p class="muted small">${esc(b.dataset.org)} will see your LinkCampus profile${me.cv ? ' and your CV' : ''} with this note.</p>
      ${me.cv ? '' : `<div class="note">Tip: add your CV in <a href="#/settings" data-close>Settings</a> so posters can read it.</div>`}
      <form id="af" style="margin-top:12px"><div class="field"><label for="an">Note (optional)</label><textarea class="input" id="an" name="note" maxlength="1500" placeholder="Why you're a great fit, when you can start, languages…"></textarea></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Send application</button></div></form>`, (m, close) => {
      $('#af', m).onsubmit = async e => { e.preventDefault();
        await busy(e.submitter, async () => { try { await api(`/opportunities/${b.dataset.id}/apply`, { method: 'POST', body: formObj(e.target) }); close(); toast('Application sent. Track it under My applications.'); route(); } catch (err) { fail(err); } }); };
    });
  },
  async appstatus(b) { await api(`/applications/${b.dataset.id}/status`, { method: 'POST', body: { status: b.value } }); toast('Status updated. The applicant was notified.'); },
  async withdraw(b) { if (!await confirmBox('Withdraw this application?', 'Withdraw')) return; await api(`/applications/${b.dataset.id}`, { method: 'DELETE' }); route(); },
});
document.addEventListener('change', e => { const s = e.target.closest('select[data-act="appstatus"]'); if (s) ACT.appstatus(s).catch(fail); });
async function viewApplications(oppId) {
  if (oppId) {
    let d; try { d = await api(`/opportunities/${oppId}/applications`); } catch (err) { main().innerHTML = empty('🫥', 'Not available', err.message); return; }
    main().innerHTML = `<div class="narrow"><a href="#/opportunities" class="btn ghost sm" style="margin-bottom:14px">${icon('back', 'width="16" height="16"')} Opportunities</a>
      <div class="page-head"><div><h1>${esc(d.opportunity.title)}</h1><p class="muted">${esc(d.opportunity.org)} · ${d.applications.length} application${d.applications.length === 1 ? '' : 's'} · ${d.opportunity.views} views</p></div></div>
      ${d.applications.length ? d.applications.map(a => `<div class="card"><div class="row">${av(a.applicant, 48)}<div class="grow"><div>${uname(a.applicant)}</div><div class="small muted">${esc(a.applicant.headline || a.applicant.campusName)} · applied ${ago(a.createdAt)}</div></div>
        <label class="sr-only" for="st${a.id}">Status</label><select class="input" id="st${a.id}" style="width:auto" data-act="appstatus" data-id="${a.id}">${Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}" ${a.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        ${a.note ? `<p style="margin-top:12px;white-space:pre-wrap">${esc(a.note)}</p>` : ''}
        <div class="row wrap" style="margin-top:12px"><a class="btn ghost sm" href="#/u/${a.applicant.id}">View profile</a>${a.cv ? `<a class="btn ghost sm" href="${esc(a.cv)}" target="_blank" rel="noopener">${icon('file', 'width="15" height="15"')} CV</a>` : ''}
        ${a.applicant.connection?.status === 'connected' ? `<a class="btn sm" href="#/messages/${a.applicant.id}">Message</a>` : connectBtn(a.applicant)}</div></div>`).join('')
        : `<div class="card">${empty('📭', 'No applications yet', 'Share the listing in groups to reach more people.')}</div>`}</div>`;
    return;
  }
  const { applications } = await api('/applications/mine');
  main().innerHTML = `<div class="narrow"><div class="page-head"><div><h1>My applications</h1><p class="muted">Track where you applied and what happened.</p></div><a class="btn ghost" href="#/opportunities">Browse opportunities</a></div>
    <div class="card">${applications.length ? `<div class="list">${applications.map(a => `<div class="list-item"><div class="grow"><div style="font-weight:700">${esc(a.title)}</div><div class="small muted">${esc(a.org)} · ${esc(a.type)} · applied ${ago(a.createdAt)}</div></div>
      <span class="chip status-${a.status}">${STATUS_LABEL[a.status]}</span>${a.status === 'submitted' ? `<button class="btn ghost sm" data-act="withdraw" data-id="${a.id}">Withdraw</button>` : ''}</div>`).join('')}</div>`
      : empty('📄', 'No applications yet', 'Apply with your profile on any listing and track it here.', '<a class="btn primary" href="#/opportunities">Find opportunities</a>')}</div></div>`;
}

// ---------------------------------------------------------------- mentors: availability and ratings
const baseMentors = viewMentors;
viewMentors = async function () {
  await baseMentors();
  if (!$('#mc')) return;
  const tab = (() => { try { return sessionStorage.getItem('mentorTab'); } catch { return null; } })() || (state.me.role === 'student' ? 'find' : 'requests');
  if (tab === 'find') {
    const { users } = await api('/users?mentors=1');
    for (const u of users) {
      const card = $(`[data-act="askmentor"][data-id="${u.id}"]`)?.closest('.card') || $(`#mc a[href="#/u/${u.id}"]`)?.closest('.card');
      if (card && u.mentorAvailability) card.querySelector('.head').insertAdjacentHTML('afterend', `<div class="small"><b>Availability:</b> <span class="muted">${esc(u.mentorAvailability)}</span></div>`);
    }
    return;
  }
  const { outgoing } = await api('/mentorship');
  for (const r of outgoing) if (['accepted', 'completed'].includes(r.status)) {
    const btn = $(`#mc a[href="#/messages/${r.mentor.id}"]`) || $$('#mc .card').find(c => c.innerHTML.includes(`#/u/${r.mentor.id}`))?.querySelector('.row.wrap');
    const host = btn ? (btn.closest('.row.wrap') || btn) : null;
    if (host) host.insertAdjacentHTML('beforeend', `<button class="btn ghost sm" data-act="rate" data-id="${r.id}" data-name="${esc(r.mentor.name)}">${icon('star', 'width="15" height="15"')} Rate</button>`);
  }
};
ACT.rate = b => {
  modal(`<h2>How was your mentorship with ${esc(firstName(b.dataset.name))}?</h2><p class="muted small">Your rating helps other students find great mentors. ${esc(firstName(b.dataset.name))} sees the stars and your note.</p>
    <form id="rf"><div class="rate-pick" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="rating" value="${i}" ${i === 5 ? 'checked' : ''}><span>${icon('star', 'width="30" height="30"')}</span><span class="sr-only">${i} stars</span></label>`).join('')}</div>
    <div class="field"><label for="rfb">Note (optional)</label><textarea class="input" id="rfb" name="feedback" maxlength="600"></textarea></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Send rating</button></div></form>`, (m, close) => {
    $('#rf', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api(`/mentorship/${b.dataset.id}/rate`, { method: 'POST', body: formObj(e.target) }); close(); toast('Thanks for the rating!'); } catch (err) { fail(err); } }); };
  });
};

// ---------------------------------------------------------------- internship reviews
async function viewReviews() {
  main().innerHTML = `<div class="page-head"><div><h1>Internship reviews</h1><p class="muted">Honest reviews of internships and jobs, by students for students.</p></div><button class="btn primary" data-act="newreview">${icon('edit', 'width="18" height="18"')} Write a review</button></div>
    <div class="filters"><div class="search">${icon('search')}<input class="input" id="q" placeholder="Search hotel, company, role or city" aria-label="Search reviews"></div></div><div id="rv">${loading()}</div>`;
  let timer;
  const load = async (company) => {
    const d = await api('/reviews?' + new URLSearchParams(company ? { company } : { q: $('#q').value }));
    if (!$('#rv')) return;
    const card = r => `<div class="card review"><div class="row between wrap"><div><b>${esc(r.company)}</b>${r.role ? ` · <span class="muted">${esc(r.role)}</span>` : ''}</div>${stars(r.rating, 16)}</div>
      <div class="tiny muted" style="margin-top:4px">${r.author ? `by <a href="#/u/${r.author.id}">${esc(r.author.name)}</a>` : `by an anonymous ${r.authorRole === 'alumni' ? 'graduate' : r.authorRole}`}${r.location ? ' · ' + esc(r.location) : ''}${r.period ? ' · ' + esc(r.period) : ''} · ${ago(r.createdAt)}</div>
      ${r.pros ? `<p class="small" style="margin-top:10px"><b class="good">Good:</b> ${esc(r.pros)}</p>` : ''}${r.cons ? `<p class="small" style="margin-top:6px"><b class="bad">Not so good:</b> ${esc(r.cons)}</p>` : ''}
      ${r.advice ? `<p class="small" style="margin-top:6px"><b>Advice:</b> ${esc(r.advice)}</p>` : ''}
      <div class="row" style="justify-content:flex-end;margin-top:8px">${r.mine || state.me.isAdmin ? `<button class="btn danger sm" data-act="delreview" data-id="${r.id}">Delete</button>` : `<button class="btn icon" data-act="report" data-type="review" data-id="${r.id}" aria-label="Report">${icon('flag')}</button>`}</div></div>`;
    $('#rv').innerHTML = (company ? `<button class="btn ghost sm" id="allrev" style="margin-bottom:12px">${icon('back', 'width="16" height="16"')} All companies</button>` : '')
      + (!company && d.companies.length ? `<div class="grid companies">${d.companies.map(c => `<button class="card company" data-c="${esc(c.company)}"><b>${esc(c.company)}</b><span class="row" style="gap:6px">${stars(c.avg)}<span class="small muted">${c.avg} · ${c.n} review${c.n > 1 ? 's' : ''}</span></span></button>`).join('')}</div><h2 style="margin:22px 0 12px">Latest reviews</h2>` : '')
      + (d.reviews.length ? d.reviews.map(card).join('') : `<div class="card">${empty('⭐', 'No reviews yet', 'Did an internship? Help the next student by writing the first review.', '<button class="btn primary" data-act="newreview">Write a review</button>')}</div>`);
    $$('#rv .company').forEach(c => c.onclick = () => load(c.dataset.c));
    $('#allrev') && ($('#allrev').onclick = () => load());
  };
  $('#q').oninput = () => { clearTimeout(timer); timer = setTimeout(() => load(), 250); };
  load().catch(fail);
}
Object.assign(ACT, {
  async delreview(b) { if (!await confirmBox('Delete this review?', 'Delete')) return; await api(`/reviews/${b.dataset.id}`, { method: 'DELETE' }); toast('Deleted.'); route(); },
  newreview() {
    modal(`<h2>Review an internship or job</h2><form id="rvf"><div class="field"><label for="rc">Company or hotel</label><input class="input" id="rc" name="company" maxlength="100" required></div>
      <div class="row wrap"><div class="field grow"><label for="rr">Role</label><input class="input" id="rr" name="role" maxlength="100" placeholder="e.g. F&B intern"></div><div class="field grow"><label for="rl">City</label><input class="input" id="rl" name="location" maxlength="100"></div></div>
      <div class="field"><label for="rp">When</label><input class="input" id="rp" name="period" maxlength="40" placeholder="e.g. Summer 2026"></div>
      <div class="field"><span class="lbl">Overall rating</span><div class="rate-pick" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="rating" value="${i}" ${i === 4 ? 'checked' : ''}><span>${icon('star', 'width="30" height="30"')}</span><span class="sr-only">${i} stars</span></label>`).join('')}</div></div>
      <div class="field"><label for="rpr">What was good</label><textarea class="input" id="rpr" name="pros" maxlength="1500"></textarea></div>
      <div class="field"><label for="rco">What was not so good</label><textarea class="input" id="rco" name="cons" maxlength="1500"></textarea></div>
      <div class="field"><label for="rad">Advice for the next intern</label><textarea class="input" id="rad" name="advice" maxlength="1000"></textarea></div>
      <label class="check"><input type="checkbox" name="anonymous" checked> Post anonymously (your name is hidden)</label>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Publish review</button></div></form>`, (m, close) => {
      $('#rvf', m).onsubmit = async e => { e.preventDefault(); const body = formObj(e.target); body.anonymous = !!body.anonymous;
        await busy(e.submitter, async () => { try { await api('/reviews', { method: 'POST', body }); close(); toast('Thanks! Your review is live.'); route(); } catch (err) { fail(err); } }); };
    });
  },
});

// ---------------------------------------------------------------- search
async function viewSearch(q) {
  q = decodeURIComponent(q || '');
  main().innerHTML = `<div class="narrow"><div class="page-head"><h1>Search</h1></div>
    <div class="search big-search">${icon('search')}<input class="input" id="sq" placeholder="People, posts, groups, events, companies…" value="${esc(q)}" aria-label="Search LinkCampus" autocomplete="off"></div><div id="sr" style="margin-top:16px"></div></div>`;
  let timer;
  const run = async () => {
    const v = $('#sq').value.trim();
    if (v.length < 2) { $('#sr').innerHTML = `<p class="muted small">Type at least 2 letters. Try a name, a hotel, a skill or a #tag.</p>`; return; }
    if (v.startsWith('#') && v.length > 2) { go('#/tag/' + encodeURIComponent(v.slice(1))); return; }
    const d = await api('/search?q=' + encodeURIComponent(v));
    if (!$('#sr')) return;
    const sec = (title, items, fn) => items.length ? `<div class="card"><h3 style="margin-bottom:6px">${title}</h3><div class="list">${items.map(fn).join('')}</div></div>` : '';
    const html = sec('People', d.people, u => `<a class="list-item" href="#/u/${u.id}" style="color:inherit">${av(u, 38)}<div class="grow"><b class="small">${esc(u.name)}</b><div class="tiny muted">${esc(u.headline || u.campusName)}</div></div></a>`)
      + sec('Posts', d.posts, p => `<a class="list-item" href="#/post/${p.id}" style="color:inherit;display:block"><div class="small">${esc(p.body)}</div><div class="tiny muted">${esc(p.author)} · ${ago(p.createdAt)}</div></a>`)
      + sec('Groups', d.groups, g => `<a class="list-item" href="#/groups/${g.id}" style="color:inherit">${icon('groups', 'width="20" height="20"')}<div class="grow"><b class="small">${esc(g.name)}</b><div class="tiny muted">${esc(g.category)}${g.private ? ' · Private' : ''}</div></div></a>`)
      + sec('Events', d.events, e => `<a class="list-item" href="#/events/${e.id}" style="color:inherit">${icon('cal', 'width="20" height="20"')}<div class="grow"><b class="small">${esc(e.title)}</b><div class="tiny muted">${esc(dt(e.startsAt))}</div></div></a>`)
      + sec('Opportunities', d.opportunities, o => `<a class="list-item" href="#/opportunities" style="color:inherit">${icon('brief', 'width="20" height="20"')}<div class="grow"><b class="small">${esc(o.title)}</b><div class="tiny muted">${esc(o.org)} · ${esc(o.type)}</div></div></a>`)
      + sec('Reviews', d.reviews, r => `<a class="list-item" href="#/reviews" style="color:inherit">${icon('star', 'width="20" height="20"')}<div class="grow"><b class="small">${esc(r.company)}</b><div class="tiny muted">${r.avg} ★ · ${r.n} review${r.n > 1 ? 's' : ''}</div></div></a>`);
    $('#sr').innerHTML = html || empty('🔎', 'No results', 'Try another word, or check the spelling.');
  };
  $('#sq').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
  $('#sq').focus(); run().catch(fail);
}

// ---------------------------------------------------------------- invites and leaderboard
async function viewInvite() {
  const [inv, lb] = await Promise.all([api('/invite'), api('/leaderboard')]);
  const url = `${DEMO ? 'https://app.linkcampus.io' : location.origin}/#/signup?ref=${inv.code}`;
  main().innerHTML = `<div class="cols"><div>
    <div class="card invite-hero"><h1>Invite your campus</h1><p class="muted" style="margin-top:6px">LinkCampus gets better with every classmate, alumni and mentor who joins. Share your personal link:</p>
      <div class="invite-link"><input class="input" readonly value="${esc(url)}" aria-label="Your invite link" onfocus="this.select()"><button class="btn primary" data-act="copy" data-text="${esc(url)}">Copy</button>
      ${navigator.share ? `<button class="btn ghost" data-act="share" data-text="${esc(url)}">Share</button>` : ''}</div>
      <div class="stats" style="margin-top:16px"><div class="stat"><b>${inv.joined}</b><span>Joined with your link</span></div><div class="stat"><b>${inv.pending}</b><span>Signed up, not verified yet</span></div></div>
      ${inv.people.length ? `<div class="avatars" style="margin-top:14px">${inv.people.map(u => `<a href="#/u/${u.id}" title="${esc(u.name)}">${av(u, 36)}</a>`).join('')}</div>` : ''}</div>
    <div class="card"><div class="row between"><h2>Ambassadors</h2><div class="tabs" style="margin:0"><button class="tab on" data-lb="all">All</button><button class="tab" data-lb="mine">My university</button></div></div>
      <div id="lb" class="list" style="margin-top:8px"></div></div></div>
    <aside><div class="card"><h3>Biggest campuses</h3><div class="list" style="margin-top:6px">${lb.universities.map((u, i) => `<div class="list-item"><span class="rank">${i + 1}</span><div class="grow small">${esc(u.name)}</div><b class="small">${u.members}</b></div>`).join('')}</div></div></aside></div>`;
  const draw = leaders => { $('#lb').innerHTML = leaders.length ? leaders.map((l, i) => `<div class="list-item"><span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span>${av(l.user, 36)}<div class="grow small">${uname(l.user)}<div class="tiny muted">${esc(l.user.campusName)}</div></div><b>${l.invited}</b></div>`).join('')
    : `<p class="small muted" style="padding:12px 0">No invites yet. Be the first ambassador!</p>`; };
  draw(lb.leaders);
  $$('[data-lb]').forEach(t => t.onclick = async () => { $$('[data-lb]').forEach(x => x.classList.toggle('on', x === t)); draw((await api('/leaderboard?campus=' + t.dataset.lb)).leaders); });
}
ACT.share = async b => { try { await navigator.share({ title: 'Join me on LinkCampus', text: 'The network for students, alumni and mentors.', url: b.dataset.text }); } catch {} };

// ---------------------------------------------------------------- university dashboard
async function viewUniversity() {
  if (!state.me.uniStaff && !state.me.isAdmin) return go('#/feed');
  let campus = null; try { campus = sessionStorage.getItem('uniCampus'); } catch {}
  const s = await api('/uni/stats' + (campus ? '?campus=' + encodeURIComponent(campus) : ''));
  const stat = (n, l) => `<div class="stat"><b>${n ?? '–'}</b><span>${l}</span></div>`;
  const max = Math.max(1, ...s.topInterests.map(i => i.count));
  main().innerHTML = `<div class="page-head"><div><h1>${esc(s.name)}</h1><p class="muted">University dashboard · anonymised engagement</p></div>
    ${s.universities ? `<select class="input" id="uc" style="width:auto;max-width:100%" aria-label="University">${s.universities.map(u => `<option value="${esc(u.id)}" ${u.id === s.campus ? 'selected' : ''}>${esc(u.name)} (${u.members})</option>`).join('')}</select>` : ''}</div>
    <div class="stats">${stat(s.members, 'Verified members')}${stat(s.new30d, 'Joined in 30 days')}${stat(s.active7d, 'Active this week')}${stat(s.active30d, 'Active this month')}
      ${stat(s.connections, 'Connections')}${stat(s.mentorships, 'Mentorships')}${stat(s.mentorRating ? s.mentorRating + ' ★' : '–', 'Mentor rating')}${stat(s.applications, 'Applications sent')}${stat(s.accepted, 'Offers accepted')}${stat(s.events, 'Events')}</div>
    <div class="cols" style="margin-top:20px"><div class="card"><h3>What students are interested in</h3><div style="margin-top:12px">${s.topInterests.map(i => `<div class="bar-row"><span class="small">${esc(i.name)}</span><span class="bar"><i style="width:${Math.round(i.count / max * 100)}%"></i></span><b class="small">${i.count}</b></div>`).join('') || '<p class="small muted">No data yet.</p>'}</div></div>
    <div class="card"><h3>Members by role</h3><div class="list" style="margin-top:6px">${s.byRole.map(r => `<div class="list-item"><span class="role ${esc(r.role)}">${esc(r.role)}</span><span class="grow"></span><b>${r.n}</b></div>`).join('')}</div>
      <p class="tiny muted" style="margin-top:12px">Counts only. No names or messages are shown to universities.</p></div></div>`;
  $('#uc') && ($('#uc').onchange = e => { try { sessionStorage.setItem('uniCampus', e.target.value); } catch {} viewUniversity(); });
}

// ---------------------------------------------------------------- settings
viewSettings = async function () {
  const me = state.me, nonStudent = me.role !== 'student', M = state.meta;
  main().innerHTML = `<div class="narrow"><div class="page-head"><div><h1>Settings</h1><p class="muted">${esc(me.email)}</p></div></div>
    <div class="card"><h2>Photo and CV</h2><div class="row wrap" style="margin-top:14px;gap:16px">${av(me, 88)}
      <div class="stack"><div class="row wrap"><button class="btn" data-act="upavatar">${icon('image', 'width="16" height="16"')} ${me.avatar ? 'Change photo' : 'Add a photo'}</button>${me.avatar ? '<button class="btn ghost" data-act="rmfile" data-k="avatar">Remove</button>' : ''}</div>
      <div class="row wrap"><button class="btn" data-act="upcv">${icon('paperclip', 'width="16" height="16"')} ${me.cv ? 'Replace CV' : 'Upload CV (PDF)'}</button>${me.cv ? `<a class="btn ghost" href="${esc(me.cv)}" target="_blank" rel="noopener">View</a><button class="btn ghost" data-act="rmfile" data-k="cv">Remove</button>` : ''}</div>
      <p class="tiny muted">Your CV is only visible to your connections and to people whose listings you apply to.</p></div></div></div>
    <form class="card" id="pf"><h2>Profile</h2><div style="height:12px"></div>
      ${profileFields(me, { compact: true })}
      <div class="field"><label for="lf">Looking for</label><input class="input" id="lf" name="lookingFor" maxlength="300" value="${esc(me.lookingFor)}"></div>
      <div class="field"><label for="bio">Bio</label><textarea class="input" id="bio" name="bio" maxlength="1000">${esc(me.bio)}</textarea></div>
      <div class="field"><label for="exp">Experience</label><textarea class="input" id="exp" name="experience" maxlength="2000" placeholder="e.g. Front office intern, Hotel X (Summer 2026)">${esc(me.experience)}</textarea></div>
      <div class="field"><label for="sk">Skills (comma separated)</label><input class="input" id="sk" name="skills" maxlength="300" value="${esc(me.skills)}" placeholder="Opera PMS, Excel, Wine service"></div>
      <div class="field"><span class="lbl">Open to</span>${selectChips('openTo', M.openTo, me.openTo)}</div>
      <div class="field"><span class="lbl">Languages I speak</span>${selectChips('speak', M.languages, me.langsSpeak)}</div>
      <div class="field"><span class="lbl">Languages I'm learning</span>${selectChips('learn', M.languages, me.langsLearn)}</div>
      <div class="field"><span class="lbl">Interests</span>${interestPicker(me.interests)}</div>
      ${mentorFields(me)}${nonStudent ? `<div class="field"><label for="ma">Mentoring availability</label><input class="input" id="ma" name="mentorAvailability" maxlength="200" value="${esc(me.mentorAvailability)}" placeholder="e.g. Tue and Thu evenings, 30-minute video calls"></div>` : ''}
      <button class="btn primary">Save profile</button></form>
    <div class="card"><h2>Privacy and notifications</h2>
      <label class="check" style="margin-top:14px"><input type="checkbox" data-pref="publicProfile" ${me.publicProfile ? 'checked' : ''}> <span><b>Public profile page</b><br><span class="small muted">Shows your name, photo, headline, university and interests at a link you can share on LinkedIn or a CV. Messages and contacts stay private.</span>
        ${me.publicProfile && !DEMO ? `<br><a class="small" href="/p/${me.id}" target="_blank" rel="noopener">${esc(location.origin)}/p/${me.id}</a>` : ''}</span></label>
      <label class="check"><input type="checkbox" data-pref="digestOpt" ${me.digestOpt ? 'checked' : ''}> <span><b>Weekly email digest</b><br><span class="small muted">New people at your university, new opportunities and anything waiting for you. Once a week at most.</span></span></label>
      ${state.meta.analytics ? `<label class="check"><input type="checkbox" id="anl" ${consent() === 'yes' ? 'checked' : ''}> <span><b>Help improve LinkCampus</b><br><span class="small muted">Anonymous usage statistics (PostHog, hosted in the EU).</span></span></label>` : ''}</div>
    <div class="card"><h2>Security</h2>
      <div class="sec-row"><div><b>Two-factor login</b><p class="small muted">${me.totpEnabled ? 'On. You enter a code from your authenticator app when you log in.' : 'Add a second step with an authenticator app (Google Authenticator, 1Password, Authy).'}</p></div>
        ${me.totpEnabled ? '<button class="btn ghost" data-act="tfaoff">Turn off</button>' : '<button class="btn primary" data-act="tfaon">Turn on</button>'}</div>
      <form id="pw" style="margin-top:18px"><b>Change password</b><div style="height:10px"></div>
        <div class="field"><label for="cpw">Current password</label><input class="input" id="cpw" type="password" name="current" autocomplete="current-password" required></div>
        <div class="field"><label for="npw">New password</label><input class="input" id="npw" type="password" name="password" minlength="8" autocomplete="new-password" required></div>
        <button class="btn">Change password</button></form>
      <div style="margin-top:20px"><b>Where you're logged in</b><div id="sess" class="list" style="margin-top:6px">${loading()}</div></div></div>
    <div class="card"><h2>Blocked people</h2><div id="blk" class="list" style="margin-top:6px">${loading()}</div></div>
    ${DEMO ? '' : `<div class="card" id="installCard" hidden><h2>Install the app</h2><p class="small muted" style="margin:6px 0 12px">Add LinkCampus to your home screen for one-tap access.</p><button class="btn primary" data-act="install">${icon('phone', 'width="16" height="16"')} Install LinkCampus</button></div>`}
    <div class="card"><h2>Your data</h2><p class="muted small" style="margin:6px 0 14px">Download everything we hold about you, or delete your account permanently.</p>
      <div class="row wrap"><button class="btn" id="export">Download my data</button><button class="btn danger" id="del">Delete account</button></div></div>
    <div class="card"><div class="row between"><div><h3>Log out</h3><p class="small muted">Signed in as ${esc(me.name)}</p></div><button class="btn ghost" data-act="logout">${icon('logout', 'width="18" height="18"')} Log out</button></div></div>
    <p class="tiny muted" style="text-align:center;margin-top:18px"><a href="https://linkcampus.io/privacy.html" target="_blank" rel="noopener">Privacy</a> · <a href="https://linkcampus.io/terms.html" target="_blank" rel="noopener">Terms</a> · <a href="mailto:hello@linkcampus.io">hello@linkcampus.io</a></p></div>`;
  bindInterests($('#pf')); ['openTo', 'speak', 'learn'].forEach(id => bindChips($('#pf'), id));
  $('#pf').onsubmit = async e => {
    e.preventDefault(); const f = formObj(e.target);
    const body = { ...f, interests: readInterests($('#pf')), mentorOpen: !!f.mentorOpen, openTo: readChips($('#pf'), 'openTo'), langsSpeak: readChips($('#pf'), 'speak'), langsLearn: readChips($('#pf'), 'learn') };
    await busy(e.submitter, async () => { try { await api('/me', { method: 'PUT', body }); await loadMe(); state.meta = await api('/meta'); toast('Profile saved.'); } catch (err) { fail(err); } });
  };
  $$('[data-pref]').forEach(c => c.onchange = async () => { try { await api('/me', { method: 'PUT', body: { [c.dataset.pref]: c.checked } }); await loadMe(); toast('Saved.'); if (c.dataset.pref === 'publicProfile') viewSettings(); } catch (err) { fail(err); } });
  $('#anl') && ($('#anl').onchange = e => { setConsent(e.target.checked ? 'yes' : 'no'); toast('Saved.'); });
  $('#pw').onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api('/me/password', { method: 'POST', body: formObj(e.target) }); e.target.reset(); toast('Password changed. Other devices were logged out.'); } catch (err) { fail(err); } }); };
  $('#export').onclick = e => busy(e.currentTarget, async () => {
    const data = await api('/me/export');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'linkcampus-data.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#del').onclick = () => modal(`<h2>Delete account</h2><p class="muted">This permanently deletes your profile, posts, messages, uploads and connections. It can't be undone.</p>
    <form id="df" style="margin-top:16px"><div class="field"><label for="dpw">Confirm with your password</label><input class="input" id="dpw" type="password" name="password" required></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn danger">Delete forever</button></div></form>`, (m, close) => {
    $('#df', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api('/me', { method: 'DELETE', body: formObj(e.target) }); close(); state.me = null; stopLive(); toast('Your account was deleted.'); go('#/login'); } catch (err) { fail(err); } }); };
  });
  if (installPrompt && $('#installCard')) $('#installCard').hidden = false;
  api('/me/sessions').then(({ sessions }) => { $('#sess').innerHTML = sessions.map(s => `<div class="list-item"><div class="grow small"><b>${esc(s.device)}</b>${s.current ? ' <span class="chip shared">This device</span>' : ''}<div class="tiny muted">Last active ${ago(s.lastUsed)} · signed in ${new Date(s.createdAt).toLocaleDateString()}</div></div>
    ${s.current ? '' : `<button class="btn ghost sm" data-act="endsess" data-id="${s.id}">Log out</button>`}</div>`).join(''); }).catch(() => {});
  api('/blocks').then(({ users }) => { $('#blk').innerHTML = users.length ? users.map(u => `<div class="list-item">${av(u, 34)}<div class="grow small"><b>${esc(u.name)}</b></div><button class="btn ghost sm" data-act="unblock" data-id="${u.id}">Unblock</button></div>`).join('') : '<p class="small muted" style="padding:8px 0">You haven\'t blocked anyone.</p>'; }).catch(() => {});
};
Object.assign(ACT, {
  async upavatar(b) {
    const file = await pickFile('image/*'); if (!file) return;
    await busy(b, async () => { await upload('avatar', file); await loadMe(); toast('Photo updated.'); $('.shell')?.remove(); route(); });
  },
  async upcv(b) { const file = await pickFile('application/pdf'); if (!file) return; await busy(b, async () => { await upload('cv', file); await loadMe(); toast('CV uploaded.'); viewSettings(); }); },
  async rmfile(b) { await api('/me/' + b.dataset.k, { method: 'DELETE' }); await loadMe(); toast('Removed.'); if (b.dataset.k === 'avatar') $('.shell')?.remove(); route(); },
  async endsess(b) { await api('/me/sessions/' + b.dataset.id, { method: 'DELETE' }); b.closest('.list-item').remove(); toast('Logged out on that device.'); },
  async tfaon() {
    const s = await api('/me/2fa/setup', { method: 'POST' });
    modal(`<h2>Turn on two-factor login</h2><ol class="small steps-list"><li>Open your authenticator app and add a new account.</li><li>Choose “enter a setup key” and paste this key:</li></ol>
      <div class="secret"><code>${esc(s.secret.replace(/(.{4})/g, '$1 ').trim())}</code><button class="btn ghost sm" data-act="copy" data-text="${esc(s.secret)}">Copy</button></div>
      <p class="small"><a href="${esc(s.otpauth)}">Or open it in your authenticator app</a> (on this phone).</p>
      <form id="tf" style="margin-top:12px"><div class="field"><label for="tfc">Enter the 6-digit code it shows</label><input class="input code-input" id="tfc" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Turn on</button></div></form>`, (m, close) => {
      $('#tf', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api('/me/2fa/enable', { method: 'POST', body: formObj(e.target) }); close(); await loadMe(); toast('Two-factor login is on.'); viewSettings(); } catch (err) { fail(err); } }); };
    });
  },
  tfaoff() {
    modal(`<h2>Turn off two-factor login</h2><form id="tf2"><div class="field"><label for="t2p">Password</label><input class="input" id="t2p" type="password" name="password" required></div>
      <div class="field"><label for="t2c">Authenticator code</label><input class="input code-input" id="t2c" name="code" inputmode="numeric" maxlength="6" required></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn danger">Turn off</button></div></form>`, (m, close) => {
      $('#tf2', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api('/me/2fa/disable', { method: 'POST', body: formObj(e.target) }); close(); await loadMe(); toast('Two-factor login is off.'); viewSettings(); } catch (err) { fail(err); } }); };
    });
  },
  async install() { if (!installPrompt) return; installPrompt.prompt(); try { await installPrompt.userChoice; } catch {} installPrompt = null; $('#installCard') && ($('#installCard').hidden = true); },
});

// ---------------------------------------------------------------- notifications (new types)
viewNotifications = async function () {
  const { notifications } = await api('/notifications');
  const ic = { connection: 'people', like: 'heart', comment: 'comment', mentor: 'mentor', group: 'groups', event: 'cal', application: 'brief' };
  main().innerHTML = `<div class="narrow"><div class="page-head"><h1>Notifications</h1></div><div class="card" style="padding:8px">
    ${notifications.length ? notifications.map(n => `<a class="notif ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/feed')}"><span class="ic">${icon(ic[n.type] || 'bell')}</span><div class="grow"><div>${esc(n.text)}</div><div class="tiny muted">${ago(n.createdAt)}</div></div></a>`).join('')
      : empty('🔔', 'All caught up', 'Requests, comments, events and application updates show up here.')}</div></div>`;
  if (notifications.some(n => !n.read)) { await api('/notifications/read', { method: 'POST' }).catch(() => {}); state.badges.notifications = 0; paintBadges(); }
};

// ---------------------------------------------------------------- admin: tabs for reports, members, audit log, backup
const baseAdmin = viewAdmin;
viewAdmin = async function () {
  if (!state.me.isAdmin) return go('#/feed');
  await baseAdmin();
  const head = $('.page-head');
  head.insertAdjacentHTML('beforeend', `<div class="row wrap">${DEMO ? '' : `<a class="btn ghost" href="/api/admin/backup">${icon('download', 'width="16" height="16"')} Download backup</a>`}<a class="btn ghost" href="#/university">${icon('chart', 'width="16" height="16"')} University dashboard</a></div>`);
  const ul = $('#ul');
  const decorate = () => $$('#ul .list-item').forEach(row => {
    const ban = $('[data-act="ban"]', row); if (!ban || $('[data-act="unistaff"]', row)) return;
    ban.insertAdjacentHTML('beforebegin', `<button class="btn ghost sm" data-act="unistaff" data-id="${ban.dataset.id}">Uni staff…</button>`);
  });
  new MutationObserver(decorate).observe(ul, { childList: true, subtree: true }); decorate();
  const { entries } = await api('/admin/audit');
  main().insertAdjacentHTML('beforeend', `<h2 style="margin:24px 0 12px">Audit log</h2><div class="card">${entries.length ? `<div class="list">${entries.slice(0, 50).map(a => `<div class="list-item small"><div class="grow"><b>${esc(a.admin)}</b> ${esc(a.action)} <span class="muted">${esc(a.target)}${a.detail ? ' · ' + esc(a.detail) : ''}</span></div><span class="tiny muted">${ago(a.createdAt)}</span></div>`).join('')}</div>` : '<p class="small muted">No admin actions yet.</p>'}</div>`);
};
ACT.unistaff = b => {
  const unis = state.meta.universities || [];
  modal(`<h2>University staff access</h2><p class="small muted">Staff see the anonymised dashboard for one university. No names or messages.</p>
    <form id="usf" style="margin-top:12px"><div class="field"><label for="usc">University</label><select class="input" id="usc" name="campus"><option value="">No access</option>${unis.map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('')}</select></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`, (m, close) => {
    $('#usf', m).onsubmit = async e => { e.preventDefault(); await busy(e.submitter, async () => { try { await api(`/admin/users/${b.dataset.id}/uni-staff`, { method: 'POST', body: formObj(e.target) }); close(); toast('Saved.'); } catch (err) { fail(err); } }); };
  });
};

// ---------------------------------------------------------------- guided tour (first visit after onboarding)
const TOUR = [
  ['#/feed', 'Your home feed', 'Posts from your network and groups. Share questions, wins and #tags here.'],
  ['#/people', 'Find people', 'Students, alumni and mentors, best matches first. Filter by interest, university, language tandem or what they’re open to.'],
  ['#/mentors', 'Get a mentor', 'Alumni and professionals who give an hour. Send a short, specific request.'],
  ['#/opportunities', 'Opportunities', 'Internships, jobs and side jobs shared here first. Apply with your profile and track your applications.'],
  ['#/events', 'Events', 'Career fairs, tastings and meetups. RSVP and add them to your calendar.'],
];
function maybeTour() {
  if (!state.me || state.me.tourDone || state.tourShown || !$('.shell')) return;
  if ($('.lcd-wel')) { setTimeout(maybeTour, 700); return; }
  state.tourShown = true;
  let i = 0;
  const box = document.createElement('div'); box.className = 'tour'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Quick tour');
  const done = () => { box.remove(); $$('.tour-hl').forEach(x => x.classList.remove('tour-hl')); api('/me/tour-done', { method: 'POST' }).catch(() => {}); state.me.tourDone = true; };
  const show = () => {
    $$('.tour-hl').forEach(x => x.classList.remove('tour-hl'));
    const [href, title, text] = TOUR[i];
    const target = $(`.nav-a[href="${href}"]`) || $(`.tabbar [href="${href}"]`) || $('.tabbar [data-act="more"]');
    target && target.classList.add('tour-hl');
    box.innerHTML = `<div class="tiny muted">Quick tour · ${i + 1} of ${TOUR.length}</div><h3 style="margin:6px 0">${title}</h3><p class="small">${text}</p>
      <div class="row between" style="margin-top:12px"><button class="btn ghost sm" data-t="skip">Skip</button><div class="row"><a class="btn ghost sm" href="${href}">Open</a><button class="btn primary sm" data-t="next">${i === TOUR.length - 1 ? 'Done' : 'Next'}</button></div></div>`;
  };
  box.addEventListener('click', e => { const t = e.target.closest('[data-t]')?.dataset.t; if (t === 'skip') done(); if (t === 'next') { i++; i >= TOUR.length ? done() : show(); } });
  document.body.appendChild(box); show();
}

// ---------------------------------------------------------------- analytics (only with consent) and error reports
const consent = () => { try { return localStorage.getItem('lc_analytics'); } catch { return null; } };
function setConsent(v) { try { localStorage.setItem('lc_analytics', v); } catch {} $('.consent')?.remove(); if (v === 'yes') loadAnalytics(); else try { window.posthog && posthog.opt_out_capturing(); } catch {} }
function loadAnalytics() {
  const a = state.meta?.analytics; if (!a || window.posthog || DEMO) return;
  const s = document.createElement('script'); s.src = a.assets + '/static/array.js'; s.async = true;
  s.onload = () => { try { posthog.init(a.key, { api_host: a.host, person_profiles: 'identified_only', capture_pageview: false, persistence: 'localStorage' }); if (state.me) posthog.identify(String(state.me.id), { role: state.me.role, university: state.me.campus }); track(); } catch {} };
  document.head.appendChild(s);
}
function track() { try { window.posthog && posthog.capture && posthog.capture('$pageview', { $current_url: location.origin + '/' + (location.hash.split('?')[0].replace(/\/\d+/g, '/:id')) }); } catch {} }
function askConsent() {
  if (!state.meta?.analytics || consent() || DEMO || $('.consent')) return;
  const el = document.createElement('div'); el.className = 'consent'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Analytics consent');
  el.innerHTML = `<p class="small">We'd like to collect anonymous usage statistics to improve LinkCampus. They're stored in the EU and never sold. <a href="https://linkcampus.io/privacy.html" target="_blank" rel="noopener">Privacy</a></p>
    <div class="row"><button class="btn ghost sm" data-c="no">No thanks</button><button class="btn primary sm" data-c="yes">Accept</button></div>`;
  el.addEventListener('click', e => { const c = e.target.closest('[data-c]')?.dataset.c; if (c) setConsent(c); });
  document.body.appendChild(el);
}
let errCount = 0;
function reportClientError(message, stack) {
  if (DEMO || ++errCount > 5) return;
  fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-LC': '1' }, body: JSON.stringify({ message: String(message).slice(0, 300), stack: String(stack || '').slice(0, 800), url: location.hash }) }).catch(() => {});
}
window.addEventListener('error', e => reportClientError(e.message, e.error && e.error.stack));
window.addEventListener('unhandledrejection', e => reportClientError(e.reason && e.reason.message || e.reason, e.reason && e.reason.stack));

// ---------------------------------------------------------------- install as an app (PWA)
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; const c = $('#installCard'); if (c) c.hidden = false; });
if (!DEMO && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/sw.js').catch(() => {});

// ---------------------------------------------------------------- routes
const OVERRIDES = { viewLogin, viewSignup, viewFeed, viewPeople, viewProfile, viewNetwork, viewMessages, viewMentors, viewGroups, viewGroup, viewOpps, viewNotifications, viewSettings, viewAdmin };
for (const r of ROUTES) if (OVERRIDES[r[1].name]) r[1] = OVERRIDES[r[1].name];
ROUTES[ROUTES.findIndex(r => r[1] === viewSignup)][0] = /^#\/signup(?:\?.*)?$/;
ROUTES.push(
  [/^#\/search(?:\?q=(.*))?$/, viewSearch], [/^#\/tag\/([^/?#]+)$/, t => viewTag(decodeURIComponent(t))], [/^#\/saved$/, viewSaved],
  [/^#\/events$/, viewEvents], [/^#\/events\/(\d+)$/, viewEvent], [/^#\/reviews$/, viewReviews], [/^#\/invite$/, viewInvite],
  [/^#\/applications(?:\/(\d+))?$/, viewApplications], [/^#\/university$/, viewUniversity],
);
const baseRoute = route;
route = function () {
  baseRoute();
  if (state.me && state.me.verified && state.me.onboarded) { startLive(); askConsent(); if (consent() === 'yes') loadAnalytics(); track(); }
};
window.removeEventListener('hashchange', baseRoute);
boot().then(() => { window.removeEventListener('hashchange', baseRoute); window.addEventListener('hashchange', route); });
