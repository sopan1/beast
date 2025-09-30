// preload-full-spoof.js
(() => {
  const { ipcRenderer } = require('electron');

  let SPOOF = {
    timeZone: null,
    userAgent: null,
    acceptLanguage: null,
    platform: null,
    appName: null,
    appVersion: null,
    languages: null
  };

  // Apply everything when we get settings
  ipcRenderer.on('spoof:set', (evt, payload) => {
    try {
      Object.assign(SPOOF, payload || {});
      if (!SPOOF.languages && SPOOF.acceptLanguage) {
        // derive navigator.languages from Accept-Language header
        SPOOF.languages = SPOOF.acceptLanguage.split(',').map(s => s.split(';')[0].trim());
      }
      applyAllSpoofs();
    } catch (e) {
      console.warn('spoof:set failed', e);
    }
  });

  // Expose a query in case main asks (optional)
  ipcRenderer.handle('spoof:get', () => SPOOF);

  // --- Helper: safeDefine ---
  function safeDefine(obj, prop, descriptor) {
    try {
      Object.defineProperty(obj, prop, descriptor);
    } catch (e) {
      // ignore
    }
  }

  // --- main apply function ---
  function applyAllSpoofs() {
    try {
      // 1) USER AGENT & navigator.* props
      if (SPOOF.userAgent) {
        // navigator.userAgent
        safeDefine(navigator, 'userAgent', { get: () => SPOOF.userAgent, configurable: true });
        // navigator.platform
        if (SPOOF.platform) safeDefine(navigator, 'platform', { get: () => SPOOF.platform, configurable: true });
        // navigator.appName & appVersion
        if (SPOOF.appName) safeDefine(navigator, 'appName', { get: () => SPOOF.appName, configurable: true });
        if (SPOOF.appVersion) safeDefine(navigator, 'appVersion', { get: () => SPOOF.appVersion, configurable: true });
      }

      // navigator.languages and navigator.language
      if (SPOOF.languages && SPOOF.languages.length) {
        safeDefine(navigator, 'languages', { get: () => Array.from(SPOOF.languages), configurable: true });
        safeDefine(navigator, 'language', { get: () => SPOOF.languages[0] || 'en-US', configurable: true });
      } else if (SPOOF.acceptLanguage) {
        const langs = SPOOF.acceptLanguage.split(',').map(s => s.split(';')[0].trim());
        safeDefine(navigator, 'languages', { get: () => langs, configurable: true });
        safeDefine(navigator, 'language', { get: () => langs[0] || 'en-US', configurable: true });
      }

      // navigator.webdriver -> false
      safeDefine(navigator, 'webdriver', { get: () => false, configurable: true });

      // plugins and mimeTypes: provide small realistic stub arrays to avoid empty-array suspicion
      try {
        const fakePlugins = [{
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format'
        }, {
          name: 'Widevine Content Decryption Module',
          filename: 'widevinecdm',
          description: 'Widevine CDM'
        }];

        safeDefine(navigator, 'plugins', { get: () => fakePlugins, configurable: true });
        safeDefine(navigator, 'mimeTypes', { get: () => [], configurable: true });
      } catch (e) { /* ignore */ }

      // 2) TIMEZONE / Intl / Date spoof (if provided)
      if (SPOOF.timeZone) {
        try {
          const tz = SPOOF.timeZone;

          // override resolvedOptions
          const realResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
          safeDefine(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
            configurable: true, writable: true,
            value: function () {
              const real = realResolved.call(this);
              return Object.assign({}, real, { timeZone: tz });
            }
          });

          // override Intl.DateTimeFormat to default to spoof timezone
          const RealDTF = Intl.DateTimeFormat;
          function FakeDTF(locales, options) {
            const opts = Object.assign({}, options || {});
            if (!opts.timeZone) opts.timeZone = tz;
            return new RealDTF(locales, opts);
          }
          FakeDTF.prototype = RealDTF.prototype;
          FakeDTF.supportedLocalesOf = RealDTF.supportedLocalesOf;
          Intl.DateTimeFormat = FakeDTF;

          // Date overrides: toLocaleString -> use timeZone
          const RealDate = Date;
          function FakeDate(...args) {
            if (this instanceof FakeDate) {
              return new RealDate(...args);
            }
            return RealDate().toString();
          }
          FakeDate.now = () => RealDate.now();
          FakeDate.UTC = RealDate.UTC;
          FakeDate.parse = RealDate.parse;
          FakeDate.prototype = RealDate.prototype;
          window.Date = FakeDate;

          const origToLocale = Date.prototype.toLocaleString;
          Date.prototype.toLocaleString = function (locale, options) {
            const opts = Object.assign({}, options || {}, { timeZone: tz });
            return origToLocale.call(this, locale || undefined, opts);
          };
        } catch (e) {
          console.warn('timezone spoof error', e);
        }
      }

      // 3) WebRTC leak mitigation: override RTCPeerConnection to hide local IPs
      try {
        const RealRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || null;
        if (RealRTCPeerConnection) {
          function NoLeakRTCPeerConnection(...args) {
            const pc = new RealRTCPeerConnection(...args);

            // override createDataChannel to keep behavior intact
            const originalCreateDataChannel = pc.createDataChannel.bind(pc);
            pc.createDataChannel = function () { return originalCreateDataChannel(...arguments); };

            // intercept setLocalDescription/createOffer and scrub candidate strings
            const origAddIceCandidate = pc.addIceCandidate.bind(pc);
            pc.addIceCandidate = function (candidate, ...rest) {
              // if candidate is an object with candidate string, scrub local IPs
              if (candidate && typeof candidate === 'object' && candidate.candidate) {
                // replace local/private IPs with 0.0.0.0 placeholder
                candidate.candidate = candidate.candidate.replace(/((25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}):\d+)/g, '0.0.0.0:9');
              }
              return origAddIceCandidate(candidate, ...rest);
            };

            // Intercept createOffer/createAnswer to scrub SDP before return
            const origCreateOffer = pc.createOffer.bind(pc);
            pc.createOffer = function (...args) {
              return origCreateOffer(...args).then(offer => {
                // scrub SDP candidate IPs
                offer.sdp = offer.sdp.replace(/((25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}):\d+/g, '0.0.0.0:9');
                return offer;
              });
            };

            const origCreateAnswer = pc.createAnswer ? pc.createAnswer.bind(pc) : null;
            if (origCreateAnswer) {
              pc.createAnswer = function (...args) {
                return origCreateAnswer(...args).then(answer => {
                  answer.sdp = answer.sdp.replace(/((25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}):\d+/g, '0.0.0.0:9');
                  return answer;
                });
              };
            }

            return pc;
          }

          // copy static props
          NoLeakRTCPeerConnection.prototype = RealRTCPeerConnection.prototype;
          try { NoLeakRTCPeerConnection.prototype.constructor = NoLeakRTCPeerConnection; } catch (e) {}

          safeDefine(window, 'RTCPeerConnection', { get: () => NoLeakRTCPeerConnection, configurable: true });
          safeDefine(window, 'webkitRTCPeerConnection', { get: () => NoLeakRTCPeerConnection, configurable: true });
        }
      } catch (e) {
        console.warn('webrtc override failed', e);
      }

      // 4) Prevent detection via permissions API that exposes webdriver
      try {
        const realQuery = navigator.permissions && navigator.permissions.query;
        if (realQuery) {
          navigator.permissions.query = (parameters) => {
            // Some fingerprint tests ask for 'notifications' state and compare to permissions
            return realQuery(parameters).then(result => {
              // return same object but tweak 'state' if needed (do nothing here)
              return result;
            });
          };
        }
      } catch (e) { /* ignore */ }

      // 5) Ensure console-logs are harmless (optional)
      // no-op

    } catch (err) {
      console.warn('applyAllSpoofs error', err);
    }
  }

  // If main never sends settings, keep a tiny default that avoids glaring nulls:
  setTimeout(() => {
    if (!SPOOF.timeZone && !SPOOF.userAgent) {
      // try to set something minimal to avoid completely empty navigator fields
      if (!navigator.languages || navigator.languages.length === 0) {
        safeDefine(navigator, 'languages', { get: () => ['en-US'], configurable: true });
        safeDefine(navigator, 'language', { get: () => 'en-US', configurable: true });
      }
      safeDefine(navigator, 'webdriver', { get: () => false, configurable: true });
    }
  }, 1500);
})();
