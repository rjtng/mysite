/* =============================================================================
   Just enough JavaScript. The page reads fine without it — everything here is
   either decoration or a progressive enhancement over a plain list.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* --- year ---------------------------------------------------------------- */
  var year = $('#year');
  if (year) { year.textContent = String(new Date().getFullYear()); }

  /* --- nav: pinned state and current section ------------------------------- */
  var nav     = $('#nav');
  var links   = $$('.nav__links a[href^="#"]');
  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);

  var queued = false;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) { nav.classList.toggle('pinned', y > 12); }

    var line = y + 160;
    var here = null;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].offsetTop <= line) { here = targets[i].id; }
    }
    // Contact is short enough that it can never win on offset alone.
    var left = document.documentElement.scrollHeight - window.innerHeight - y;
    if (left < 120) { here = 'contact'; }

    links.forEach(function (a) {
      a.classList.toggle('current', a.getAttribute('href') === '#' + here);
    });
    queued = false;
  }
  window.addEventListener('scroll', function () {
    if (!queued) { window.requestAnimationFrame(onScroll); queued = true; }
  }, { passive: true });
  onScroll();

  /* --- mobile sheet -------------------------------------------------------- */
  var burger = $('#burger');
  var sheet  = $('#sheet');

  function openSheet(open) {
    if (!burger || !sheet) { return; }
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    sheet.hidden = !open;
    document.body.classList.toggle('locked', open);
  }
  if (burger) {
    burger.addEventListener('click', function () {
      openSheet(burger.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (sheet) {
    $$('a', sheet).forEach(function (a) {
      a.addEventListener('click', function () { openSheet(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { openSheet(false); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860) { openSheet(false); }
  });

  /* --- reveal on entry ------------------------------------------------------ */
  var hidden = $$('.reveal');
  if (still || !('IntersectionObserver' in window)) {
    hidden.forEach(function (el) { el.classList.add('shown'); });
  } else {
    var io = new IntersectionObserver(function (rows) {
      rows.forEach(function (row) {
        if (row.isIntersecting) {
          row.target.classList.add('shown');
          io.unobserve(row.target);
        }
      });
    // Generous margin so a fast scroll never lands on a column still waiting
    // for its fade.
    }, { rootMargin: '220px 0px 220px 0px', threshold: 0 });
    hidden.forEach(function (el) { io.observe(el); });

    // Safety net. If the observer never fires — a background tab that is never
    // painted, an odd embedded webview — the content must not stay invisible.
    setTimeout(function () {
      hidden.forEach(function (el) { el.classList.add('shown'); });
    }, 2600);
  }

  /* --- hero: rotate the role words ------------------------------------------ */
  var slot = $('#roles');
  if (slot && !still) {
    var words = $$('b', slot);
    var at = 0;
    if (words.length > 1) {
      setInterval(function () {
        var prev = words[at];
        at = (at + 1) % words.length;
        prev.classList.remove('on');
        prev.classList.add('off');
        words[at].classList.remove('off');
        // Next frame, so the browser sees the start position before animating.
        requestAnimationFrame(function () { words[at].classList.add('on'); });
        setTimeout(function () { prev.classList.remove('off'); }, 500);
      }, 2600);
    }
  }

  /* --- marquee: needs two copies to loop seamlessly ------------------------- */
  var band = $('#band');
  if (band && band.firstElementChild) {
    band.appendChild(band.firstElementChild.cloneNode(true));
    band.setAttribute('data-ready', '');
  }

  /* =========================================================================
     Credentials. Everything below is generated from assets/js/data-certs.js,
     which is written by tools/fetch-credly.ps1 straight off the Credly feed.
     ====================================================================== */
  var CERTS = Array.isArray(window.CERTIFICATIONS) ? window.CERTIFICATIONS : [];
  if (!CERTS.length) { return; }

  var monthOf = function (c) {
    var d = new Date(c.date + 'T00:00:00');
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  /* --- headline counts ------------------------------------------------------ */
  var counts = $('#counts');
  var brands = [];
  var brandTally = {};
  CERTS.forEach(function (c) {
    if (!brandTally[c.brand]) { brandTally[c.brand] = 0; brands.push(c.brand); }
    brandTally[c.brand]++;
  });
  brands.sort(function (a, b) { return brandTally[b] - brandTally[a]; });

  var domains = {};
  CERTS.forEach(function (c) { domains[c.domain] = 1; });

  if (counts) {
    var oldest = CERTS.reduce(function (a, c) { return c.date < a ? c.date : a; }, CERTS[0].date);
    var rows = [
      [CERTS.length, 'Credentials'],
      [brands.length, 'Issuing bodies'],
      [Object.keys(domains).length, 'Subject areas'],
      [monthOf({ date: oldest }), 'First one earned']
    ];
    counts.innerHTML = rows.map(function (r) {
      return '<div><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>';
    }).join('');
  }

  /* --- the twelve featured badges ------------------------------------------- */
  /* Credly stores these as 1200px PNGs — around 400 KB each, for a 58px slot.
     It serves resized copies from /size/<w>x<h>/, but only when the URL ends in
     a real filename; the older "/blob" ones just redirect back to the original,
     so those are left alone. 110 and 220 are both stocked sizes. */
  function thumb(url, size) {
    if (!/^https:\/\/images\.credly\.com\/images\//.test(url) || /\/blob$/.test(url)) { return url; }
    return url.replace('/images/', '/size/' + size + '/images/');
  }

  var grid = $('#badgeGrid');
  if (grid) {
    grid.innerHTML = CERTS.filter(function (c) { return c.featured; }).map(function (c) {
      var src = thumb(c.img, '110x110');
      var x2  = thumb(c.img, '220x220');
      return '<a class="badge" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' +
               '<img src="' + esc(src) + '"' +
                 (x2 !== src ? ' srcset="' + esc(src) + ' 1x, ' + esc(x2) + ' 2x"' : '') +
                 ' alt="" loading="lazy" decoding="async" width="58" height="58">' +
               '<span class="badge__name">' + esc(c.name) + '</span>' +
               '<span class="badge__meta"><span>' + esc(c.brand) + '</span>' +
                 '<span>' + esc(String(c.date).slice(0, 4)) + '</span></span>' +
             '</a>';
    }).join('');
  }

  /* --- full record, filterable by issuer ------------------------------------ */
  var list    = $('#recordList');
  var filters = $('#filters');
  var more    = $('#recordMore');
  var STEP    = 12;

  if (!list) { return; }

  list.innerHTML = CERTS.map(function (c) {
    return '<li data-brand="' + esc(c.brand) + '">' +
             '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' +
               '<span class="record__issuer">' + esc(c.brand) + '</span>' +
               '<span class="record__name">' + esc(c.name) + '</span>' +
               '<time class="record__date" datetime="' + esc(c.date) + '">' + esc(monthOf(c)) + '</time>' +
             '</a>' +
           '</li>';
  }).join('');

  var items   = $$('li', list);
  var current = 'All';
  var shown   = STEP;

  function paint() {
    var seen = 0;
    items.forEach(function (li) {
      var match = current === 'All' || li.getAttribute('data-brand') === current;
      if (match && seen < shown) { li.hidden = false; seen++; }
      else if (match) { li.hidden = true; seen++; }
      else { li.hidden = true; }
    });

    var total = current === 'All' ? CERTS.length : brandTally[current];
    if (more) {
      if (total > shown) {
        more.hidden = false;
        more.textContent = 'Show ' + (total - shown) + ' more';
      } else if (total > STEP) {
        more.hidden = false;
        more.textContent = 'Show fewer';
      } else {
        more.hidden = true;
      }
    }
  }

  if (filters) {
    filters.innerHTML = ['All'].concat(brands).map(function (b) {
      var n = b === 'All' ? CERTS.length : brandTally[b];
      return '<button class="filter" type="button" data-brand="' + esc(b) + '" ' +
             'aria-pressed="' + (b === 'All') + '">' + esc(b) + '<b>' + n + '</b></button>';
    }).join('');

    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) { return; }
      current = btn.getAttribute('data-brand');
      shown = STEP;
      $$('.filter', filters).forEach(function (f) {
        f.setAttribute('aria-pressed', String(f === btn));
      });
      paint();
    });
  }

  if (more) {
    more.addEventListener('click', function () {
      var total = current === 'All' ? CERTS.length : brandTally[current];
      shown = shown >= total ? STEP : total;
      paint();
      if (shown === STEP) { list.scrollIntoView({ block: 'nearest' }); }
    });
  }

  paint();
})();
