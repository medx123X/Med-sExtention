/* ══════════════════════════════════════════
   Chrome Smart Bookmark Manager — app.js
   v1.1 — wallpaper fixed per-tab
══════════════════════════════════════════ */

const DEFAULT_DATA = {
  tabs: [
    {
      id: 'home', name: 'Home', accent: '#e63232',
      wallpaper: null, wallpaperFit: '100% 100%',
      groups: [
        { id: 'g1', name: 'Netflix',  bookmarks: [{ id: 'b1', name: 'Netflix',  url: 'https://netflix.com' }] },
        { id: 'g2', name: 'Youtube',  bookmarks: [{ id: 'b2', name: 'YouTube',  url: 'https://youtube.com' }] },
        { id: 'g3', name: 'Whatsapp', bookmarks: [{ id: 'b3', name: 'WhatsApp', url: 'https://web.whatsapp.com' }] },
      ]
    },
    {
      id: 'ai', name: 'AI', accent: '#e63232',
      wallpaper: null, wallpaperFit: '100% 100%',
      groups: [
        { id: 'g4', name: 'Claude',  bookmarks: [{ id: 'b4', name: 'Claude',   url: 'https://claude.ai' }] },
        { id: 'g5', name: 'ChatGPT', bookmarks: [{ id: 'b5', name: 'ChatGPT',  url: 'https://chatgpt.com' }] },
        { id: 'g6', name: 'Gemini',  bookmarks: [{ id: 'b6', name: 'Gemini',   url: 'https://gemini.google.com' }] },
      ]
    },
    {
      id: 'anime', name: 'Anime', accent: '#e63232',
      wallpaper: null, wallpaperFit: '100% 100%',
      groups: [
        { id: 'g7', name: 'AniWave',  bookmarks: [{ id: 'b7', name: 'AniWave',  url: 'https://aniwave.to' }] },
        { id: 'g8', name: 'AniWatch', bookmarks: [{ id: 'b8', name: 'AniWatch', url: 'https://aniwatch.to' }] },
      ]
    }
  ],
  activeTab: 'home'
};

const ACCENT_COLORS = [
  '#e63232','#e67e22','#f1c40f','#27ae60',
  '#16a085','#2980b9','#8e44ad','#e91e8c',
  '#ffffff','#ff69b4','#00bcd4','#ff5722'
];

// ── State ──────────────────────────────────────
let state = { tabs: [], activeTab: '' };
let gridMode   = true;
let hiddenMode = false;
let editingBm  = null; // { groupId, bookmarkId|null }

// ── Storage ────────────────────────────────────
function save() {
  const raw = JSON.stringify(state);
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ lumilistData: raw });
    } else {
      localStorage.setItem('lumilistData', raw);
    }
  } catch(e) { console.warn('save error', e); }
}

function load(cb) {
  function parse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('lumilistData', (res) => {
        state = parse(res.lumilistData) || structuredClone(DEFAULT_DATA);
        migrateState();
        cb();
      });
    } else {
      state = parse(localStorage.getItem('lumilistData')) || structuredClone(DEFAULT_DATA);
      migrateState();
      cb();
    }
  } catch(e) {
    state = structuredClone(DEFAULT_DATA);
    cb();
  }
}

// Ensure every tab has the wallpaper fields (migration for old saves)
function migrateState() {
  if (!state.tabs) state.tabs = [];
  if (!state.activeTab && state.tabs.length) state.activeTab = state.tabs[0].id;
  state.tabs.forEach(tab => {
    if (!('wallpaper' in tab))    tab.wallpaper    = null;
    if (!('wallpaperFit' in tab)) tab.wallpaperFit = '100% 100%';
    if (!tab.groups)              tab.groups       = [];
    tab.groups.forEach(g => { if (!g.bookmarks) g.bookmarks = []; });
  });
}

// ── Helpers ────────────────────────────────────
function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

