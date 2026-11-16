/* Discovery Pass — puente en el sitio principal (vive en discovery/).
   Sin contexto de campaña en sessionStorage no hace absolutamente nada:
   el sitio se comporta exactamente igual que siempre.
   Con contexto, RE-VERIFICA la firma antes de aplicar nada. Al aplicar:
   inserta el bloque promocional en Contact Us, fija programa IV y el
   tratamiento de la campaña, añade la sección PROMO al mensaje preparado
   y cuenta la solicitud una sola vez por dispositivo (Idea 1). */
(function () {
  'use strict';
  var raw = null;
  try { raw = sessionStorage.getItem('grc.dp.v1'); } catch (e) {}
  if (!raw) return;
  var data;
  try { data = JSON.parse(raw); } catch (e) { return; }
  if (!data || !data.p || !data.s || !data.cp) return;

  var PUBLIC_KEYS = {
    'GRC-CAMPAIGN-KEY-03': { kty: 'EC', crv: 'P-256', x: 'Dt-yx8-anxKbNOQgVYICbAQK_2xeTPGNlKZ7He-MXyc', y: 'MKA16-CS-h_9AOwUWFK-14fYXlbk5qUyilbFw8R48n8' },
    'GRC-CAMPAIGN-KEY-01': { kty: 'EC', crv: 'P-256', x: 'PZJiGFsfXCPuTolk1b9e5EGX7_ihDDQqY0aYgXj3go4', y: 'ux6ayc1xa0qioFd2lzda9QgcY5Ca2WyRuiMCpnRy8h8' }
  };
  var COUNTER_NS = 'globalreachclinic-discovery';
  var COUNTER_BASE = 'https://abacus.jasoncameron.dev';
  var cp = data.cp;

  function $(id) { return document.getElementById(id); }
  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function fmtDate(iso, tz) {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso) ? iso + 'T12:00:00' : iso)); }
    catch (e) { return iso; }
  }
  function promoText() {
    return ['PROMO — DISCOVERY PASS',
      'Campaign: ' + cp.n,
      'Campaign Code: ' + cp.id,
      'Campaign Source: ' + cp.ch,
      'Complimentary Service: ' + cp.svc,
      'Offer Expiration: ' + fmtDate(cp.en, cp.tz),
      'Request Type: DISCOVERY PASS REQUEST',
      'Please contact me with availability and instructions to receive my individual Discovery Pass.'].join('\n');
  }
  function countOnce() {
    var flag = 'grc.dp.counted.' + cp.id;
    try { if (localStorage.getItem(flag)) return; } catch (e) {}
    fetch(COUNTER_BASE + '/hit/' + COUNTER_NS + '/' + encodeURIComponent(cp.id))
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && typeof j.value === 'number') { try { localStorage.setItem(flag, '1'); } catch (e) {} } })
      .catch(function () {});
  }
  function rewriteLinks() {
    [['openSMS', 'body='], ['openWA', 'text=']].forEach(function (pair) {
      var a = $(pair[0]);
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var i = href.indexOf(pair[1]);
      if (i < 0) return;
      var head = href.slice(0, i + pair[1].length), enc = href.slice(i + pair[1].length);
      var txt;
      try { txt = decodeURIComponent(enc); } catch (e) { return; }
      if (txt.indexOf('PROMO — DISCOVERY PASS') >= 0) return;
      a.setAttribute('href', head + encodeURIComponent(txt + '\n\n' + promoText()));
    });
  }
  function apply() {
    var st = document.createElement('style');
    st.textContent =
      '.promo-block{background:#eef7ff;border:1.5px solid #1768a1;border-radius:16px;padding:14px;margin-bottom:14px}' +
      '.promo-block h3{margin:0 0 4px;font-size:12px;letter-spacing:.14em;color:#0b3d91}' +
      '.promo-applied{display:inline-block;background:#0b3d91;color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.1em;border-radius:999px;padding:3px 9px;margin:2px 0 8px}' +
      '.promo-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;padding:5px 0;border-top:1px solid #d6e9fa;color:#315a7f}' +
      '.promo-row b{color:#0b3d91;text-align:right}' +
      '.promo-note{font-size:12.5px;line-height:1.6;color:#315a7f;margin:8px 0 0}';
    document.head.appendChild(st);

    var form = $('contactForm');
    if (!form) return;
    var block = document.createElement('div');
    block.className = 'promo-block';
    block.id = 'promoBlock';
    function row(label, value) {
      var r = document.createElement('div'); r.className = 'promo-row';
      var s = document.createElement('span'); s.textContent = label;
      var b = document.createElement('b'); b.textContent = value;
      r.appendChild(s); r.appendChild(b); return r;
    }
    var h3 = document.createElement('h3'); h3.textContent = 'YOUR DISCOVERY PASS PROMOTION';
    var badge = document.createElement('span'); badge.className = 'promo-applied'; badge.textContent = 'PROMOTION APPLIED';
    block.appendChild(h3); block.appendChild(badge);
    block.appendChild(row('Promotion', 'Discovery Pass'));
    block.appendChild(row('Campaign', cp.n));
    var codeRow = row('Campaign Code', cp.id); codeRow.querySelector('b').id = 'pRowCode';
    block.appendChild(codeRow);
    block.appendChild(row('Included Experience', cp.svc));
    block.appendChild(row('Offer Valid Until', fmtDate(cp.en, cp.tz)));
    var note = document.createElement('p'); note.className = 'promo-note';
    note.textContent = 'These details come from your verified invitation and cannot be edited.';
    block.appendChild(note);
    form.insertBefore(block, form.firstChild);

    var sel = $('program');
    if (sel) {
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.indexOf('IV Hydration') === 0) { sel.selectedIndex = i; break; }
      }
      sel.dispatchEvent(new Event('change'));
      sel.disabled = true;
    }
    var iv = $('ivSelection');
    if (iv) {
      var found = false;
      for (var j = 0; j < iv.options.length; j++) if (iv.options[j].text === cp.svc) { iv.selectedIndex = j; found = true; break; }
      if (!found) { var op = document.createElement('option'); op.text = cp.svc; op.value = cp.svc; iv.appendChild(op); iv.value = cp.svc; }
      iv.disabled = true;
    }

    var confirm = $('confirm'), wa = $('openWA');
    if (confirm && wa) {
      var copyBtn = document.createElement('button');
      copyBtn.className = 'btn full secondary';
      copyBtn.id = 'copyMsg';
      copyBtn.type = 'button';
      copyBtn.textContent = 'Copy message';
      copyBtn.addEventListener('click', function () {
        var href = ($('openSMS') || {}).href || '';
        var m = href.match(/[?&]body=([^&]*)/);
        var txt = m ? decodeURIComponent(m[1]) : '';
        if (txt && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () {
            copyBtn.textContent = 'Message copied';
            setTimeout(function () { copyBtn.textContent = 'Copy message'; }, 2000);
          }).catch(function () {});
        }
      });
      wa.parentNode.insertBefore(copyBtn, wa.nextSibling);
    }
    ['openSMS', 'openWA'].forEach(function (id) {
      var a = $(id);
      if (a) a.addEventListener('click', countOnce);
    });
    if (confirm) {
      new MutationObserver(function () {
        if (confirm.classList.contains('active')) rewriteLinks();
      }).observe(confirm, { attributes: true, attributeFilter: ['class'] });
    }
    var tab = document.querySelector('[data-tab="consult"]');
    if (tab) setTimeout(function () { tab.click(); }, 60);
  }

  if (!window.crypto || !crypto.subtle || !PUBLIC_KEYS[cp.kid]) return;
  var payload;
  try { payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(data.p))); } catch (e) { return; }
  if (!payload || payload.id !== cp.id) return;
  crypto.subtle.importKey('jwk', PUBLIC_KEYS[cp.kid], { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    .then(function (key) {
      return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64urlToBytes(data.s), new TextEncoder().encode(data.p));
    })
    .then(function (valid) {
      if (!valid) { try { sessionStorage.removeItem('grc.dp.v1'); } catch (e) {} return; }
      var now = Date.now();
      if (now < Date.parse(cp.st) || now > Date.parse(cp.en)) return;
      apply();
    })
    .catch(function () {});
})();
