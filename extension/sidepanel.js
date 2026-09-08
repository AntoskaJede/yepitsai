// YepIts.ai Side Panel — YouTube Summarizer

const API_BASE = 'https://yepits.ai';
const TOKEN_KEY = 'yepits_token';
const USER_KEY = 'yepits_user';

let token = null;
let userEmail = null;
let userPlan = 'free';
let isLoginMode = true;

// ============================================================
// DOM refs
// ============================================================
const authView = document.getElementById('authView');
const summaryView = document.getElementById('summaryView');
const settingsView = document.getElementById('settingsView');
const authFormView = document.getElementById('authFormView');
const forgotView = document.getElementById('forgotView');

const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authSubmit = document.getElementById('authSubmit');
const switchMode = document.getElementById('switchMode');
const showForgot = document.getElementById('showForgot');
const logoutBtn = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');

const summarizeBtn = document.getElementById('summarizeBtn');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorText = document.getElementById('errorText');
const retryBtn = document.getElementById('retryBtn');
const proState = document.getElementById('proState');
const proDuration = document.getElementById('proDuration');
const resultState = document.getElementById('resultState');
const summaryText = document.getElementById('summaryText');
const takeawaysSection = document.getElementById('takeawaysSection');
const takeawaysList = document.getElementById('takeawaysList');
const timestampsSection = document.getElementById('timestampsSection');
const timestampsList = document.getElementById('timestampsList');
const remainingBadge = document.getElementById('remainingBadge');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resummarizeBtn = document.getElementById('resummarizeBtn');
const videoInfo = document.getElementById('videoInfo');
const videoTitle = document.getElementById('videoTitle');
const videoChannel = document.getElementById('videoChannel');
const usageInfo = document.getElementById('usageInfo');
const signinBtn = document.getElementById('signinBtn');
const limitState = document.getElementById('limitState');
const shareBtn = document.getElementById('shareBtn');

let currentVideoUrl = null;
let currentPublicUrl = null;

// Only send Authorization when we actually have a token. Anonymous users
// get the same 3 free summaries a day as on the website (IP-based).
function authHeaders(extra = {}) {
  return token ? { ...extra, 'Authorization': `Bearer ${token}` } : extra;
}

// Usage text + bar, from either /api/usage or a summarize response.
function applyUsage(data) {
  if (!data) return;
  if (data.plan) userPlan = data.plan;
  const usageBar = document.getElementById('usageBar');
  const usageBarFill = document.getElementById('usageBarFill');
  const usageBarText = document.getElementById('usageBarText');
  const usageUpgrade = document.getElementById('usageUpgrade');
  if (userPlan === 'pro') {
    usageInfo.textContent = 'Pro plan - Unlimited summaries';
    if (usageBar) usageBar.style.display = 'none';
    if (usageBarText) usageBarText.textContent = 'Pro - Unlimited';
    if (usageUpgrade) usageUpgrade.style.display = 'none';
    return;
  }
  if (data.remaining === undefined || !data.limit) return;
  usageInfo.textContent = `${data.remaining}/${data.limit} free summaries remaining today${token ? '' : ' - no account needed'}`;
  if (usageBar) {
    usageBar.style.display = '';
    if (usageBarFill) {
      usageBarFill.style.width = ((data.remaining / data.limit) * 100) + '%';
      usageBarFill.style.background = data.remaining === 0 ? '#ef4444' : data.remaining === 1 ? '#f59e0b' : '#FF4F00';
    }
  }
  if (usageBarText) usageBarText.textContent = `${data.remaining} of ${data.limit} remaining`;
  if (usageUpgrade) usageUpgrade.style.display = data.remaining <= 1 ? '' : 'none';
}

// ============================================================
// Init — auto-login from storage
// ============================================================
chrome.storage.local.get([TOKEN_KEY, USER_KEY, 'yepits_history'], (data) => {
  if (data[TOKEN_KEY]) {
    token = data[TOKEN_KEY];
    userEmail = data[USER_KEY] || null;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (res.ok) {
        showSummaryView();
        checkCurrentTab();
        fetchUsage().then(d => { if (d) userPlan = d.plan || 'free'; });
        renderHistory(data.yepits_history || []);
      } else {
        clearSession();
        showAuthView();
      }
    }).catch(() => {
      showSummaryView();
      checkCurrentTab();
    });
  } else {
    // No account: go straight to the summarizer. Sign-in is one tap away.
    showSummaryView();
    checkCurrentTab();
    renderHistory(data.yepits_history || []);
    usageInfo.textContent = '3 free summaries a day - no account needed';
  }
});

