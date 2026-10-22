/* =============================================================================
   Just enough JavaScript. The site reads fine without it — the projects are a
   plain list, the volumes are printed one after another, and every link is an
   ordinary page load. Everything here is either decoration or a progressive
   enhancement over that, including the router at the end, which swaps pages
   in place instead of reloading them.

   Two layers. Theme, nav, the logo sprite and the router run once per visit.
   Each page's own behaviour (the Index, the wall, the shelf, the clock, the
   credentials, a project page's rail) is set up by initPage() whenever its
   content arrives, and everything it hangs on window or document is released
   by teardown() before the next page replaces it.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The phone layout: the tab bar, the feed, the pile and the full-screen book.
  var phone = window.matchMedia('(max-width: 760px)');
  var root = document.documentElement;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function scrollBehavior() { return still ? 'auto' : 'smooth'; }

  // The stylesheet scrolls smoothly; restoring a position should not.
  function jump(fn) {
    var was = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    fn();
    root.style.scrollBehavior = was;
  }

  /* --- page lifecycle ---------------------------------------------------------
     onPage() is addEventListener for anything outside the page's own content;
     atLeave() queues any other undo (timers, observers). teardown() runs them
     all when the page is swapped out. */
  var cleanups = [];
  function atLeave(fn) { cleanups.push(fn); }
  function onPage(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    atLeave(function () { target.removeEventListener(type, fn, opts); });
  }
  function teardown() {
    var fns = cleanups;
    cleanups = [];
    fns.forEach(function (fn) { try { fn(); } catch (error) {} });
  }

  // What the router and the nav ask of whichever page is showing: which room
  // to mark in the nav, and how to go to a #place on it.
  var page = null;

  function navH() { return parseFloat(window.getComputedStyle(root).getPropertyValue('--nav-h')) || 64; }

  function focusEl(el) {
    if (!el.matches('a[href], button, input, select, textarea, [tabindex]')) { el.setAttribute('tabindex', '-1'); }
    el.focus({ preventScroll: true });
  }
  function scrollToEl(el, how) {
    if (how.instant) { jump(function () { el.scrollIntoView({ block: 'start' }); }); }
    else { el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' }); }
  }
  // The plain version: scroll to the element with that id.
  function goToId(hash, how) {
    var id = decodeURIComponent((hash || '').replace(/^#/, ''));
    var el = id ? document.getElementById(id) : null;
    if (!el) { return false; }
    if (!how.first && !how.noScroll) { scrollToEl(el, how); }
    if (how.keyboard) { focusEl(el); }
    return true;
  }

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

  /* --- technology marks ------------------------------------------------------
     The sprite is fetched rather than inlined so it sits under /assets and is
     cached instead of riding along in every HTML response. It is injected into
     the document rather than referenced with <use href="sprite.svg#id">,
     because external references there are still unreliable in WebKit. Until it
     lands every mark shows as its name, so a blocked request costs nothing.
     Fetched once, by the first page that has a mark. */
  var spriteAsked = false;
  function ensureSprite() {
    if (spriteAsked || !window.fetch || !$('use[href^="#t-"]')) { return; }
    spriteAsked = true;
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

  /* --- nav: pinned state and the current room ------------------------------- */
  var nav = $('#nav');
  function markNav() {
    var y = window.scrollY || root.scrollTop;
    if (nav) { nav.classList.toggle('pinned', y > 8); }
    var here = page ? page.room() : null;
    $$('.nav__links a').forEach(function (a) {
      a.classList.toggle('current', !!here && a.hash === '#' + here);
    });
  }
  var navQueued = false;
  window.addEventListener('scroll', function () {
    if (!navQueued) {
      navQueued = true;
      window.requestAnimationFrame(function () { navQueued = false; markNav(); });
    }
  }, { passive: true });

  // A project page offers the way back to whichever room the visit began in.
  function rememberRoom(room) {
    try { sessionStorage.setItem('workFrom', room); } catch (error) {}
  }

  /* =========================================================================
     Home: the Wall, the Index and the shelf
     ====================================================================== */
  function initHome() {
    var ALIASES = { home: 'wall', projects: 'index' };

    /* --- Index ---------------------------------------------------------------
       Each row carries everything about its project: the mock screen in its
       thumbnail, the role and description under the link, the type and the
       marks. The preview panel and the wall are built from these rows, so a
       project added to the list turns up everywhere. */
    var list = $('[data-index]');
    var rows = list ? $$('.project', list) : [];
    var TYPE_NAMES = { all: 'All projects', gov: 'Government systems', device: 'Smart devices', mobile: 'Mobile apps' };

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

    /* --- preview panel ---------------------------------------------------- */
    var peek = $('[data-peek]');
    var peekShot = $('[data-peek-shot]');
    var peekName = $('[data-peek-name]');
    var peekRole = $('[data-peek-role]');
    var peekDesc = $('[data-peek-desc]');
    var peeked = null;
    var peekTimer = 0;
    atLeave(function () { clearTimeout(peekTimer); });

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
      if (link) {
        link.addEventListener('focus', function () { showPeek(p, true); });
        link.addEventListener('click', function () { rememberRoom('index'); });
      }
    });
    if (list) {
      list.addEventListener('pointerleave', function () { markPeek(null); });
      list.addEventListener('focusout', function (e) {
        if (!list.contains(e.relatedTarget)) { markPeek(null); }
      });
    }

    /* --- filters and search ----------------------------------------------- */
    var filterButtons = $$('[data-filter]');
    var find = $('[data-find]');
    var filterLabel = $('[data-filter-label]');
    var counts = $$('[data-count]');
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
      counts.forEach(function (c) { c.textContent = pad(shown); });
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
      // The phone layout asks in words, as the reference does there.
      var askPhone = function () { find.placeholder = phone.matches ? 'Find a project' : 'type to find'; };
      askPhone();
      if (phone.addEventListener) { onPage(phone, 'change', askPhone); }
      find.addEventListener('input', applyFilter);
      find.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && find.value) { find.value = ''; applyFilter(); }
      });
      // "/" jumps to the search box, as it does on most sites with one.
      onPage(document, 'keydown', function (e) {
        if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) { return; }
        var t = e.target;
        if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) { return; }
        e.preventDefault();
        find.focus({ preventScroll: true });
        $('#index').scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      });
    }
    if (projects.length) { showPeek(projects[0], false); }

    /* --- Wall ----------------------------------------------------------------
       Each project gets three tiles: its screen (phones for the mobile app), a
       close-up or a second screen, and its brand marks. The rows start at
       different points in that list so no project stacks above itself. */
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

      var caption = function (i) {
        var p = projects[i];
        wallCount.textContent = pad(i + 1) + ' / ' + pad(projects.length);
        wallName.textContent = p.name;
        wallDesc.textContent = p.desc;
      };
      var focusProject = function (i) {
        if (i === focused) { return; }
        focused = i;
        wall.classList.toggle('is-focus', i >= 0);
        tiles.forEach(function (tile) { tile.classList.toggle('is-on', Number(tile.getAttribute('data-p')) === i); });
        if (i >= 0) { caption(i); }
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
      onPage(document, 'pointerdown', function (e) {
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
        onPage(window, 'scroll', function () {
          if (!driftQueued) { driftQueued = true; window.requestAnimationFrame(drift); }
        }, { passive: true });
        drift();
      }

      /* On a phone the wall is a feed instead, as in the reference: one
         project to a screen, its number, name and line pinned at the foot,
         and a rail of ticks down the side. The screen nearest its place is
         in focus and the rest wash back; the caption fades between them. */
      var feed = document.createElement('ol');
      feed.className = 'feed';
      feed.setAttribute('aria-label', 'Projects');
      feed.innerHTML = projects.map(function (p) {
        var kind = mainKind(p);
        return '<li class="feed__item"><a class="feed__shot feed__shot--' + kind + '" href="/work/' + p.id + '">' +
          shot(p, kind) + '<span class="visually-hidden">' + esc(p.name) + '</span></a></li>';
      }).join('');
      var rail = document.createElement('div');
      rail.className = 'feed__rail';
      rail.setAttribute('aria-hidden', 'true');
      rail.innerHTML = new Array(projects.length * 5 + 1).join('<i></i>');
      wall.insertBefore(feed, plane.parentNode.nextSibling);
      wall.insertBefore(rail, feed.nextSibling);
      var items = $$('.feed__item', feed);
      var notches = $$('i', rail);
      $$('.feed__shot', feed).forEach(function (a) {
        a.addEventListener('click', function () { rememberRoom('wall'); });
      });

      var feedAt = -1;
      var feedQueued = false;
      var follow = function () {
        feedQueued = false;
        if (!phone.matches) { return; }
        var cs = window.getComputedStyle(items[0]);
        var line = navH() + (items[0].offsetHeight - parseFloat(cs.paddingBottom)) / 2;
        var near = 0;
        var nearD = Infinity;
        var centres = items.map(function (item, i) {
          var r = item.firstChild.getBoundingClientRect();
          var c = r.top + r.height / 2;
          var d = (c - line) / item.offsetHeight;
          item.style.setProperty('--near', Math.max(0.18, 1 - Math.abs(d) * 1.5).toFixed(3));
          if (Math.abs(d) < Math.abs(nearD)) { near = i; nearD = d; }
          return c;
        });
        if (near !== feedAt) { feedAt = near; caption(near); }
        wall.style.setProperty('--cap', Math.max(0, 1 - Math.abs(nearD) * 2.6).toFixed(3));
        var span = centres[centres.length - 1] - centres[0];
        var progress = span > 0 ? Math.min(1, Math.max(0, (line - centres[0]) / span)) : 0;
        var on = Math.round(progress * (notches.length - 1));
        notches.forEach(function (n, i) { n.classList.toggle('is-on', i === on); });
      };
      var fitFeed = function () {
        var w = feed.clientWidth - 2 * parseFloat(window.getComputedStyle(feed).paddingLeft);
        if (w > 0) { feed.style.setProperty('--feed-s', Math.min(1, w / 480).toFixed(4)); }
        follow();
      };
      onPage(window, 'scroll', function () {
        if (!feedQueued) { feedQueued = true; window.requestAnimationFrame(follow); }
      }, { passive: true });
      onPage(window, 'resize', fitFeed);
      fitFeed();
    }

    /* --- About: the shelf -------------------------------------------------- */
    var openHooks = [];
    var library = $('[data-library]');
    var reader = library ? bookReader(library, openHooks) : null;

    /* --- the clock under the shelf, in Zamboanga time ---------------------- */
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
        var clockTimer = setInterval(tick, 15000);
        atLeave(function () { clearInterval(clockTimer); });
      }
    }

    credentials(openHooks);

    var rooms = ['wall', 'index', 'about']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    page = {
      room: function () {
        var line = (window.scrollY || root.scrollTop) + window.innerHeight * 0.35;
        var here = rooms.length ? rooms[0].id : null;
        rooms.forEach(function (room) { if (room.offsetTop <= line) { here = room.id; } });
        if (here === 'about' && reader && reader.openId() === 'contact') { here = 'contact'; }
        return here;
      },
      /* Any link to a volume takes its book off the shelf: the spines, the
         nav's Contact, and links to the old section anchors. Old links to
         #home and #projects land on the rooms that replaced them. */
      hash: function (hash, how) {
        var raw = decodeURIComponent((hash || '').replace(/^#/, ''));
        var id = ALIASES[raw] || raw;
        if (reader && reader.has(id)) {
          reader.open(id, {
            scroll: how.noScroll ? null : how.shelf ? 'nudge' : 'start',
            instant: how.instant || how.first,
            focus: how.user
          });
          return true;
        }
        if (id !== raw) { how = { instant: how.instant, keyboard: how.keyboard, noScroll: how.noScroll }; }
        return goToId(id, how);
      }
    };
  }

  /* =========================================================================
     The reader. Following a spine takes its book off the shelf: it slides
     out spine first, turns to its cover in front of the shelf and opens on
     a spread, the contents on the left and a page on the right. A narrow
     screen gets one page at a time, the contents first. The pages are the
     volume's own .vol__page sections, moved into the book while they show
     and put back after, so whatever is wired to them keeps working.

     The book is one box in 3D (covers, spine, page edges) while it moves.
     Once it lies open it is flattened (.is-flat), and the spread is ordinary
     layout: crisp text, links, scrolling. Turning a page lays a copy of it
     over the spread and swings that.
     ====================================================================== */
  function bookReader(library, openHooks) {
    var shelf = $('.shelf', library);
    var animates = !!Element.prototype.animate;

    var volumes = $$('.book', library).map(function (spine) {
      var id = spine.getAttribute('aria-controls');
      var vol = id ? document.getElementById(id) : null;
      if (!vol) { return null; }
      var text = function (sel) { var n = $(sel, vol); return n ? n.textContent.trim() : ''; };
      var lede = $('.vol__lede', vol);
      return {
        id: id,
        spine: spine,
        num: $('.book__num', spine) ? $('.book__num', spine).textContent : '',
        by: $('.book__by', spine) ? $('.book__by', spine).textContent : '',
        title: text('.vol__title'),
        lede: lede ? lede.innerHTML : '',
        w: parseFloat(spine.style.getPropertyValue('--w')) || 56,
        h: parseFloat(spine.style.getPropertyValue('--h')) || 392,
        tone: (spine.className.match(/\bbook--(?:light|ink)\b/) || [''])[0],
        pages: $$('.vol__page', vol).map(function (node) {
          var home = document.createComment('');
          node.parentNode.insertBefore(home, node);
          var title = $('.vol__page-title', node);
          return { node: node, home: home, title: title ? title.textContent.trim() : '' };
        })
      };
    }).filter(function (v) { return v && v.pages.length; });
    if (!shelf || !volumes.length) { return null; }

    var el = document.createElement('div');
    el.className = 'reader';
    el.hidden = true;
    el.setAttribute('role', 'region');
    el.innerHTML =
      '<p class="reader__label" aria-hidden="true"></p>' +
      '<div class="reader__stage"><div class="fb">' +
        '<div class="fb__back"></div>' +
        '<div class="fb__facing" aria-hidden="true"></div>' +
        '<div class="fb__top"></div><div class="fb__bottom"></div><div class="fb__edge"></div>' +
        '<div class="fb__spine" aria-hidden="true"></div>' +
        // The left-hand page first, so it is read (and tabbed through) first.
        '<div class="fb__flap">' +
          '<div class="fb__cover" aria-hidden="true"></div>' +
          '<div class="fb__inside"><div class="fb__sheet fb__sheet--left"><div class="fb__body"></div>' +
            '<p class="fb__folio"><span data-folio-vol></span><span>Contents</span></p></div></div>' +
        '</div>' +
        '<div class="fb__page fb__sheet"><div class="fb__body"></div>' +
          '<p class="fb__folio"><span data-folio-title></span><span data-folio-num></span></p></div>' +
      '</div></div>' +
      '<div class="reader__bar">' +
        '<button type="button" class="reader__turn" data-turn="-1" aria-label="Previous page"><span aria-hidden="true">&larr;</span></button>' +
        '<p class="reader__where" aria-live="polite"></p>' +
        '<button type="button" class="reader__turn" data-turn="1" aria-label="Next page"><span aria-hidden="true">&rarr;</span></button>' +
        '<i class="reader__sep" aria-hidden="true"></i>' +
        '<button type="button" class="reader__close">Back to shelf</button>' +
      '</div>' +
      '<div class="fb__sheet fb__probe" aria-hidden="true"><div class="fb__body"></div><p class="fb__folio"><span>&nbsp;</span></p></div>';
    library.appendChild(el);
    (library.closest('.about') || library.parentNode).classList.add('has-reader');

    var stage = $('.reader__stage', el);
    var fb = $('.fb', el);
    var right = $('.fb__page', el);
    var rightBody = $('.fb__body', right);
    var flap = $('.fb__flap', el);
    var cover = $('.fb__cover', el);
    var spineFace = $('.fb__spine', el);
    var leftSheet = $('.fb__sheet--left', el);
    var leftBody = $('.fb__body', leftSheet);
    var where = $('.reader__where', el);
    var prev = $('[data-turn="-1"]', el);
    var next = $('[data-turn="1"]', el);
    var probe = $('.fb__probe', el);
    var probeBody = $('.fb__body', probe);

    /* On a phone the open book fills the window, and the header's Close puts
       it back, as in the reference. The button lives in the header only
       while this page does. */
    var navClose = document.createElement('button');
    navClose.type = 'button';
    navClose.className = 'nav__close';
    navClose.textContent = 'Close';
    var toggle = $('.nav__inner .theme-toggle');
    if (toggle) { toggle.parentNode.insertBefore(navClose, toggle); }
    atLeave(function () { navClose.remove(); root.classList.remove('is-reading'); });

    var toc = document.createElement('div');
    toc.className = 'fb__contents';
    var contents = { node: toc, title: 'Contents', toc: true };

    var cur = null;       // the volume out of the shelf
    var state = 'shelf';  // 'shelf', 'moving' or 'open'
    var single = false;   // one page at a time
    var size = null;      // { W, H, D } in px
    var at = 0;           // which of list() is on the right-hand page
    var shown = null;
    var endTurn = null;   // ends the turn under way, if any
    var overlay = false;  // the full-screen book of the phone layout
    var queue = Promise.resolve();
    var dimTimer = 0;
    atLeave(function () { clearTimeout(dimTimer); });

    function byId(id) {
      for (var i = 0; i < volumes.length; i++) { if (volumes[i].id === id) { return volumes[i]; } }
      return null;
    }
    // What the right-hand page can show: the contents too, on one page.
    function list() { return single ? [contents].concat(cur.pages) : cur.pages; }

    function play(node, frames, opts) {
      if (!animates || still) { return Promise.resolve(); }
      return node.animate(frames, opts).finished.catch(function () {});
    }
    function pause(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

    /* --- dressing the book for a volume ----------------------------------- */
    function dress(v) {
      fb.className = 'fb' + (v.tone ? ' ' + v.tone : '');
      el.setAttribute('aria-label', 'Vol. ' + v.num + ', ' + v.title);
      cover.innerHTML =
        '<span class="fb__by">' + esc(v.by) + '</span>' +
        '<span class="fb__num">' + esc(v.num) + '</span>' +
        '<span class="fb__name">' + esc(v.title) + '</span>' +
        '<span class="fb__foot">Vol. ' + esc(v.num) + '</span>';
      spineFace.innerHTML = '<span class="' + v.spine.className.replace(/\s*\b(book--first|is-out)\b/g, '') + '">' +
        v.spine.innerHTML + '</span>';
      $('[data-folio-vol]', el).textContent = 'Vol. ' + v.num;
      $('.reader__label', el).textContent = 'Vol. ' + v.num + ' \u00b7 ' + v.title;
      toc.innerHTML =
        '<p class="fb__kicker">Vol. ' + esc(v.num) + '</p>' +
        '<h3 class="fb__vtitle" id="reader-title" tabindex="-1">' + esc(v.title) + '</h3>' +
        (v.lede ? '<p class="fb__lede">' + v.lede + '</p>' : '') +
        '<p class="fb__label">Contents</p>' +
        '<ol class="fb__toc">' + v.pages.map(function (p, i) {
          return '<li><button type="button" data-goto="' + i + '"><span>' + esc(p.title) + '</span>' +
            '<i>' + pad(i + 1) + '</i><b aria-hidden="true">&rarr;</b></button></li>';
        }).join('') + '</ol>';
    }

    /* The book is as tall as its longest page needs, within the window, and
       as deep as its spine is wide for its height. */
    function measure(v) {
      var libW = library.clientWidth;
      single = libW < 680;
      var W = Math.floor(single ? Math.min(libW, 420) : Math.min(440, libW / 2));
      fb.style.setProperty('--W', W + 'px');
      probe.style.width = (W - 6) + 'px';
      var need = 0;
      [contents].concat(v.pages).forEach(function (p) {
        probeBody.appendChild(p.node.cloneNode(true));
        need = Math.max(need, probe.offsetHeight);
        probeBody.textContent = '';
      });
      var most = overlay ? window.innerHeight - navH() - 130 : Math.max(420, window.innerHeight - navH() - 150);
      var H = Math.round(Math.min(most, Math.max(W * (overlay && single ? 1.42 : 1.28), need + 6)));
      // As deep as the spine is wide for its length, standing or lying.
      var sr = v.spine.getBoundingClientRect();
      var lying = phone.matches;
      var long = lying ? sr.width : sr.height;
      var D = Math.round(H * (long ? (lying ? sr.height : sr.width) / long : v.w / v.h));
      size = { W: W, H: H, D: D };
      fb.style.setProperty('--H', H + 'px');
      fb.style.setProperty('--D', D + 'px');
      stage.style.height = H + 'px';
      // The spine drawn at the book's size: --k for a standing one, --z lying.
      spineFace.firstChild.style.cssText = '--w:' + v.w + ';--h:' + v.h + ';--k:' + (H / v.h).toFixed(4) +
        ';--z:' + (long ? H / long : 1).toFixed(4);
      fb.classList.toggle('is-single', single);
      // The contents live on the left page of a spread.
      if (!single && toc.parentNode !== leftBody) { leftBody.appendChild(toc); }
    }

    /* --- what the right-hand page shows ----------------------------------- */
    function home(item) {
      if (!item) { return; }
      if (item.toc) {
        if (single) { toc.remove(); } else { leftBody.appendChild(toc); }
      } else {
        item.home.parentNode.insertBefore(item.node, item.home.nextSibling);
      }
    }
    function show(i) {
      var items = list();
      home(shown);
      at = Math.max(0, Math.min(items.length - 1, i));
      shown = items[at];
      rightBody.appendChild(shown.node);
      rightBody.scrollTop = 0;
      right.classList.toggle('fb__sheet--left', verso(at));
      more();
      var n = cur.pages.indexOf(shown);
      $('[data-folio-title]', el).textContent = shown.toc ? 'Vol. ' + cur.num : cur.title;
      $('[data-folio-num]', el).textContent = n < 0 ? 'Contents' : pad(n + 1);
      $$('[data-goto]', toc).forEach(function (b) {
        if (Number(b.getAttribute('data-goto')) === n) { b.setAttribute('aria-current', 'page'); }
        else { b.removeAttribute('aria-current'); }
      });
      // One page at a time counts the contents as a page, as the reference does.
      var count = single ? (at + 1) + ' / ' + items.length : (n < 0 ? '' : (n + 1) + ' ') + '/ ' + cur.pages.length;
      where.innerHTML = '<span class="reader__vol">Vol. ' + esc(cur.num) + ' &middot; ' + esc(cur.title) + ' &middot; </span>' +
        '<b>' + esc(shown.title) + '</b> <span class="reader__count">' + count + '</span>';
      prev.disabled = at === 0;
      next.disabled = at === items.length - 1;
      if (state === 'open') { settled(); }
    }
    /* One page at a time, the pages still fall either side of a spine: the
       contents and every other page to its left, the rest to its right, with
       the edge of the facing page in view. */
    function verso(i) { return single && i % 2 === 0; }
    function side() { fb.classList.toggle('is-verso', verso(at)); }

    // Whatever measures itself (the marquee) does so once the book lies flat.
    function settled() { openHooks.forEach(function (fn) { fn(cur.id); }); }

    // A page longer than the book scrolls, and fades out while there is more.
    function more() {
      right.classList.toggle('has-more', rightBody.scrollHeight - rightBody.scrollTop - rightBody.clientHeight > 4);
    }
    rightBody.addEventListener('scroll', more, { passive: true });

    /* --- poses -------------------------------------------------------------
       One transform list throughout, so every pose blends into the next. On
       the shelf the book stands turned a quarter, spine out, scaled down to
       the spine and pushed back so the spine sits at its true size. */
    function tf(x, y, z, s, rz, ry, rx) {
      return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) ' +
        'scale3d(' + s.toFixed(4) + ',' + s.toFixed(4) + ',' + s.toFixed(4) + ') ' +
        'rotateZ(' + rz + 'deg) rotateY(' + ry + 'deg) rotateX(' + rx + 'deg)';
    }
    function flapAt(deg) { return 'translateZ(' + (size.D / 2) + 'px) rotateY(' + deg + 'deg)'; }
    /* A book lying in the phone layout's pile is the same, turned a further
       quarter in the plane of the page, so its spine runs across. */
    function poses(v) {
      var st = stage.getBoundingClientRect();
      var sr = v.spine.getBoundingClientRect();
      var W = size.W, H = size.H, D = size.D;
      var lying = phone.matches;
      var rz = lying ? -90 : 0;
      var s = (lying ? sr.width : sr.height) / H;
      var x = sr.left + sr.width / 2 - (st.left + st.width / 2);
      var y = sr.top + sr.height / 2 - (st.top + H / 2);
      var z = -s * W / 2;
      var spread = single ? 0 : W / 2;
      return {
        shelf: tf(x, y, z, s, rz, 90, 0),
        pulled: tf(x, y - 6, z + 110, s, rz, 90, 0),
        turning: tf(x * 0.45, y * 0.45 - 30, -D / 2 + 60, (s + 1) / 2, rz * 0.4, 38, -6),
        front: tf(0, 0, -D / 2, 1, 0, 0, 0),
        opening: tf(spread / 2, -10, -D / 2 + 30, 1, 0, 0, 9),
        open: tf(spread, 0, -D / 2, 1, 0, 0, 0)
      };
    }

    // The shelf makes room for the open book, at once, so that scrolling to
    // the book (or back to where the page was) finds the page full height.
    function room(px) { library.style.minHeight = px ? px + 'px' : ''; }

    // Keep the open book in view, under the nav.
    function bring(how) {
      if (!how.scroll || overlay) { return; }
      var r = el.getBoundingClientRect();
      var top = r.top - navH() - 16;
      var delta = 0;
      if (how.scroll === 'start' || top < 0) { delta = top; }
      else if (r.bottom > window.innerHeight - 12) { delta = Math.min(top, r.bottom - window.innerHeight + 12); }
      if (Math.abs(delta) < 2) { return; }
      if (how.instant) { jump(function () { window.scrollBy(0, delta); }); }
      else { window.scrollBy({ top: delta, behavior: scrollBehavior() }); }
    }

    /* --- off the shelf ------------------------------------------------------ */
    function takeOut(v, how) {
      cur = v;
      state = 'moving';
      overlay = phone.matches;
      // Full screen, the book still comes off the pile: bring the pile into
      // view behind it, so the flight starts from its spine and Close lands
      // there.
      if (overlay && how.scroll === 'start') {
        jump(function () { window.scrollBy(0, library.getBoundingClientRect().top - navH() - 24); });
      }
      root.classList.toggle('is-reading', overlay);
      el.hidden = false;
      el.classList.remove('is-open');
      dress(v);
      measure(v);
      shown = null;
      show(0);
      side();
      var p = poses(v);
      v.spine.classList.add('is-out');
      v.spine.setAttribute('aria-expanded', 'true');
      library.classList.add('is-reading');
      if (!overlay) { room(el.offsetHeight); }
      shelf.inert = true;
      markNav();
      bring(how);

      if (how.instant || still || !animates) { return Promise.resolve(lieOpen(how)); }

      fb.classList.remove('is-flat');
      fb.style.transform = p.front;
      flap.style.transform = flapAt(0);
      clearTimeout(dimTimer);
      dimTimer = setTimeout(function () { library.classList.add('is-dim'); }, 380);
      return play(fb, [
        { transform: p.shelf, easing: 'cubic-bezier(.3,.6,.35,1)' },
        { transform: p.pulled, offset: 0.24, easing: 'cubic-bezier(.45,0,.3,1)' },
        { transform: p.turning, offset: 0.62, easing: 'cubic-bezier(.3,0,.25,1)' },
        { transform: p.front }
      ], { duration: 1250 }).then(function () {
        return pause(90);
      }).then(function () {
        if (!el.isConnected) { return; }
        fb.style.transform = p.open;
        flap.style.transform = flapAt(-180);
        var ease = 'cubic-bezier(.55,0,.3,1)';
        return Promise.all([
          play(fb, [{ transform: p.front }, { transform: p.opening }, { transform: p.open }], { duration: 950, easing: ease }),
          play(flap, [{ transform: flapAt(0) }, { transform: flapAt(-180) }], { duration: 950, easing: ease })
        ]);
      }).then(function () { lieOpen(how); });
    }

    function lieOpen(how) {
      if (!el.isConnected) { return; }
      fb.style.transform = '';
      flap.style.transform = '';
      fb.classList.add('is-flat');
      library.classList.add('is-dim');
      el.classList.add('is-open');
      state = 'open';
      settled();
      if (how.focus) { $('#reader-title', el).focus({ preventScroll: true }); }
    }

    /* --- back on the shelf ------------------------------------------------- */
    function putBack(how) {
      var v = cur;
      if (endTurn) { endTurn(); }
      state = 'moving';
      el.classList.remove('is-open');
      var done = function () {
        if (!el.isConnected) { return; }
        home(shown);
        shown = null;
        toc.remove();
        el.hidden = true;
        fb.style.transform = '';
        flap.style.transform = '';
        fb.classList.remove('is-flat');
        v.spine.classList.remove('is-out');
        v.spine.setAttribute('aria-expanded', 'false');
        library.classList.remove('is-reading', 'is-dim');
        root.classList.remove('is-reading');
        room(0);
        shelf.inert = false;
        cur = null;
        state = 'shelf';
        markNav();
        if (how.focus) { v.spine.focus({ preventScroll: true }); }
      };
      if (how.instant || still || !animates) { done(); return Promise.resolve(); }

      var p = poses(v);
      var ease = 'cubic-bezier(.55,0,.3,1)';
      fb.classList.remove('is-flat');
      fb.style.transform = p.front;
      flap.style.transform = flapAt(0);
      return Promise.all([
        play(fb, [{ transform: p.open }, { transform: p.opening }, { transform: p.front }], { duration: 850, easing: ease }),
        play(flap, [{ transform: flapAt(-180) }, { transform: flapAt(0) }], { duration: 850, easing: ease })
      ]).then(function () {
        if (!el.isConnected) { return; }
        library.classList.remove('is-dim');
        fb.style.transform = p.shelf;
        return play(fb, [
          { transform: p.front, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: p.turning, offset: 0.38, easing: 'cubic-bezier(.3,0,.3,1)' },
          { transform: p.pulled, offset: 0.76, easing: 'cubic-bezier(.4,0,.2,1)' },
          { transform: p.shelf }
        ], { duration: 1150 });
      }).then(done);
    }

    /* --- turning pages ------------------------------------------------------
       On a spread, a copy of the page lifts off to the left, showing the new
       one beneath; back, a copy of the previous page swings in over it.
       Either way the copy's other side is the left-hand page, so it lands as
       if it were the page. One page at a time, the book slides along within
       a spread and a page turns over between spreads, the book following it
       across so the page that lands is the one in view. */
    // Copies only: no ids twice on the page, nothing to tab to.
    function copy(from, cls) {
      var sheet = document.createElement('div');
      sheet.className = 'fb__sheet ' + cls;
      sheet.innerHTML = from.innerHTML;
      $$('[id]', sheet).forEach(function (n) { n.removeAttribute('id'); });
      return sheet;
    }
    function leafOf(front, back) {
      var leaf = document.createElement('div');
      leaf.className = 'fb__leaf';
      leaf.setAttribute('aria-hidden', 'true');
      leaf.inert = true;
      leaf.appendChild(front);
      back.classList.add('fb__leaf-back');
      leaf.appendChild(back);
      return leaf;
    }
    var FLAT = 'perspective(2400px) rotateY(0deg)';
    var OVER = 'perspective(2400px) rotateY(-180deg)';
    var TURN_EASE = 'cubic-bezier(.45,.05,.25,1)';
    // Ends the turn when its animations do, or at once when another starts.
    function finish(parts, anims, after) {
      var end = function () {
        if (endTurn === end) { endTurn = null; }
        anims.forEach(function (a) { a.cancel(); });
        parts.forEach(function (n) { n.remove(); });
        after();
      };
      endTurn = end;
      Promise.all(anims.map(function (a) { return a.finished; })).then(end, function () {});
    }

    function turn(to) {
      if (!cur || state !== 'open' || to === at || to < 0 || to >= list().length) { return; }
      // A turn asked for mid-turn finishes the one under way first.
      if (endTurn) { endTurn(); }
      if (still || !animates) { show(to); side(); return; }
      var forward = to > at;
      if (single) {
        var across = Math.floor(at / 2) !== Math.floor(to / 2);
        if (across && verso(at) !== forward) { turnOver(to, forward); } else { slide(to, forward); }
        return;
      }
      var under = null;
      var front;
      if (forward) {
        front = copy(right, 'fb__leaf-face');
        show(to);
      } else {
        under = copy(right, 'fb__under');
        fb.appendChild(under);
        show(to);
        front = copy(right, 'fb__leaf-face');
      }
      var leaf = leafOf(front, copy(leftSheet, 'fb__sheet--left'));
      fb.appendChild(leaf);
      // No opacity here: it would flatten the leaf and show its face through.
      leaf.style.transform = forward ? OVER : FLAT;
      var swing = leaf.animate(forward ? [{ transform: FLAT }, { transform: OVER }] : [{ transform: OVER }, { transform: FLAT }],
        { duration: 760, easing: TURN_EASE });
      finish(under ? [leaf, under] : [leaf], [swing], function () {});
    }

    // Within a spread: the book slides a page's width, the old page with it.
    function slide(to, forward) {
      var delta = forward ? -size.W : size.W;
      var old = copy(right, 'fb__under' + (verso(at) ? ' fb__sheet--left' : ''));
      old.style.left = (verso(at) ? 6 : 0) + 'px';
      fb.appendChild(old);
      show(to);
      right.style.left = ((verso(to) ? 6 : 0) - delta) + 'px';
      fb.classList.add('is-turning');
      var move = fb.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + delta + 'px)' }],
        { duration: 560, easing: TURN_EASE });
      finish([old], [move], function () {
        right.style.left = '';
        fb.classList.remove('is-turning');
        side();
      });
    }

    // Between spreads: the right-hand page turns over to become the next
    // left-hand one (or back), and the book follows it across.
    function turnOver(to, forward) {
      var front, back;
      if (forward) {
        front = copy(right, 'fb__leaf-face');
        show(to);
        back = copy(right, 'fb__sheet--left');
      } else {
        back = copy(right, 'fb__sheet--left');
        show(to);
        front = copy(right, 'fb__leaf-face');
      }
      var blank = document.createElement('div');
      blank.className = 'fb__sheet fb__under';
      var leaf = leafOf(front, back);
      fb.appendChild(blank);
      fb.appendChild(leaf);
      right.style.visibility = 'hidden';
      fb.classList.add('is-turning');
      leaf.style.transform = forward ? OVER : FLAT;
      var here = 'translateX(0)';
      var there = 'translateX(' + size.W + 'px)';
      var swing = leaf.animate(forward ? [{ transform: FLAT }, { transform: OVER }] : [{ transform: OVER }, { transform: FLAT }],
        { duration: 820, easing: TURN_EASE });
      var follow = fb.animate(forward ? [{ transform: here }, { transform: there }] : [{ transform: there }, { transform: here }],
        { duration: 820, easing: TURN_EASE });
      finish([leaf, blank], [swing, follow], function () {
        right.style.visibility = '';
        fb.classList.remove('is-turning');
        side();
      });
    }

    /* --- the public face ---------------------------------------------------- */
    /* Straight away when nothing is moving, so a caller that restores the
       scroll position next finds the page at its full height; after the
       move under way otherwise. */
    function open(id, how) {
      var v = byId(id);
      if (!v) { return; }
      var step = function () {
        if (!el.isConnected) { return; }
        if (cur === v) { bring(how); return; }
        // Another volume is out: it goes back at once, this one comes out.
        if (cur) { putBack({ instant: true }); }
        return takeOut(v, how);
      };
      queue = state === 'moving' ? queue.then(step) : Promise.resolve(step());
    }
    function close(how) {
      if (!cur || state !== 'open') { return; }
      queue = Promise.resolve(putBack(how));
      try { history.replaceState(history.state, '', location.pathname + location.search + '#about'); } catch (error) {}
    }

    navClose.addEventListener('click', function () { close({ focus: true }); });
    // Full screen, a link outside the book (the name in the header) puts it
    // back at once and goes where it goes.
    onPage(document, 'click', function (e) {
      if (!overlay || state !== 'open' || !e.target.closest || !e.target.closest('a[href]') || el.contains(e.target)) { return; }
      queue = Promise.resolve(putBack({ instant: true }));
    }, true);

    el.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button') : null;
      if (!t || !el.contains(t)) { return; }
      if (t.classList.contains('reader__close')) { close({ focus: true }); return; }
      if (t.hasAttribute('data-turn')) { turn(at + Number(t.getAttribute('data-turn'))); return; }
      if (t.hasAttribute('data-goto')) { turn(list().indexOf(cur.pages[Number(t.getAttribute('data-goto'))])); }
    });

    onPage(document, 'keydown', function (e) {
      if (state !== 'open' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) { return; }
      var t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) { return; }
      // From inside the book, or from nowhere in particular while it shows.
      if (!el.contains(t)) {
        var r = el.getBoundingClientRect();
        if (t.closest('a[href], button, [tabindex]:not([tabindex="-1"])') || r.bottom < navH() || r.top > window.innerHeight) { return; }
      }
      if (e.key === 'Escape') { e.preventDefault(); close({ focus: true }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); turn(at + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(at - 1); }
    });

    // A swipe across the page turns it, on a touch screen.
    if (window.PointerEvent) {
      var sx = 0, sy = 0, swiping = false;
      right.addEventListener('pointerdown', function (e) {
        swiping = e.pointerType === 'touch' && !e.target.closest('.credly-row');
        sx = e.clientX; sy = e.clientY;
      });
      right.addEventListener('pointercancel', function () { swiping = false; });
      right.addEventListener('pointerup', function (e) {
        if (!swiping) { return; }
        swiping = false;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { turn(at + (dx < 0 ? 1 : -1)); }
      });
    }

    // A new width can change a spread into single pages and back.
    var fitTimer = 0;
    onPage(window, 'resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(function () {
        if (state !== 'open') { return; }
        if (endTurn) { endTurn(); }
        var page = shown;
        home(shown);
        shown = null;
        overlay = phone.matches;
        root.classList.toggle('is-reading', overlay);
        measure(cur);
        var i = list().indexOf(page);
        show(i < 0 ? 0 : i);
        side();
        room(overlay ? 0 : el.offsetHeight);
      }, 150);
    });
    atLeave(function () { clearTimeout(fitTimer); });

    // On paper the volumes print whole, so the page in the book goes home.
    onPage(window, 'beforeprint', function () { if (shown && !shown.toc) { home(shown); } });
    onPage(window, 'afterprint', function () { if (shown && !shown.toc) { rightBody.appendChild(shown.node); } });

    return {
      has: function (id) { return !!byId(id); },
      openId: function () { return cur ? cur.id : null; },
      open: open,
      close: close
    };
  }

  /* =========================================================================
     Credentials: the top six in $whoami and the Credly marquee in vol. 03.
     The data is generated from the public profile by tools/fetch-credly.ps1,
     so every image and verification URL stays official.
     ====================================================================== */
  function credentials(openHooks) {
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
        if (!track.isConnected) { return; }
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
      onPage(window, 'resize', pace);

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
  }

  /* =========================================================================
     Project pages (/work/*)
     The back link and the nav follow the room the visit began in. The hero
     screen is fitted to its card, and the rail at the right marks the section
     in view.
     ====================================================================== */
  function initWork(work) {
    var from = null;
    try { from = sessionStorage.getItem('workFrom'); } catch (error) {}
    var room = from === 'index' ? 'index' : 'wall';

    var back = $('[data-back]');
    if (back) {
      if (room === 'index') {
        back.setAttribute('href', '/#index');
        var backLabel = $('[data-back-label]');
        if (backLabel) { backLabel.textContent = 'Back to the index'; }
      }
      // Arrived here from the home page: going back is a step back in
      // history, which returns to the same place on it.
      back.addEventListener('click', function (e) {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
        if (history.state && history.state.from === '/') { e.preventDefault(); history.back(); }
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
      onPage(window, 'resize', fitShot);
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
      atLeave(function () { railIo.disconnect(); });
      ticks[0].classList.add('is-current');
    }

    page = { room: function () { return room; }, hash: goToId };
  }

  /* --- whichever page is showing ----------------------------------------- */
  function initPage() {
    page = { room: function () { return null; }, hash: goToId };
    var year = $('#year');
    if (year) { year.textContent = String(new Date().getFullYear()); }
    ensureSprite();
    var work = $('[data-work]');
    if (work) { initWork(work); } else if ($('[data-index]') || $('#wall')) { initHome(); }
  }

  /* =========================================================================
     Router
     Links within the site swap pages in place: the next page is fetched, its
     <main> and footer replace these, and the title, description and canonical
     follow. The header stays, so the theme and the nav never flicker. Each
     move is a history entry that remembers where on the page it was, so Back
     and Forward return to the same place. Anything that goes wrong falls back
     to an ordinary page load, which is what every link is underneath.
     ====================================================================== */
  var canRoute = !!(window.fetch && window.DOMParser && window.Promise && window.URL &&
    window.history && history.pushState && document.adoptNode);
  var renderedPath = location.pathname;
  var htmlCache = {};
  var scriptsLoaded = {};
  $$('script[src]').forEach(function (s) { scriptsLoaded[s.src] = true; });

  if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }

  // A link the router can take: same site, a page rather than a file, and
  // not meant for a new tab or a download.
  function pageUrl(a) {
    if (!a || a.hasAttribute('download')) { return null; }
    var target = a.getAttribute('target');
    if (target && target !== '_self') { return null; }
    var url;
    try { url = new URL(a.href, location.href); } catch (error) { return null; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) { return null; }
    if (/\.[a-z0-9]+$/i.test(url.pathname) && !/\.html?$/i.test(url.pathname)) { return null; }
    return url;
  }
  function isHere(url) { return url.pathname === renderedPath && url.search === location.search; }

  function saveScroll() {
    try {
      var state = {};
      var old = history.state || {};
      for (var key in old) { if (Object.prototype.hasOwnProperty.call(old, key)) { state[key] = old[key]; } }
      state.scrollY = window.scrollY || root.scrollTop;
      history.replaceState(state, '');
    } catch (error) {}
  }
  /* Kept up to date while scrolling, since a reload gives no reliable last
     chance: at most every 400ms (Safari limits how often history can be
     written), and once more when the scrolling stops. */
  var savedAt = 0;
  var saveTimer = 0;
  window.addEventListener('scroll', function () {
    clearTimeout(saveTimer);
    var now = Date.now();
    if (now - savedAt > 400) { savedAt = now; saveScroll(); }
    saveTimer = setTimeout(function () { savedAt = Date.now(); saveScroll(); }, 160);
  }, { passive: true });
  window.addEventListener('pagehide', saveScroll);

  function fetchPage(path) {
    if (!htmlCache[path]) {
      htmlCache[path] = fetch(path, { credentials: 'same-origin' }).then(function (r) {
        var type = r.headers.get('content-type') || '';
        if (!r.ok || type.indexOf('text/html') < 0) { throw new Error('not a page: ' + r.status); }
        return r.text();
      });
      htmlCache[path].catch(function () { delete htmlCache[path]; });
    }
    return htmlCache[path];
  }

  // Scripts the next page carries that this visit has not loaded yet: the
  // home page's credential data, when the visit began on a project page.
  function loadScripts(doc) {
    return Promise.all($$('script[src]', doc.body).map(function (s) {
      var src = new URL(s.getAttribute('src'), location.href).href;
      if (scriptsLoaded[src] || /\/main\.js(\?|$)/.test(src)) { return null; }
      scriptsLoaded[src] = true;
      return new Promise(function (resolve) {
        var el = document.createElement('script');
        el.src = src;
        el.onload = el.onerror = function () { resolve(); };
        document.body.appendChild(el);
      });
    }));
  }

  var HEAD_SYNC = [
    'meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:type"]',
    'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:url"]'
  ];
  function syncHead(doc) {
    document.title = doc.title;
    HEAD_SYNC.forEach(function (sel) {
      var next = doc.head.querySelector(sel);
      var here = document.head.querySelector(sel);
      if (!next || !here) { return; }
      var attr = here.tagName === 'LINK' ? 'href' : 'content';
      here.setAttribute(attr, next.getAttribute(attr));
    });
  }

  function focusHeading() {
    var h = $('#main h1');
    if (h) { focusEl(h); }
  }

  /* how.push: add a history entry. how.scrollY: put the page back where it
     was (Back and Forward); otherwise it opens at the top, or at its #place. */
  var navSeq = 0;
  function navigate(url, how) {
    var seq = ++navSeq;
    var slow = setTimeout(function () { root.classList.add('is-loading'); }, 120);
    var settle = function () {
      clearTimeout(slow);
      if (seq === navSeq) { root.classList.remove('is-loading'); }
    };
    var fallback = function () { settle(); window.location.assign(url.href); };

    return fetchPage(url.pathname + url.search).then(function (html) {
      if (seq !== navSeq) { return; }
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var nextMain = doc.getElementById('main');
      if (!nextMain || !document.getElementById('main')) { throw new Error('no <main>'); }

      return loadScripts(doc).then(function () {
        if (seq !== navSeq) { return; }
        if (how.push) {
          saveScroll();
          history.pushState({ from: renderedPath }, '', url.pathname + url.search + url.hash);
        }
        var swap = function () {
          try {
            teardown();
            syncHead(doc);
            document.getElementById('main').replaceWith(document.adoptNode(nextMain));
            var nextFoot = doc.querySelector('footer.foot');
            var hereFoot = $('footer.foot');
            if (nextFoot && hereFoot) { hereFoot.replaceWith(document.adoptNode(nextFoot)); }
            renderedPath = url.pathname;
            initPage();

            var restoring = typeof how.scrollY === 'number';
            var placed = url.hash ? page.hash(url.hash, { instant: true, noScroll: restoring, user: !restoring }) : false;
            if (restoring) { jump(function () { window.scrollTo(0, how.scrollY); }); }
            else if (!placed) { jump(function () { window.scrollTo(0, 0); }); }
            if (!placed || restoring) { focusHeading(); }
            markNav();
          } catch (error) {
            window.location.assign(url.href);
          }
        };
        if (document.startViewTransition && !still) { document.startViewTransition(swap); }
        else { swap(); }
        settle();
      });
    }).catch(fallback);
  }

  // One listener for every link on every page.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { return; }
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    var url = pageUrl(a);
    if (!url) { return; }
    var keyboard = e.detail === 0;

    if (isHere(url)) {
      // A place on this page. Moving between volumes on the shelf replaces
      // the entry; anything else adds one, so Back returns to where it was.
      e.preventDefault();
      var onShelf = a.classList.contains('book') || !!a.closest('.vol__nav');
      var there = url.pathname + url.search + url.hash;
      if (url.hash !== location.hash) {
        saveScroll();
        try {
          if (onShelf) { history.replaceState(history.state, '', there); }
          else { history.pushState({ from: renderedPath }, '', there); }
        } catch (error) {}
      }
      if (url.hash) {
        page.hash(url.hash, { user: true, keyboard: keyboard, shelf: onShelf });
      } else {
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
        if (keyboard) { focusHeading(); }
      }
      markNav();
      return;
    }

    if (!canRoute) { return; }
    e.preventDefault();
    navigate(url, { push: true });
  });

  // Back and Forward: another page is fetched and put back where it was; a
  // step within this page reopens its volume or returns to its place.
  window.addEventListener('popstate', function (e) {
    var url = new URL(location.href);
    var y = e.state && typeof e.state.scrollY === 'number' ? e.state.scrollY : null;
    if (url.pathname !== renderedPath) {
      if (canRoute) { navigate(url, { push: false, scrollY: y === null ? undefined : y }); }
      else { window.location.reload(); }
      return;
    }
    if (url.hash) { page.hash(url.hash, { instant: y !== null, noScroll: y !== null }); }
    if (y !== null) { jump(function () { window.scrollTo(0, y); }); }
    else if (!url.hash) { window.scrollTo({ top: 0, behavior: scrollBehavior() }); }
    markNav();
  });

  // Fetch a page as soon as the pointer or focus reaches a link to it, so it
  // is usually here by the time of the click.
  if (canRoute) {
    var warm = function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      var url = pageUrl(a);
      if (url && !isHere(url)) { fetchPage(url.pathname + url.search).catch(function () {}); }
    };
    document.addEventListener('pointerover', warm, { passive: true });
    document.addEventListener('focusin', warm);
  }

  /* --- first paint ----------------------------------------------------------
     Set up the page, open the volume the address asks for (the old #skills,
     #experience and #contact links included), and on a reload or a return
     from another site, put the page back where it was. */
  initPage();
  var navEntry = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  var returning = navEntry && (navEntry.type === 'reload' || navEntry.type === 'back_forward');
  var savedY = returning && history.state && typeof history.state.scrollY === 'number' ? history.state.scrollY : null;
  if (location.hash) { page.hash(location.hash, { first: true, instant: true, noScroll: savedY !== null }); }
  if (savedY !== null) { window.requestAnimationFrame(function () { jump(function () { window.scrollTo(0, savedY); }); }); }
  markNav();
})();
