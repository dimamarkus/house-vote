(function registerHouseVoteListingParser() {
  const PARSER_VERSION = '2026-04-hardening-2-extension-booking';

  function normalizeText(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.replace(/\s+/g, ' ').trim();
    return trimmed ? trimmed : null;
  }

  /**
   * Returns only the direct text nodes of an element, skipping any nested
   * child elements. Useful when a container interleaves useful top-level
   * text with nested tooltips / rating widgets / icon labels (Booking's
   * address wrapper is the canonical example).
   */
  function getDirectText(element) {
    if (!element) {
      return null;
    }

    const textNodes = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' ');
    return normalizeText(textNodes);
  }

  function getDirectTextFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = getDirectText(element);
      if (value) {
        return value;
      }
    }

    return null;
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

    if (source === 'BOOKING') {
      return {
        title: [
          '#hp_hotel_name h2.pp-header__title',
          'h2.pp-header__title',
          '[data-testid="breadcrumb-current"]',
        ],
        address: ['[data-testid="PropertyHeaderAddressDesktop-wrapper"]'],
        price: ['.js-average-per-night-price', '[data-testid="price-and-discounted-price"]'],
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

  function extractRoomBreakdownFromVrbo() {
    const rooms = Array.from(document.querySelectorAll('[data-stid="content-item"]'))
      .map((item) => {
        const name = normalizeText(item.querySelector('h4')?.textContent || null);
        if (!name || !/^(Bedroom|Living Room|Office|Den|Loft|Game Room|Studio)\b/i.test(name)) {
          return null;
        }

        const beds =
          Array.from(item.querySelectorAll('.uitk-text, [class*="uitk-text"]'))
            .map((candidate) => normalizeText(candidate.textContent))
            .find(
              (value) =>
                Boolean(value) &&
                value !== name &&
                /\b(beds?|sofa(?:\s+beds?)?|futon|cribs?|mattress(?:es)?)\b/i.test(value),
            ) || null;

        return beds ? { name, beds } : null;
      })
      .filter(Boolean);

    if (rooms.length === 0) return null;

    const summary =
      Array.from(document.querySelectorAll('h3'))
        .map((heading) => normalizeText(heading.textContent))
        .find((value) => value && /\bbedrooms?\b/i.test(value) && /\bsleeps\b/i.test(value)) || null;

    return { summary, rooms };
  }

  function extractRoomBreakdownFromAirbnb() {
    const carouselRooms = Array.from(
      document.querySelectorAll('[data-section-id="SLEEPING_ARRANGEMENT_WITH_IMAGES"] li[data-key]'),
    )
      .map((item) => {
        const name = normalizeText(item.getAttribute('data-key'));
        if (!name) {
          return null;
        }

        const beds =
          Array.from(item.querySelectorAll('div, span'))
            .map((candidate) => normalizeText(candidate.textContent))
            .map((value) => {
              if (!value) {
                return null;
              }

              if (value.startsWith(name)) {
                return normalizeText(value.slice(name.length));
              }

              return value;
            })
            .find(
              (value) =>
                Boolean(value) &&
                value !== name &&
                /\b(beds?|cribs?|bunk\s+beds?|sofa(?:\s+beds?)?|futon|mattress(?:es)?)\b/i.test(value),
            ) || null;

        const image = item.querySelector('img');
        const imageUrl =
          normalizeImageUrl(image?.getAttribute('data-original-uri') || image?.currentSrc || image?.getAttribute('src')) ||
          null;

        return beds ? { name, beds, imageUrl } : null;
      })
      .filter(Boolean);

    if (carouselRooms.length > 0) {
      return { summary: null, rooms: carouselRooms };
    }

    const rooms = [];
    const bodyText = document.body ? document.body.innerText : '';
    const pattern = /(Bedroom \d+)\s+([\d]+ [\w]+ beds?(?:,\s*\d+ [\w]+ beds?)*)/gi;
    let match;
    while ((match = pattern.exec(bodyText)) !== null) {
      rooms.push({ name: match[1], beds: match[2], imageUrl: null });
    }
    if (rooms.length === 0) return null;
    return { summary: null, rooms };
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

  /**
   * Mirrors the server-side bookingAdapter.ts. We can't import that module
   * (it's cheerio-based and bundled server-only), so the selectors and
   * heuristics live here too. Keep the two in sync when either side changes.
   */
  function extractBookingAddress() {
    const wrapper = document.querySelector('[data-testid="PropertyHeaderAddressDesktop-wrapper"]');
    if (!wrapper) {
      return null;
    }

    const candidates = wrapper.querySelectorAll('div, span, a');
    for (const element of candidates) {
      const directText = getDirectText(element);
      if (!directText) {
        continue;
      }
      // "street, city, region-or-country" — street-number prefix filters out
      // tooltip copy like "Excellent location - 9.6/10 (3728 reviews)".
      const commaCount = (directText.match(/,/g) || []).length;
      if (commaCount >= 2 && /\d/.test(directText)) {
        return directText;
      }
    }

    return null;
  }

  function extractBookingCheapestNightly() {
    let cheapest = null;
    let cheapestRaw = null;

    const nightlyElements = document.querySelectorAll('.js-average-per-night-price');

    for (const element of nightlyElements) {
      const rawAttr = element.getAttribute('data-price-per-night-raw');
      if (!rawAttr) {
        continue;
      }
      const parsed = Number.parseFloat(rawAttr);
      if (Number.isFinite(parsed) && parsed > 0 && (cheapest === null || parsed < cheapest)) {
        cheapest = parsed;
        cheapestRaw = rawAttr;
      }
    }

    if (cheapest === null) {
      for (const element of nightlyElements) {
        const text = normalizeText(element.textContent);
        if (!text) {
          continue;
        }
        const match = text.match(/\$?([0-9][0-9,]*(?:\.\d+)?)/);
        if (!match) {
          continue;
        }
        const parsed = Number.parseFloat(match[1].replace(/,/g, ''));
        if (Number.isFinite(parsed) && parsed > 0 && (cheapest === null || parsed < cheapest)) {
          cheapest = parsed;
        }
      }
    }

    return {
      dollars: cheapest === null ? null : Math.round(cheapest),
      rawAttr: cheapestRaw,
    };
  }

  function addDaysToIso(isoStart, days) {
    const start = new Date(isoStart);
    if (Number.isNaN(start.getTime())) {
      return null;
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + days);
    return end.toISOString().slice(0, 10);
  }

  function extractBookingStayMeta() {
    let startDate = null;
    let endDate = null;

    try {
      const url = new URL(window.location.href);
      startDate = url.searchParams.get('checkin');
      endDate = url.searchParams.get('checkout');
    } catch {
      // Non-URL contexts shouldn't happen in a content script, but fall through
    }

    if (!startDate) {
      startDate = normalizeText(document.querySelector('input[name="checkin"]')?.getAttribute('value'));
    }
    if (!endDate) {
      endDate = normalizeText(document.querySelector('input[name="checkout"]')?.getAttribute('value'));
    }

    let nights = null;
    const nightsLabelText = Array.from(document.querySelectorAll('.bui-price-display__label'))
      .map((element) => normalizeText(element.textContent))
      .find((text) => text && /\b\d+\s+nights?\b/i.test(text));
    const nightsMatch = nightsLabelText ? nightsLabelText.match(/\b(\d+)\s+nights?\b/i) : null;
    if (nightsMatch) {
      nights = Number.parseInt(nightsMatch[1], 10);
    }

    if (!endDate && startDate && nights) {
      endDate = addDaysToIso(startDate, nights);
    }

    return { startDate, endDate, nights };
  }

  function extractBookingHints() {
    const title = getDirectTextFromSelectors([
      '#hp_hotel_name h2.pp-header__title',
      'h2.pp-header__title',
      '[data-testid="breadcrumb-current"]',
    ]);
    const address = extractBookingAddress();
    const pricing = extractBookingCheapestNightly();
    const stayMeta = extractBookingStayMeta();
    const description = normalizeText(
      document.querySelector('[data-testid="property-description"]')?.textContent,
    );
    const hotelId = normalizeText(document.querySelector('input[name="hotel_id"]')?.getAttribute('value'));

    const priceMeta =
      pricing.dollars !== null
        ? {
            basis: 'NIGHTLY',
            nights: stayMeta.nights,
            startDate: stayMeta.startDate,
            endDate: stayMeta.endDate,
          }
        : null;

    return {
      title: title || null,
      address: address || null,
      sourceDescription: description,
      roomSummaryText: '',
      price: pricing.dollars !== null ? String(pricing.dollars) : null,
      priceMeta,
      rawSignals: {
        hotelId,
        rawPricePerNight: pricing.rawAttr,
        checkin: stayMeta.startDate,
        checkout: stayMeta.endDate,
        nights: stayMeta.nights,
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

  function detectSourceFromHostname(hostname) {
    if (hostname.includes('airbnb')) {
      return 'AIRBNB';
    }
    if (hostname.includes('vrbo')) {
      return 'VRBO';
    }
    if (hostname.includes('booking.com')) {
      return 'BOOKING';
    }
    return 'UNKNOWN';
  }

  const EMPTY_HINTS = {
    title: null,
    address: null,
    roomSummaryText: '',
    price: null,
    rawSignals: {},
    sourceDescription: null,
    priceMeta: null,
  };

  function pickHintsForSource(source) {
    if (source === 'AIRBNB') {
      return extractAirbnbHints();
    }
    if (source === 'VRBO') {
      return extractVrboHints();
    }
    if (source === 'BOOKING') {
      return extractBookingHints();
    }
    return EMPTY_HINTS;
  }

  function extractListingCaptureFromPage() {
    const hostname = window.location.hostname.toLowerCase();
    const source = detectSourceFromHostname(hostname);
    const selectors = getSourceSpecificSelectors(source);
    const jsonLdBlocks = collectJsonLd();
    const structuredListing = findStructuredListing(jsonLdBlocks);
    const nextData = collectJsonById('__NEXT_DATA__');
    const pageText = document.body ? document.body.innerText.replace(/\s+/g, ' ') : '';
    const sourceHints = pickHintsForSource(source);
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
      {
        label: 'selector:price',
        value: extractNightlyPriceFromText(getTextFromSelectors(selectors.price) || '', source),
      },
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
      priceMeta: sourceHints.priceMeta || null,
      sourceDescription: sourceHints.sourceDescription || null,
      bedroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+bedrooms?\b/i]),
      bedCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+beds?\b/i]),
      bathroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+(?:bathrooms?|baths?)\b/i]),
      notes: notesParts.join(' | ') || null,
      imageUrl: photoUrls[0] || null,
      photoUrls,
      roomBreakdown:
        source === 'VRBO'
          ? extractRoomBreakdownFromVrbo()
          : source === 'AIRBNB'
            ? extractRoomBreakdownFromAirbnb()
            : null,
      rawPayload: {
        parserDebug,
      },
    };
  }

  window.houseVoteListingParser = {
    extractListingCaptureFromPage,
  };
}());
