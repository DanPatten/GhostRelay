const enabledInput = document.getElementById("enabled");
const domainSpan = document.getElementById("domain");
const portInput = document.getElementById("port");
const screenshotInput = document.getElementById("screenshot");
const statusEl = document.getElementById("status");

let currentHostname = null;

// Get active tab hostname, then load settings
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    try {
      currentHostname = new URL(tabs[0].url).hostname;
    } catch {}
  }
  domainSpan.textContent = currentHostname || "(unknown)";

  chrome.storage.sync.get({ enabledDomains: {}, port: 7391, screenshot: false }, (s) => {
    enabledInput.checked = currentHostname ? !!s.enabledDomains[currentHostname] : false;
    enabledInput.disabled = !currentHostname;
    portInput.value = s.port;
    screenshotInput.checked = s.screenshot;
    checkConnection(s.port);
  });
});

// Save on change
enabledInput.addEventListener("change", () => {
  if (!currentHostname) return;
  chrome.storage.sync.get({ enabledDomains: {} }, (s) => {
    const domains = s.enabledDomains;
    if (enabledInput.checked) {
      domains[currentHostname] = true;
    } else {
      delete domains[currentHostname];
    }
    chrome.storage.sync.set({ enabledDomains: domains });
  });
});

portInput.addEventListener("change", () => {
  const port = parseInt(portInput.value, 10);
  if (port >= 1024 && port <= 65535) {
    chrome.storage.sync.set({ port });
    checkConnection(port);
  }
});

screenshotInput.addEventListener("change", () => {
  chrome.storage.sync.set({ screenshot: screenshotInput.checked });
});

function checkConnection(port) {
  statusEl.textContent = "Checking connection...";
  fetch(`http://localhost:${port}/tags`)
    .then((r) => {
      if (r.ok) {
        return r.json().then((data) => {
          const count = data.tags ? data.tags.length : 0;
          statusEl.textContent = `Connected — ${count} tag(s)`;
          statusEl.className = "connected";
        });
      }
      throw new Error("Bad response");
    })
    .catch(() => {
      statusEl.textContent = "Server not reachable";
      statusEl.className = "disconnected";
    });
}