signinBtn.addEventListener('click', () => { isLoginMode = true; showAuthView(); });
document.getElementById('skipAuth').addEventListener('click', (e) => { e.preventDefault(); showSummaryView(); checkCurrentTab(); });
document.getElementById('limitSignin').addEventListener('click', () => { isLoginMode = true; showAuthView(); });

// Listen for tab changes
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TAB_UPDATED' || msg.type === 'TAB_ACTIVATED') {
    currentVideoUrl = msg.url;
    updateVideoInfo();
  }
  if (msg.type === 'AUTO_SUMMARIZE') {
    currentVideoUrl = msg.url;
    if (resultState.style.display === 'none' && loadingState.style.display === 'none') {
      summarizeCurrentVideo();
    }
  }
});

// ============================================================
// Auth
// ============================================================
switchMode.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    authTitle.textContent = 'Welcome back';
    authSubtitle.textContent = 'Sign in to summarize YouTube videos';
    authSubmit.textContent = 'Sign In';
    switchMode.textContent = 'No account? Sign up free';
  } else {
    authTitle.textContent = 'Create account';
    authSubtitle.textContent = 'Start summarizing videos in seconds';
    authSubmit.textContent = 'Sign Up';
    switchMode.textContent = 'Already have an account? Sign in';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  authSubmit.disabled = true;
  authSubmit.textContent = 'Please wait...';

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isLoginMode ? { email, password } : { email, password, acceptTerms: true }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    token = data.token;
    userEmail = email;
    chrome.storage.local.set({ [TOKEN_KEY]: token, [USER_KEY]: email });

    showSummaryView();
    checkCurrentTab();
    fetchUsage();
  } catch (err) {
    const authError = document.getElementById('authError');
    document.getElementById('authErrorText').textContent = err.message;
    authError.style.display = '';
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
  }
});

// Show forgot password
showForgot.addEventListener('click', (e) => {
  e.preventDefault();
  authFormView.style.display = 'none';
  forgotView.style.display = '';
  // Pre-fill email if already entered
  const emailVal = document.getElementById('emailInput').value.trim();
  if (emailVal) document.getElementById('forgotEmail').value = emailVal;
});

// Back from forgot
document.getElementById('backFromForgot').addEventListener('click', () => {
  forgotView.style.display = 'none';
  authFormView.style.display = '';
  document.getElementById('forgotSuccess').style.display = 'none';
  document.getElementById('forgotForm').style.display = '';
  // Clear auth error
  document.getElementById('authError').style.display = 'none';
});

// Submit forgot password
document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const btn = document.getElementById('forgotSubmit');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    document.getElementById('forgotSuccess').style.display = '';
    document.getElementById('forgotForm').style.display = 'none';
  } catch {
    document.getElementById('forgotSuccess').style.display = '';
    document.getElementById('forgotForm').style.display = 'none';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send reset link';
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  clearSession();
  userPlan = 'free';
  showSummaryView();
  checkCurrentTab();
  usageInfo.textContent = '3 free summaries a day - no account needed';
});

// Settings
settingsBtn.addEventListener('click', () => {
  showSettingsView();
  loadSettings();
});

document.getElementById('backFromSettings').addEventListener('click', () => {
  settingsView.style.display = 'none';
  summaryView.style.display = '';
});

// Upgrade to Pro — opens Stripe checkout
async function upgradeToPro() {
  if (!token) {
    showAuthView();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (data.url) {
      chrome.tabs.create({ url: data.url });
    } else {
      alert('Could not start checkout. Please try again or contact pava@yepits.ai');
    }
  } catch {
    alert('Could not start checkout. Please try again or contact pava@yepits.ai');
  }
}

// Wire up all upgrade buttons in the extension
document.querySelectorAll('.upgrade-btn, #upgradeBtn, #usageUpgrade, [data-upgrade]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    upgradeToPro();
  });
});

