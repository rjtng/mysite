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
  if (slot) {
    var words = $$('b', slot);
    var at = 0;

    // Size the slot to the visible word so the caret sits right after it.
    // The words are absolutely positioned at width:max-content, so offsetWidth
    // is the text width rather than the slot's.
    function fitSlot(el) {
      if (el && el.offsetWidth) { slot.style.width = el.offsetWidth + 'px'; }
    }
    fitSlot(words[0]);
    // The label is webfont text, so it is wider once JetBrains Mono arrives.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fitSlot(words[at]); });
    }

    if (words.length > 1 && !still) {
      setInterval(function () {
        var prev = words[at];
        at = (at + 1) % words.length;
        var next = words[at];

        prev.classList.remove('on');
        prev.classList.add('off');
        next.classList.remove('off');

        // Force a reflow so the browser registers the start position before
        // the transition. This used to be a requestAnimationFrame callback,
        // but rAF does not run in a background or unpainted tab, so the
        // interval would strip 'on' from the old word and never add it to the
        // new one — leaving the line blank until the tab was looked at again.
        void next.offsetWidth;
        next.classList.add('on');
        fitSlot(next);

        setTimeout(function () { prev.classList.remove('off'); }, 500);
      }, 2600);
    }
  }

  /* --- marquee ---------------------------------------------------------------
     Two identical copies so the loop is seamless, paced off the measured width
     so the strip always travels at the same speed. Adding a technology then
     makes the row longer rather than faster, which is the part that is easy to
     get wrong by hand. */
  var band = $('#band');
  var paceBand = function () {};

  if (band && band.firstElementChild) {
    var row = band.firstElementChild;
    band.appendChild(row.cloneNode(true));
    band.setAttribute('data-ready', '');

    var PX_PER_SEC = 52;
    var lastSeconds = 0;
    paceBand = function () {
      var width = row.getBoundingClientRect().width;
      if (!width) { return; }
      var seconds = Math.round(width / PX_PER_SEC);
      if (seconds === lastSeconds) { return; }   // don't restart for nothing
      lastSeconds = seconds;
      band.style.setProperty('--band-time', seconds + 's');
    };

    paceBand();
    // The labels are webfont text, so the row gets wider once Sora arrives.
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(paceBand); }
    window.addEventListener('resize', paceBand);
  }

  /* --- technology logos ------------------------------------------------------
     The sprite is fetched rather than inlined so it sits under /assets and is
     cached for a year instead of riding along in every HTML response. It is
     injected into the document rather than referenced with
     <use href="sprite.svg#id">, because external references there are still
     unreliable in WebKit. Until it lands the marks stay hidden, so a blocked or
     failed request degrades to the plain text strip this used to be. */
  if (window.fetch && $('.band__logo')) {
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
        document.body.insertBefore(document.importNode(svg, true), document.body.firstChild);
        document.documentElement.classList.add('sprite-ready');
        paceBand();   // the marks widen every item, so re-measure
      })
      .catch(function () { /* the labels stand on their own */ });
  }

  /* --- marquee: drag to scrub ------------------------------------------------
     The auto-scroll is a CSS animation on the track. Dragging moves a separate
     wrapper around it, so the two transforms compose rather than fight, and
     the animation never has to be unwound and restarted.

     The strip is two identical copies, so the content repeats every one row
     width. Wrapping the drag offset into that span keeps the seam invisible no
     matter how far someone drags, and stops the number growing without bound. */
  var viewport = $('#bandViewport');
  var dragEl   = $('#bandDrag');

  if (viewport && dragEl && row && window.PointerEvent) {
    var offset = 0, startX = 0, startOffset = 0, dragging = false;

    viewport.addEventListener('pointerdown', function (e) {
      if (e.button) { return; }              // left button and touch only
      dragging = true;
      startX = e.clientX;
      startOffset = offset;
      viewport.classList.add('dragging');
      try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) { return; }
      offset = startOffset + (e.clientX - startX);
      var period = row.getBoundingClientRect().width;
      if (period) { offset = offset % period; }
      dragEl.style.transform = 'translateX(' + offset + 'px)';
    });

    function endDrag(e) {
      if (!dragging) { return; }
      dragging = false;
      viewport.classList.remove('dragging');
      if (e && e.pointerId !== undefined) {
        try { viewport.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);
  }

  /* --- projects carousel --------------------------------------------------- */
  var carousel = $('#projectsCarousel');
  if (carousel) {
    var carouselViewport = $('[data-carousel-viewport]', carousel);
    var carouselTrack = $('[data-carousel-track]', carousel);
    var projectCards = $$('[data-carousel-track] .project-card', carousel);
    var carouselStatus = $('[data-carousel-status]', carousel);
    var previousProject = $('[data-carousel-prev]', carousel);
    var nextProject = $('[data-carousel-next]', carousel);
    var projectAt = 0;
    var projectStartX = 0;
    var projectStartOffset = 0;
    var projectDragging = false;
    var projectOffset = 0;

    function positionProjects() {
      if (!carouselViewport || !carouselTrack || !projectCards.length) { return; }
      var cardWidth = projectCards[0].getBoundingClientRect().width;
      var gap = parseFloat(window.getComputedStyle(carouselTrack).gap) || 0;
      projectOffset = (carouselViewport.clientWidth - cardWidth) / 2 - projectAt * (cardWidth + gap);
      carouselTrack.style.transform = 'translateX(' + projectOffset + 'px)';
      projectCards.forEach(function (card, index) {
        card.classList.toggle('is-active', index === projectAt);
        card.setAttribute('aria-hidden', index === projectAt ? 'false' : 'true');
      });
      if (carouselStatus) { carouselStatus.textContent = 'Showing project ' + (projectAt + 1) + ' of ' + projectCards.length; }
      if (previousProject) { previousProject.disabled = projectAt === 0; }
      if (nextProject) { nextProject.disabled = projectAt === projectCards.length - 1; }
    }

    function showProject(index) {
      projectAt = Math.max(0, Math.min(index, projectCards.length - 1));
      positionProjects();
    }
    if (previousProject) { previousProject.addEventListener('click', function () { showProject(projectAt - 1); }); }
    if (nextProject) { nextProject.addEventListener('click', function () { showProject(projectAt + 1); }); }
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); showProject(projectAt - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); showProject(projectAt + 1); }
    });
    if (carouselViewport && window.PointerEvent) {
      carouselViewport.addEventListener('pointerdown', function (e) {
        if (e.button || e.target.closest('a, button')) { return; }
        projectDragging = true;
        projectStartX = e.clientX;
        projectStartOffset = projectOffset;
        carouselViewport.classList.add('is-dragging');
        try { carouselViewport.setPointerCapture(e.pointerId); } catch (err) {}
      });
      carouselViewport.addEventListener('pointermove', function (e) {
        if (!projectDragging) { return; }
        carouselTrack.style.transform = 'translateX(' + (projectStartOffset + e.clientX - projectStartX) + 'px)';
      });
      function endProjectDrag(e) {
        if (!projectDragging) { return; }
        projectDragging = false;
        carouselViewport.classList.remove('is-dragging');
        var distance = e && e.clientX !== undefined ? e.clientX - projectStartX : 0;
        if (Math.abs(distance) > 55) { showProject(projectAt + (distance < 0 ? 1 : -1)); }
        else { positionProjects(); }
        if (e && e.pointerId !== undefined) {
          try { carouselViewport.releasePointerCapture(e.pointerId); } catch (err) {}
        }
      }
      carouselViewport.addEventListener('pointerup', endProjectDrag);
      carouselViewport.addEventListener('pointercancel', endProjectDrag);
      carouselViewport.addEventListener('lostpointercapture', endProjectDrag);
    }
    carousel.classList.add('is-ready');
    positionProjects();
    window.addEventListener('resize', positionProjects);
  }

  /* =========================================================================
     Credly badge marquee. The data is generated from the public profile by
     tools/fetch-credly.ps1, so every image and verification URL stays official.
     ====================================================================== */
  var CERTS = Array.isArray(window.CERTIFICATIONS) ? window.CERTIFICATIONS : [];
  if (!CERTS.length) { return; }

  /* Credly stores these as 1200px PNGs — around 400 KB each, for a badge slot.
     It serves resized copies from /size/<w>x<h>/, but only when the URL ends in
     a real filename; the older "/blob" ones just redirect back to the original,
     so those are left alone. */
  function thumb(url, size) {
    if (!/^https:\/\/images\.credly\.com\/images\//.test(url) || /\/blob$/.test(url)) { return url; }
    return url.replace('/images/', '/size/' + size + '/images/');
  }

  var marquee = $('#credlyMarquee');
  if (!marquee) { return; }

  function badgeMarkup(c) {
    var src = thumb(c.img, '220x220');
    var x2 = thumb(c.img, '440x440');
    return '<a class="credly-badge" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer" aria-label="Verify ' + esc(c.name) + ' on Credly">' +
      '<span class="credly-badge__image"><img src="' + esc(src) + '"' +
        (x2 !== src ? ' srcset="' + esc(src) + ' 1x, ' + esc(x2) + ' 2x"' : '') +
        ' alt="" loading="lazy" decoding="async" width="104" height="104"></span>' +
      '</a>';
  }

  var rows = $$('[data-credly-track]', marquee);
  var BADGES_PER_ROW = 30;
  rows.forEach(function (track, rowIndex) {
    var rowStart = rowIndex * BADGES_PER_ROW;
    var rowCerts = CERTS.slice(rowStart, rowStart + BADGES_PER_ROW);
    track.innerHTML = '<ul>' + rowCerts.map(badgeMarkup).join('') + '</ul>';
    track.appendChild(track.firstElementChild.cloneNode(true));
    track.setAttribute('data-ready', '');
    var row = track.parentElement;
    var pace = function () {
      var width = track.firstElementChild.getBoundingClientRect().width;
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      var distance = width + gap;
      if (width) {
        track.style.setProperty('--credly-distance', distance + 'px');
        track.style.setProperty('--credly-time', Math.max(32, Math.round(distance / 34)) + 's');
      }
    };
    pace();
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(pace); }
    window.addEventListener('resize', pace);

    if (!window.PointerEvent) { return; }
    var drag = row.parentElement;
    var dragWrap = row;
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
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      period += gap;
      if (period) { offset = offset % period; }
      dragWrap.style.transform = 'translateX(' + offset + 'px)';
    });
    function endCredlyDrag(e) {
      if (!dragging) { return; }
      dragging = false; drag.classList.remove('is-dragging');
      if (e && e.pointerId !== undefined) {
        try { drag.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    drag.addEventListener('pointerup', endCredlyDrag);
    drag.addEventListener('pointercancel', endCredlyDrag);
    drag.addEventListener('lostpointercapture', endCredlyDrag);
    drag.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  });
})();
