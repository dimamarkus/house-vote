import { extensionMessageTypes } from './extension-messages';

const storageKeys = {
  appUrl: 'houseVoteAppUrl',
  tripId: 'houseVoteTripId',
  importToken: 'houseVoteImportToken',
  debugMode: 'houseVoteDebugMode',
};

const appUrlInput = document.getElementById('app-url');
const tripIdInput = document.getElementById('trip-id');
const importTokenInput = document.getElementById('import-token');
const debugModeInput = document.getElementById('debug-mode');
const detectTripButton = document.getElementById('detect-trip');
const saveListingButton = document.getElementById('save-listing');
const openSavedTripLink = document.getElementById('open-saved-trip');
const authStatusElement = document.getElementById('auth-status');
const openSignInLink = document.getElementById('open-sign-in');
const refreshAuthButton = document.getElementById('refresh-auth');
const statusElement = document.getElementById('status');
const previewElement = document.getElementById('capture-preview');

function setStatus(message, tone = 'muted') {
  statusElement.textContent = message;
  statusElement.className = `status ${tone}`;
}

function setOpenTripLink(url) {
  if (!url) {
    openSavedTripLink.classList.add('hidden');
    openSavedTripLink.setAttribute('href', '#');
    return;
  }

  openSavedTripLink.classList.remove('hidden');
  openSavedTripLink.setAttribute('href', url);
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(response);
    });
  });
}

function renderAuthStatus(authStatus) {
  openSignInLink.classList.add('hidden');
  openSignInLink.setAttribute('href', '#');

  if (!authStatus || !authStatus.isConfigured) {
    authStatusElement.textContent = authStatus && authStatus.error
      ? authStatus.error
      : 'Extension auth is not configured yet.';
    authStatusElement.className = 'status error';
    return;
  }

  if (!authStatus.isSignedIn) {
    authStatusElement.textContent = 'Not signed in. Sign in to House Vote in this browser, then refresh.';
    authStatusElement.className = 'status muted';

    if (authStatus.signInUrl) {
      openSignInLink.classList.remove('hidden');
      openSignInLink.setAttribute('href', authStatus.signInUrl);
    }
    return;
  }

  authStatusElement.textContent = `Signed in as ${authStatus.emailAddress || authStatus.userId || 'House Vote user'}.`;
  authStatusElement.className = 'status success';
}

async function refreshAuthStatus() {
  authStatusElement.textContent = 'Checking House Vote sign-in...';
  authStatusElement.className = 'status muted';

  try {
    const authStatus = await sendRuntimeMessage({ type: extensionMessageTypes.authStatus });
    renderAuthStatus(authStatus);
  } catch (error) {
    authStatusElement.textContent = error instanceof Error ? error.message : 'Failed to check House Vote sign-in.';
    authStatusElement.className = 'status error';
  }
}

function saveSettings() {
  chrome.storage.local.set({
    [storageKeys.appUrl]: appUrlInput.value.trim(),
    [storageKeys.tripId]: tripIdInput.value.trim(),
    [storageKeys.importToken]: importTokenInput.value.trim(),
    [storageKeys.debugMode]: Boolean(debugModeInput.checked),
  });
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(Object.values(storageKeys));

  appUrlInput.value = stored[storageKeys.appUrl] || 'http://localhost:3000';
  tripIdInput.value = stored[storageKeys.tripId] || '';
  importTokenInput.value = stored[storageKeys.importToken] || '';
  debugModeInput.checked = Boolean(stored[storageKeys.debugMode]);
}