function getActiveTab() {
  return state.tabs.find(t => t.id === state.activeTab) || state.tabs[0] || null;
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    if (domain === 'chatgpt.com' || domain === 'chat.openai.com') {
      return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    }
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(new URL(url).origin)}`;
  } catch { return null; }
}

const FAVICON_OVERRIDES = {};

function setAccentVars(color) {
  document.documentElement.style.setProperty('--accent', color);
  const r = parseInt(color.slice(1,3),16),
        g = parseInt(color.slice(3,5),16),
        b = parseInt(color.slice(5,7),16);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.35)`);
}

function makePlaceholder(name) {
  const d = document.createElement('div');
  d.className = 'bm-favicon-placeholder';
  d.textContent = (name || '?')[0].toUpperCase();
  return d;
}

// ── Wallpaper ──────────────────────────────────
// KEY FIX: wallpaper is stored on the TAB object.
// renderWallpaper() always reads from getActiveTab(),
// so adding/removing groups never touches the wallpaper.

function renderWallpaper() {
  const tab = getActiveTab();
  const wp  = document.getElementById('wallpaper');
  const fit = tab?.wallpaperFit || '100% 100%';

  // Always reset bg first so switching tabs is clean
  wp.style.backgroundImage = '';
  wp.style.background      = '';

  if (tab?.wallpaper) {
    wp.style.backgroundImage = `url(${JSON.stringify(tab.wallpaper)})`;
    wp.style.backgroundSize  = fit;
    wp.style.backgroundPosition = 'center';
    wp.style.backgroundRepeat   = 'no-repeat';
  } else {
    // Subtle dark fallback — no wallpaper set
    wp.style.background = 'radial-gradient(ellipse at 70% 50%, rgba(50,8,8,0.9) 0%, #080506 70%)';
  }

  // Sync fit buttons
  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.fit === fit);
  });
}

function applyWallpaper(dataUrlOrSrc) {
  const tab = getActiveTab();
  if (!tab) return;
  tab.wallpaper = dataUrlOrSrc;
  save();
  renderWallpaper();
}

// ── Render ─────────────────────────────────────
function render() {
  renderTabs();
  renderBookmarks();
  renderWallpaper();  // wallpaper is always driven by the active tab
}

function renderTabs() {
  const bar    = document.getElementById('tabBar');
  const addBtn = document.getElementById('addTabBtn');
  bar.querySelectorAll('.tab-btn').forEach(el => el.remove());

  state.tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (tab.id === state.activeTab ? ' active' : '');
    btn.textContent = tab.name;
    btn.dataset.id  = tab.id;
    btn.addEventListener('click', () => {
      state.activeTab = tab.id;
      save();
      render();  // re-renders wallpaper from the new active tab
    });
    btn.addEventListener('contextmenu', e => { e.preventDefault(); ctxTab(tab); });
    bar.insertBefore(btn, addBtn);
  });
}

