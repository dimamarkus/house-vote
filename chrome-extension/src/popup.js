import { extensionMessageTypes } from './extension-messages';

const storageKeys = {
  appUrl: 'houseVoteAppUrl',
  tripId: 'houseVoteTripId',
  importToken: 'houseVoteImportToken',
  selectedTripId: 'houseVoteSelectedTripId',
  debugMode: 'houseVoteDebugMode',
};

const appUrlInput = document.getElementById('app-url');
const tripIdInput = document.getElementById('trip-id');
const importTokenInput = document.getElementById('import-token');
const tripSelect = document.getElementById('trip-select');
const debugModeInput = document.getElementById('debug-mode');
const detectTripButton = document.getElementById('detect-trip');
const saveListingButton = document.getElementById('save-listing');
const openSavedTripLink = document.getElementById('open-saved-trip');
const openSelectedTripLink = document.getElementById('open-selected-trip');
const authStatusElement = document.getElementById('auth-status');
const openSignInLink = document.getElementById('open-sign-in');
const refreshAuthButton = document.getElementById('refresh-auth');
const tripPickerStatusElement = document.getElementById('trip-picker-status');
const statusElement = document.getElementById('status');
const previewElement = document.getElementById('capture-preview');

let currentAuthStatus = null;

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

function setOpenSelectedTripLink(appUrl, tripId) {
  if (!appUrl || !tripId) {
    openSelectedTripLink.classList.add('hidden');
    openSelectedTripLink.setAttribute('href', '#');
    return;
  }

  openSelectedTripLink.classList.remove('hidden');
  openSelectedTripLink.setAttribute('href', new URL(`/trips/${tripId}`, `${appUrl}/`).toString());
}

function setTripPickerStatus(message, tone = 'muted') {
  tripPickerStatusElement.textContent = message;
  tripPickerStatusElement.className = `status ${tone}`;
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
  currentAuthStatus = authStatus || null;
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

function resetTripPicker(message, tone = 'muted') {
  tripSelect.disabled = true;
  tripSelect.replaceChildren(new Option(message, ''));
  setOpenSelectedTripLink(null, null);
  setTripPickerStatus(message, tone);
}

function formatTripOptionLabel(trip) {
  const detailParts = [
    trip.location,
    trip.listingCount === 1 ? '1 listing' : `${trip.listingCount} listings`,
    trip.role === 'owner' ? 'Owner' : 'Collaborator',
  ].filter(Boolean);

  return detailParts.length > 0 ? `${trip.name} (${detailParts.join(' · ')})` : trip.name;
}

function renderTripOptions(tripsList) {
  tripSelect.replaceChildren(
    ...tripsList.map((trip) => new Option(formatTripOptionLabel(trip), trip.id)),
  );
  tripSelect.disabled = tripsList.length === 0;
}

function selectTrip(tripId, appUrl) {
  const selectedTrip = tripId || '';
  tripSelect.value = selectedTrip;
  tripIdInput.value = selectedTrip;

  if (appUrl) {
    appUrlInput.value = appUrl;
  }

  setOpenSelectedTripLink(appUrl, selectedTrip);
  saveSettings();
  chrome.storage.local.set({ [storageKeys.selectedTripId]: selectedTrip });
}

async function fetchTripOptions(authStatus) {
  if (!authStatus || !authStatus.isSignedIn || !authStatus.token || !authStatus.appUrl) {
    resetTripPicker('Sign in to load trips');
    return;
  }

  tripSelect.disabled = true;
  setTripPickerStatus('Loading your trips...');

  const response = await fetch(`${authStatus.appUrl}/api/extension/trips`, {
    headers: {
      Authorization: `Bearer ${authStatus.token}`,
    },
  });
  const responseBody = await response.json();

  if (!response.ok || !responseBody.success) {
    throw new Error(responseBody.error || 'Failed to load trips.');
  }

  const tripsList = Array.isArray(responseBody.data) ? responseBody.data : [];
  if (tripsList.length === 0) {
    resetTripPicker('No trips found. Create a trip in House Vote first.');
    return;
  }

  renderTripOptions(tripsList);

  const stored = await chrome.storage.local.get(storageKeys.selectedTripId);
  const storedTripId = stored[storageKeys.selectedTripId];
  const detectedTripContext = await detectTripContext(authStatus.appUrl);
  const selectedTrip =
    tripsList.find((trip) => trip.id === storedTripId) ||
    tripsList.find((trip) => trip.id === detectedTripContext?.tripId) ||
    tripsList[0];

  selectTrip(selectedTrip.id, authStatus.appUrl);
  setTripPickerStatus(`Ready to save to "${selectedTrip.name}".`);
}

async function refreshAuthStatus() {
  authStatusElement.textContent = 'Checking House Vote sign-in...';
  authStatusElement.className = 'status muted';

  try {
    const authStatus = await sendRuntimeMessage({ type: extensionMessageTypes.authStatus });
    renderAuthStatus(authStatus);
    try {
      await fetchTripOptions(authStatus);
    } catch (error) {
      resetTripPicker(error instanceof Error ? error.message : 'Failed to load trips.', 'error');
    }
  } catch (error) {
    authStatusElement.textContent = error instanceof Error ? error.message : 'Failed to check House Vote sign-in.';
    authStatusElement.className = 'status error';
    resetTripPicker('Unable to load trips.', 'error');
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

async function detectTripContext(preferredAppUrlOverride) {
  const preferredAppUrl = (preferredAppUrlOverride || appUrlInput.value).trim().replace(/\/+$/, '');
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
  const selectedTripId = tripSelect.value.trim();
  const debugMode = Boolean(debugModeInput.checked);
  const canUseAuthenticatedImport = Boolean(
    currentAuthStatus &&
      currentAuthStatus.isSignedIn &&
      currentAuthStatus.token &&
      currentAuthStatus.appUrl &&
      selectedTripId,
  );

  if (!canUseAuthenticatedImport && (!appUrl || !tripId || !importToken)) {
    setStatus('Sign in and choose a trip, or use advanced manual setup with trip id and import token.', 'error');
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

    const importAppUrl = canUseAuthenticatedImport ? currentAuthStatus.appUrl : appUrl;
    const importTripId = canUseAuthenticatedImport ? selectedTripId : tripId;
    const response = canUseAuthenticatedImport
      ? await fetch(`${importAppUrl}/api/extension/import-listing`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentAuthStatus.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: importTripId,
            capture,
          }),
        })
      : await fetch(`${importAppUrl}/api/import-listing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: importTripId,
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
      const tripUrl = new URL(responseBody.data.tripPath, `${importAppUrl}/`).toString();
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
tripSelect.addEventListener('change', () => {
  selectTrip(tripSelect.value, appUrlInput.value.trim().replace(/\/+$/, ''));
  setTripPickerStatus('Selected trip saved.');
});
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
