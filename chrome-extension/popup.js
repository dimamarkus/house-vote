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

  function getMetaItempropContent(itemprop) {
    return normalizeText(document.querySelector(`meta[itemprop="${itemprop}"]`)?.getAttribute('content'));
  }

  function getTextFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = normalizeText(element ? element.textContent : null);
      if (value) {
        return value;
      }
    }

    return null;
  }

  function getAttributeFromSelectors(selectors, attributeName) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = normalizeText(element ? element.getAttribute(attributeName) : null);
      if (value) {
        return value;
      }
    }

    return null;
  }

  function getAllTextFromSelectors(selectors) {
    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .map((element) => normalizeText(element.textContent))
      .filter(Boolean);
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

  function collectJsonById(scriptId) {
    const scriptTag = document.getElementById(scriptId);
    if (!scriptTag) {
      return null;
    }

    try {
      return JSON.parse(scriptTag.textContent || 'null');
    } catch {
      return null;
    }
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

  function deepCollectByKey(value, targetKeys, collectedValues = []) {
    if (!value || typeof value !== 'object') {
      return collectedValues;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        deepCollectByKey(item, targetKeys, collectedValues);
      }

      return collectedValues;
    }

    for (const [key, entry] of Object.entries(value)) {
      if (targetKeys.includes(key)) {
        collectedValues.push(entry);
      }

      deepCollectByKey(entry, targetKeys, collectedValues);
    }

    return collectedValues;
  }

  function extractCount(text, patterns) {
    if (!text) {
      return null;
    }

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  function extractNightlyPriceFromText(text, source) {
    if (!text) {
      return null;
    }

    const exactNightlyPatterns =
      source === 'VRBO'
        ? [
            /The current price is \$([0-9][0-9,]*)/i,
            /\$([0-9][0-9,]*)\s+per\s+night/i,
            /\$([0-9][0-9,]*)\s*\/\s*night/i,
            /\$([0-9][0-9,]*)\s*x?\s*night/i,
          ]
        : [
            /The current price is \$([0-9][0-9,]*)/i,
            /\$([0-9][0-9,]*)\s*x?\s*night/i,
            /\$([0-9][0-9,]*)\s*\/\s*night/i,
            /\$([0-9][0-9,]*)\s+per\s+night/i,
          ];

    for (const pattern of exactNightlyPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    const priceLines = text
      .split(/\n+/)
      .map((line) => normalizeText(line))
      .filter(Boolean);

    for (const line of priceLines) {
      if (/for\s+\d+\s+nights?/i.test(line) || /fees included/i.test(line)) {
        continue;
      }

      const standaloneMatch = line.match(/\$([0-9][0-9,]*)/);
      if (standaloneMatch && standaloneMatch[1]) {
        return standaloneMatch[1];
      }
    }

    const fallbackMatch = text.match(/\$([0-9][0-9,]*)/);
    return fallbackMatch ? fallbackMatch[1] : null;
  }

  function normalizeImageUrl(urlValue) {
    const normalizedValue = normalizeText(urlValue);
    if (!normalizedValue || normalizedValue.startsWith('data:')) {
      return null;
    }

    const lowerCaseValue = normalizedValue.toLowerCase();
    const excludedFragments = ['avatar', 'profile', 'logo', 'icon', 'flag', 'mapbox', 'staticmap'];
    if (excludedFragments.some((fragment) => lowerCaseValue.includes(fragment))) {
      return null;
    }

    try {
      return new URL(normalizedValue, window.location.href).toString();
    } catch {
      return null;
    }
  }

  function normalizePhotoUrls(values) {
    return Array.from(new Set(values.map(normalizeImageUrl).filter(Boolean))).slice(0, 20);
  }

  function parseStructuredImageValues(values) {
    const images = [];

    for (const entry of values) {
      if (!entry) {
        continue;
      }

      if (typeof entry === 'string') {
        images.push(entry);
        continue;
      }

      if (Array.isArray(entry)) {
        for (const item of entry) {
          if (typeof item === 'string') {
            images.push(item);
          } else if (item && typeof item === 'object' && typeof item.url === 'string') {
            images.push(item.url);
          }
        }
        continue;
      }

      if (typeof entry === 'object' && typeof entry.url === 'string') {
        images.push(entry.url);
      }
    }

    return images;
  }

  function getSourceSpecificSelectors(source) {
    if (source === 'AIRBNB') {
      return {
        title: ['main h1', 'h1[data-testid]', '[data-section-id="TITLE_DEFAULT"] h1'],
        address: ['main h2', '[data-testid="subtitle"]', '[data-section-id="TITLE_DEFAULT"] h2'],
        price: [
          '[data-testid="book-it-default"]',
          '[data-testid="price-availability-row"]',
          '[data-testid="structured-display-price"]',
        ],
      };
    }

    if (source === 'VRBO') {
      return {
        title: ['main h1', 'h1[data-stid]', 'h1'],
        address: ['[data-stid="content-h1"] + div', '[data-stid="content-h1"] ~ div', 'main h1 + div'],
        price: [
          '[data-wdio="price-per-night"]',
          '[data-stid="price-summary-message"]',
          '[data-stid="price-summary"]',
        ],
      };
    }

    return {
      title: ['main h1', 'h1'],
      address: ['main h2'],
      price: [],
    };
  }

  function summarizeAmenities(jsonLdBlocks) {
    const amenityValues = [];

    for (const feature of deepCollectByKey(jsonLdBlocks, ['amenityFeature'])) {
      if (Array.isArray(feature)) {
        for (const item of feature) {
          if (item && typeof item === 'object' && typeof item.name === 'string') {
            amenityValues.push(item.name);
          }
        }
      }
    }

    return Array.from(new Set(amenityValues.map((value) => value.trim()).filter(Boolean))).slice(0, 6);
  }

  function buildAddress(parts) {
    return Array.from(new Set(parts.filter(Boolean))).join(', ') || null;
  }

  function extractAirbnbHints() {
    const titleSectionText = getTextFromSelectors([
      '[data-section-id="TITLE_DEFAULT"]',
      '[data-plugin-in-point-id="TITLE_DEFAULT"]',
    ]);
    const summaryText = getTextFromSelectors([
      '[data-section-id="TITLE_DEFAULT"] ol',
      '[data-plugin-in-point-id="TITLE_DEFAULT"] ol',
      '[data-section-id="TITLE_DEFAULT"] h2 + div',
    ]);
    const priceContainerText = getTextFromSelectors([
      '[data-testid="book-it-default"]',
      '[data-testid="book-it-hover-target"]',
    ]);

    return {
      title:
        getTextFromSelectors([
          '[data-section-id="TITLE_DEFAULT"] h1',
          '[data-plugin-in-point-id="TITLE_DEFAULT"] h1',
          'main h1',
        ]) || null,
      address:
        getTextFromSelectors([
          '[data-section-id="TITLE_DEFAULT"] h2',
          '[data-plugin-in-point-id="TITLE_DEFAULT"] h2',
          'main h2',
        ]) || null,
      roomSummaryText: summaryText || titleSectionText || '',
      price: extractNightlyPriceFromText(priceContainerText || '', 'AIRBNB'),
      rawSignals: {
        titleSectionText: titleSectionText ? titleSectionText.slice(0, 500) : null,
        summaryText: summaryText ? summaryText.slice(0, 300) : null,
        priceContainerText: priceContainerText ? priceContainerText.slice(0, 300) : null,
      },
    };
  }

  function extractVrboHints() {
    const priceSummaryTexts = getAllTextFromSelectors(['[data-test-id="price-summary-message-line"]']);
    const priceSummaryText = getTextFromSelectors(['[data-test-id="price-summary"]']);
    const headlineText = getTextFromSelectors([
      '#product-headline',
      '[data-stid="content-hotel-title"]',
    ]);

    return {
      title:
        getTextFromSelectors([
          '#product-headline h1',
          '[data-stid="content-hotel-title"] h1',
          'main h1',
        ]) || getMetaItempropContent('name'),
      address: buildAddress([
        getMetaItempropContent('streetAddress'),
        getMetaItempropContent('addressLocality'),
        getMetaItempropContent('addressRegion'),
      ]),
      roomSummaryText: [
        headlineText,
        ...priceSummaryTexts.slice(0, 4),
      ]
        .filter(Boolean)
        .join(' '),
      price: extractNightlyPriceFromText(
        [priceSummaryText, ...priceSummaryTexts].filter(Boolean).join('\n'),
        'VRBO',
      ),
      rawSignals: {
        headlineText: headlineText ? headlineText.slice(0, 500) : null,
        priceSummaryTexts: priceSummaryTexts.slice(0, 6),
      },
    };
  }

  const hostname = window.location.hostname.toLowerCase();
  const source = hostname.includes('airbnb')
    ? 'AIRBNB'
    : hostname.includes('vrbo')
      ? 'VRBO'
      : 'UNKNOWN';
  const selectors = getSourceSpecificSelectors(source);
  const jsonLdBlocks = collectJsonLd();
  const structuredListing = findStructuredListing(jsonLdBlocks);
  const nextData = collectJsonById('__NEXT_DATA__');
  const pageText = document.body ? document.body.innerText.replace(/\s+/g, ' ') : '';
  const sourceHints =
    source === 'AIRBNB'
      ? extractAirbnbHints()
      : source === 'VRBO'
        ? extractVrboHints()
        : {
            title: null,
            address: null,
            roomSummaryText: '',
            price: null,
            rawSignals: {},
          };
  const canonicalUrl =
    getAttributeFromSelectors(['link[rel="canonical"]'], 'href') ||
    getMetaContent('meta[property="og:url"]') ||
    window.location.href;
  const ogImage = getMetaContent('meta[property="og:image"]');
  const structuredImages = parseStructuredImageValues(deepCollectByKey(jsonLdBlocks, ['image']));
  const nextDataImages = parseStructuredImageValues(deepCollectByKey(nextData, ['image', 'images', 'pictureUrls']));
  const titleCandidates = [
    sourceHints.title,
    getMetaContent('meta[property="og:title"]'),
    normalizeText(structuredListing && structuredListing.name),
    getTextFromSelectors(selectors.title),
    normalizeText(document.title),
  ].filter(Boolean);
  const title =
    titleCandidates[0] || null;
  const addressCandidates = [
    sourceHints.address,
    normalizeText(structuredListing && structuredListing.address && structuredListing.address.streetAddress),
    normalizeText(structuredListing && structuredListing.address && structuredListing.address.addressLocality),
    getTextFromSelectors(selectors.address),
    normalizeText(document.querySelector('meta[property="og:description"]')?.getAttribute('content')),
  ].filter(Boolean);
  const address =
    addressCandidates[0] || null;
  const structuredOffers = deepCollectByKey(structuredListing, ['offers'])[0];
  const structuredPrice =
    structuredOffers && typeof structuredOffers === 'object' && !Array.isArray(structuredOffers)
      ? normalizeText(structuredOffers.price || structuredOffers.priceSpecification?.price)
      : null;
  const selectorPrice = getTextFromSelectors(selectors.price);
  const amenitySummary = summarizeAmenities(jsonLdBlocks);
  const photoUrls = normalizePhotoUrls([
    ogImage,
    ...structuredImages,
    ...nextDataImages,
    ...Array.from(document.images).map((image) => image.currentSrc || image.src).filter(Boolean),
  ]);
  const selectorSignals = {
    title: getAllTextFromSelectors(selectors.title).slice(0, 3),
    address: getAllTextFromSelectors(selectors.address).slice(0, 3),
    price: getAllTextFromSelectors(selectors.price).slice(0, 3),
  };
  const notesParts = [
    source === 'VRBO' && getMetaItempropContent('identifier')
      ? `VRBO property id: ${getMetaItempropContent('identifier')}`
      : null,
    normalizeText(getMetaContent('meta[name="description"]')),
    amenitySummary.length > 0 ? `Amenities: ${amenitySummary.join(', ')}` : null,
  ].filter(Boolean);
  const roomSummaryText = [sourceHints.roomSummaryText, pageText].filter(Boolean).join(' ');

  return {
    source,
    url: canonicalUrl,
    title,
    address,
    price:
      sourceHints.price ||
      normalizeText(getMetaContent('meta[property="product:price:amount"]')) ||
      structuredPrice ||
      normalizeText(selectorPrice) ||
      extractNightlyPriceFromText(pageText, source),
    bedroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+bedrooms?\b/i]),
    bedCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+beds?\b/i]),
    bathroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+(?:bathrooms?|baths?)\b/i]),
    notes: notesParts.join(' | ') || null,
    imageUrl: photoUrls[0] || null,
    photoUrls,
    rawPayload: {
      parserVersion: 'v3',
      pageTitle: document.title,
      hostname,
      structuredDataCount: jsonLdBlocks.length,
      structuredDataTypes: jsonLdBlocks
        .map((block) => (block && typeof block === 'object' ? block['@type'] : null))
        .filter(Boolean)
        .slice(0, 10),
      selectorSignals,
      titleCandidates,
      addressCandidates,
      amenitySummary,
      sourceSignals: sourceHints.rawSignals,
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

    if (capture.source === 'UNKNOWN') {
      throw new Error('This page is not recognized as an Airbnb or VRBO listing page.');
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

    const missingFields = Array.isArray(responseBody.data.missingFields) ? responseBody.data.missingFields : [];
    const missingFieldMessage =
      missingFields.length > 0 ? ` Missing: ${missingFields.join(', ')}.` : '';

    setStatus(
      `Saved ${capture.title || 'listing'} (${responseBody.data.source}, ${responseBody.data.importStatus.toLowerCase()}).${missingFieldMessage}`,
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