function renderBookmarks() {
  const tab  = getActiveTab();
  const list = document.getElementById('bookmarkList');
  list.innerHTML = '';
  list.className = 'bookmark-list'
    + (gridMode   ? ' grid-mode'   : '')
    + (hiddenMode ? ' hidden-mode' : '');

  if (!tab) return;
  setAccentVars(tab.accent || '#e63232');

  tab.groups.forEach(group => {
    const card = document.createElement('div');
    card.className = 'bm-group';
    card.draggable = true;
    card.dataset.gid = group.id;

    // ── Drag & Drop ──
    card.addEventListener('dragstart', e => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', group.id);
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.bm-group').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.bm-group').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      const toId   = group.id;
      if (fromId === toId) return;
      const tab = getActiveTab();
      const fromIdx = tab.groups.findIndex(g => g.id === fromId);
      const toIdx   = tab.groups.findIndex(g => g.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;
      const [moved] = tab.groups.splice(fromIdx, 1);
      tab.groups.splice(toIdx, 0, moved);
      save();
      renderBookmarks();
    });

    // Header
    const hdr   = document.createElement('div');
    hdr.className = 'bm-group-header';
    const name  = document.createElement('span');
    name.className = 'bm-group-name';
    name.textContent = group.name;
    const acts  = document.createElement('div');
    acts.className = 'bm-group-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'bm-group-action';
    renameBtn.title = 'Rename';
    renameBtn.textContent = '✎';
    renameBtn.onclick = e => { e.stopPropagation(); renameGroup(tab, group); };

    const delGrpBtn = document.createElement('button');
    delGrpBtn.className = 'bm-group-action del';
    delGrpBtn.title = 'Delete group';
    delGrpBtn.textContent = '✕';
    delGrpBtn.onclick = e => {
      e.stopPropagation();
      if (confirm(`Delete group "${group.name}" and all its bookmarks?`)) {
        tab.groups = tab.groups.filter(g => g.id !== group.id);
        save(); renderBookmarks();
        // NOTE: we do NOT call renderWallpaper() here — wallpaper is untouched
      }
    };

    const addBmBtn = document.createElement('button');
    addBmBtn.className = 'bm-group-action add';
    addBmBtn.title = 'Add bookmark';
    addBmBtn.textContent = '+';
    addBmBtn.onclick = e => { e.stopPropagation(); openBmModal(group.id, null); };

    acts.append(addBmBtn, renameBtn, delGrpBtn);
    hdr.append(name, acts);
    card.appendChild(hdr);

    // Bookmarks
    group.bookmarks.forEach(bm => {
      const a = document.createElement('a');
      a.className = 'bm-item';
      a.href      = bm.url;
      a.target    = '_blank';
      a.rel       = 'noopener';

      const domain = (() => { try { return new URL(bm.url).hostname; } catch { return ''; } })();
      const favUrl = FAVICON_OVERRIDES[domain] || getFavicon(bm.url);
      if (favUrl) {
        const img = document.createElement('img');
        img.className = 'bm-favicon';
        img.src = favUrl;
        img.onerror = () => img.replaceWith(makePlaceholder(bm.name));
        a.appendChild(img);
      } else {
        a.appendChild(makePlaceholder(bm.name));
      }

      const span = document.createElement('span');
      span.className = 'bm-name';
      span.textContent = bm.name;
      a.appendChild(span);

      const ia = document.createElement('div');
      ia.className = 'bm-item-actions';

      const editBm = document.createElement('button');
      editBm.className = 'bm-item-action';
      editBm.title = 'Edit';
      editBm.textContent = '✎';
      editBm.onclick = e => { e.preventDefault(); e.stopPropagation(); openBmModal(group.id, bm.id); };

      const delBm = document.createElement('button');
      delBm.className = 'bm-item-action del';
      delBm.title = 'Delete';
      delBm.textContent = '✕';
      delBm.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        group.bookmarks = group.bookmarks.filter(b => b.id !== bm.id);
        save(); renderBookmarks();
      };

      ia.append(editBm, delBm);
      a.appendChild(ia);
      card.appendChild(a);
    });

    list.appendChild(card);
  });

  // Add group button
  const addGrp = document.createElement('div');
  addGrp.className = 'add-group-card';
  addGrp.textContent = '+ new group';
  addGrp.onclick = () => addGroup(tab);
  list.appendChild(addGrp);
}

// ── Groups ─────────────────────────────────────
function addGroup(tab) {
  const name = prompt('Group name:');
  if (!name?.trim()) return;
  tab.groups.push({ id: uid(), name: name.trim(), bookmarks: [] });
  save();
  renderBookmarks();
  // Wallpaper stays — renderBookmarks() does NOT touch it
}

function renameGroup(tab, group) {
  const name = prompt('New name:', group.name);
  if (!name?.trim()) return;
  group.name = name.trim();
  save(); renderBookmarks();
}

