const storageKeys = {
  appUrl: 'houseVoteAppUrl',
  tripId: 'houseVoteTripId',
  importToken: 'houseVoteImportToken',
};

const appUrlInput = document.getElementById('app-url');
const tripIdInput = document.getElementById('trip-id');
const importTokenInput = document.getElementById('import-token');
const saveListingButton = document.getElementById('save-listing');
const statusElement = document.getElementById('status');
const previewElement = document.getElementById('capture-preview');

function setStatus(message, tone = 'muted') {
  statusElement.textContent = message;
  statusElement.className = `status ${tone}`;
}

function saveSettings() {
  chrome.storage.local.set({
    [storageKeys.appUrl]: appUrlInput.value.trim(),
    [storageKeys.tripId]: tripIdInput.value.trim(),
    [storageKeys.importToken]: importTokenInput.value.trim(),
  });
}

async function loadSettings() {
  const stored = await chrome.storage.local.get(Object.values(storageKeys));

  appUrlInput.value = stored[storageKeys.appUrl] || 'http://localhost:3000';
  tripIdInput.value = stored[storageKeys.tripId] || '';
  importTokenInput.value = stored[storageKeys.importToken] || '';
}

function extractListingCaptureFromPage() {
  function normalizeText(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  function getMetaContent(selector) {
    const element = document.querySelector(selector);
    return normalizeText(element ? element.getAttribute('content') : null);
  }

  function collectJsonLd() {
    return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .flatMap((scriptTag) => {
        try {
          const parsed = JSON.parse(scriptTag.textContent || 'null');
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      })
      .filter(Boolean);
  }

  function findStructuredListing(blocks) {
    return (
      blocks.find((entry) => {
        const typeValue = entry && typeof entry === 'object' ? entry['@type'] : null;

        if (Array.isArray(typeValue)) {
          return typeValue.includes('Product') || typeValue.includes('LodgingBusiness');
        }

        return typeValue === 'Product' || typeValue === 'LodgingBusiness';
      }) || null
    );
  }

  function extractCount(pageText, label) {
    const regex = new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s+${label}`, 'i');
    const match = pageText.match(regex);

    return match ? match[1] : null;
  }

  function extractPrice(pageText) {
    const regex = /\$([0-9][0-9,]*)/;
    const match = pageText.match(regex);
    return match ? match[1] : null;
  }

  function normalizePhotoUrls(values) {
    return Array.from(new Set(values.filter(Boolean))).slice(0, 12);
  }

  const hostname = window.location.hostname.toLowerCase();
  const source = hostname.includes('airbnb')
    ? 'AIRBNB'
    : hostname.includes('vrbo')
      ? 'VRBO'
      : 'UNKNOWN';
  const jsonLdBlocks = collectJsonLd();
  const structuredListing = findStructuredListing(jsonLdBlocks);
  const pageText = document.body ? document.body.innerText.replace(/\s+/g, ' ') : '';
  const ogImage = getMetaContent('meta[property="og:image"]');
  const title =
    normalizeText(getMetaContent('meta[property="og:title"]')) ||
    normalizeText(structuredListing && structuredListing.name) ||
    normalizeText(document.querySelector('h1') ? document.querySelector('h1').textContent : null) ||
    normalizeText(document.title);
  const address =
    normalizeText(structuredListing && structuredListing.address && structuredListing.address.streetAddress) ||
    normalizeText(structuredListing && structuredListing.address && structuredListing.address.addressLocality) ||
    normalizeText(document.querySelector('meta[property="og:description"]')?.getAttribute('content'));
  const photoUrls = normalizePhotoUrls([
    ogImage,
    ...Array.from(document.images).map((image) => image.currentSrc || image.src).filter(Boolean),
  ]);

  return {
    source,
    url: window.location.href,
    title,
    address,
    price: normalizeText(getMetaContent('meta[property="product:price:amount"]')) || extractPrice(pageText),
    bedroomCount: extractCount(pageText, 'bedroom'),
    bedCount: extractCount(pageText, 'bed'),
    bathroomCount: extractCount(pageText, 'bath'),
    notes: normalizeText(getMetaContent('meta[name="description"]')),
    imageUrl: photoUrls[0] || null,
    photoUrls,
    rawPayload: {
      pageTitle: document.title,
      hostname,
      structuredDataCount: jsonLdBlocks.length,
    },
  };
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function captureListingFromActiveTab(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractListingCaptureFromPage,
  });

  return result && result.result ? result.result : null;
}

async function saveCurrentListing() {
  const appUrl = appUrlInput.value.trim().replace(/\/+$/, '');
  const tripId = tripIdInput.value.trim();
  const importToken = importTokenInput.value.trim();

  if (!appUrl || !tripId || !importToken) {
    setStatus('House Vote URL, trip id, and import token are required.', 'error');
    return;
  }

  saveListingButton.disabled = true;
  setStatus('Capturing listing from active tab...');

  try {
    const activeTab = await getCurrentTab();

    if (!activeTab || !activeTab.id) {
      throw new Error('No active tab found.');
    }

    const capture = await captureListingFromActiveTab(activeTab.id);

    if (!capture || !capture.url) {
      throw new Error('Could not parse this page. Open an Airbnb or VRBO listing and try again.');
    }

    previewElement.textContent = JSON.stringify(capture, null, 2);
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

    setStatus(
      `Saved ${capture.title || 'listing'} (${responseBody.data.source}, ${responseBody.data.importStatus.toLowerCase()}).`,
      'success',
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unexpected import error.', 'error');
  } finally {
    saveListingButton.disabled = false;
  }
}

appUrlInput.addEventListener('change', saveSettings);
tripIdInput.addEventListener('change', saveSettings);
importTokenInput.addEventListener('change', saveSettings);
saveListingButton.addEventListener('click', saveCurrentListing);

loadSettings().catch(() => {
  setStatus('Failed to load saved settings.', 'error');
});
