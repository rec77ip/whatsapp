// Contacts and messages live in index.html. This file only adds behaviour.
// Read it top to bottom: each numbered section is one feature.

/* ---------- 0. Helpers and state ---------- */
const $  = s => document.querySelector(s);            // find one element
const $$ = s => [...document.querySelectorAll(s)];    // find many, as a real array
const app = $('#app');
const photos = {};        // contact id -> chosen profile image URL
let cur = null;           // id of the open chat, e.g. "c3"
let target = null;        // contact whose photo is being changed
let sender = 'me';        // who the next typed message is "from": 'me' or 'them'

const itemOf = id => $(`.item[data-id="${id}"]`);
// device time like "11:55 AM"
const now = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
// Each chat has its own clock. The first message you send uses the device time; every message after that
// is 0-5 minutes later than the one before it, so a conversation looks natural.
const clocks = {};                                    // chat id -> Date of its last message
function nextStamp(id) {
  clocks[id] = clocks[id]
    ? new Date(clocks[id].getTime() + Math.floor(Math.random() * 6) * 60000)   // + 0 to 5 whole minutes
    : new Date();                                                              // first message = device time
  return clocks[id].toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
const initials = name => name.split(' - ')[0].split(' ').filter(w => w && !['Mr', 'Miss'].includes(w))
                             .slice(0, 2).map(w => w[0]).join('').toUpperCase();

/* ---------- 1. Light / dark theme ---------- */
$('#theme').onclick = () => {
  const dark = app.dataset.theme === 'dark';
  app.dataset.theme = dark ? 'light' : 'dark';        // CSS variables do the rest
  $('#theme').textContent = dark ? '🌙' : '☀';
};

/* ---------- 2. Random contact order + search ---------- */
function shuffleChats() {
  const list = $('#chat-list'), items = $$('.item');
  for (let i = items.length - 1; i > 0; i--) {         // Fisher-Yates shuffle
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach(it => list.append(it));                // append() moves the element
}
$('#shuffle').onclick = shuffleChats;
$('#search').oninput = e => {
  const q = e.target.value.toLowerCase();
  $$('.item').forEach(it => it.hidden = !it.dataset.name.toLowerCase().includes(q));
};

/* ---------- 3. Profile photos ---------- */
function repaint(id) {                                  // update every avatar of this contact
  $$(`[data-av="${id}"]`).forEach(el => {
    el.style.backgroundImage = photos[id] ? `url(${photos[id]})` : '';
    el.classList.toggle('has', !!photos[id]);
  });
}
function choosePhoto(id) { target = id; $('#pick-av').click(); }
$('#pick-av').onchange = e => {
  const f = e.target.files[0];
  if (f) { photos[target] = URL.createObjectURL(f); repaint(target); }
  e.target.value = '';
};

/* ---------- 4. Open a chat / go back ---------- */
$('#chat-list').onclick = e => {                        // ONE listener for all 50 items (event delegation)
  const item = e.target.closest('.item');
  if (!item) return;
  if (e.target.closest('.av')) return choosePhoto(item.dataset.id);
  openChat(item.dataset.id);
};
function openChat(id) {
  cur = id;
  const it = itemOf(id);
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + id));
  $('#h-av').dataset.av = id;
  $('#h-av').style.setProperty('--h', it.querySelector('.av').style.getPropertyValue('--h'));
  $('#h-av span').textContent = it.querySelector('.av span').textContent;
  $('#h-name b').textContent = it.dataset.name;
  it.classList.remove('unread'); it.querySelector('.badge')?.remove();   // reading clears the badge
  repaint(id); showStatus(); updateWho();
  app.classList.add('chatting');
  history.pushState({ chat: id }, '');                  // phone back button works too
  const pane = $('#pane-' + id); pane.scrollTop = pane.scrollHeight;
}
function goBack() { app.classList.remove('chatting'); $('#info').hidden = true; cur = null; }
$('#back').onclick = () => history.state ? history.back() : goBack();
window.onpopstate = goBack;

/* ---------- 5. Contact info page (tap the name) ---------- */
$('#h-av').onclick = () => choosePhoto(cur);
$('#h-name').onclick = () => {
  const it = itemOf(cur);
  $('#i-name').textContent = it.dataset.name;
  $('#i-num').textContent = it.dataset.num;
  const a = $('#i-av');
  a.dataset.av = cur;
  a.style.setProperty('--h', $('#h-av').style.getPropertyValue('--h'));
  a.querySelector('span').textContent = $('#h-av span').textContent;
  repaint(cur);
  // Media section: copy every image shared in this chat into the strip
  const imgs = $$(`#pane-${cur} img`);
  $('#media').replaceChildren(...imgs.map(i => i.cloneNode()));
  $('#media-count').textContent = imgs.length + ' ›';
  $('#info').hidden = false;
};
$('#i-close').onclick = () => $('#info').hidden = true;
$('#i-av').onclick = () => choosePhoto(cur);