// Pro required state upgrade button
const proUpgradeBtn = document.querySelector('.pro-state .primary-btn, #proState .primary-btn');
if (proUpgradeBtn) {
  proUpgradeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    upgradeToPro();
  });
}

// Delete account
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
  if (!confirm('Are you sure? This permanently deletes your account and all data. This cannot be undone.')) return;

  try {
    await fetch(`${API_BASE}/api/auth/delete`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    clearSession();
    showAuthView();
    alert('Your account has been deleted.');
  } catch {
    alert('Could not delete account. Please contact pava@yepits.ai');
  }
});

// ============================================================
// Summarize
// ============================================================
summarizeBtn.addEventListener('click', summarizeCurrentVideo);
retryBtn.addEventListener('click', summarizeCurrentVideo);

resummarizeBtn.addEventListener('click', () => {
  resultState.style.display = 'none';
  errorState.style.display = 'none';
  limitState.style.display = 'none';
  proState.style.display = 'none';
  summarizeBtn.style.display = '';
  videoInfo.style.display = 'none';
});

shareBtn.addEventListener('click', async () => {
  if (!currentPublicUrl) return;
  try { await navigator.clipboard.writeText(currentPublicUrl); shareBtn.textContent = 'Link copied'; }
  catch { chrome.tabs.create({ url: currentPublicUrl }); }
  setTimeout(() => shareBtn.textContent = 'Share', 2000);
});

copyBtn.addEventListener('click', () => {
  const parts = [];
  if (videoTitle.textContent) parts.push(videoTitle.textContent);
  if (videoChannel.textContent) parts.push('By ' + videoChannel.textContent);
  parts.push('', 'SUMMARY', summaryText.innerText);
  if (takeawaysSection.style.display !== 'none') {
    parts.push('', 'KEY TAKEAWAYS');
    document.querySelectorAll('#takeawaysList li').forEach(li => parts.push('- ' + li.textContent));
  }
  if (timestampsSection.style.display !== 'none') {
    parts.push('', 'KEY MOMENTS');
    document.querySelectorAll('.timestamp-item').forEach(item => {
      parts.push(item.querySelector('.timestamp-time').textContent + ' - ' + item.querySelector('.timestamp-text').textContent);
    });
  }
  parts.push('', 'Summarized with YepIts.ai');
  navigator.clipboard.writeText(parts.join('\n'));
  copyBtn.textContent = 'Copied!';
  setTimeout(() => copyBtn.textContent = 'Copy', 2000);
});