// ── Bookmark Modal ─────────────────────────────
function openBmModal(groupId, bookmarkId) {
  editingBm = { groupId, bookmarkId };
  const tab    = getActiveTab();
  const catSel = document.getElementById('bm-category');
  catSel.innerHTML = '';
  tab.groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    if (g.id === groupId) opt.selected = true;
    catSel.appendChild(opt);
  });

  if (bookmarkId) {
    document.getElementById('modalTitle').textContent = 'Edit Bookmark';
    const grp = tab.groups.find(g => g.id === groupId);
    const bm  = grp?.bookmarks.find(b => b.id === bookmarkId);
    document.getElementById('bm-name').value = bm?.name || '';
    document.getElementById('bm-url').value  = bm?.url  || '';
  } else {
    document.getElementById('modalTitle').textContent = 'Add Bookmark';
    document.getElementById('bm-name').value = '';
    document.getElementById('bm-url').value  = '';
  }

  document.getElementById('bookmarkModal').classList.add('open');
  document.getElementById('bm-name').focus();
}

function saveBm() {
  const tab  = getActiveTab();
  const name = document.getElementById('bm-name').value.trim();
  let   url  = document.getElementById('bm-url').value.trim();
  const gid  = document.getElementById('bm-category').value;
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  if (editingBm.bookmarkId) {
    const oldGrp = tab.groups.find(g => g.id === editingBm.groupId);
    const bm     = oldGrp?.bookmarks.find(b => b.id === editingBm.bookmarkId);
    if (!bm) return;
    bm.name = name; bm.url = url;
    if (gid !== editingBm.groupId) {
      oldGrp.bookmarks = oldGrp.bookmarks.filter(b => b.id !== bm.id);
      tab.groups.find(g => g.id === gid)?.bookmarks.push(bm);
    }
  } else {
    tab.groups.find(g => g.id === gid)?.bookmarks.push({ id: uid(), name, url });
  }

  save(); renderBookmarks();
  document.getElementById('bookmarkModal').classList.remove('open');
}

document.getElementById('bmModalCancel').onclick = () => document.getElementById('bookmarkModal').classList.remove('open');
document.getElementById('bmModalSave').onclick   = saveBm;
document.getElementById('bm-url').addEventListener('keydown', e => { if (e.key === 'Enter') saveBm(); });
document.getElementById('bookmarkModal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

// ── Tab Modal ──────────────────────────────────
let selectedAccent = '#e63232';

document.getElementById('addTabBtn').onclick = () => {
  selectedAccent = '#e63232';
  document.getElementById('tab-name').value = '';
  buildSwatches();
  document.getElementById('tabModal').classList.add('open');
  document.getElementById('tab-name').focus();
};

function buildSwatches() {
  const c = document.getElementById('colorSwatches');
  c.innerHTML = '';
  ACCENT_COLORS.forEach(col => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (col === selectedAccent ? ' selected' : '');
    sw.style.background = col;
    sw.onclick = () => {
      c.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedAccent = col;
    };
    c.appendChild(sw);
  });
}

