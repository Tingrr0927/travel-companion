/* ai.js — AI itinerary section */

const AIModule = (() => {
  function render() {
    try {
      const container = document.getElementById('ai-content');
      if (!container) return;
      // content already in HTML, just init events
    } catch(e) {}
  }

  function init() {
    try {
      document.getElementById('ai-render-btn')?.addEventListener('click', renderMarkdown);
      document.getElementById('ai-clear-btn')?.addEventListener('click', clearAI);
    } catch(e) {}
  }

  function renderMarkdown() {
    try {
      const raw = document.getElementById('ai-textarea')?.value || '';
      const preview = document.getElementById('ai-preview');
      if (!preview) return;
      if (!raw.trim()) {
        preview.innerHTML = '<p style="color:var(--text-secondary)">請先貼入行程文字</p>';
        return;
      }
      if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(raw);
      } else {
        // fallback: plain text with line breaks
        preview.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word">${escapeHtml(raw)}</pre>`;
      }
      preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch(e) {}
  }

  function clearAI() {
    try {
      const ta = document.getElementById('ai-textarea');
      const preview = document.getElementById('ai-preview');
      if (ta) ta.value = '';
      if (preview) preview.innerHTML = '';
    } catch(e) {}
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, render };
})();