downloadBtn.addEventListener('click', () => {
  const parts = ['# ' + (videoTitle.textContent || 'Summary')];
  if (videoChannel.textContent) parts.push('*By ' + videoChannel.textContent + '*\n');
  parts.push('## Summary\n', summaryText.innerText);
  if (takeawaysSection.style.display !== 'none') {
    parts.push('\n## Key Takeaways\n');
    document.querySelectorAll('#takeawaysList li').forEach((li, i) => parts.push(`${i + 1}. ${li.textContent}`));
  }
  if (timestampsSection.style.display !== 'none') {
    parts.push('\n## Key Moments\n');
    document.querySelectorAll('.timestamp-item').forEach(item => {
      parts.push(`- **${item.querySelector('.timestamp-time').textContent}** - ${item.querySelector('.timestamp-text').textContent}`);
    });
  }
  parts.push('\n---\n*Summarized with [YepIts.ai](https://yepits.ai)*');
  const blob = new Blob([parts.join('\n')], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'summary.md';
  a.click();
  URL.revokeObjectURL(a.href);
  downloadBtn.textContent = 'Saved!';
  setTimeout(() => downloadBtn.textContent = 'Save', 2000);
});

async function summarizeCurrentVideo() {
  if (!currentVideoUrl) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
      currentVideoUrl = tab.url;
    } else {
      showError('Open a YouTube video first, then click summarize.');
      return;
    }
  }

  summarizeBtn.style.display = 'none';
  errorState.style.display = 'none';
  proState.style.display = 'none';
  limitState.style.display = 'none';
  resultState.style.display = 'none';
  loadingState.style.display = '';

  // Reset progress steps
  document.querySelectorAll('.progress-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');

  // Animate progress steps
  const steps = ['step1', 'step2', 'step3'];
  steps.forEach((id, i) => {
    setTimeout(() => {
      if (loadingState.style.display === 'none') return;
      const step = document.getElementById(id);
      if (step) {
        steps.slice(0, i + 1).forEach(s => {
          const el = document.getElementById(s);
          if (el) el.classList.add('active');
        });
      }
    }, i * 2500);
  });

  try {
    const res = await fetch(`${API_BASE}/api/summarize`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ url: currentVideoUrl }),
    });

    if (res.status === 401 && token) {
      clearSession();
      showAuthView();
      return;
    }

    const data = await res.json();
    if (res.status === 402 && data.limitReached) {
      loadingState.style.display = 'none';
      limitState.style.display = '';
      document.getElementById('limitSignin').style.display = token ? 'none' : '';
      document.getElementById('limitText').textContent = token
        ? 'Free accounts get 3 summaries a day. Pro is unlimited, any video length.'
        : 'Everyone gets 3 free summaries a day. Sign in to keep your history, or go Pro for unlimited.';
      applyUsage({ remaining: 0, limit: 3 });
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Failed to summarize');

    if (data.proRequired) {
      loadingState.style.display = 'none';
      proState.style.display = '';
      proDuration.textContent = data.duration;
      // Show video info even on Pro required
      if (data.title) {
        videoInfo.style.display = '';
        videoTitle.textContent = data.title;
        videoChannel.textContent = data.channel || '';
        const thumbImg = document.getElementById('videoThumbImg');
        if (data.videoId) {
          thumbImg.src = `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`;
          document.getElementById('videoThumb').style.display = '';
        }
      }
      return;
    }

    // Show results
    loadingState.style.display = 'none';
    resultState.style.display = '';

    if (data.title) {
      videoInfo.style.display = '';
      videoTitle.textContent = data.title;
      videoChannel.textContent = data.channel || '';
      const thumbImg = document.getElementById('videoThumbImg');
      if (data.videoId) {
        thumbImg.src = `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`;
        thumbImg.onerror = () => { document.getElementById('videoThumb').style.display = 'none'; };
        document.getElementById('videoThumb').style.display = '';
      }
    }

    summaryText.innerHTML = formatText(data.summary);

    if (data.takeaways && data.takeaways.length) {
      takeawaysSection.style.display = '';
      takeawaysList.innerHTML = data.takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('');
    } else {
      takeawaysSection.style.display = 'none';
    }

    if (data.timestamps && data.timestamps.length) {
      timestampsSection.style.display = '';
      timestampsList.innerHTML = data.timestamps.map(t =>
        `<div class="timestamp-item" data-time="${parseTimestamp(t.time)}">
          <span class="timestamp-time">${t.time}</span>
          <span class="timestamp-text">${escapeHtml(t.label)}</span>
        </div>`
      ).join('');

      document.querySelectorAll('.timestamp-item').forEach(item => {
        item.addEventListener('click', async () => {
          const seconds = parseFloat(item.dataset.time);
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (s) => { const v = document.querySelector('video'); if (v) v.currentTime = s; },
              args: [seconds],
            });
          }
        });
      });
    } else {
      timestampsSection.style.display = 'none';
    }

    remainingBadge.textContent = userPlan === 'pro' ? 'Pro' : (data.remaining !== undefined ? `${data.remaining}/${data.limit} left` : '');
    if (userPlan === 'pro') {
      remainingBadge.style.background = '#dcfce7';
      remainingBadge.style.color = '#16a34a';
    } else if (data.remaining !== undefined) {
      remainingBadge.style.background = data.remaining === 0 ? '#fef2f2' : '#FFE8DD';
      remainingBadge.style.color = data.remaining === 0 ? '#dc2626' : '#FF4F00';
    }

    applyUsage({ remaining: data.remaining, limit: data.limit });

    // Public page for this summary (share loop)
    currentPublicUrl = data.publicUrl || (data.videoId ? `${API_BASE}/s/${data.videoId}` : null);
    shareBtn.style.display = currentPublicUrl ? '' : 'none';

    // Save to history
    if (data.videoId) saveToHistory(data);
  } catch (err) {
    loadingState.style.display = 'none';
    summarizeBtn.style.display = '';
    showError(err.message);
  }
}