document.getElementById('tabModalCancel').onclick = () => document.getElementById('tabModal').classList.remove('open');
document.getElementById('tabModalSave').onclick   = () => {
  const name = document.getElementById('tab-name').value.trim();
  if (!name) return;
  const id = name.toLowerCase().replace(/\s+/g,'_') + '_' + uid();
  state.tabs.push({ id, name, accent: selectedAccent, wallpaper: null, wallpaperFit: '100% 100%', groups: [] });
  state.activeTab = id;
  save(); render();
  document.getElementById('tabModal').classList.remove('open');
};
document.getElementById('tabModal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

function ctxTab(tab) {
  const v = prompt('Rename (or type DELETE to remove):', tab.name);
  if (v === null) return;
  if (v.trim().toUpperCase() === 'DELETE') {
    if (state.tabs.length <= 1) { alert("Can't delete the last tab."); return; }
    state.tabs = state.tabs.filter(t => t.id !== tab.id);
    state.activeTab = state.tabs[0].id;
  } else if (v.trim()) {
    tab.name = v.trim();
  }
  save(); render();
}

// ── Settings Modal ─────────────────────────────
function openSettings() {
  const tab = getActiveTab();
  // Show which tab wallpaper applies to
  document.getElementById('wallpaperTabLabel').textContent = tab ? `(${tab.name} tab)` : '';
  // Sync fit buttons
  const fit = tab?.wallpaperFit || '100% 100%';
  document.querySelectorAll('.fit-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.fit === fit));
  document.getElementById('settingsModal').classList.add('open');
}

document.getElementById('settingsBtn').onclick   = openSettings;
document.getElementById('wallpaperBtn').onclick  = openSettings;
document.getElementById('importBtn').onclick     = openSettings;
document.getElementById('settingsClose').onclick = () => document.getElementById('settingsModal').classList.remove('open');
document.getElementById('settingsModal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

// Wallpaper upload
document.getElementById('wallpaperFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => applyWallpaper(ev.target.result);
  reader.readAsDataURL(file);
  e.target.value = ''; // reset so same file can be re-uploaded
});

// Fit mode
document.getElementById('fitBtns').addEventListener('click', e => {
  const btn = e.target.closest('.fit-btn');
  if (!btn) return;
  const tab = getActiveTab();
  if (!tab) return;
  tab.wallpaperFit = btn.dataset.fit;
  save(); renderWallpaper();
  document.querySelectorAll('.fit-btn').forEach(b => b.classList.toggle('active', b === btn));
});

// Remove wallpaper
document.getElementById('wallpaperClear').onclick = () => {
  const tab = getActiveTab();
  if (!tab) return;
  tab.wallpaper = null;
  save(); renderWallpaper();
};

// Add bookmark
document.getElementById('addBookmarkBtn').onclick = () => {
  document.getElementById('settingsModal').classList.remove('open');
  const tab = getActiveTab();
  if (!tab) return;
  if (tab.groups.length === 0) { tab.groups.push({ id: uid(), name: 'New Group', bookmarks: [] }); save(); renderBookmarks(); }
  openBmModal(tab.groups[0].id, null);
};

// Export
document.getElementById('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chrome-bookmarks.json';
  a.click();
};

// Import
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.tabs && data.activeTab) { state = data; migrateState(); save(); render(); document.getElementById('settingsModal').classList.remove('open'); }
      else alert('Invalid backup file.');
    } catch { alert('Could not read JSON file.'); }
  };
  reader.readAsText(file);
});

// Clear all
document.getElementById('clearAllBtn').onclick = () => {
  if (confirm('Delete all data and start fresh?')) {
    state = structuredClone(DEFAULT_DATA); save(); render();
    document.getElementById('settingsModal').classList.remove('open');
  }
};

// ── Action bar misc ────────────────────────────
document.getElementById('searchBtn').onclick = () => {
  const o = document.getElementById('searchOverlay');
  o.classList.toggle('open');
  if (o.classList.contains('open')) { document.getElementById('searchInput').value = ''; document.getElementById('searchResults').innerHTML = ''; document.getElementById('searchInput').focus(); }
};
document.getElementById('searchClose').onclick = () => document.getElementById('searchOverlay').classList.remove('open');
document.getElementById('searchOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  const res = document.getElementById('searchResults');
  res.innerHTML = '';
  if (!q) return;
  state.tabs.forEach(tab => {
    tab.groups.forEach(group => {
      group.bookmarks.forEach(bm => {
        if (!bm.name.toLowerCase().includes(q) && !bm.url.toLowerCase().includes(q)) return;
        const item = document.createElement('a');
        item.className = 'search-result-item';
        item.href = bm.url; item.target = '_blank'; item.rel = 'noopener';
        const fav = getFavicon(bm.url);
        if (fav) { const img = document.createElement('img'); img.className='bm-favicon'; img.src=fav; img.onerror=()=>img.replaceWith(makePlaceholder(bm.name)); item.appendChild(img); }
        else item.appendChild(makePlaceholder(bm.name));
        const nm = document.createElement('span'); nm.className='sr-name'; nm.textContent=bm.name;
        const ct = document.createElement('span'); ct.className='sr-cat'; ct.textContent=`${tab.name} › ${group.name}`;
        let host=''; try{host=new URL(bm.url).hostname;}catch{}
        const ul = document.createElement('span'); ul.className='sr-url'; ul.textContent=host;
        item.append(nm,ct,ul);
        res.appendChild(item);
      });
    });
  });
  if (!res.children.length) res.innerHTML='<div style="color:rgba(255,255,255,0.3);text-align:center;padding:20px;font-size:13px;">No results</div>';
});

