/* Integer-cent arithmetic. No financial or personal data leaves the browser. */
(function (root) {
  'use strict';
  function parseAmountToCents(value) {
    const raw = String(value).trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw)) return null;
    const [whole, fraction = ''] = raw.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents >= 0 && cents <= 10000000000 ? cents : null;
  }
  function supportCents(cents) {
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > 10000000000) throw new RangeError('Invalid amount');
    return Math.floor((cents * 12 + 500) / 1000);
  }
  // VMI applies the minimum to one person's annual allocation to one recipient.
  // Small allocations cannot be pooled across people to reach that minimum.
  function transferableSupportCents(cents) {
    const result = supportCents(cents);
    return result >= 300 ? result : 0;
  }
  function campaignPhase(dateISO, campaign) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) throw new TypeError('Expected an ISO date');
    if (dateISO < campaign.start) return 'prelaunch';
    if (dateISO > campaign.deadline) return 'closed';
    return campaign.recipientVerified && campaign.gpmBankAccountVerified ? 'open' : 'unverified';
  }
  function validIban(iban) {
    const clean = String(iban).replace(/\s/g, '').toUpperCase();
    if (!/^LT\d{18}$/.test(clean)) return false;
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    let remainder = 0;
    for (const char of rearranged) {
      const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
      for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
  }
  const api = Object.freeze({ parseAmountToCents, supportCents, transferableSupportCents, campaignPhase, validIban });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParishMath = api;
})(globalThis);