// Editable name and number: save when you press Enter or click away
function saveName() {
  const it = itemOf(cur), v = $('#i-name').textContent.trim();
  if (!v) { $('#i-name').textContent = it.dataset.name; return; }       // empty = undo
  it.dataset.name = v;
  it.querySelector('.top b').textContent = v;
  $('#h-name b').textContent = v;
  $$(`[data-av="${cur}"] span`).forEach(s => s.textContent = initials(v));
  $('#h-av span').textContent = initials(v);
}
function saveNum() { itemOf(cur).dataset.num = $('#i-num').textContent.trim(); }
[['#i-name', saveName], ['#i-num', saveNum]].forEach(([sel, fn]) => {
  $(sel).onblur = fn;
  $(sel).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
});

/* ---------- 6. Chat wallpaper (per chat) ---------- */
$('#wallbtn').onclick = () => $('#pick-wall').click();
$('#pick-wall').onchange = e => {
  const f = e.target.files[0];
  if (f) {
    const pane = $('#pane-' + cur);
    pane.style.backgroundImage = `url(${URL.createObjectURL(f)})`;   // this chat only
    pane.classList.add('custom');                                    // .custom = size "cover" (see style.css)
  }
  e.target.value = '';
};

/* ---------- 7. Who is sending: me or them ---------- */
function updateWho() {
  $('#who').textContent = sender === 'me' ? 'Me' : 'Them';
  const name = cur ? itemOf(cur).dataset.name.split(' - ')[0] : '';
  $('#text').placeholder = sender === 'me' ? 'Message' : 'Type as ' + name;
}
$('#who').onclick = () => { sender = sender === 'me' ? 'them' : 'me'; updateWho(); };

/* ---------- 8. Sending messages (text and images) ---------- */
function addMsg(node, preview) {
  const pane = $('#pane-' + cur);
  const m = document.createElement('div');
  m.className = 'm ' + (sender === 'me' ? 'out' : 'in');
  m.append(node);
  const t = document.createElement('i');
  const stamp = nextStamp(cur);                          // 0-5 minutes after the previous message
  t.textContent = stamp;
  if (sender === 'me') t.insertAdjacentHTML('beforeend', ' <u>✓✓</u>');
  m.append(t);
  pane.append(m); pane.scrollTop = pane.scrollHeight;
  const it = itemOf(cur);
  it.querySelector('.last').textContent = preview;
  it.querySelector('.top small').textContent = stamp;
  $('#chat-list').prepend(it);                           // newest chat to the top
}
function sendText() {
  const v = $('#text').value.trim();
  if (!v || !cur) return;
  addMsg(document.createTextNode(v), v);
  $('#text').value = '';
  $('#composer').classList.remove('typing');
}
$('#send').onclick = sendText;
$('#text').onkeydown = e => { if (e.key === 'Enter') sendText(); };
$('#text').oninput = e => $('#composer').classList.toggle('typing', !!e.target.value.trim());  // mic <-> send
$('#clip').onclick = $('#cam').onclick = () => $('#pick-img').click();
$('#pick-img').onchange = e => {
  const f = e.target.files[0];
  if (f) { const img = new Image(); img.src = URL.createObjectURL(f); addMsg(img, '📷 Photo'); }
  e.target.value = '';
};

/* ---------- 9. Hide / show the floating buttons ---------- */
$('#hide').onclick = () => app.classList.add('clean');                 // hides theme, wallpaper, who and itself
$$('.bar').forEach(b => b.ondblclick = () => app.classList.remove('clean'));   // double-click a top bar to restore

/* ---------- 10. Random online / last seen ---------- */
function showStatus() {
  if (!cur) return;
  const it = itemOf(cur);
  $('#h-name small').textContent = it.dataset.online === 'true' ? 'online' : 'last seen today at ' + it.dataset.seen;
}
function shuffleOnline(chance) {
  $$('.item').forEach(it => {
    if (Math.random() > chance) return;
    const on = Math.random() < 0.4;
    it.dataset.online = on;
    if (!on) it.dataset.seen = (6 + Math.floor(Math.random() * 12)) + ':' + String(Math.floor(Math.random() * 60)).padStart(2, '0') + ' PM';
  });
  showStatus();
}

/* ---------- Start up ---------- */
shuffleChats();
shuffleOnline(1);
setInterval(() => shuffleOnline(0.15), 6000);
$('#theme').textContent = '☀';