document.getElementById('incognitoBtn').onclick = () => {
  try { if (typeof chrome!=='undefined'&&chrome.windows) chrome.windows.create({incognito:true}); else alert('Press Ctrl+Shift+N'); }
  catch { alert('Press Ctrl+Shift+N'); }
};

document.getElementById('gridBtn').onclick = () => {
  gridMode = !gridMode;
  document.getElementById('gridBtn').classList.toggle('active', gridMode);
  renderBookmarks();
};

document.getElementById('deleteBtn').onclick = () => {
  document.getElementById('deleteBtn').classList.toggle('active');
};

document.getElementById('hideBtn').onclick = () => {
  hiddenMode = !hiddenMode;
  document.getElementById('hideBtn').classList.toggle('active', hiddenMode);
  document.getElementById('blurOverlay').classList.toggle('active', hiddenMode);
  renderBookmarks();
};

// Keyboard
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['searchOverlay','bookmarkModal','tabModal','settingsModal'].forEach(id => document.getElementById(id).classList.remove('open'));
    if (hiddenMode) {
      hiddenMode = false;
      document.getElementById('hideBtn').classList.remove('active');
      document.getElementById('blurOverlay').classList.remove('active');
      renderBookmarks();
    }
  }
  if ((e.ctrlKey||e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchOverlay').classList.toggle('open');
    if (document.getElementById('searchOverlay').classList.contains('open')) document.getElementById('searchInput').focus();
  }
});

// ── Clock ──────────────────────────────────────
function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  document.getElementById('clockTime').textContent    = `${h}:${m}`;
  document.getElementById('clockSeconds').textContent = s;
  document.getElementById('clockDate').textContent    = dateStr;
}

updateClock();
setInterval(updateClock, 1000);

// ── Boot ───────────────────────────────────────
load(() => {
  // Always open on the first tab (Home) on every new tab
  if (state.tabs.length) state.activeTab = state.tabs[0].id;
  document.getElementById('gridBtn').classList.add('active');
  render();
});