// ============================================================
// Helpers
// ============================================================
async function fetchUsage() {
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/usage`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    userPlan = data.plan || 'free';
    applyUsage({ ...data, plan: userPlan });
    return data;
  } catch {
    return null;
  }
}

async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
    currentVideoUrl = tab.url;
    summarizeBtn.style.display = '';
    updateVideoInfo();
  } else {
    currentVideoUrl = null;
    summarizeBtn.style.display = 'none';
    videoInfo.style.display = 'none';
    // Show helpful empty state
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = '';
  }
}

async function updateVideoInfo() {
  if (!currentVideoUrl) return;
  try {
    const videoId = new URL(currentVideoUrl).searchParams.get('v');
    if (videoId) {
      const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const data = await oembed.json();
      videoInfo.style.display = '';
      videoTitle.textContent = data.title;
      videoChannel.textContent = data.author_name;
      const thumbImg = document.getElementById('videoThumbImg');
      thumbImg.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      document.getElementById('videoThumb').style.display = '';
    }
  } catch {}
}

function showAuthView() {
  authView.style.display = '';
  summaryView.style.display = 'none';
  settingsView.style.display = 'none';
  logoutBtn.style.display = 'none';
  settingsBtn.style.display = 'none';
  signinBtn.style.display = 'none';
  authFormView.style.display = '';
  forgotView.style.display = 'none';
  // Clear errors
  document.getElementById('authError').style.display = 'none';
  errorState.style.display = 'none';
}

function showSummaryView() {
  authView.style.display = 'none';
  summaryView.style.display = '';
  settingsView.style.display = 'none';
  logoutBtn.style.display = token ? '' : 'none';
  settingsBtn.style.display = token ? '' : 'none';
  signinBtn.style.display = token ? 'none' : '';
}

function showSettingsView() {
  authView.style.display = 'none';
  summaryView.style.display = 'none';
  settingsView.style.display = '';
}

function clearSession() {
  token = null;
  userEmail = null;
  chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
}

function showError(msg) {
  errorState.style.display = '';
  errorText.textContent = msg;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatText(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function parseTimestamp(timeStr) {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// ============================================================
// Summary history (stored locally)
// ============================================================
function saveToHistory(videoData) {
  chrome.storage.local.get(['yepits_history'], (data) => {
    const history = data.yepits_history || [];
    // Remove duplicate if same video
    const filtered = history.filter(h => h.videoId !== videoData.videoId);
    // Add to front, keep max 10
    filtered.unshift({
      videoId: videoData.videoId,
      title: videoData.title,
      channel: videoData.channel,
      timestamp: Date.now(),
    });
    const trimmed = filtered.slice(0, 10);
    chrome.storage.local.set({ yepits_history: trimmed });
    renderHistory(trimmed);
  });
}

function renderHistory(history) {
  let container = document.getElementById('historySection');
  if (!container) return;
  
  if (!history || history.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';
  const list = document.getElementById('historyList');
  if (!list) return;

  list.innerHTML = history.map(h => {
    const ago = timeAgo(h.timestamp);
    return `<div class="history-item" data-video-id="${h.videoId}" data-url="https://www.youtube.com/watch?v=${h.videoId}">
      <img class="history-thumb" src="https://img.youtube.com/vi/${h.videoId}/default.jpg" onerror="this.style.display='none'" />
      <div class="history-info">
        <div class="history-title">${escapeHtml(h.title)}</div>
        <div class="history-meta">${escapeHtml(h.channel || '')} - ${ago}</div>
      </div>
    </div>`;
  }).join('');

  // Click to re-open
  list.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      chrome.tabs.create({ url });
    });
  });
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

async function loadSettings() {
  document.getElementById('settingsEmail').textContent = userEmail || 'Unknown';
  const usage = await fetchUsage();
  if (usage) {
    document.getElementById('settingsPlan').textContent = usage.plan === 'pro' ? 'Pro ($7/mo)' : 'Free';
    document.getElementById('settingsUsage').textContent = usage.plan === 'pro'
      ? 'Unlimited'
      : `${usage.remaining}/${usage.limit} per day`;
  }
  // Show/hide upgrade button
  document.getElementById('upgradeBtn').style.display = usage?.plan === 'pro' ? 'none' : '';
}
