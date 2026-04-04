(function registerHouseVoteListingParser() {
  const PARSER_VERSION = '2026-04-hardening-1-extension';

  function normalizeText(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.replace(/\s+/g, ' ').trim();
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

  function getAllTextFromSelectors(selectors) {
    return selectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .map((element) => normalizeText(element.textContent))
      .filter(Boolean);
  }

  function getAttributeFromSelectors(selectors, attributeName) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = normalizeImageUrl(element ? element.getAttribute(attributeName) : null, {
        allowUiAssets: true,
      });
      if (value) {
        return value;
      }
    }

    return null;
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

  function normalizeImageUrl(urlValue, options = {}) {
    const normalizedValue = normalizeText(urlValue);
    if (!normalizedValue || normalizedValue.startsWith('data:')) {
      return null;
    }

    const lowerCaseValue = normalizedValue.toLowerCase();
    const excludedFragments = [
      'avatar',
      'profile',
      '/users/',
      '/user/',
      'logo',
      'icon',
      'flag',
      'mapbox',
      'staticmap',
      'travel-assets',
      'onekey',
      'vrbocare',
      '.svg',
    ];
    if (!options.allowUiAssets && excludedFragments.some((fragment) => lowerCaseValue.includes(fragment))) {
      return null;
    }

    try {
      return new URL(normalizedValue, window.location.href).toString();
    } catch {
      return null;
    }
  }

  function normalizePhotoUrls(values) {
    return Array.from(new Set(values.map((value) => normalizeImageUrl(value)).filter(Boolean))).slice(0, 20);
  }

  function parseSrcSetValues(srcset) {
    const normalizedValue = normalizeText(srcset);
    if (!normalizedValue) {
      return [];
    }

    return normalizedValue
      .split(',')
      .map((entry) => normalizeText(entry.split(/\s+/)[0] || null))
      .filter(Boolean);
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
      if (!Array.isArray(feature)) {
        continue;
      }

      for (const item of feature) {
        if (item && typeof item === 'object' && typeof item.name === 'string') {
          amenityValues.push(item.name);
        }
      }
    }

    return Array.from(new Set(amenityValues.map((value) => value.trim()).filter(Boolean))).slice(0, 6);
  }

  function buildAddress(parts) {
    return Array.from(new Set(parts.filter(Boolean))).join(', ') || null;
  }

  function pickCandidate(candidates) {
    const normalizedCandidates = candidates.map((candidate) => ({
      label: candidate.label,
      value: normalizeText(candidate.value),
    }));
    const winner = normalizedCandidates.find((candidate) => candidate.value) || null;

    return {
      value: winner ? winner.value : null,
      winner: winner ? winner.label : null,
      candidates: normalizedCandidates.filter((candidate) => candidate.value),
    };
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
        titleSectionText,
        summaryText,
        priceContainerText,
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
      roomSummaryText: [headlineText, ...priceSummaryTexts.slice(0, 4)].filter(Boolean).join(' '),
      price: extractNightlyPriceFromText(
        [priceSummaryText, ...priceSummaryTexts].filter(Boolean).join('\n'),
        'VRBO',
      ),
      rawSignals: {
        headlineText,
        priceSummaryTexts: priceSummaryTexts.slice(0, 6),
      },
    };
  }

  function extractListingCaptureFromPage() {
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
      normalizeImageUrl(getMetaContent('meta[property="og:url"]'), { allowUiAssets: true }) ||
      window.location.href;
    const titleSelection = pickCandidate([
      { label: 'source-hint', value: sourceHints.title },
      { label: 'og:title', value: getMetaContent('meta[property="og:title"]') },
      { label: 'structured:name', value: normalizeText(structuredListing && structuredListing.name) },
      { label: 'selector:title', value: getTextFromSelectors(selectors.title) },
      { label: 'document:title', value: document.title },
    ]);
    const structuredAddress =
      structuredListing && structuredListing.address && typeof structuredListing.address === 'object'
        ? buildAddress([
            normalizeText(structuredListing.address.streetAddress),
            normalizeText(structuredListing.address.addressLocality),
            normalizeText(structuredListing.address.addressRegion),
          ])
        : null;
    const addressSelection = pickCandidate([
      { label: 'source-hint', value: sourceHints.address },
      { label: 'structured:address', value: structuredAddress },
      { label: 'selector:address', value: getTextFromSelectors(selectors.address) },
      { label: 'meta:description', value: getMetaContent('meta[property="og:description"]') },
    ]);
    const structuredOffers = deepCollectByKey(structuredListing, ['offers'])[0];
    const structuredPrice =
      structuredOffers && typeof structuredOffers === 'object' && !Array.isArray(structuredOffers)
        ? normalizeText(
            String(
              structuredOffers.price ||
                (structuredOffers.priceSpecification && structuredOffers.priceSpecification.price) ||
                '',
            ),
          )
        : null;
    const priceSelection = pickCandidate([
      { label: 'source-hint', value: sourceHints.price },
      { label: 'meta:product-price', value: getMetaContent('meta[property="product:price:amount"]') },
      { label: 'structured:offers.price', value: structuredPrice },
      { label: 'selector:price', value: getTextFromSelectors(selectors.price) },
      { label: 'body:text', value: extractNightlyPriceFromText(pageText, source) },
    ]);
    const structuredImages = parseStructuredImageValues(deepCollectByKey(jsonLdBlocks, ['image']));
    const nextDataImages = parseStructuredImageValues(deepCollectByKey(nextData, ['image', 'images', 'pictureUrls']));
    const domImages = Array.from(document.images).flatMap((image) => [
      image.currentSrc || image.src,
      image.getAttribute('data-src'),
      image.getAttribute('data-original'),
      ...parseSrcSetValues(image.getAttribute('srcset')),
      ...parseSrcSetValues(image.getAttribute('data-srcset')),
    ]);
    const photoUrls = normalizePhotoUrls([
      getMetaContent('meta[property="og:image"]'),
      ...structuredImages,
      ...nextDataImages,
      ...domImages,
    ]);
    const amenitySummary = summarizeAmenities(jsonLdBlocks);
    const roomSummaryText = [sourceHints.roomSummaryText, pageText].filter(Boolean).join(' ');
    const notesParts = [
      source === 'VRBO' && getMetaItempropContent('identifier')
        ? `VRBO property id: ${getMetaItempropContent('identifier')}`
        : null,
      normalizeText(getMetaContent('meta[name="description"]')),
      amenitySummary.length > 0 ? `Amenities: ${amenitySummary.join(', ')}` : null,
    ].filter(Boolean);
    const selectorSignals = {
      title: getAllTextFromSelectors(selectors.title).slice(0, 3),
      address: getAllTextFromSelectors(selectors.address).slice(0, 3),
      price: getAllTextFromSelectors(selectors.price).slice(0, 3),
    };
    const parserDebug = {
      parserVersion: PARSER_VERSION,
      source,
      hostname,
      canonicalUrl,
      title: {
        winner: titleSelection.winner,
        candidates: titleSelection.candidates,
      },
      address: {
        winner: addressSelection.winner,
        candidates: addressSelection.candidates,
      },
      price: {
        winner: priceSelection.winner,
        candidates: priceSelection.candidates,
      },
      photoCount: photoUrls.length,
      structuredDataTypes: jsonLdBlocks
        .map((block) => (block && typeof block === 'object' ? block['@type'] : null))
        .flat()
        .filter(Boolean)
        .slice(0, 10),
      selectorSignals,
      sourceSignals: sourceHints.rawSignals,
      amenitySummary,
    };

    return {
      source,
      url: canonicalUrl,
      title: titleSelection.value,
      address: addressSelection.value,
      price: priceSelection.value,
      bedroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+bedrooms?\b/i]),
      bedCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+beds?\b/i]),
      bathroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+(?:bathrooms?|baths?)\b/i]),
      notes: notesParts.join(' | ') || null,
      imageUrl: photoUrls[0] || null,
      photoUrls,
      rawPayload: {
        parserDebug,
      },
    };
  }

  window.houseVoteListingParser = {
    extractListingCaptureFromPage,
  };
}());