// ── Quick Launch Bar ───────────────────────────
const ENGINES = [
  { label: 'G', name: 'Google',     url: 'https://google.com/search?q=' },
  { label: 'B', name: 'Bing',       url: 'https://bing.com/search?q=' },
  { label: 'D', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { label: 'Y', name: 'YouTube',    url: 'https://youtube.com/results?search_query=' },
];
let qlEngineIdx = 0;
let qlActiveIdx = -1;
let qlItems     = [];

const qlInput        = document.getElementById('qlInput');
const qlResults      = document.getElementById('qlResults');
const qlEngineToggle = document.getElementById('qlEngineToggle');
const qlEngineLabel  = document.getElementById('qlEngineLabel');

function qlGetAllBookmarks() {
  const all = [];
  state.tabs.forEach(tab => {
    tab.groups.forEach(group => {
      group.bookmarks.forEach(bm => {
        all.push({ ...bm, tabName: tab.name, groupName: group.name });
      });
    });
  });
  return all;
}

function qlRender(q) {
  qlResults.innerHTML = '';
  qlActiveIdx = -1;
  qlItems = [];

  if (!q.trim()) { qlResults.classList.remove('open'); return; }

  const lower = q.toLowerCase();
  const bookmarks = qlGetAllBookmarks().filter(bm =>
    bm.name.toLowerCase().includes(lower) || bm.url.toLowerCase().includes(lower)
  ).slice(0, 5);

  // Bookmark matches first
  bookmarks.forEach(bm => {
    const domain = (() => { try { return new URL(bm.url).hostname; } catch { return ''; } })();
    const favUrl = FAVICON_OVERRIDES[domain] || getFavicon(bm.url);
    const item = qlMakeItem({
      type: 'bookmark',
      icon: favUrl,
      name: bm.name,
      sub:  bm.url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      tag:  bm.tabName,
      href: bm.url,
    });
    qlResults.appendChild(item);
    qlItems.push(item);
  });

  // Web search option at the bottom
  const engine = ENGINES[qlEngineIdx];
  const searchItem = qlMakeItem({
    type:   'search',
    name:   `Search ${engine.name} for "${q}"`,
    sub:    engine.url + encodeURIComponent(q),
    href:   engine.url + encodeURIComponent(q),
  });
  qlResults.appendChild(searchItem);
  qlItems.push(searchItem);

  qlResults.classList.add('open');
}

function qlMakeItem({ type, icon, name, sub, tag, href }) {
  const a = document.createElement('a');
  a.className = 'ql-result-item';
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';

  // Icon
  if (type === 'search') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','2');
    svg.classList.add('ql-result-icon-search');
    svg.innerHTML = '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>';
    a.appendChild(svg);
  } else if (icon) {
    const img = document.createElement('img');
    img.className = 'ql-result-icon';
    img.src = icon;
    img.onerror = () => img.replaceWith(makePlaceholderSmall(name));
    a.appendChild(img);
  } else {
    a.appendChild(makePlaceholderSmall(name));
  }

  const text = document.createElement('div');
  text.className = 'ql-result-text';
  const nm = document.createElement('span'); nm.className = 'ql-result-name'; nm.textContent = name;
  const sb = document.createElement('span'); sb.className = 'ql-result-sub';  sb.textContent = sub || '';
  text.append(nm, sb);
  a.appendChild(text);

  if (tag) {
    const tg = document.createElement('span'); tg.className = 'ql-result-tag'; tg.textContent = tag;
    a.appendChild(tg);
  }

  a.addEventListener('click', () => {
    qlInput.value = '';
    qlResults.classList.remove('open');
    qlActiveIdx = -1;
  });

  return a;
}

function makePlaceholderSmall(name) {
  const d = document.createElement('div');
  d.className = 'ql-result-icon-placeholder';
  d.textContent = (name || '?')[0].toUpperCase();
  return d;
}

function qlSetActive(idx) {
  qlItems.forEach((el, i) => el.classList.toggle('active', i === idx));
  qlActiveIdx = idx;
}

qlInput.addEventListener('input', e => qlRender(e.target.value));

qlInput.addEventListener('keydown', e => {
  if (!qlItems.length) {
    if (e.key === 'Enter' && qlInput.value.trim()) {
      const engine = ENGINES[qlEngineIdx];
      window.open(engine.url + encodeURIComponent(qlInput.value.trim()), '_blank');
      qlInput.value = '';
      qlResults.classList.remove('open');
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    qlSetActive(Math.min(qlActiveIdx + 1, qlItems.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    qlSetActive(Math.max(qlActiveIdx - 1, 0));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (qlActiveIdx >= 0) { qlItems[qlActiveIdx].click(); }
    else if (qlItems.length) { qlItems[qlItems.length - 1].click(); } // default: web search
  } else if (e.key === 'Escape') {
    qlInput.value = '';
    qlResults.classList.remove('open');
    qlActiveIdx = -1;
  }
});

qlInput.addEventListener('blur', () => {
  setTimeout(() => qlResults.classList.remove('open'), 150);
});

qlInput.addEventListener('focus', () => {
  if (qlInput.value.trim()) qlRender(qlInput.value);
});

// Engine toggle
qlEngineToggle.addEventListener('click', () => {
  qlEngineIdx = (qlEngineIdx + 1) % ENGINES.length;
  qlEngineLabel.textContent = ENGINES[qlEngineIdx].label;
  qlEngineToggle.title = `Switch search engine (${ENGINES[qlEngineIdx].name})`;
  if (qlInput.value.trim()) qlRender(qlInput.value);
});
