(() => {
  // Prevent double-injection
  if (window.__tagrelay_loaded) return;
  window.__tagrelay_loaded = true;

  let selectionMode = false;
  let taggedElements = []; // { el, badge, popover, popoverMode, data }
  let hoveredEl = null;
  let serverPort = 7890;
  let screenshotEnabled = false;
  let enabled = false;
  let eventSource = null;
  const currentHostname = location.hostname;

  // Load settings
  chrome.storage.sync.get({ port: 7890, screenshot: false, enabledDomains: {} }, (s) => {
    serverPort = s.port;
    screenshotEnabled = s.screenshot;
    enabled = !!(s.enabledDomains || {})[currentHostname];
    applyEnabledState();
    connectSSE();
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.port) {
      serverPort = changes.port.newValue;
      connectSSE();
    }
    if (changes.screenshot) {
      screenshotEnabled = changes.screenshot.newValue;
    }
    if (changes.enabledDomains) {
      enabled = !!(changes.enabledDomains.newValue || {})[currentHostname];
      applyEnabledState();
    }
  });

  function applyEnabledState() {
    fab.classList.toggle("tagrelay-disabled", !enabled);
    if (!enabled && selectionMode) {
      toggleSelectionMode();
    }
  }

  // --- SSE Connection ---
  function connectSSE() {
    if (eventSource) eventSource.close();
    eventSource = new EventSource(`http://localhost:${serverPort}/events`);
    eventSource.addEventListener("clear", () => {
      clearAllTags();
      if (selectionMode) toggleSelectionMode();
    });
    eventSource.onerror = () => {
      // Silently retry — EventSource auto-reconnects
    };
  }

  // --- Floating Action Button ---
  const fab = document.createElement("button");
  fab.id = "tagrelay-fab";
  fab.classList.add("tagrelay-disabled"); // Start hidden until storage loads
  fab.textContent = "TR";
  fab.title = "TagRelay — Click to start tagging elements";
  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleSelectionMode();
  });
  document.documentElement.appendChild(fab);

  // --- Clear Button (trash icon, shown in selection mode) ---
  const btnClear = document.createElement("button");
  btnClear.id = "tagrelay-btn-clear";
  btnClear.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1.5 14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
  btnClear.title = "Clear all tags";
  btnClear.style.display = "none";
  btnClear.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    clearAllTags();
    syncTags();
  });
  document.documentElement.appendChild(btnClear);

  // --- Selection Mode ---
  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    fab.classList.toggle("active", selectionMode);
    updateClearButton();
    if (!selectionMode && hoveredEl) {
      hoveredEl.classList.remove("tagrelay-highlight");
      hoveredEl = null;
    }
  }

  function updateClearButton() {
    btnClear.style.display = (selectionMode && taggedElements.length > 0) ? "flex" : "none";
  }

  // --- Unique CSS Selector Generator ---
  function getSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let current = el;
    while (current && current !== document.documentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`#${CSS.escape(current.id)} > ${part}`);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          part += `:nth-of-type(${idx})`;
        }
      }
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  // --- Richer Tag Data Helpers ---
  function getAttributes(el) {
    const keys = ["id", "class", "role", "aria-label", "href", "src", "name", "placeholder", "type", "alt", "title", "data-testid"];
    const attrs = {};
    for (const key of keys) {
      const val = el.getAttribute(key);
      if (val != null && val !== "") attrs[key] = val;
    }
    return Object.keys(attrs).length > 0 ? attrs : undefined;
  }

  function getParentContext(el) {
    const ancestors = [];
    let current = el.parentElement;
    let depth = 0;
    while (current && current !== document.documentElement && depth < 3) {
      let desc = current.tagName.toLowerCase();
      if (current.classList.length > 0) desc += "." + Array.from(current.classList).join(".");
      ancestors.push(desc);
      current = current.parentElement;
      depth++;
    }
    return ancestors.length > 0 ? ancestors : undefined;
  }

  // --- Tagging ---
  function isTagRelayUI(el) {
    if (!el || !el.closest) return false;
    return (
      el === fab ||
      el.closest("#tagrelay-fab") ||
      el.closest("#tagrelay-btn-clear") ||
      el.closest(".tagrelay-badge") ||
      el.closest(".tagrelay-popover")
    );
  }

  function findTagged(el) {
    return taggedElements.findIndex((t) => t.el === el);
  }

  function positionBadge(badge, el) {
    const rect = el.getBoundingClientRect();
    const margin = 4;

    // Hide badge if element is entirely off-screen
    const offScreen =
      rect.right < 0 ||
      rect.left > window.innerWidth ||
      rect.bottom < 0 ||
      rect.top > window.innerHeight;
    badge.style.display = offScreen ? "none" : "";
    if (offScreen) return;

    // Position at element's top-right corner, clamped to viewport
    let top = rect.top - 10;
    let left = rect.right - 10;
    top = Math.max(margin, Math.min(top, window.innerHeight - 24 - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - 30 - margin));
    badge.style.top = `${top}px`;
    badge.style.left = `${left}px`;
  }

  function positionPopover(popover, badge) {
    const badgeRect = badge.getBoundingClientRect();
    const margin = 8;

    // Use known width (textarea 200px + padding 16px) and estimate height
    const popW = popover.offsetWidth || 220;
    const popH = popover.offsetHeight || 100;

    // Default: below badge, left-aligned to badge
    let top = badgeRect.bottom + 6;
    let left = badgeRect.left;

    // Clamp right edge
    if (left + popW > window.innerWidth - margin) {
      left = window.innerWidth - popW - margin;
    }
    // Clamp left edge
    if (left < margin) {
      left = margin;
    }
    // Clamp bottom — flip above badge
    if (top + popH > window.innerHeight - margin) {
      top = badgeRect.top - popH - 6;
    }
    // Clamp top
    if (top < margin) {
      top = margin;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }

  function createPopover(entry) {
    const popover = document.createElement("div");
    popover.className = "tagrelay-popover";
    popover.style.display = "none";

    // Preview label (shown on hover)
    const preview = document.createElement("div");
    preview.className = "tagrelay-popover-preview";

    // Edit area (shown on click)
    const editArea = document.createElement("div");
    editArea.className = "tagrelay-popover-edit";

    const textarea = document.createElement("textarea");
    textarea.className = "tagrelay-popover-text";
    textarea.placeholder = "What should change?";
    textarea.value = entry.data.annotation || "";

    textarea.addEventListener("click", (e) => e.stopPropagation());
    textarea.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        saveAndClose(entry);
      }
    });
    textarea.addEventListener("keyup", (e) => e.stopPropagation());

    textarea.addEventListener("blur", () => {
      // Delay to check if focus moved to Remove button (which fires mousedown first)
      setTimeout(() => {
        // If entry was already removed or popover closed, bail
        if (!entry.popover || entry.popoverMode !== "edit") return;
        // If focus moved to another element inside the popover, don't close
        if (entry.popover.contains(document.activeElement)) return;
        saveAndClose(entry);
      }, 0);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "tagrelay-popover-remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const idx = taggedElements.indexOf(entry);
      if (idx !== -1) {
        entry.popoverMode = null; // prevent blur handler from running
        removeTag(idx);
        syncTags();
      }
    });

    editArea.appendChild(textarea);
    editArea.appendChild(removeBtn);
    popover.appendChild(preview);
    popover.appendChild(editArea);

    popover.addEventListener("mouseenter", () => {
      clearTimeout(popoverHideTimeout);
    });
    popover.addEventListener("mouseleave", () => {
      popoverHideTimeout = setTimeout(() => {
        if (entry.popoverMode === "edit" && entry.popover.contains(document.activeElement)) return;
        hidePopover(entry);
      }, 300);
    });

    document.documentElement.appendChild(popover);

    return popover;
  }

  function showPopover(entry, mode) {
    if (!entry.popover) {
      entry.popover = createPopover(entry);
    }
    const popover = entry.popover;
    entry.popoverMode = mode;

    if (mode === "preview") {
      if (!entry.data.annotation) return; // nothing to preview
      const preview = popover.querySelector(".tagrelay-popover-preview");
      preview.textContent = entry.data.annotation;
      preview.style.display = "block";
      popover.querySelector(".tagrelay-popover-edit").style.display = "none";
    } else if (mode === "edit") {
      popover.querySelector(".tagrelay-popover-preview").style.display = "none";
      popover.querySelector(".tagrelay-popover-edit").style.display = "flex";
      const textarea = popover.querySelector(".tagrelay-popover-text");
      textarea.value = entry.data.annotation || "";
    }

    popover.style.display = "flex";
    positionPopover(popover, entry.badge);

    if (mode === "edit") {
      const textarea = popover.querySelector(".tagrelay-popover-text");
      setTimeout(() => textarea.focus(), 0);
    }
  }

  function hidePopover(entry, force) {
    if (!entry.popover) return;
    // Don't close edit mode if textarea is focused (unless forced)
    if (!force && entry.popoverMode === "edit" && entry.popover.contains(document.activeElement)) {
      return;
    }
    entry.popover.style.display = "none";
    entry.popoverMode = null;
  }

  function saveAndClose(entry) {
    if (!entry.popover) return;
    const textarea = entry.popover.querySelector(".tagrelay-popover-text");
    entry.data.annotation = textarea.value.trim() || undefined;
    entry.badge.classList.toggle("has-annotation", !!entry.data.annotation);
    hidePopover(entry, true);
    syncTags();
  }

  let popoverHideTimeout = null;

  function addTag(el) {
    const index = taggedElements.length + 1;
    const rect = el.getBoundingClientRect();

    const badge = document.createElement("span");
    badge.className = "tagrelay-badge";
    badge.textContent = String(index);
    positionBadge(badge, el);
    document.documentElement.appendChild(badge);

    el.classList.add("tagrelay-tagged");

    const data = {
      index,
      selector: getSelector(el),
      innerText: (el.innerText || "").trim().slice(0, 500),
      outerHTML: el.outerHTML.slice(0, 2000),
      boundingBox: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      pageURL: location.href,
      timestamp: new Date().toISOString(),
      tagName: el.tagName,
      attributes: getAttributes(el),
      parentContext: getParentContext(el),
      pageTitle: document.title,
    };

    const entry = { el, badge, popover: null, popoverMode: null, data };
    taggedElements.push(entry);
    updateFabCount();

    // Show edit popover on first tag
    showPopover(entry, "edit");

    // Hover: show preview (annotation text only)
    badge.addEventListener("mouseenter", () => {
      clearTimeout(popoverHideTimeout);
      if (entry.popoverMode !== "edit") {
        showPopover(entry, "preview");
      }
    });
    badge.addEventListener("mouseleave", () => {
      popoverHideTimeout = setTimeout(() => {
        if (entry.popoverMode === "edit" && entry.popover && entry.popover.contains(document.activeElement)) return;
        hidePopover(entry, entry.popoverMode !== "edit");
      }, 300);
    });
    // Click: show edit mode
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      clearTimeout(popoverHideTimeout);
      showPopover(entry, "edit");
    });

    if (screenshotEnabled) {
      captureElementScreenshot(el, taggedElements.length - 1);
    }
  }

  function removeTag(idx) {
    const entry = taggedElements[idx];
    entry.badge.remove();
    if (entry.popover) entry.popover.remove();
    entry.el.classList.remove("tagrelay-tagged");
    taggedElements.splice(idx, 1);
    renumberBadges();
    updateFabCount();
  }

  function renumberBadges() {
    taggedElements.forEach((t, i) => {
      t.data.index = i + 1;
      t.badge.textContent = String(i + 1);
      positionBadge(t.badge, t.el);
      if (t.popover) positionPopover(t.popover, t.badge);
    });
  }

  function clearAllTags() {
    for (const t of taggedElements) {
      t.badge.remove();
      if (t.popover) t.popover.remove();
      t.el.classList.remove("tagrelay-tagged");
    }
    taggedElements = [];
    updateFabCount();
  }

  function updateFabCount() {
    fab.textContent = taggedElements.length > 0 ? String(taggedElements.length) : "TR";
    updateClearButton();
  }

  // --- Screenshot ---
  function captureElementScreenshot(el, idx) {
    const rect = el.getBoundingClientRect();
    chrome.runtime.sendMessage({ type: "capture-screenshot" }, (response) => {
      if (!response || !response.dataUrl) return;
      // Crop to element bounding box
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        const canvas = document.createElement("canvas");
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          rect.x * dpr, rect.y * dpr,
          rect.width * dpr, rect.height * dpr,
          0, 0,
          rect.width * dpr, rect.height * dpr
        );
        if (taggedElements[idx]) {
          taggedElements[idx].data.screenshot = canvas.toDataURL("image/png");
          syncTags();
        }
      };
      img.src = response.dataUrl;
    });
  }

  // --- Sync to server ---
  function syncTags() {
    const elements = taggedElements.map((t) => t.data);
    updateFabCount();
    const body = { pageURL: location.href, elements };
    fetch(`http://localhost:${serverPort}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {
      // Server not running — silently ignore
    });
  }

  // --- Event Handlers ---
  document.addEventListener(
    "mouseover",
    (e) => {
      if (!selectionMode) return;
      if (isTagRelayUI(e.target)) return;
      if (hoveredEl) hoveredEl.classList.remove("tagrelay-highlight");
      hoveredEl = e.target;
      hoveredEl.classList.add("tagrelay-highlight");
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      if (!selectionMode) return;
      if (e.target === hoveredEl) {
        hoveredEl.classList.remove("tagrelay-highlight");
        hoveredEl = null;
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!selectionMode) return;
      if (isTagRelayUI(e.target)) return;
      e.preventDefault();
      e.stopPropagation();

      const idx = findTagged(e.target);
      if (idx !== -1) {
        showPopover(taggedElements[idx], "edit");
        return;
      }
      addTag(e.target);
      syncTags();
    },
    true
  );

  // Reposition badges and popovers on scroll/resize
  function repositionBadges() {
    taggedElements.forEach((t) => {
      positionBadge(t.badge, t.el);
      if (t.popover && t.popover.style.display !== "none") {
        positionPopover(t.popover, t.badge);
      }
    });
  }
  window.addEventListener("scroll", repositionBadges, { passive: true });
  window.addEventListener("resize", repositionBadges, { passive: true });
})();
