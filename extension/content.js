// Content script — inject "Summarize" button on YouTube
(function () {
  'use strict';
  console.debug('[YepIts] content script 2.1.0');

  const BTN_ID = 'yepits-summary-btn';
  const CONTAINER_ID = 'yepits-btn-container';

  const BOLT_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>`;

  function createButton() {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'yepits-btn-container';

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.className = 'yepits-summary-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Summarize this video with YepIts.ai');
    btn.innerHTML = `${BOLT_SVG} <span>Summarize with AI</span>`;

    btn.addEventListener('click', () => {
      // Open the side panel
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
      // Auto-trigger summarize after panel mounts
      setTimeout(() => {
        const url = window.location.href.split('&')[0];
        chrome.runtime.sendMessage({ type: 'TRIGGER_SUMMARIZE', url });
      }, 400);
    });

    container.appendChild(btn);
    return container;
  }

  // ============================================================
  // Anchor finder — returns the DOM node we should insertBefore.
  // YouTube's selectors change often; we try multiple strategies
  // in priority order so the button keeps appearing across redesigns.
  // ============================================================
  // Is this element actually laid out? YouTube keeps hidden legacy nodes
  // (an old #actions-inner inside #secondary-info, for example) in the DOM,
  // and querySelector happily returns them. A button inside one is invisible.
  function isVisible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function firstVisible(selectors) {
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (isVisible(el)) return el;
      }
    }
    return null;
  }

  function findAnchor() {
    // Tier 1 — the like / share / save row on the current watch layout.
    const buttons = firstVisible([
      'ytd-watch-metadata #top-level-buttons-computed',
      '#top-level-buttons-computed',
    ]);
    if (buttons) return { node: buttons, where: 'prepend' };

    // Tier 2 — the actions container that holds that row.
    const actions = firstVisible(['ytd-watch-metadata #actions-inner', '#actions-inner', '#actions']);
    if (actions) return { node: actions, where: 'prepend' };

    // Tier 3 — older layout.
    const topRow = firstVisible(['#top-row']);
    if (topRow) return { node: topRow, where: 'after' };

    // Tier 4 — next to the title, so the button still appears if the
    // actions row is renamed again.
    const title = firstVisible([
      'ytd-watch-metadata h1',
      'h1.ytd-watch-metadata',
      '#title h1',
      '#info h1',
    ]);
    if (title && title.parentElement) return { node: title.parentElement, where: 'append' };

    return null;
  }

  function injectButton() {
    if (document.getElementById(CONTAINER_ID)) return;

    const anchor = findAnchor();
    if (!anchor) return;

    const container = createButton();

    try {
      if (anchor.where === 'prepend' && anchor.node.firstChild) {
        anchor.node.insertBefore(container, anchor.node.firstChild);
      } else if (anchor.where === 'after') {
        anchor.node.parentNode.insertBefore(container, anchor.node.nextSibling);
      } else {
        anchor.node.appendChild(container);
      }
      // If the host collapsed us to nothing, back out so the observer retries
      // with a different anchor on the next DOM change.
      if (!isVisible(container)) {
        console.debug('[YepIts] anchor collapsed, retrying later:', anchor.where, anchor.node.id || anchor.node.tagName);
        container.remove();
      } else {
        console.debug('[YepIts] button placed in', anchor.where, anchor.node.id || anchor.node.tagName, 'parent', container.parentElement && (container.parentElement.id || container.parentElement.tagName));
      }
    } catch (e) {
      console.warn('[YepIts] inject failed:', e.message);
    }
  }

  function removeButton() {
    const old = document.getElementById(CONTAINER_ID);
    if (old) old.remove();
  }

  let lastUrl = location.href;

  // Initial attempts — YouTube renders progressively so we retry a few times.
  const initialAttempts = [200, 800, 1800, 3500];
  initialAttempts.forEach((ms) => setTimeout(injectButton, ms));

  // Watch for SPA route changes (YouTube uses pushState).
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeButton();
      // Re-inject after a short delay — give YouTube a beat to render the new page.
      setTimeout(injectButton, 600);
      return;
    }
    // Same URL, but DOM may have re-rendered (e.g. menu open/close), or
    // YouTube moved our host node into a hidden layout container.
    const existing = document.getElementById(CONTAINER_ID);
    if (!existing) {
      injectButton();
    } else if (!isVisible(existing)) {
      console.debug('[YepIts] button lost visibility (parent', existing.parentElement && (existing.parentElement.id || existing.parentElement.tagName), '), re-anchoring');
      existing.remove();
      injectButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Clean up on unload so we don't leave a zombie button if the SPA navigates away fast.
  window.addEventListener('pagehide', removeButton);
})();
