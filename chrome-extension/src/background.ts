/// <reference types="chrome" />

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  if (!request || typeof request !== 'object' || !('type' in request)) {
    return false;
  }

  if (request.type === 'HOUSE_VOTE_EXTENSION_HEALTH_CHECK') {
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
