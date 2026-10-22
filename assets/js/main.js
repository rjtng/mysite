/* =============================================================================
   Just enough JavaScript. The page reads fine without it — the projects are a
   plain list and the volumes are printed one after another. Everything here
   is either decoration or a progressive enhancement over that.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function scrollBehavior() { return still ? 'auto' : 'smooth'; }

  /* --- theme ----------------------------------------------------------------
     Light unless the visitor picks dark, and only a click is remembered. The
     previous design stored its dark default on every visit, so this keeps its
     choice under a new key rather than inheriting "portfolio-theme". */
  var themeButtons = $$('[data-theme-toggle]');
  var themeMeta = $('meta[name="theme-color"]');
  function applyTheme(dark) {
    if (dark) { root.setAttribute('data-theme', 'dark'); } else { root.removeAttribute('data-theme'); }
    themeButtons.forEach(function (button) { button.setAttribute('aria-pressed', String(dark)); });
    if (themeMeta) { themeMeta.setAttribute('content', dark ? '#131312' : '#f2f1ed'); }
  }
  applyTheme(root.getAttribute('data-theme') === 'dark');
  themeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') !== 'dark';
      applyTheme(dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) {}
    });
  });

  /* --- year ---------------------------------------------------------------- */
  var year = $('#year');
  if (year) { year.textContent = String(new Date().getFullYear()); }

  /* --- technology marks ------------------------------------------------------
     The sprite is fetched rather than inlined so it sits under /assets and is
     cached instead of riding along in every HTML response. It is injected into
     the document rather than referenced with <use href="sprite.svg#id">,
     because external references there are still unreliable in WebKit. Until it
     lands every mark shows as its name, so a blocked request costs nothing. */
  if (window.fetch && $('use[href^="#t-"]')) {
    fetch('/assets/img/tech-sprite.svg?v=5')
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        var svg = doc.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
          return;
        }
        svg.setAttribute('class', 'sprite');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
        document.body.insertBefore(document.importNode(svg, true), document.body.firstChild);
        root.classList.add('sprite-ready');
      })
      .catch(function () { /* the names stand on their own */ });
  }

  /* =========================================================================
     Index
     Each row carries everything about its project: the mock screen in its
     thumbnail, the role and description under the link, the type and the
     marks. The preview panel and the wall are built from these rows, so a
     project added to the list turns up everywhere.
     ====================================================================== */
  var list = $('[data-index]');
  var rows = list ? $$('.project', list) : [];
  var TYPE_NAMES = { all: 'All', gov: 'Government systems', device: 'Smart devices', mobile: 'Mobile apps' };

  var projects = rows.map(function (row, i) {
    var text = function (sel) {
      var el = $(sel, row);
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    };
    var preview = $('.project__thumb .project-preview', row);
    var p = {
      i: i,
      row: row,
      id: row.id,
      type: row.getAttribute('data-type'),
      name: text('.project__name'),
      typeName: text('.project__type-label'),
      role: text('.project__role'),
      desc: text('.project__desc'),
      preview: preview ? preview.outerHTML : '',
      marks: $$('.tech', row).slice(0, 4).map(function (t) { return t.outerHTML; }).join('')
    };
    var techNames = $$('.tech__name', row).map(function (t) { return t.textContent; }).join(' ');
    p.haystack = [p.name, p.typeName, p.role, p.desc, techNames].join(' ').toLowerCase();
    return p;
  });

  /* Every copy of a project screen is a 480x300 scene, scaled by the .shot
     around it: the screen itself, a close-up of it, three phones for a
     mobile app, or a card of the project's brand marks. */
  function scene(p, kind) {
    if (kind === 'phones') {
      var screen = p.preview.replace('class="project-preview', 'class="project-preview project-preview--phone');
      var phone = '<span class="phone"><span class="phone__screen">' + screen + '</span></span>';
      return '<span class="phones">' + phone + phone + phone + '</span>';
    }
    if (kind === 'zoom') { return '<span class="zoom">' + p.preview + '</span>'; }
    if (kind === 'stack') {
      return '<span class="stack-card"><span class="stack-card__marks">' + p.marks + '</span>' +
        '<span class="stack-card__foot"><span>' + esc(p.name) + '</span><span>' + esc(p.typeName) + '</span></span></span>';
    }
    return p.preview;
  }
  function shot(p, kind) { return '<span class="shot">' + scene(p, kind) + '</span>'; }
  function mainKind(p) { return p.type === 'mobile' ? 'phones' : 'screen'; }

  // A mobile app's thumbnail is its phones, as in the reference.
  projects.forEach(function (p) {
    var thumb = $('.project__thumb', p.row);
    if (thumb && p.type === 'mobile') { thumb.innerHTML = shot(p, 'phones'); }
  });

  /* --- preview panel ------------------------------------------------------ */
  var peek = $('[data-peek]');
  var peekShot = $('[data-peek-shot]');
  var peekName = $('[data-peek-name]');
  var peekRole = $('[data-peek-role]');
  var peekDesc = $('[data-peek-desc]');
  var peeked = null;
  var peekTimer = 0;

  function markPeek(p) {
    rows.forEach(function (row) { row.classList.toggle('is-peek', !!p && row === p.row); });
  }
  function showPeek(p, mark) {
    markPeek(mark ? p : null);
    if (!peek || peeked === p) { return; }
    var first = !peeked;
    peeked = p;
    var fill = function () {
      peekShot.innerHTML = shot(p, mainKind(p));
      peekName.textContent = p.name;
      peekRole.textContent = p.role;
      peekDesc.textContent = p.desc;
      peek.classList.remove('is-swapping');
    };
    clearTimeout(peekTimer);
    if (first || still) { fill(); return; }
    peek.classList.add('is-swapping');
    peekTimer = setTimeout(fill, 130);
  }

  projects.forEach(function (p) {
    var link = $('.project__link', p.row);
    p.row.addEventListener('pointerenter', function () { showPeek(p, true); });
    if (link) { link.addEventListener('focus', function () { showPeek(p, true); }); }
  });
  if (list) {
    list.addEventListener('pointerleave', function () { markPeek(null); });
    list.addEventListener('focusout', function (e) {
      if (!list.contains(e.relatedTarget)) { markPeek(null); }
    });
  }

  /* --- filters and search ------------------------------------------------- */
  var filterButtons = $$('[data-filter]');
  var find = $('[data-find]');
  var filterLabel = $('[data-filter-label]');
  var count = $('[data-count]');
  var empty = $('[data-empty]');
  var status = $('[data-status]');
  var filter = 'all';

  function applyFilter() {
    var raw = find ? find.value.trim() : '';
    var words = raw ? raw.toLowerCase().split(/\s+/) : [];
    var shown = 0;
    var firstShown = null;
    projects.forEach(function (p) {
      var ok = (filter === 'all' || p.type === filter) &&
        words.every(function (w) { return p.haystack.indexOf(w) >= 0; });
      p.row.hidden = !ok;
      if (ok) { shown++; firstShown = firstShown || p; }
    });
    if (count) { count.textContent = pad(shown); }
    if (filterLabel) { filterLabel.textContent = TYPE_NAMES[filter] || 'All'; }
    if (empty) {
      empty.hidden = shown > 0;
      empty.textContent = raw ? 'Nothing matches “' + raw + '”.' : 'Nothing of this type yet.';
    }
    if (status) { status.textContent = shown === 1 ? '1 project shown' : shown + ' projects shown'; }
    if (firstShown && (!peeked || peeked.row.hidden)) { showPeek(firstShown, false); }
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      filter = button.getAttribute('data-filter');
      filterButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      applyFilter();
    });
  });
  if (find) {
    find.addEventListener('input', applyFilter);
    find.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && find.value) { find.value = ''; applyFilter(); }
    });
    // "/" jumps to the search box, as it does on most sites with one.
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) { return; }
      var t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) { return; }
      e.preventDefault();
      find.focus({ preventScroll: true });
      $('#index').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    });
  }
  if (projects.length) { showPeek(projects[0], false); }

  // A project page offers the way back to whichever room the visit began in.
  function rememberRoom(room) {
    try { sessionStorage.setItem('workFrom', room); } catch (error) {}
  }
  projects.forEach(function (p) {
    var link = $('.project__link', p.row);
    if (link) { link.addEventListener('click', function () { rememberRoom('index'); }); }
  });

  /* =========================================================================
     Wall
     Each project gets three tiles: its screen (phones for the mobile app), a
     close-up or a second screen, and its brand marks. The rows start at
     different points in that list so no project stacks above itself.
     ====================================================================== */
  var wall = $('#wall');
  var plane = $('[data-wall]');
  if (wall && plane && projects.length) {
    var kinds = function (p) { return p.type === 'mobile' ? ['phones', 'screen', 'stack'] : ['screen', 'zoom', 'stack']; };
    var unique = [];
    for (var k = 0; k < 3; k++) {
      projects.forEach(function (p) { unique.push({ p: p, kind: kinds(p)[k] }); });
    }
    var ROWS = 6;
    var PER_ROW = 7;
    var html = '';
    for (var r = 0; r < ROWS; r++) {
      html += '<div class="wall__row">';
      for (var c = 0; c < PER_ROW; c++) {
        var t = unique[(c + r * 5) % unique.length];
        html += '<a class="tile tile--' + t.kind + '" href="/work/' + t.p.id + '" data-p="' + t.p.i + '" tabindex="-1">' +
          shot(t.p, t.kind) + '</a>';
      }
      html += '</div>';
    }
    plane.innerHTML = html;
    window.requestAnimationFrame(function () { plane.classList.add('is-built'); });

    var tiles = $$('.tile', plane);
    var wallCount = $('[data-wall-count]');
    var wallName = $('[data-wall-name]');
    var wallDesc = $('[data-wall-desc]');
    var focused = -1;

    var focusProject = function (i) {
      if (i === focused) { return; }
      focused = i;
      wall.classList.toggle('is-focus', i >= 0);
      tiles.forEach(function (tile) { tile.classList.toggle('is-on', Number(tile.getAttribute('data-p')) === i); });
      if (i < 0) { return; }
      var p = projects[i];
      wallCount.textContent = pad(i + 1) + ' / ' + pad(projects.length);
      wallName.textContent = p.name;
      wallDesc.textContent = p.desc;
    };

    /* A mouse previews on hover and goes on click. A finger has no hover, so
       the first tap on a project previews it and a second one goes. */
    var lastPointer = 'mouse';
    plane.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') { return; }
      var tile = e.target.closest('.tile');
      if (tile) { focusProject(Number(tile.getAttribute('data-p'))); }
    });
    plane.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'touch') { focusProject(-1); }
    });
    document.addEventListener('pointerdown', function (e) {
      lastPointer = e.pointerType;
      if (e.pointerType === 'touch' && !plane.contains(e.target)) { focusProject(-1); }
    });
    plane.addEventListener('click', function (e) {
      var tile = e.target.closest('.tile');
      if (!tile) { return; }
      var i = Number(tile.getAttribute('data-p'));
      if (lastPointer === 'touch' && focused !== i) { e.preventDefault(); focusProject(i); return; }
      rememberRoom('wall');   // and the link goes to the project's page
    });

    // The wall drifts a little slower than the page, so it sits behind it.
    if (!still) {
      var driftQueued = false;
      var drift = function () {
        driftQueued = false;
        var y = window.scrollY || root.scrollTop;
        if (y > wall.offsetHeight * 1.5) { return; }
        plane.style.setProperty('--shift', (y * 0.35).toFixed(1) + 'px');
      };
      window.addEventListener('scroll', function () {
        if (!driftQueued) { driftQueued = true; window.requestAnimationFrame(drift); }
      }, { passive: true });
    }
  }

  /* =========================================================================
     Project pages (/work/*)
     The back link and the nav follow the room the visit began in. The hero
     screen is fitted to its card, and the rail at the right marks the section
     in view.
     ====================================================================== */
  var work = $('[data-work]');
  if (work) {
    var from = null;
    try { from = sessionStorage.getItem('workFrom'); } catch (error) {}
    if (from === 'index') {
      var back = $('[data-back]');
      var backLabel = $('[data-back-label]');
      if (back) { back.setAttribute('href', '/#index'); }
      if (backLabel) { backLabel.textContent = 'Back to the index'; }
      $$('.nav__links a').forEach(function (a) {
        a.classList.toggle('current', a.getAttribute('href') === '/#index');
      });
    }

    var fit = $('[data-fit]');
    if (fit) {
      var hero = fit.parentElement;
      var fitShot = function () {
        var cs = window.getComputedStyle(hero);
        var room = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (room > 0) { fit.style.setProperty('--s', Math.min(1.2, room / 480).toFixed(3)); }
      };
      fitShot();
      window.addEventListener('resize', fitShot);
    }

    var rail = $('[data-rail]');
    var marks = $$('[data-rail-mark]', work);
    if (rail && marks.length > 1 && 'IntersectionObserver' in window) {
      var ticks = marks.map(function (mark) {
        var li = document.createElement('li');
        li.title = mark.getAttribute('data-rail-mark');
        li.addEventListener('click', function () {
          mark.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        });
        rail.appendChild(li);
        return li;
      });
      var seen = marks.map(function () { return false; });
      var railIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { seen[marks.indexOf(entry.target)] = entry.isIntersecting; });
        var at = seen.indexOf(true);
        ticks.forEach(function (li, n) { li.classList.toggle('is-current', n === (at < 0 ? 0 : at)); });
      }, { rootMargin: '-30% 0px -50% 0px' });
      marks.forEach(function (mark) { railIo.observe(mark); });
      ticks[0].classList.add('is-current');
    }
  }

  /* =========================================================================
     About — the shelf
     ====================================================================== */
  var books = $$('.book');
  var vols = $$('.vol');
  var openHooks = [];
  var openId = null;

  function volById(id) {
    var el = id ? document.getElementById(id) : null;
    return el && el.classList.contains('vol') ? el : null;
  }

  /* scroll: 'nudge' brings the volume into view only if it is out of sight
     (a spine was clicked, so the shelf should stay on screen); 'start' puts
     its top under the nav. */
  function openVol(id, how) {
    var vol = volById(id);
    if (!vol) { return false; }
    how = how || {};
    if (openId !== id) {
      openId = id;
      vols.forEach(function (v) { v.classList.toggle('is-open', v === vol); });
      books.forEach(function (b) { b.setAttribute('aria-expanded', String(b.getAttribute('aria-controls') === id)); });
      openHooks.forEach(function (fn) { fn(id); });
      markNav();
    }
    if (how.hash) {
      try { history.replaceState(null, '', '#' + id); } catch (error) {}
    }
    if (how.scroll === 'start') {
      vol.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    } else if (how.scroll === 'nudge') {
      var top = vol.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight - 140) {
        window.scrollBy({ top: top - window.innerHeight * 0.38, behavior: scrollBehavior() });
      }
    }
    if (how.focus) { vol.focus({ preventScroll: true }); }
    return true;
  }

  // Any link to a volume opens it: the spines, the nav's Contact, the arrows
  // at the foot of each volume, and links to the old section anchors.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
    var id = a.getAttribute('href').slice(1);
    if (!volById(id)) { return; }
    e.preventDefault();
    var onShelf = a.classList.contains('book') || !!a.closest('.vol__nav');
    openVol(id, { hash: true, focus: true, scroll: onShelf ? 'nudge' : 'start' });
  });
  window.addEventListener('hashchange', function () {
    openVol(location.hash.slice(1), { scroll: 'start' });
  });

  /* --- the clock under the shelf, in Zamboanga time ------------------------ */
  var clock = $('[data-clock]');
  if (clock && window.Intl && Intl.DateTimeFormat) {
    var clockFormat = null;
    try {
      clockFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
    } catch (error) {}
    if (clockFormat) {
      var clockSep = $('[data-clock-sep]');
      if (clockSep) { clockSep.hidden = false; }
      var tick = function () { clock.textContent = clockFormat.format(new Date()); };
      tick();
      setInterval(tick, 15000);
    }
  }

  /* =========================================================================
     Nav: pinned state and the current room
     ====================================================================== */
  var nav = $('#nav');
  var navLinks = $$('.nav__links a[href^="#"]');
  var rooms = ['wall', 'index', 'about']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function markNav() {
    var y = window.scrollY || root.scrollTop;
    if (nav) { nav.classList.toggle('pinned', y > 8); }
    var line = y + window.innerHeight * 0.35;
    var here = rooms.length ? rooms[0].id : null;
    rooms.forEach(function (room) { if (room.offsetTop <= line) { here = room.id; } });
    if (here === 'about' && openId === 'contact') { here = 'contact'; }
    navLinks.forEach(function (a) { a.classList.toggle('current', a.getAttribute('href') === '#' + here); });
  }
  var navQueued = false;
  window.addEventListener('scroll', function () {
    if (!navQueued) {
      navQueued = true;
      window.requestAnimationFrame(function () { navQueued = false; markNav(); });
    }
  }, { passive: true });

  /* =========================================================================
     Credentials: the top six in $whoami and the Credly marquee in vol. 03.
     The data is generated from the public profile by tools/fetch-credly.ps1,
     so every image and verification URL stays official.
     ====================================================================== */
  (function credentials() {
    var CERTS = Array.isArray(window.CERTIFICATIONS) ? window.CERTIFICATIONS : [];
    if (!CERTS.length) { return; }

    /* Credly stores these as 1200px PNGs — around 400 KB each, for a badge
       slot. It serves resized copies from /size/<w>x<h>/, but only when the
       URL ends in a real filename; the older "/blob" ones just redirect back
       to the original, so those are left alone. */
    function thumb(url, size) {
      if (!/^https:\/\/images\.credly\.com\/images\//.test(url) || /\/blob$/.test(url)) { return url; }
      return url.replace('/images/', '/size/' + size + '/images/');
    }

    /* --- top certifications --------------------------------------------------
       Hand-picked and in order. Each entry looks for its badge in the
       generated Credly data by name, which supplies the badge art and, unless
       the entry carries its own link, the verification URL. An entry with no
       Credly badge yet shows a drawn tile instead; once the badge is claimed
       on Credly, the next run of tools/fetch-credly.ps1 brings it in and the
       art switches over on its own. */
    var TOP_CERTS = [
      { title: 'IBM Full Stack Software Developer Professional Certificate', issuer: 'IBM',
        short: 'Full Stack Software Developer', match: /^IBM Full Stack Software Developer Professional Certificate/ },
      { title: 'IBM AI Developer Professional Certificate', issuer: 'IBM',
        short: 'AI Developer', match: /^IBM AI Developer Professional Certificate/ },
      { title: 'IBM Data Engineering Professional Certificate', issuer: 'IBM',
        short: 'Data Engineering', match: /^IBM Data Engineering Professional Certificate/ },
      { title: 'IBM Data Analytics with Excel and R Professional Certificate', issuer: 'IBM',
        short: 'Data Analytics with Excel and R', match: /^IBM Data Analytics with Excel and R/ },
      { title: 'IBM Cybersecurity Analyst Professional Certificate', issuer: 'IBM',
        short: 'Cybersecurity Analyst', match: /^IBM Cybersecurity Analyst Professional Certificate/ },
      { title: 'Google UX Design Professional Certificate', issuer: 'Google',
        short: 'UX Design', match: /^Google UX Design Professional Certificate/ }
    ];

    // One shape for every credential the page shows, whichever list it is from.
    function credential(title, img, url, tile) {
      var site = /coursera\.org/.test(url) ? 'Coursera' : /credly\.com/.test(url) ? 'Credly' : '';
      return { title: title, img: img || '', url: url || '', site: site, tile: tile };
    }
    var topClaimed = [];
    var TOP = TOP_CERTS.map(function (t) {
      var hit = null;
      for (var i = 0; i < CERTS.length && !hit; i++) {
        if (t.match.test(CERTS[i].name) && topClaimed.indexOf(CERTS[i]) < 0) { hit = CERTS[i]; }
      }
      if (hit) { topClaimed.push(hit); }
      return credential(t.title, hit && hit.img, t.url || (hit && hit.url), { issuer: t.issuer, short: t.short });
    });
    var REST = CERTS.filter(function (c) { return topClaimed.indexOf(c) < 0; }).map(function (c) {
      return credential(c.name, c.img, c.url, null);
    });

    // Badge art where there is some, otherwise the drawn tile.
    function credentialArt(c, size) {
      if (!c.img) {
        return '<span class="cert-tile"><b>' + esc(c.tile.issuer) + '</b><span>' + esc(c.tile.short) + '</span></span>';
      }
      var src = thumb(c.img, size);
      var x2 = thumb(c.img, size === '220x220' ? '440x440' : '220x220');
      return '<img src="' + esc(src) + '"' + (x2 !== src && size === '220x220' ? ' srcset="' + esc(src) + ' 1x, ' + esc(x2) + ' 2x"' : '') +
        ' alt="" loading="lazy" decoding="async" width="104" height="104">';
    }
    // A link to the credential's record where there is one, otherwise plain.
    function credentialLink(c, cls, inner) {
      var label = c.site ? (c.site === 'Credly' ? 'Verify ' : 'View ') + c.title + ' on ' + c.site : c.title;
      if (!c.url) { return '<span class="' + cls + '" title="' + esc(c.title) + '">' + inner + '</span>'; }
      return '<a class="' + cls + '" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer"' +
        ' title="' + esc(c.title) + '" aria-label="' + esc(label) + '">' + inner + '</a>';
    }

    var badgeRow = $('[data-featured-badges]');
    if (badgeRow) {
      badgeRow.innerHTML = TOP.map(function (c) {
        return '<li>' + credentialLink(c, 'badge', credentialArt(c, '220x220')) + '</li>';
      }).join('');
    }

    var marquee = $('#credlyMarquee');
    if (!marquee) { return; }

    function badgeMarkup(c) {
      return credentialLink(c, 'credly-badge', '<span class="credly-badge__image">' + credentialArt(c, '220x220') + '</span>');
    }

    // Each row opens with its share of the top six, in order, then its share
    // of everything else, newest first. Both rows show their first badges at
    // the left edge on load, whichever way they drift.
    var tracks = $$('[data-credly-track]', marquee);
    function share(items, rowIndex) {
      var per = Math.ceil(items.length / tracks.length);
      return items.slice(rowIndex * per, rowIndex * per + per);
    }
    var paces = [];
    tracks.forEach(function (track, rowIndex) {
      var rowCerts = share(TOP, rowIndex).concat(share(REST, rowIndex));
      track.innerHTML = '<ul>' + rowCerts.map(badgeMarkup).join('') + '</ul>';
      track.appendChild(track.firstElementChild.cloneNode(true));
      track.setAttribute('data-ready', '');
      var dragWrap = track.parentElement;
      var drag = dragWrap.parentElement;

      // Paced off the measured width, so a longer row is longer, not faster.
      // A hidden volume measures zero, so this runs again when it opens.
      var pace = function () {
        var width = track.firstElementChild.getBoundingClientRect().width;
        var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
        if (!width) { return; }
        var distance = width + gap;
        track.style.setProperty('--credly-distance', distance + 'px');
        track.style.setProperty('--credly-time', Math.max(32, Math.round(distance / 34)) + 's');
      };
      paces.push(pace);
      pace();
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(pace); }
      window.addEventListener('resize', pace);

      if (!window.PointerEvent) { return; }
      var offset = 0, startX = 0, startOffset = 0, dragging = false, moved = false;
      drag.addEventListener('pointerdown', function (e) {
        if (e.button) { return; }
        dragging = true; moved = false; startX = e.clientX; startOffset = offset;
        drag.classList.add('is-dragging');
        try { drag.setPointerCapture(e.pointerId); } catch (err) {}
      });
      drag.addEventListener('pointermove', function (e) {
        if (!dragging) { return; }
        moved = moved || Math.abs(e.clientX - startX) > 5;
        offset = startOffset + (e.clientX - startX);
        var period = track.firstElementChild.getBoundingClientRect().width;
        period += parseFloat(window.getComputedStyle(track).columnGap) || 0;
        if (period) { offset = offset % period; }
        dragWrap.style.transform = 'translateX(' + offset + 'px)';
      });
      function endDrag(e) {
        if (!dragging) { return; }
        dragging = false;
        drag.classList.remove('is-dragging');
        if (e && e.pointerId !== undefined) {
          try { drag.releasePointerCapture(e.pointerId); } catch (err) {}
        }
      }
      drag.addEventListener('pointerup', endDrag);
      drag.addEventListener('pointercancel', endDrag);
      drag.addEventListener('lostpointercapture', endDrag);
      drag.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
      }, true);
    });
    openHooks.push(function (id) {
      if (id === 'certifications') { window.requestAnimationFrame(function () { paces.forEach(function (fn) { fn(); }); }); }
    });
  })();

  /* --- first paint ----------------------------------------------------------
     Open the volume the address asks for (the old #skills, #experience and
     #contact links included), otherwise $whoami, then mark the nav. Old links
     to #home and #projects land on the rooms that replaced them. */
  var hash = location.hash.slice(1);
  var ALIASES = { home: 'wall', projects: 'index' };
  if (ALIASES[hash]) { hash = ALIASES[hash]; }
  if (vols.length) {
    if (openVol(hash, {})) {
      window.requestAnimationFrame(function () { volById(hash).scrollIntoView({ block: 'start' }); });
    } else {
      openVol(vols[0].id, {});
      var room = hash && document.getElementById(hash);
      if (room && room !== document.getElementById(location.hash.slice(1))) { room.scrollIntoView({ block: 'start' }); }
    }
  }
  markNav();
})();
