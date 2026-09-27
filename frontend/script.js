/* ============================================
   SPEEDDL - COMPLETE JAVASCRIPT
   ============================================ */

const API_URL = 'https://scrapenest-backend.onrender.com';

const themeToggle = document.getElementById('themeToggle');
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const pasteBtn = document.getElementById('pasteBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');
const loadingSection = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultsSection = document.getElementById('results');
const resultContent = document.getElementById('resultContent');
const homeContent = document.getElementById('homeContent');

let globalProfileData = null;

/* ---------- Theme (respects system preference) ---------- */
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  });
}

/* ---------- Tab Parameter Handler ---------- */
(function handleTabParameter() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (!tab) return;

  const tabMap = {
    'video':    { type: 'Video',    placeholder: 'Paste Instagram video link here...' },
    'photo':    { type: 'Photo',    placeholder: 'Paste Instagram photo link here...' },
    'reels':    { type: 'Reels',    placeholder: 'Paste Instagram Reels link here...' },
    'story':    { type: 'Story',    placeholder: 'Paste Instagram Story link here...' },
    'igtv':     { type: 'IGTV',     placeholder: 'Paste Instagram IGTV link here...' },
    'carousel': { type: 'Carousel', placeholder: 'Paste Instagram carousel link here...' },
    'viewer':   { type: 'Viewer',   placeholder: 'Paste Instagram profile URL or @username here...' }
  };

  const config = tabMap[tab.toLowerCase()];
  if (!config) return;

  if (urlInput) {
    urlInput.placeholder = config.placeholder;
    urlInput.focus();
  }

  document.querySelectorAll('.cat-btn').forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text === tab.toLowerCase()) {
      btn.classList.add('active');
    }
  });

  setTimeout(() => {
    const inputBox = document.querySelector('.input-box');
    if (inputBox) {
      inputBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 300);
})();

/* ---------- Paste Button ---------- */
if (pasteBtn) {
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        urlInput.focus();
      }
    } catch (err) {
      alert('Please paste manually (clipboard access denied)');
    }
  });
}

/* ---------- Clear Button ---------- */
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    urlInput.focus();
    status.textContent = '';
    clearBtn.classList.add('hidden');
    pasteBtn.classList.remove('hidden');
  });
}

/* ---------- Download Button ---------- */
if (downloadBtn) {
  downloadBtn.addEventListener('click', handleDownload);
  urlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleDownload();
  });
}

/* ---------- Handle Download ---------- */
async function handleDownload() {
  const url = urlInput.value.trim();

  if (!url) {
    status.textContent = 'Please paste an Instagram link or username';
    return;
  }

  const isValid = url.includes('instagram.com') || /^@?[\w.]{1,30}$/.test(url);
  if (!isValid) {
    status.textContent = 'Please enter a valid Instagram URL or @username';
    return;
  }

  showLoading();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_URL}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch media');
    }

    if (!data.medias && !data.isProfile) {
      throw new Error('No media found');
    }

    showResult(data);

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      showError('Request timed out. Please try again.');
    } else {
      showError(err.message);
    }
  }
}

