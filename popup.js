/**
 * popup.js — LeetCode → GitHub Sync
 * Handles: tab switching, GitHub auth, problem state display, push trigger
 */

// ── Utility ──────────────────────────────────────────────
const $ = id => document.getElementById(id);

function toast(msg, type = 'success', duration = 3000) {
  const el = $('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => { el.className = ''; }, duration);
}

function addLog(msg, type = 'inf') {
  const box = $('logBox');
  box.style.display = 'block';
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `> ${msg}`;
  box.appendChild(entry);
  box.scrollTop = box.scrollHeight;
}

// ── Tab switching ─────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $(`panel-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'push') loadPushPanel();
  });
});

// ── GitHub Connection ─────────────────────────────────────
async function verifyGitHubToken(token, user, repo) {
  const res = await fetch(`https://api.github.com/repos/${user}/${repo}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return await res.json();
}

async function loadConnectPanel() {
  const data = await chrome.storage.sync.get(['ghToken', 'ghUser', 'ghRepo', 'ghBranch']);
  if (data.ghToken && data.ghUser && data.ghRepo) {
    showConnectedView(data);
  } else {
    showSetupForm();
  }
}

function showConnectedView(data) {
  $('setupForm').style.display = 'none';
  $('connectedView').style.display = 'block';
  $('dispRepo').textContent = `${data.ghUser}/${data.ghRepo}`;
  $('dispBranch').textContent = data.ghBranch || 'main';
  $('dispUser').textContent = data.ghUser;
  $('globalStatus').className = 'status-dot connected';
}

function showSetupForm() {
  $('setupForm').style.display = 'block';
  $('connectedView').style.display = 'none';
  $('globalStatus').className = 'status-dot';
}

$('connectBtn').addEventListener('click', async () => {
  const token  = $('ghToken').value.trim();
  const user   = $('ghUser').value.trim();
  const repo   = $('ghRepo').value.trim();
  const branch = $('ghBranch').value.trim() || 'main';

  if (!token || !user || !repo) {
    toast('Please fill in all fields.', 'error');
    return;
  }

  const btn = $('connectBtn');
  btn.disabled = true;
  btn.innerHTML = 'Verifying...';

  try {
    await verifyGitHubToken(token, user, repo);
    await chrome.storage.sync.set({ ghToken: token, ghUser: user, ghRepo: repo, ghBranch: branch });
    showConnectedView({ ghToken: token, ghUser: user, ghRepo: repo, ghBranch: branch });
    toast('✓ Connected successfully!', 'success');
  } catch (e) {
    toast(`✗ ${e.message}`, 'error', 4000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Verify & Connect';
  }
});

$('disconnectBtn').addEventListener('click', async () => {
  await chrome.storage.sync.remove(['ghToken', 'ghUser', 'ghRepo', 'ghBranch']);
  showSetupForm();
  $('globalStatus').className = 'status-dot';
  toast('Disconnected from GitHub.', 'error');
});

// ── Push Panel ────────────────────────────────────────────
async function loadPushPanel() {
  const data = await chrome.storage.sync.get(['ghToken', 'ghUser', 'ghRepo', 'ghBranch']);
  const isConnected = !!(data.ghToken && data.ghUser && data.ghRepo);

  if (!isConnected) {
    $('noConnWarn').style.display = 'block';
    $('pushUI').style.display = 'none';
    return;
  }

  $('noConnWarn').style.display = 'none';
  $('pushUI').style.display = 'block';

  // Ask content script for current problem state
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('leetcode.com/problems')) {
    $('noProblemMsg').style.display = 'block';
    $('problemDetected').style.display = 'none';
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROBLEM_STATE' });
    if (response && response.title) {
      displayProblem(response);
    } else {
      $('noProblemMsg').style.display = 'block';
      $('problemDetected').style.display = 'none';
    }
  } catch (e) {
    $('noProblemMsg').style.display = 'block';
    $('problemDetected').style.display = 'none';
  }
}

function displayProblem(state) {
  $('noProblemMsg').style.display = 'none';
  $('problemDetected').style.display = 'block';

  $('detectedTitle').textContent = state.title || 'Unknown Problem';

  // Difficulty badge
  const diffEl = $('detectedDiff');
  const diff = (state.difficulty || '').toLowerCase();
  diffEl.textContent = state.difficulty || '?';
  diffEl.className = 'badge';
  if (diff === 'easy')   { diffEl.style.cssText = 'background:rgba(0,212,170,0.12);color:#00d4aa;border:1px solid rgba(0,212,170,0.25)'; }
  if (diff === 'medium') { diffEl.style.cssText = 'background:rgba(255,209,102,0.12);color:#ffd166;border:1px solid rgba(255,209,102,0.25)'; }
  if (diff === 'hard')   { diffEl.style.cssText = 'background:rgba(255,74,107,0.12);color:#ff4a6b;border:1px solid rgba(255,74,107,0.25)'; }

  $('detectedLang').textContent = state.language || 'Unknown';

  const statusEl = $('detectedStatus');
  const accepted = state.status === 'Accepted';
  statusEl.textContent = state.status || 'No submission yet';
  if (accepted) {
    statusEl.style.cssText = 'background:rgba(0,212,170,0.12);color:#00d4aa;border:1px solid rgba(0,212,170,0.25)';
  } else {
    statusEl.style.cssText = 'background:rgba(255,74,107,0.12);color:#ff4a6b;border:1px solid rgba(255,74,107,0.25)';
  }

  const pushBtn = $('pushBtn');
  if (accepted) {
    pushBtn.disabled = false;
    $('pushBtnIcon').textContent = '🚀';
    $('pushBtnText').textContent = 'Push to GitHub';
  } else {
    pushBtn.disabled = true;
    $('pushBtnIcon').textContent = '🔒';
    $('pushBtnText').textContent = 'Submit accepted solution first';
  }
}

// ── Push Handler ──────────────────────────────────────────
$('pushBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const pushBtn = $('pushBtn');
  pushBtn.disabled = true;
  $('pushBtnIcon').textContent = '⏳';
  $('pushBtnText').textContent = 'Pushing...';

  const logBox = $('logBox');
  logBox.innerHTML = '';
  addLog('Starting push process...', 'inf');

  try {
    // Get full problem data from content script
    const state = await chrome.tabs.sendMessage(tab.id, { type: 'GET_FULL_DATA' });
    if (!state || !state.code) throw new Error('Could not extract solution code from page.');

    addLog(`Problem: ${state.title}`, 'inf');
    addLog(`Language: ${state.language}`, 'inf');
    addLog(`Status: ${state.status}`, 'ok');

    // Get credentials
    const creds = await chrome.storage.sync.get(['ghToken', 'ghUser', 'ghRepo', 'ghBranch']);

    // Build GitHub paths
    const folderName  = buildFolderName(state.questionId, state.titleSlug);
    const ext         = getExtension(state.language);
    const fileName    = `${state.titleSlug}.${ext}`;
    const readmePath  = `${folderName}/README.md`;
    const solutionPath = `${folderName}/${fileName}`;

    addLog(`Folder: ${folderName}/`, 'inf');
    addLog(`Files: README.md, ${fileName}`, 'inf');

    const readmeContent  = buildReadme(state);
    const solutionContent = state.code;

    addLog('Uploading README.md...', 'inf');
    await pushFileToGitHub(creds, readmePath, readmeContent, `Add README for ${state.title}`);
    addLog('README.md ✓', 'ok');

    addLog(`Uploading ${fileName}...`, 'inf');
    await pushFileToGitHub(creds, solutionPath, solutionContent, `Add solution for ${state.title} [${state.language}]`);
    addLog(`${fileName} ✓`, 'ok');

    addLog('Push complete! 🎉', 'ok');
    toast('✓ Solution pushed to GitHub!', 'success');

    $('pushBtnIcon').textContent = '✓';
    $('pushBtnText').textContent = 'Pushed successfully!';

  } catch (e) {
    addLog(`Error: ${e.message}`, 'err');
    toast(`✗ ${e.message}`, 'error', 5000);
    pushBtn.disabled = false;
    $('pushBtnIcon').textContent = '🚀';
    $('pushBtnText').textContent = 'Retry Push';
  }
});

// ── GitHub API ────────────────────────────────────────────
async function pushFileToGitHub(creds, path, content, message) {
  const { ghToken, ghUser, ghRepo, ghBranch } = creds;
  const apiUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${path}`;
  const branch = ghBranch || 'main';

  // Check if file exists (to get SHA for update)
  let sha = null;
  try {
    const existing = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (existing.ok) {
      const data = await existing.json();
      sha = data.sha;
    }
  } catch (_) { /* file doesn't exist yet, that's fine */ }

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch
  };
  if (sha) body.sha = sha;

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub API error ${res.status}`);
  }
  return await res.json();
}

// ── Helpers ───────────────────────────────────────────────
function buildFolderName(questionId, titleSlug) {
  const id = String(questionId || '0000').padStart(4, '0');
  return `${id}-${titleSlug}`;
}

function buildReadme(state) {
  const diff = state.difficulty || 'Unknown';
  const tags = (state.tags || []).join(', ') || 'N/A';

  return `# ${state.title}

## Problem Details

| Field | Value |
|-------|-------|
| **Difficulty** | ${diff} |
| **Tags** | ${tags} |
| **LeetCode Link** | [View Problem](https://leetcode.com/problems/${state.titleSlug}/) |

## Problem Description

${state.description || '_Description not available. Visit the LeetCode problem page for details._'}

## Solution

**Language:** ${state.language}

See \`${state.titleSlug}.${getExtension(state.language)}\` for the implementation.

---
*Pushed automatically by [LeetCode → GitHub Sync](https://github.com) Chrome Extension*
`;
}

function getExtension(language) {
  const map = {
    'Python':      'py',
    'Python3':     'py',
    'C++':         'cpp',
    'Java':        'java',
    'C':           'c',
    'C#':          'cs',
    'JavaScript':  'js',
    'TypeScript':  'ts',
    'Go':          'go',
    'Rust':        'rs',
    'Ruby':        'rb',
    'Swift':       'swift',
    'Kotlin':      'kt',
    'Scala':       'scala',
    'PHP':         'php',
    'Dart':        'dart',
    'R':           'r',
    'Racket':      'rkt',
    'Erlang':      'erl',
    'Elixir':      'ex',
    'Bash':        'sh',
    'MySQL':       'sql',
    'MS SQL Server': 'sql',
    'Oracle':      'sql',
    'Pandas':      'py',
  };
  return map[language] || 'txt';
}

// ── Init ──────────────────────────────────────────────────
loadConnectPanel();
