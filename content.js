/**
 * content.js — LeetCode → GitHub Sync
 * Injected into leetcode.com/problems/* pages.
 * Responsibilities:
 *   1. Extract problem metadata (title, difficulty, description, tags)
 *   2. Extract current editor code and selected language
 *   3. Monitor submission status (polling + DOM observation)
 *   4. Respond to messages from popup.js
 */

(function () {
  'use strict';

  let problemState = {
    title:       null,
    titleSlug:   null,
    questionId:  null,
    difficulty:  null,
    description: null,
    tags:        [],
    language:    null,
    code:        null,
    status:      null,   // 'Accepted' | 'Wrong Answer' | etc.
  };

  // ── Extract from URL ──────────────────────────────────────
  function extractSlugFromUrl() {
    const match = window.location.pathname.match(/\/problems\/([\w-]+)/);
    return match ? match[1] : null;
  }

  // ── Fetch problem metadata via LeetCode GraphQL API ───────
  async function fetchProblemMetadata(slug) {
    try {
      const query = `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionFrontendId
            title
            titleSlug
            difficulty
            content
            topicTags { name }
          }
        }
      `;
      const res = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': window.location.href
        },
        body: JSON.stringify({ query, variables: { titleSlug: slug } })
      });
      if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);
      const json = await res.json();
      const q = json.data && json.data.question;
      if (!q) throw new Error('No question data returned');

      problemState.questionId  = q.questionFrontendId;
      problemState.title       = q.title;
      problemState.titleSlug   = q.titleSlug;
      problemState.difficulty  = q.difficulty;
      problemState.description = htmlToMarkdown(q.content || '');
      problemState.tags        = (q.topicTags || []).map(t => t.name);
    } catch (e) {
      // Fallback: parse from DOM
      parseProblemFromDOM();
    }
  }

  function htmlToMarkdown(html) {
    if (!html) return '';
    return html
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => '```\n' + c.replace(/<[^>]+>/g, '') + '\n```')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  function parseProblemFromDOM() {
    // Title from <title> tag or heading
    const titleEl = document.querySelector('[data-cy="question-title"]')
                 || document.querySelector('.question-title')
                 || document.querySelector('h4[data-cy]');
    if (titleEl) problemState.title = titleEl.textContent.trim().replace(/^\d+\.\s*/, '');

    // Try from page title
    if (!problemState.title) {
      const pageTitle = document.title;
      const match = pageTitle.match(/^(.+?) -/);
      if (match) problemState.title = match[1].trim();
    }

    // Difficulty
    const diffEl = document.querySelector('[diff]')
                || document.querySelector('.difficulty-label')
                || [...document.querySelectorAll('div')].find(el =>
                    ['Easy', 'Medium', 'Hard'].includes(el.textContent.trim())
                   );
    if (diffEl) problemState.difficulty = diffEl.textContent.trim();
  }

  // ── Extract current editor code ───────────────────────────
  function extractCode() {
    // Try Monaco editor (LeetCode's primary editor)
    try {
      const monacoModels = window.monaco && window.monaco.editor.getModels();
      if (monacoModels && monacoModels.length > 0) {
        const model = monacoModels[monacoModels.length - 1];
        return model.getValue();
      }
    } catch (_) {}

    // CodeMirror fallback
    try {
      const cm = document.querySelector('.CodeMirror');
      if (cm && cm.CodeMirror) {
        return cm.CodeMirror.getValue();
      }
    } catch (_) {}

    // Textarea fallback
    try {
      const ta = document.querySelector('.view-lines');
      if (ta) {
        return [...ta.querySelectorAll('.view-line')]
          .map(l => l.textContent)
          .join('\n');
      }
    } catch (_) {}

    return null;
  }

  // ── Extract selected language ─────────────────────────────
  function extractLanguage() {
    // Language selector button (new LeetCode UI)
    const selectors = [
      '[data-cy="lang-select"] button',
      '.ant-select-selection-item',
      '[id*="headlessui-listbox-button"]',
      'button[id*="language"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }

    // Try the dropdown that shows current language
    const allBtns = document.querySelectorAll('button');
    const langNames = ['Python', 'Python3', 'C++', 'Java', 'JavaScript', 'TypeScript',
                       'Go', 'Rust', 'Ruby', 'Swift', 'Kotlin', 'C#', 'C', 'Scala',
                       'PHP', 'Dart', 'MySQL', 'Bash', 'R', 'Racket', 'Erlang', 'Elixir', 'Pandas'];
    for (const btn of allBtns) {
      const txt = btn.textContent.trim();
      if (langNames.includes(txt)) return txt;
    }

    return 'Unknown';
  }

  // ── Monitor submission result ─────────────────────────────
  let submissionObserver = null;

  function observeSubmissionResult() {
    if (submissionObserver) submissionObserver.disconnect();

    submissionObserver = new MutationObserver(() => {
      checkSubmissionStatus();
    });

    submissionObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function checkSubmissionStatus() {
    // Check various result indicators LeetCode uses
    const resultSelectors = [
      '[data-e2e-locator="submission-result"]',
      '.submission-result',
      '[class*="result-"]',
      '[class*="Result"]',
    ];

    for (const sel of resultSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        if (text) {
          problemState.status = normalizeStatus(text);
          // Capture code snapshot at the moment of submission
          const code = extractCode();
          if (code) problemState.code = code;
          const lang = extractLanguage();
          if (lang) problemState.language = lang;
          return;
        }
      }
    }

    // Fallback: scan for known status text in the DOM
    const statusTexts = ['Accepted', 'Wrong Answer', 'Time Limit Exceeded',
                         'Runtime Error', 'Memory Limit Exceeded', 'Compile Error',
                         'Output Limit Exceeded', 'TLE', 'MLE'];
    for (const status of statusTexts) {
      const found = [...document.querySelectorAll('span, div, h4, h5, p')]
        .find(el => el.textContent.trim() === status && el.children.length === 0);
      if (found) {
        problemState.status = status;
        const code = extractCode();
        if (code) problemState.code = code;
        const lang = extractLanguage();
        if (lang) problemState.language = lang;
        return;
      }
    }
  }

  function normalizeStatus(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (lower.includes('accepted')) return 'Accepted';
    if (lower.includes('wrong answer')) return 'Wrong Answer';
    if (lower.includes('time limit')) return 'Time Limit Exceeded';
    if (lower.includes('runtime error')) return 'Runtime Error';
    if (lower.includes('memory limit')) return 'Memory Limit Exceeded';
    if (lower.includes('compile')) return 'Compile Error';
    return raw.trim();
  }

  // ── Also intercept XHR/fetch for submission API responses ─
  // LeetCode fires AJAX when submission result comes in — we intercept it.
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

    if (url.includes('/check/') || url.includes('/submission/') || url.includes('submissionId')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        if (data && data.state === 'SUCCESS') {
          const status = data.status_msg || '';
          problemState.status = normalizeStatus(status);
          if (data.code) problemState.code = data.code;
          if (data.lang) problemState.language = normalizeLang(data.lang);

          // Capture from editor too as fallback
          if (!problemState.code) {
            const code = extractCode();
            if (code) problemState.code = code;
          }
          if (!problemState.language || problemState.language === 'Unknown') {
            problemState.language = extractLanguage();
          }
        }
      } catch (_) {}
    }
    return response;
  };

  // Also intercept XMLHttpRequest for older API calls
  const origXHROpen = XMLHttpRequest.prototype.open;
  const origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._url = url;
    return origXHROpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      try {
        if (this._url && (this._url.includes('/check/') || this._url.includes('submission'))) {
          const data = JSON.parse(this.responseText);
          if (data && data.state === 'SUCCESS') {
            problemState.status = normalizeStatus(data.status_msg || '');
            if (data.code) problemState.code = data.code;
            if (data.lang) problemState.language = normalizeLang(data.lang);
          }
        }
      } catch (_) {}
    });
    return origXHRSend.apply(this, args);
  };

  function normalizeLang(lang) {
    const map = {
      'python':  'Python3',
      'python3': 'Python3',
      'cpp':     'C++',
      'java':    'Java',
      'c':       'C',
      'csharp':  'C#',
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'golang':  'Go',
      'go':      'Go',
      'rust':    'Rust',
      'ruby':    'Ruby',
      'swift':   'Swift',
      'kotlin':  'Kotlin',
      'scala':   'Scala',
      'php':     'PHP',
      'dart':    'Dart',
      'mysql':   'MySQL',
      'bash':    'Bash',
      'r':       'R',
      'racket':  'Racket',
      'erlang':  'Erlang',
      'elixir':  'Elixir',
      'pandas':  'Pandas',
    };
    return map[lang.toLowerCase()] || lang;
  }

  // ── Message listener (from popup) ─────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_PROBLEM_STATE') {
      // Return current snapshot
      const lang = problemState.language || extractLanguage();
      sendResponse({
        ...problemState,
        language: lang,
        titleSlug: problemState.titleSlug || extractSlugFromUrl(),
      });
      return true;
    }

    if (msg.type === 'GET_FULL_DATA') {
      // Full snapshot with fresh code extraction
      const code = extractCode() || problemState.code;
      const lang = problemState.language || extractLanguage();
      const slug = problemState.titleSlug || extractSlugFromUrl();

      sendResponse({
        ...problemState,
        code: code,
        language: lang,
        titleSlug: slug,
      });
      return true;
    }
  });

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    const slug = extractSlugFromUrl();
    if (!slug) return;

    problemState.titleSlug = slug;
    await fetchProblemMetadata(slug);
    observeSubmissionResult();
    checkSubmissionStatus();

    // Poll for language every 2s (user might switch)
    setInterval(() => {
      const lang = extractLanguage();
      if (lang && lang !== 'Unknown') problemState.language = lang;
    }, 2000);
  }

  // Wait for page to settle
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Page already loaded — small delay for React to mount
    setTimeout(init, 1500);
  }

  // Re-init on SPA navigation (LeetCode is a React SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const curr = location.href;
    if (curr !== lastUrl) {
      lastUrl = curr;
      if (curr.includes('leetcode.com/problems')) {
        setTimeout(init, 1500);
      }
    }
  }).observe(document, { subtree: true, childList: true });

})();
