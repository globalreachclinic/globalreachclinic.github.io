/* Discovery Pass — landing de campaña (carpeta discovery/, aislada del sitio).
   Lee ?c=&p=&s=, verifica la firma ECDSA P-256/SHA-256 (WebCrypto) con la
   clave PÚBLICA, lee el contador de cupo y, al pulsar el CTA, entrega el
   contexto verificado al sitio principal vía sessionStorage (mismo origen).
   La clave privada vive solo en GR Discovery Pass Manager, nunca aquí. */
(function () {
  'use strict';
  var PUBLIC_KEYS = {
    'GRC-CAMPAIGN-KEY-03': { kty: 'EC', crv: 'P-256', x: 'Dt-yx8-anxKbNOQgVYICbAQK_2xeTPGNlKZ7He-MXyc', y: 'MKA16-CS-h_9AOwUWFK-14fYXlbk5qUyilbFw8R48n8' },
    'GRC-CAMPAIGN-KEY-01': { kty: 'EC', crv: 'P-256', x: 'PZJiGFsfXCPuTolk1b9e5EGX7_ihDDQqY0aYgXj3go4', y: 'ux6ayc1xa0qioFd2lzda9QgcY5Ca2WyRuiMCpnRy8h8' }
  };
  var PRICES = {
    'Global Reach Signature IV Foundation': '$175',
    'Global Reach Immune Optimization': '$190',
    'Global Reach Performance & Recovery': '$190',
    'Global Reach MigraRelief': '$180',
    'Global Reach Hangover Recovery': '$180',
    'Global Reach Metabolic Optimization Infusion': '$210',
    'Global Reach Skin & Hair Vitality': '$185',
    'Global Reach Advanced Skin Restoration': '$210',
    'Global Reach NAD+ Cellular Vitality': 'from $250'
  };
  var SUPPORTED_LEGAL = ['DISCOVERY-LEGAL-V1'];
  var COUNTER_NS = 'globalreachclinic-discovery';
  var COUNTER_BASE = 'https://abacus.jasoncameron.dev';
  var state = { campaign: null, remaining: null, p: null, s: null };

  function $(id) { return document.getElementById(id); }
  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function parseWhen(iso) { return new Date(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso) ? iso + 'T12:00:00' : iso); }
  function fmtDate(iso, tz) {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(parseWhen(iso)); }
    catch (e) { return iso; }
  }
  function fmtRange(st, en, tz) {
    try {
      var o = { timeZone: tz || 'America/New_York', month: 'long', day: 'numeric' };
      var y = { timeZone: tz || 'America/New_York', year: 'numeric' };
      return new Intl.DateTimeFormat('en-US', o).format(parseWhen(st)) + ' – ' +
             new Intl.DateTimeFormat('en-US', o).format(parseWhen(en)) + ', ' +
             new Intl.DateTimeFormat('en-US', y).format(parseWhen(en));
    } catch (e) { return st + ' – ' + en; }
  }
  function fetchCounter(path) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, 3500) : null;
    return fetch(COUNTER_BASE + path, ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) { if (t) clearTimeout(t); return (j && typeof j.value === 'number') ? j.value : null; })
      .catch(function () { return null; });
  }
  var ERRORS = {
    invalid: ['Invalid Promotion', 'This Discovery Pass invitation could not be verified.'],
    notyet: ['Promotion Not Yet Active', 'This invitation is not active yet.'],
    expired: ['Promotion Expired', 'This Discovery Pass promotion has ended.'],
    unavailable: ['Promotion Unavailable', 'This invitation is currently unavailable. Please contact Global Reach Health Clinic for assistance.']
  };
  function showError(kind) {
    var e = ERRORS[kind] || ERRORS.invalid;
    $('discErrTitle').textContent = e[0];
    $('discErrText').textContent = e[1];
    $('landing').hidden = true;
    $('errorView').hidden = false;
  }
  function parseQuery() {
    var q = new URLSearchParams(location.search);
    var c = q.get('c'), p = q.get('p'), s = q.get('s');
    return (c && p && s) ? { c: c, p: p, s: s } : null;
  }
  function verify(params) {
    var payload;
    try { payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(params.p))); }
    catch (e) { return Promise.resolve({ ok: false, kind: 'invalid' }); }
    if (!payload || payload.v !== 1 || !payload.id || !PUBLIC_KEYS[payload.kid] ||
        SUPPORTED_LEGAL.indexOf(payload.lv) < 0 || params.c !== payload.id) {
      return Promise.resolve({ ok: false, kind: 'invalid' });
    }
    return crypto.subtle.importKey('jwk', PUBLIC_KEYS[payload.kid], { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
      .then(function (key) {
        return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(params.s), new TextEncoder().encode(params.p));
      })
      .then(function (valid) {
        if (!valid) return { ok: false, kind: 'invalid' };
        var now = Date.now(), st = Date.parse(payload.st), en = Date.parse(payload.en);
        if (isNaN(st) || isNaN(en)) return { ok: false, kind: 'invalid' };
        if (now < st) return { ok: false, kind: 'notyet' };
        if (now > en) return { ok: false, kind: 'expired' };
        return { ok: true, campaign: payload };
      })
      .catch(function () { return { ok: false, kind: 'invalid' }; });
  }
  function render(cp) {
    $('discBenefitService').textContent = cp.svc;
    $('dRowCampaign').textContent = cp.n;
    $('dRowService').textContent = cp.svc;
    $('dRowIncluded').textContent = cp.inc;
    $('dRowFees').textContent = cp.fee;
    $('dRowValid').textContent = fmtRange(cp.st, cp.en, cp.tz);
    $('dRowLimit').textContent = (cp.per === 1 ? 'One per person' : cp.per + ' per person') + (cp.tr ? ' · Transferable' : ' · Non-transferable');
    var feesTxt = (String(cp.fee).toLowerCase() === 'none') ? 'with no mandatory fees' : 'with mandatory fees of ' + cp.fee;
    $('discTerms').textContent =
      'This invitation offers one complimentary ' + cp.svc + ' treatment, including ' + cp.inc.charAt(0).toLowerCase() + cp.inc.slice(1) +
      ', ' + feesTxt + ', to one person between ' + fmtDate(cp.st, cp.tz) + ' and ' + fmtDate(cp.en, cp.tz) +
      '. Treatment is subject to clinical screening and provider approval, and may be declined if not clinically appropriate. ' +
      (cp.tr ? 'The pass may be transferred. ' : 'The pass is not transferable. ') + 'It has no cash value.';
    $('discCodeLine').textContent = 'Campaign code ' + cp.id + ' · Terms version ' + cp.lv;
    if (PRICES[cp.svc]) {
      $('dRowPrice').textContent = PRICES[cp.svc] + ' — yours complimentary with this pass';
      $('dPriceWrap').style.display = '';
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    var params = parseQuery();
    if (!params || !window.crypto || !crypto.subtle) { showError('invalid'); return; }
    state.p = params.p; state.s = params.s;
    verify(params).then(function (res) {
      if (!res.ok) { showError(res.kind); return; }
      state.campaign = res.campaign;
      var cp = res.campaign;
      if (typeof cp.tot === 'number') {
        fetchCounter('/get/' + COUNTER_NS + '/' + encodeURIComponent(cp.id)).then(function (v) {
          if (v !== null) {
            state.remaining = Math.max(0, cp.tot - v);
            if (state.remaining <= 0) { showError('unavailable'); return; }
          }
          render(cp);
        });
      } else { render(cp); }
    });
    $('discCta').addEventListener('click', function () {
      if (!state.campaign) return;
      try {
        sessionStorage.setItem('grc.dp.v1', JSON.stringify({ p: state.p, s: state.s, cp: state.campaign }));
      } catch (e) { /* sin sessionStorage no hay traspaso: se queda en la landing */ return; }
      location.href = '../';
    });
  });
})();
