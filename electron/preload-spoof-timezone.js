// preload-spoof-timezone.js
const { ipcRenderer } = require('electron');

let SPOOFED_TZ = null;

ipcRenderer.on('spoof-timezone:set', (evt, tz) => {
  if (typeof tz === 'string' && tz.length) {
    SPOOFED_TZ = tz;
    applyTimezoneSpoof(SPOOFED_TZ);
  }
});

ipcRenderer.invoke('spoof-timezone:query').then((tz) => {
  if (tz) { SPOOFED_TZ = tz; applyTimezoneSpoof(SPOOFED_TZ); }
}).catch(()=>{});

function applyTimezoneSpoof(timeZone) {
  try {
    console.log(`🕰️ Applying aggressive timezone spoof: ${timeZone}`);
    
    // Store original functions
    const realResolved = Intl.DateTimeFormat.prototype.resolvedOptions;
    const realGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    const realToString = Date.prototype.toString;
    const realToDateString = Date.prototype.toDateString;
    const realToTimeString = Date.prototype.toTimeString;
    
    // Calculate timezone offset for the target timezone
    const targetOffset = getTimezoneOffset(timeZone);
    
    // Override getTimezoneOffset to return target timezone offset
    Object.defineProperty(Date.prototype, 'getTimezoneOffset', {
      configurable: true, writable: true,
      value: function() {
        return targetOffset;
      }
    });
    
    // Override toString methods to show target timezone consistently
    Object.defineProperty(Date.prototype, 'toString', {
      configurable: true, writable: true,
      value: function() {
        try {
          const targetTime = new Date(this.toLocaleString('en-US', { timeZone }));
          const offset = targetOffset;
          const offsetHours = Math.floor(Math.abs(offset) / 60);
          const offsetMinutes = Math.abs(offset) % 60;
          const offsetSign = offset <= 0 ? '+' : '-';
          const offsetString = offsetSign + String(offsetHours).padStart(2, '0') + String(offsetMinutes).padStart(2, '0');
          
          const tzAbbr = this.toLocaleString('en-US', { 
            timeZone, 
            timeZoneName: 'short' 
          }).split(' ').pop();
          
          return targetTime.toDateString() + ' ' + targetTime.toTimeString().split(' ')[0] + ' GMT' + offsetString + ' (' + tzAbbr + ')';
        } catch (e) {
          return realToString.call(this);
        }
      }
    });
    
    Object.defineProperty(Date.prototype, 'toDateString', {
      configurable: true, writable: true,
      value: function() {
        try {
          const targetTime = new Date(this.toLocaleString('en-US', { timeZone }));
          return targetTime.toDateString();
        } catch (e) {
          return realToDateString.call(this);
        }
      }
    });
    
    Object.defineProperty(Date.prototype, 'toTimeString', {
      configurable: true, writable: true,
      value: function() {
        try {
          const targetTime = new Date(this.toLocaleString('en-US', { timeZone }));
          const offset = targetOffset;
          const offsetHours = Math.floor(Math.abs(offset) / 60);
          const offsetMinutes = Math.abs(offset) % 60;
          const offsetSign = offset <= 0 ? '+' : '-';
          const offsetString = offsetSign + String(offsetHours).padStart(2, '0') + String(offsetMinutes).padStart(2, '0');
          
          const tzAbbr = this.toLocaleString('en-US', { 
            timeZone, 
            timeZoneName: 'short' 
          }).split(' ').pop();
          
          return targetTime.toTimeString().split(' ')[0] + ' GMT' + offsetString + ' (' + tzAbbr + ')';
        } catch (e) {
          return realToTimeString.call(this);
        }
      }
    });

    Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
      configurable: true, writable: true,
      value: function () {
        const real = realResolved.call(this);
        return Object.assign({}, real, { timeZone });
      }
    });

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
      const opts = Object.assign({}, options || {}, { timeZone });
      return origToLocale.call(this, locale || undefined, opts);
    };

    const RealDTF = Intl.DateTimeFormat;
    function FakeDTF(locales, options) {
      const opts = Object.assign({}, options || {});
      if (!opts.timeZone) opts.timeZone = timeZone;
      return new RealDTF(locales, opts);
    }
    FakeDTF.prototype = RealDTF.prototype;
    FakeDTF.supportedLocalesOf = RealDTF.supportedLocalesOf;
    Intl.DateTimeFormat = FakeDTF;

    Object.defineProperty(Intl.DateTimeFormat.prototype, 'resolvedOptions', {
      configurable: true, writable: true,
      value: function () {
        const real = realResolved.call(Object.create(RealDTF.prototype));
        return Object.assign({}, real, { timeZone });
      }
    });
    
    console.log(`✅ Enhanced timezone spoof applied: ${timeZone}, Test: ${new Date().toString()}`);
  } catch (err) {
    console.warn('Timezone spoofing failed:', err);
  }
}

// Helper function to calculate timezone offset
function getTimezoneOffset(timeZone) {
  try {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const target = new Date(utc.toLocaleString('en-US', { timeZone }));
    return (utc.getTime() - target.getTime()) / 60000;
  } catch (e) {
    console.warn('Failed to calculate timezone offset:', e);
    return 0;
  }
}