function parseTripContextFromUrl(urlString) {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString);
    const tripMatch = url.pathname.match(/^\/trips\/([^/?#]+)/);
    if (!tripMatch) {
      return null;
    }

    return {
      appUrl: url.origin,
      tripId: tripMatch[1],
      tripUrl: url.toString(),
    };
  } catch {
    return null;
  }
}

async function detectTripContext() {
  const preferredAppUrl = appUrlInput.value.trim().replace(/\/+$/, '');
  const tabs = await chrome.tabs.query({});
  const tripTabs = tabs
    .map((tab) => parseTripContextFromUrl(tab.url))
    .filter(Boolean);

  if (tripTabs.length === 0) {
    return null;
  }

  const matchingTripTab = preferredAppUrl
    ? tripTabs.find((tab) => tab.appUrl === preferredAppUrl)
    : null;

  return matchingTripTab || tripTabs[0];
}

async function applyDetectedTripContext() {
  const tripContext = await detectTripContext();

  if (!tripContext) {
    setStatus('No open House Vote trip tab found. You can still paste the trip id manually.', 'muted');
    return null;
  }

  appUrlInput.value = tripContext.appUrl;
  tripIdInput.value = tripContext.tripId;
  saveSettings();
  setStatus(`Using trip ${tripContext.tripId} from the open House Vote tab.`, 'muted');
  return tripContext;
}

function formatCapturePreview(capture, debugMode) {
  if (!capture) {
    return 'Nothing captured yet.';
  }

  const baseSummary = {
    source: capture.source,
    title: capture.title,
    address: capture.address,
    price: capture.price,
    bedrooms: capture.bedroomCount,
    beds: capture.bedCount,
    bathrooms: capture.bathroomCount,
    photoCount: Array.isArray(capture.photoUrls) ? capture.photoUrls.length : 0,
    roomSummary: capture.roomBreakdown ? capture.roomBreakdown.summary : null,
    roomCount: capture.roomBreakdown && Array.isArray(capture.roomBreakdown.rooms)
      ? capture.roomBreakdown.rooms.length
      : 0,
    url: capture.url,
  };

  if (!debugMode) {
    return JSON.stringify(baseSummary, null, 2);
  }

  return JSON.stringify(
    {
      ...baseSummary,
      roomBreakdown: capture.roomBreakdown ?? null,
      parserDebug: capture.rawPayload && capture.rawPayload.parserDebug ? capture.rawPayload.parserDebug : null,
    },
    null,
    2,
  );
}

function formatImportSuccessMessage(importData) {
  const missingFields = Array.isArray(importData.missingFields) ? importData.missingFields : [];
  const listingLabel = importData.listingTitle || 'listing';

  if (missingFields.length === 0) {
    return `Saved "${listingLabel}" to House Vote.`;
  }

  return `Saved "${listingLabel}" to House Vote. Still missing: ${missingFields.join(', ')}.`;
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function captureListingFromActiveTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['listing-parser.js'],
  });

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.houseVoteListingParser?.extractListingCaptureFromPage() || null,
  });

  return result && result.result ? result.result : null;
}

async function saveCurrentListing() {
  const appUrl = appUrlInput.value.trim().replace(/\/+$/, '');
  const tripId = tripIdInput.value.trim();
  const importToken = importTokenInput.value.trim();
  const debugMode = Boolean(debugModeInput.checked);

  if (!appUrl || !tripId || !importToken) {
    setStatus('House Vote URL, trip id, and import token are required.', 'error');
    return;
  }

  saveListingButton.disabled = true;
  setOpenTripLink(null);
  setStatus('Capturing the current page...');

  try {
    const activeTab = await getCurrentTab();

    if (!activeTab || !activeTab.id) {
      throw new Error('No active tab found.');
    }

    const capture = await captureListingFromActiveTab(activeTab.id);

    if (!capture || !capture.url) {
      throw new Error('Could not parse this page. Open a supported listing (Airbnb, VRBO, or Booking.com) and try again.');
    }

    if (capture.source === 'UNKNOWN') {
      throw new Error('This page is not recognized as a supported listing. Open an Airbnb, VRBO, or Booking.com property page and try again.');
    }

    previewElement.textContent = formatCapturePreview(capture, debugMode);
    setStatus('Saving listing into House Vote...');

    const response = await fetch(`${appUrl}/api/import-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId,
        importToken,
        capture,
      }),
    });

    const responseBody = await response.json();

    if (!response.ok || !responseBody.success) {
      throw new Error(responseBody.error || 'Import request failed.');
    }

    setStatus(formatImportSuccessMessage(responseBody.data), 'success');

    if (responseBody.data && responseBody.data.tripPath) {
      const tripUrl = new URL(responseBody.data.tripPath, `${appUrl}/`).toString();
      setOpenTripLink(tripUrl);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unexpected import error.', 'error');
  } finally {
    saveListingButton.disabled = false;
  }
}

appUrlInput.addEventListener('change', async () => {
  saveSettings();
  await applyDetectedTripContext();
});
tripIdInput.addEventListener('change', saveSettings);
importTokenInput.addEventListener('change', saveSettings);
debugModeInput.addEventListener('change', () => {
  saveSettings();
  const currentPreview = previewElement.textContent;
  if (currentPreview && currentPreview !== 'Nothing captured yet.') {
    previewElement.textContent = 'Capture debug mode changed. Save again to refresh this preview.';
  }
});
detectTripButton.addEventListener('click', async () => {
  try {
    await applyDetectedTripContext();
  } catch {
    setStatus('Failed to inspect open tabs for a House Vote trip.', 'error');
  }
});
refreshAuthButton.addEventListener('click', refreshAuthStatus);
saveListingButton.addEventListener('click', saveCurrentListing);

loadSettings()
  .then(async () => {
    await Promise.all([
      applyDetectedTripContext(),
      refreshAuthStatus(),
    ]);
  })
  .catch(() => {
    setStatus('Failed to load saved settings.', 'error');
  });