/* ---------- Show Loading ---------- */
function showLoading() {
  if (homeContent) homeContent.classList.add('hidden');
  if (resultsSection) resultsSection.classList.add('hidden');
  if (loadingSection) loadingSection.classList.remove('hidden');

  downloadBtn.disabled = true;
  if (pasteBtn) pasteBtn.classList.add('hidden');
  if (clearBtn) clearBtn.classList.remove('hidden');
  status.textContent = '';
  if (loadingText) loadingText.textContent = '';

  const url = urlInput.value.toLowerCase();
  let mediaType = 'media';
  if (url.includes('/reel/') || url.includes('/reels/')) mediaType = 'Reel';
  else if (url.includes('/p/')) mediaType = 'Post / Photo';
  else if (url.includes('/tv/')) mediaType = 'IGTV Video';
  else if (url.includes('/stories/')) mediaType = 'Story';
  else mediaType = 'Profile / Stories';

  if (loadingText) {
    loadingText.textContent = `We are fetching the ${mediaType}. Please wait :)`;
  }

  setTimeout(() => {
    if (loadingSection) {
      loadingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

/* ---------- Show Result ---------- */
function showResult(data) {
  if (loadingSection) loadingSection.classList.add('hidden');

  if (data.isProfile) {
    globalProfileData = data;
    renderProfileView(data);
  } else {
    renderMediaView(data);
  }

  if (resultsSection) resultsSection.classList.remove('hidden');
  downloadBtn.disabled = false;

  setTimeout(() => {
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

/* ---------- Render Media View ---------- */
function renderMediaView(data) {
  const medias = data.medias || [];
  let html = '';

  medias.forEach((media, index) => {
    const isVideo = media.type === 'video';
    const downloadUrl = media.url;
    const previewImg = media.thumbnail || downloadUrl;
    const cardId = `media-preview-${index}`;

    html += `
      <div style="max-width:440px; margin:10px auto 24px; background:var(--card-bg, #ffffff); border-radius:16px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08);">
        <div id="${cardId}" style="position:relative; width:100%; aspect-ratio:4/5; background:#000; overflow:hidden;">
          <img src="${escapeHtml(previewImg)}" alt="Preview" style="width:100%; height:100%; object-fit:cover; display:block;">
          <div style="position:absolute; top:10px; right:10px; display:flex; gap:6px; color:white; font-size:0.95rem; text-shadow:0 1px 4px rgba(0,0,0,0.8); z-index:2;">
            ${isVideo ? '<span>▶</span>' : ''}
            <span>⛶</span>
          </div>
          ${isVideo ? `
            <div onclick="playLiveVideo('${cardId}', '${escapeHtml(downloadUrl)}')" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; cursor:pointer; background:rgba(0,0,0,0.15); z-index:1;">
              <div style="width:56px; height:56px; background:rgba(255,255,255,0.9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:#0284c7; padding-left:4px; box-shadow:0 4px 15px rgba(0,0,0,0.25);">▶</div>
            </div>
          ` : ''}
        </div>

        <div style="padding:14px 16px 12px;">
          <a href="${escapeHtml(downloadUrl)}" download class="result-download-btn" style="display:block; text-align:center; background:#EF4444; color:white; padding:12px 16px; border-radius:10px; font-weight:700; text-decoration:none; font-size:0.95rem;">
            Download
          </a>
        </div>

        ${data.title ? `
          <div style="margin:0 16px 16px; padding:12px; background:rgba(0,0,0,0.03); border-radius:10px; border:1px solid rgba(0,0,0,0.05); font-size:0.84rem; color:var(--text, #334155); font-weight:600; line-height:1.5; white-space:pre-wrap;">${escapeHtml(data.title)}</div>
        ` : ''}
      </div>
    `;
  });

  if (resultContent) resultContent.innerHTML = html;
}

/* ---------- Play Live Video ---------- */
window.playLiveVideo = function(containerId, videoUrl) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <video src="${videoUrl}" controls autoplay playsinline style="width:100%; height:100%; object-fit:contain; background:#000;"></video>
  `;
};
/* ---------- Render Profile View ---------- */
function renderProfileView(data) {
  const postsCount = (data.posts || []).length;
  const storiesCount = (data.stories || []).length;
  const highlightsCount = (data.highlights || []).length;
  const reelsCount = (data.reels || []).length;

  let html = `
    <div style="max-width:540px; margin:0 auto 20px;">
      <div style="display:flex; align-items:flex-start; gap:18px; margin-bottom:14px; text-align:left;">
        <div style="position:relative; width:82px; height:82px; flex-shrink:0;">
          <img src="${escapeHtml(data.avatar)}" alt="Avatar" style="width:82px; height:82px; border-radius:50%; object-fit:cover; border:3px solid #38bdf8; display:block; background:#1e293b;">
          <div style="position:absolute; bottom:0; right:0; background:#0284c7; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:0.75rem; border:2px solid #fff;">⛶</div>
        </div>
        <div style="flex:1;">
          <div style="font-size:1.1rem; font-weight:700; color:var(--text, #0f172a); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <span>@${escapeHtml(data.username)}</span>
            <a href="https://www.instagram.com/${escapeHtml(data.username)}/" target="_blank" rel="noopener noreferrer" style="color:#0284c7; text-decoration:none; font-size:0.9rem;">↗</a>
          </div>
          <div style="display:flex; gap:18px; margin-bottom:8px; font-size:0.85rem; color:#64748b;">
            <div><b style="color:var(--text, #0f172a); font-size:0.95rem;">${postsCount}</b> posts</div>
            <div><b style="color:var(--text, #0f172a); font-size:0.95rem;">${escapeHtml(data.followers || '0')}</b> followers</div>
            <div><b style="color:var(--text, #0f172a); font-size:0.95rem;">${escapeHtml(data.following || '0')}</b> following</div>
          </div>
          <div style="font-size:0.92rem; font-weight:700; color:var(--text, #0f172a); margin-bottom:4px;">${escapeHtml(data.fullName || '')}</div>
          ${data.bio ? `<div style="font-size:0.8rem; color:#475569; white-space:pre-wrap; line-height:1.4;">${escapeHtml(data.bio)}</div>` : ''}
        </div>
      </div>

      <div style="display:flex; border-bottom:1px solid rgba(0,0,0,0.1); margin:18px 0 16px;">
        <div class="profile-tab" data-tab="posts" style="flex:1; text-align:center; padding:10px 4px; font-size:0.78rem; font-weight:700; color:#0284c7; border-bottom:2px solid #0284c7; text-transform:uppercase; cursor:pointer;">POSTS (${postsCount})</div>
        <div class="profile-tab" data-tab="stories" style="flex:1; text-align:center; padding:10px 4px; font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; cursor:pointer;">STORIES (${storiesCount})</div>
        <div class="profile-tab" data-tab="highlights" style="flex:1; text-align:center; padding:10px 4px; font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; cursor:pointer;">HIGHLIGHTS (${highlightsCount})</div>
        <div class="profile-tab" data-tab="reels" style="flex:1; text-align:center; padding:10px 4px; font-size:0.78rem; font-weight:700; color:#64748b; text-transform:uppercase; cursor:pointer;">REELS (${reelsCount})</div>
      </div>

      <div id="profileTabContent"></div>
    </div>
  `;

  if (resultContent) resultContent.innerHTML = html;

  if (resultContent) {
    resultContent.querySelectorAll('.profile-tab').forEach(tabEl => {
      tabEl.addEventListener('click', () => {
        switchActiveTab(tabEl.dataset.tab);
      });
    });
  }

  if (postsCount > 0) switchActiveTab('posts');
  else if (storiesCount > 0) switchActiveTab('stories');
  else if (highlightsCount > 0) switchActiveTab('highlights');
  else if (reelsCount > 0) switchActiveTab('reels');
}

/* ---------- Switch Active Tab ---------- */
function switchActiveTab(tab) {
  const data = globalProfileData;
  if (!data) return;

  document.querySelectorAll('.profile-tab').forEach(tabEl => {
    if (tabEl.dataset.tab === tab) {
      tabEl.style.color = '#0284c7';
      tabEl.style.borderBottom = '2px solid #0284c7';
    } else {
      tabEl.style.color = '#64748b';
      tabEl.style.borderBottom = 'none';
    }
  });

  const content = document.getElementById('profileTabContent');
  if (!content) return;

  /* ---------- Posts ---------- */
  if (tab === 'posts') {
    const posts = data.posts || [];
    if (posts.length === 0) {
      content.innerHTML = `<p style="color:#64748b; font-size:0.85rem; padding:20px 0; text-align:center;">No feed posts found.</p>`;
      return;
    }
    let html = `<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">`;
    posts.forEach((item) => {
      const isVid = item.type === 'video';
      html += `
        <div style="background:var(--card-bg, #ffffff); border-radius:12px; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08); display:flex; flex-direction:column;">
          <div style="position:relative; width:100%; aspect-ratio:1/1; background:#000;">
            <img src="${escapeHtml(item.thumbnail)}" alt="Post" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position:absolute; top:6px; right:6px; color:white; font-size:0.8rem; text-shadow:0 1px 3px rgba(0,0,0,0.8);">${isVid ? '▶' : '⛶'}</div>
          </div>
          <div style="padding:8px 10px; display:flex; flex-direction:column; justify-content:space-between; flex:1;">
            <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px;">❤️ ${(item.likes || 0).toLocaleString()} &bull; 💬 ${item.comments || 0}</div>
            <a href="${escapeHtml(item.url)}" download class="result-download-btn" style="background:#EF4444; color:white; padding:7px 4px; border-radius:6px; font-size:0.78rem; font-weight:700; text-align:center; text-decoration:none; display:block;">Download</a>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    content.innerHTML = html;
  }

  /* ---------- Reels ---------- */
  else if (tab === 'reels') {
    const reels = data.reels || [];
    if (reels.length === 0) {
      content.innerHTML = `<p style="color:#64748b; font-size:0.85rem; padding:20px 0; text-align:center;">No reels found.</p>`;
      return;
    }
    let html = `<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">`;
    reels.forEach((item) => {
      html += `
        <div style="background:var(--card-bg, #ffffff); border-radius:12px; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08); display:flex; flex-direction:column;">
          <div style="position:relative; width:100%; aspect-ratio:9/16; background:#000;">
            <img src="${escapeHtml(item.thumbnail)}" alt="Reel" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position:absolute; top:6px; right:6px; color:white; font-size:0.85rem; text-shadow:0 1px 3px rgba(0,0,0,0.8);">▶</div>
          </div>
          <div style="padding:8px 10px; display:flex; flex-direction:column; justify-content:space-between; flex:1;">
            <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px;">❤️ ${(item.likes || 0).toLocaleString()} &bull; 💬 ${item.comments || 0}</div>
            <a href="${escapeHtml(item.url)}" download class="result-download-btn" style="background:#EF4444; color:white; padding:7px 4px; border-radius:6px; font-size:0.78rem; font-weight:700; text-align:center; text-decoration:none; display:block;">Download Reel</a>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    content.innerHTML = html;
  }

  /* ---------- Stories ---------- */
  else if (tab === 'stories') {
    const stories = data.stories || [];
    if (stories.length === 0) {
      content.innerHTML = `<p style="color:#64748b; font-size:0.85rem; padding:20px 0; text-align:center;">No active stories in the last 24 hours.</p>`;
      return;
    }
    let sHtml = `<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">`;
    stories.forEach((s) => {
      sHtml += `
        <div style="background:var(--card-bg, #ffffff); border-radius:12px; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08); display:flex; flex-direction:column;">
          <div style="position:relative; width:100%; aspect-ratio:9/16; background:#000;">
            <img src="${escapeHtml(s.thumbnail || s.url)}" alt="Story" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position:absolute; top:6px; right:6px; color:white; font-size:0.8rem; text-shadow:0 1px 3px rgba(0,0,0,0.8);">${s.type === 'video' ? '▶' : '⛶'}</div>
          </div>
          <div style="padding:8px;">
            <a href="${escapeHtml(s.url)}" download class="result-download-btn" style="background:#EF4444; color:white; padding:8px 4px; border-radius:6px; font-size:0.78rem; font-weight:700; text-align:center; text-decoration:none; display:block;">Download Story</a>
          </div>
        </div>
      `;
    });
    sHtml += `</div>`;
    content.innerHTML = sHtml;
  }

  /* ---------- Highlights ---------- */
  else if (tab === 'highlights') {
    const hls = data.highlights || [];
    if (hls.length === 0) {
      content.innerHTML = `<p style="color:#64748b; font-size:0.85rem; padding:20px 0; text-align:center;">No highlights found.</p>`;
      return;
    }
    let hHtml = `<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; text-align:center;">`;
    hls.forEach(h => {
      hHtml += `
        <div class="highlight-card" data-id="${escapeHtml(h.id)}" data-title="${escapeHtml(h.title)}" style="background:var(--card-bg, #ffffff); border:1px solid rgba(0,0,0,0.08); border-radius:12px; padding:10px 4px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <img src="${escapeHtml(h.cover)}" alt="Highlight" loading="lazy" style="width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #0284c7; margin-bottom:6px; display:inline-block; background:#f1f5f9;">
          <div style="font-size:0.75rem; font-weight:600; color:var(--text, #0f172a); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px;">${escapeHtml(h.title)}</div>
          <span style="font-size:0.68rem; color:#0284c7; font-weight:700;">Open Folder ➔</span>
        </div>
      `;
    });
    hHtml += `</div><div id="albumViewer" style="margin-top:20px;"></div>`;
    content.innerHTML = hHtml;

    content.querySelectorAll('.highlight-card').forEach(card => {
      card.addEventListener('click', () => {
        openHighlightAlbum(card.dataset.id, card.dataset.title);
      });
    });
  }
}

/* ---------- Open Highlight Album ---------- */
async function openHighlightAlbum(id, title) {
  const viewer = document.getElementById('albumViewer');
  if (!viewer) return;

  viewer.innerHTML = `<p style="color:#0284c7; font-size:0.85rem; padding:14px 0; text-align:center;">Loading "${escapeHtml(title)}" items...</p>`;
  viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const res = await fetch(`${API_URL}/api/highlight/${encodeURIComponent(id)}`);
    const json = await res.json();

    if (!json.success || !json.items || json.items.length === 0) {
      throw new Error('No items found in this highlight');
    }

    let aHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 4px;">
        <span style="font-size:0.9rem; font-weight:700; color:var(--text, #0f172a);">${escapeHtml(title)} (${json.items.length} items)</span>
        <button id="closeAlbumBtn" style="background:#e2e8f0; border:none; border-radius:6px; padding:4px 8px; font-size:0.75rem; cursor:pointer; font-weight:600;">✕ Close</button>
      </div>
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
    `;

    json.items.forEach((item, idx) => {
      aHtml += `
        <div style="background:var(--card-bg, #ffffff); border-radius:12px; overflow:hidden; box-shadow:0 3px 12px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08); display:flex; flex-direction:column;">
          <div style="position:relative; width:100%; aspect-ratio:9/16; background:#000;">
            <img src="${escapeHtml(item.thumbnail || item.url)}" alt="Item" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;">
            <div style="position:absolute; top:6px; right:6px; color:white; font-size:0.8rem; text-shadow:0 1px 3px rgba(0,0,0,0.8);">${item.type === 'video' ? '▶' : '⛶'}</div>
          </div>
          <div style="padding:8px;">
            <a href="${escapeHtml(item.url)}" download class="result-download-btn" style="background:#EF4444; color:white; padding:8px 4px; border-radius:6px; font-size:0.78rem; font-weight:700; text-align:center; text-decoration:none; display:block;">Download Item ${idx + 1}</a>
          </div>
        </div>
      `;
    });
    aHtml += `</div>`;
    viewer.innerHTML = aHtml;

    const closeBtn = document.getElementById('closeAlbumBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        viewer.innerHTML = '';
      });
    }

  } catch (err) {
    viewer.innerHTML = `<p style="color:#ef4444; font-size:0.85rem; text-align:center;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

/* ---------- Show Error ---------- */
function showError(message) {
  if (loadingSection) loadingSection.classList.add('hidden');
  if (homeContent) homeContent.classList.remove('hidden');
  if (loadingText) loadingText.textContent = '';

  status.textContent = 'Error: ' + message;
  downloadBtn.disabled = false;

  const inputBox = document.querySelector('.input-box');
  if (inputBox) {
    inputBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/* ---------- Escape HTML ---------- */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/* ---------- Lazy Loading ---------- */
(function initLazyLoading() {
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img:not([loading])').forEach(img => {
      if (!img.closest('header') && !img.classList.contains('hero-logo')) {
        img.loading = 'lazy';
        img.decoding = 'async';
      }
    });
  }
})();

/* ---------- Set Year ---------- */
(function setYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* ---------- Back to Top ---------- */
(function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ---------- About Page Animations ---------- */
(function initAboutAnimations() {
  function animateCount(el, target, duration = 1800) {
    const isDecimal = target % 1 !== 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = isDecimal ? target.toFixed(1) : target;
      }
    }

    requestAnimationFrame(update);
  }

  const statsRow = document.querySelector('.stats-row');
  if (statsRow) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.stats-row .stat-item').forEach((item, i) => {
            setTimeout(() => item.classList.add('visible'), i * 150);
          });
          document.querySelectorAll('.stats-row .count-up').forEach((el, i) => {
            const target = parseFloat(el.closest('.stat-item').dataset.count);
            setTimeout(() => animateCount(el, target), i * 150);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(statsRow);
  }

  const slider = document.getElementById('reviewsSlider');
  const dots = document.querySelectorAll('.slider-dots .dot');
  if (slider && dots.length) {
    slider.addEventListener('scroll', () => {
      const cardWidth = slider.querySelector('.review-card')?.offsetWidth + 20 || 340;
      const activeIndex = Math.round(slider.scrollLeft / cardWidth);
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeIndex);
      });
    }, { passive: true });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        const cardWidth = slider.querySelector('.review-card')?.offsetWidth + 20 || 340;
        slider.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
      });
    });
  }
})();

/* ============================================
   GOOGLE TRANSLATE — Auto Init
   ============================================ */
(function initGoogleTranslate() {
  const el = document.getElementById('google_translate_element');
  if (!el) return;

  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'en,hi,bn,ta,te,mr,gu,kn,ml,pa,ur,ar,es,fr,de,it,pt,ru,ja,ko,zh-CN,id,ms,th,tr,vi,nl,pl,fa',
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
      autoDisplay: false
    }, 'google_translate_element');
  };

  const script = document.createElement('script');
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.body.appendChild(script);
})();
