/* =============================================================================
   Just enough JavaScript. The page reads fine without it — everything here is
   either decoration or a progressive enhancement over a plain list.
   ========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- theme --------------------------------------------------------------- */
  var themeButtons = $$('[data-theme-toggle]');
  var themeRoot = document.documentElement;
  var themeListeners = [];
  function setTheme(theme) {
    var light = theme === 'light';
    themeRoot.toggleAttribute('data-theme', light);
    if (light) { themeRoot.setAttribute('data-theme', 'light'); }
    themeButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(light));
      button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      button.setAttribute('title', light ? 'Dark mode' : 'Light mode');
    });
    var themeColor = $('meta[name="theme-color"]');
    if (themeColor) { themeColor.setAttribute('content', light ? '#F3F7FC' : '#050A16'); }
    try { localStorage.setItem('portfolio-theme', light ? 'light' : 'dark'); } catch (error) {}
    themeListeners.forEach(function (listener) { listener(light); });
  }
  setTheme(themeRoot.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  themeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setTheme(themeRoot.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });
  });

  /* --- constellation layer ----------------------------------------------- */
  var constellationCanvas = $('#constellations');
  if (constellationCanvas && constellationCanvas.getContext) {
    var constellationContext = constellationCanvas.getContext('2d');
    var constellationStars = [];
    var constellationWidth = 0;
    var constellationHeight = 0;
    var constellationDpr = 1;
    var constellationPointer = { x: 0, y: 0, active: false };

    function resizeConstellations() {
      constellationWidth = window.innerWidth;
      constellationHeight = window.innerHeight;
      constellationDpr = Math.min(window.devicePixelRatio || 1, 2);
      constellationCanvas.width = constellationWidth * constellationDpr;
      constellationCanvas.height = constellationHeight * constellationDpr;
      constellationCanvas.style.width = constellationWidth + 'px';
      constellationCanvas.style.height = constellationHeight + 'px';
      constellationContext.setTransform(constellationDpr, 0, 0, constellationDpr, 0, 0);
      var count = Math.min(72, Math.max(30, Math.round(constellationWidth * constellationHeight / 18000)));
      constellationStars = [];
      for (var i = 0; i < count; i++) {
        constellationStars.push({
          x: Math.random() * constellationWidth,
          y: Math.random() * constellationHeight,
          radius: .7 + Math.random() * 1.3,
          phase: Math.random() * Math.PI * 2,
          drift: .08 + Math.random() * .16
        });
      }
    }

    function drawConstellations(time) {
      constellationContext.clearRect(0, 0, constellationWidth, constellationHeight);
      var shiftX = constellationPointer.active ? (constellationPointer.x - constellationWidth / 2) * .012 : 0;
      var shiftY = constellationPointer.active ? (constellationPointer.y - constellationHeight / 2) * .012 : 0;
      var points = constellationStars.map(function (star) {
        var drift = still ? 0 : Math.sin(time * .00008 * star.drift + star.phase) * 4;
        return { x: star.x + shiftX + drift, y: star.y + shiftY + drift * .45, star: star };
      });
      constellationContext.lineWidth = 1;
      for (var i = 0; i < points.length; i++) {
        for (var j = i + 1; j < points.length; j++) {
          var dx = points[i].x - points[j].x;
          var dy = points[i].y - points[j].y;
          var distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 145) {
            constellationContext.strokeStyle = 'rgba(120, 190, 255, ' + (0.13 * (1 - distance / 145)) + ')';
            constellationContext.beginPath();
            constellationContext.moveTo(points[i].x, points[i].y);
            constellationContext.lineTo(points[j].x, points[j].y);
            constellationContext.stroke();
          }
        }
      }
      points.forEach(function (point) {
        var pulse = still ? 1 : .82 + Math.sin(time * .001 + point.star.phase) * .18;
        constellationContext.fillStyle = 'rgba(169, 224, 255, ' + (.42 * pulse) + ')';
        constellationContext.beginPath();
        constellationContext.arc(point.x, point.y, point.star.radius, 0, Math.PI * 2);
        constellationContext.fill();
      });
      if (!still) { window.requestAnimationFrame(drawConstellations); }
    }

    resizeConstellations();
    window.addEventListener('resize', resizeConstellations);
    window.addEventListener('pointermove', function (event) {
      constellationPointer.x = event.clientX;
      constellationPointer.y = event.clientY;
      constellationPointer.active = true;
    }, { passive: true });
    window.requestAnimationFrame(drawConstellations);
  }

  var backToTop = $('.finale__top');
  if (backToTop) {
    backToTop.addEventListener('click', function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    });
  }

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
      var isMobile = window.matchMedia('(max-width: 620px)').matches;
      var cardWidth = projectCards[0].getBoundingClientRect().width;
      var spacing = isMobile ? cardWidth * .12 : Math.min(cardWidth * .76, 560);
      projectOffset = 0;
      carouselTrack.style.transform = 'none';
      projectCards.forEach(function (card, index) {
        var distance = index - projectAt;
        var visible = Math.abs(distance) <= 1;
        var rotation = isMobile ? 0 : distance * -25;
        var scale = isMobile ? 1 : (distance === 0 ? 1 : .85);
        var x = isMobile ? distance * (cardWidth + 24) : distance * spacing;
        card.style.setProperty('--card-x', x + 'px');
        card.style.setProperty('--card-rotate', rotation + 'deg');
        card.style.setProperty('--card-scale', scale);
        card.style.zIndex = distance === 0 ? '30' : (visible ? '10' : '0');
        card.classList.toggle('is-active', index === projectAt);
        card.classList.toggle('is-neighbor', visible && index !== projectAt);
        card.setAttribute('aria-hidden', visible ? 'false' : 'true');
        card.setAttribute('tabindex', index === projectAt ? '0' : '-1');
      });
      if (carouselStatus) { carouselStatus.textContent = 'Showing project ' + (projectAt + 1) + ' of ' + projectCards.length; }
      if (previousProject) { previousProject.disabled = projectAt === 0; }
      if (nextProject) { nextProject.disabled = projectAt === projectCards.length - 1; }
    }

    function showProject(index) {
      projectAt = Math.max(0, Math.min(index, projectCards.length - 1));
      positionProjects();
    }
    projectCards.forEach(function (card, index) {
      card.addEventListener('click', function (e) {
        if (index !== projectAt && !e.target.closest('a, button')) { showProject(index); }
      });
    });
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
        carouselTrack.style.transform = 'translateX(' + (e.clientX - projectStartX) + 'px)';
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

  /* --- stages: particle field -----------------------------------------------
     Light drifting toward the viewer, drawn as streaks so it reads as motion
     even in a still frame. Each particle sits at a depth z and is projected
     through one vanishing point; its streak runs from where it was half a
     second ago to where it is now. Nearer particles therefore travel faster
     and draw longer and thicker, which gives the field depth without a blur
     filter.

     Every .stage (the hero and the closing scene) gets its own field.
     data-vanish-y places the vanishing point, data-calm sizes the quiet zone
     around it, and data-foot quietens a strip along the bottom, so the text
     over each stage stays legible. A field animates only while its stage is
     on screen, and under prefers-reduced-motion it draws one still frame. */
  // Weighted toward the lighter tones, which separate best from the glow.
  // Both lists are indexed by the same p.tone, so keep them the same length.
  var FIELD_DARK  = ['99,205,255', '169,224,255', '99,205,255', '124,156,255', '44,123,242'];
  var FIELD_LIGHT = ['33,104,213', '20,122,168', '33,104,213', '74,141,235', '23,77,167'];

  function particleStage(stage) {
    var field = $('.stage__particles', stage);
    if (!field || !field.getContext) { return; }
    var fieldContext = field.getContext('2d');
    var vanishAt = parseFloat(stage.getAttribute('data-vanish-y')) || .46;
    var calmBy = parseFloat(stage.getAttribute('data-calm')) || 0;
    var footBy = parseFloat(stage.getAttribute('data-foot')) || 0;
    var specks = [];
    var fieldWidth = 0, fieldHeight = 0;
    var vanishX = 0, vanishY = 0, aimX = 0, aimY = 0;
    var fieldLive = false, fieldFrame = 0, fieldLast = 0;

    // Drops a particle at depth z over a random point of the stage, so new
    // ones spread evenly rather than bunching at the vanishing point.
    function placeSpeck(p, z) {
      p.z = z;
      p.x = (Math.random() - .5) * fieldWidth * z;
      p.y = (Math.random() - .5) * fieldHeight * z;
      p.speed = .045 + Math.random() * .045;
      p.size = .7 + Math.random() * 1.5;
      p.alpha = .35 + Math.random() * .6;
      p.tone = Math.floor(Math.random() * FIELD_DARK.length);
      return p;
    }

    function sizeField() {
      var rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) { return; }
      if (rect.width === fieldWidth && rect.height === fieldHeight) { return; }
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      fieldWidth = rect.width;
      fieldHeight = rect.height;
      field.width = Math.round(fieldWidth * dpr);
      field.height = Math.round(fieldHeight * dpr);
      fieldContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(150, Math.max(56, fieldWidth * fieldHeight / 9500)));
      specks = [];
      for (var i = 0; i < count; i++) { specks.push(placeSpeck({}, .18 + Math.random() * .82)); }
    }

    function streak(x1, y1, x2, y2) {
      fieldContext.beginPath();
      fieldContext.moveTo(x1, y1);
      fieldContext.lineTo(x2, y2);
      fieldContext.stroke();
    }

    function drawField(dt) {
      var light = themeRoot.getAttribute('data-theme') === 'light';
      var tones = light ? FIELD_LIGHT : FIELD_DARK;
      fieldContext.clearRect(0, 0, fieldWidth, fieldHeight);
      fieldContext.globalCompositeOperation = light ? 'source-over' : 'lighter';
      fieldContext.lineCap = 'round';

      vanishX += (aimX - vanishX) * .04;
      vanishY += (aimY - vanishY) * .04;
      var cx = fieldWidth / 2 + vanishX;
      var cy = fieldHeight * vanishAt + vanishY;
      var calm = Math.min(fieldWidth, fieldHeight) * calmBy;
      var foot = footBy ? fieldHeight - footBy : Infinity;

      for (var i = 0; i < specks.length; i++) {
        var p = specks[i];
        p.z -= p.speed * dt;
        var hx = cx + p.x / p.z;
        var hy = cy + p.y / p.z;
        if (p.z < .14 || hx < -80 || hx > fieldWidth + 80 || hy < -80 || hy > fieldHeight + 80) {
          placeSpeck(p, .9 + Math.random() * .1);
          continue;
        }

        var near = 1 - p.z;
        var width = p.size * (.6 + near * near * 3.4);
        var tz = p.z + p.speed * .55;
        var dx = hx - (cx + p.x / tz);
        var dy = hy - (cy + p.y / tz);
        var travel = Math.sqrt(dx * dx + dy * dy);
        // At least a short dash, so even distant specks read as moving.
        var span = Math.max(width * 1.8, Math.min(travel, 130));
        var tx = travel ? hx - dx / travel * span : hx;
        var ty = travel ? hy - dy / travel * span : hy;

        var a = p.alpha * Math.min(1, near / .14);              // fade in from far
        if (p.z < .3) { a *= .5 + (p.z - .14) / .32; }           // soften the nearest
        var off = Math.sqrt((hx - cx) * (hx - cx) + (hy - cy) * (hy - cy));
        if (off < calm) { a *= .3 + .7 * off / calm; }
        if (hy > foot) { a *= Math.max(.15, 1 - (hy - foot) / footBy); }
        if (light) { a *= .7; }

        var tone = tones[p.tone];
        fieldContext.strokeStyle = 'rgba(' + tone + ',' + (a * .2).toFixed(3) + ')';
        fieldContext.lineWidth = width * 3.6;
        streak(tx, ty, hx, hy);
        fieldContext.strokeStyle = 'rgba(' + tone + ',' + a.toFixed(3) + ')';
        fieldContext.lineWidth = width;
        streak(tx, ty, hx, hy);
      }
    }

    function fieldTick(now) {
      var dt = fieldLast ? Math.min((now - fieldLast) / 1000, .05) : 0;
      fieldLast = now;
      drawField(dt);
      fieldFrame = fieldLive ? window.requestAnimationFrame(fieldTick) : 0;
    }
    function startField() {
      stage.classList.add('is-live');
      if (still) { drawField(0); return; }
      if (fieldLive) { return; }
      fieldLive = true;
      fieldLast = 0;
      fieldFrame = window.requestAnimationFrame(fieldTick);
    }
    function stopField() {
      stage.classList.remove('is-live');
      fieldLive = false;
      if (fieldFrame) { window.cancelAnimationFrame(fieldFrame); fieldFrame = 0; }
    }

    function refitField() {
      sizeField();
      if (!fieldLive) { drawField(0); }
    }
    sizeField();
    if ('ResizeObserver' in window) {
      new ResizeObserver(refitField).observe(stage);
    } else {
      window.addEventListener('resize', refitField);
    }
    // A still frame keeps the old palette until it is redrawn.
    themeListeners.push(function () { if (!fieldLive) { drawField(0); } });

    // The vanishing point leans away from the pointer, a little parallax.
    window.addEventListener('pointermove', function (e) {
      if (!fieldLive) { return; }
      var rect = stage.getBoundingClientRect();
      aimX = (e.clientX - rect.left - rect.width / 2) * -.05;
      aimY = (e.clientY - rect.top - rect.height / 2) * -.05;
    }, { passive: true });

    watchLive(stage, startField, stopField);
  }

  // Calls on() while el is on screen and off() once it leaves. Without an
  // observer it simply stays on.
  function watchLive(el, on, off) {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { on(); } else { off(); }
    }).observe(el);
  }

  $$('.stage').forEach(particleStage);

  /* --- hero: the call to action looks back -----------------------------------
     The pupils follow the pointer. Positions are read once per animation
     frame, however fast the pointer events arrive. */
  var eyeBalls = $$('.eyes__ball');
  if (eyeBalls.length) {
    var lookX = 0, lookY = 0, lookQueued = false;
    var look = function () {
      lookQueued = false;
      eyeBalls.forEach(function (ball) {
        var r = ball.getBoundingClientRect();
        var dx = lookX - (r.left + r.width / 2);
        var dy = lookY - (r.top + r.height / 2);
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var reach = Math.min(1, d / 120) * r.width * .22;
        ball.style.setProperty('--look', (dx / d * reach).toFixed(2) + 'px ' + (dy / d * reach).toFixed(2) + 'px');
      });
    };
    window.addEventListener('pointermove', function (e) {
      lookX = e.clientX;
      lookY = e.clientY;
      if (!lookQueued) { lookQueued = true; window.requestAnimationFrame(look); }
    }, { passive: true });
  }

  /* --- hero: type the tagline out -------------------------------------------
     The sentence is in the page in full, so without scripting, or with reduced
     motion, it simply shows. Otherwise it is cleared and typed back once, with
     the line's height held meanwhile so the buttons below never jump when the
     sentence wraps. It waits for the webfonts so that height is the final one. */
  var typed = $('.hero__typed');
  if (typed && !still) {
    var sentence = typed.textContent;
    var typeLine = typed.parentElement;
    var typeFrom = function () {
      typeLine.style.minHeight = typeLine.offsetHeight + 'px';
      typed.textContent = '';
      var shown = 0;
      var typeNext = function () {
        shown++;
        typed.textContent = sentence.slice(0, shown);
        if (shown < sentence.length) {
          setTimeout(typeNext, sentence.charAt(shown - 1) === ' ' ? 75 : 42);
        } else {
          typeLine.style.minHeight = '';
        }
      };
      setTimeout(typeNext, 450);
    };
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(typeFrom); } else { typeFrom(); }
  }

  /* --- about: the wall of project screens ------------------------------------
     Built from the mock screens already drawn on the project cards, so the
     wall always shows the real project list. Three rows, each holding its
     tiles twice so the drift loops without a seam. */
  var wall = $('[data-project-wall]');
  if (wall) {
    var screens = $$('#projects .project-card').map(function (card, i) {
      var preview = $('.project-preview', card);
      var title = $('.project-card__body h3', card);
      if (!preview || !title) { return null; }
      var shot = preview.cloneNode(true);
      shot.removeAttribute('role');
      shot.removeAttribute('aria-label');
      return '<li class="wall__tile"><div class="wall__shot">' + shot.outerHTML + '</div>' +
        '<p class="wall__label"><span>' + esc(title.textContent.trim()) + '</span>' +
        '<span>' + (i < 9 ? '0' : '') + (i + 1) + '</span></p></li>';
    }).filter(Boolean);

    if (screens.length) {
      var wallRows = '';
      for (var r = 0; r < 3; r++) {
        var set = '';
        // Enough tiles to outrun the widest screen, offset per row so the
        // same project never stacks straight above itself.
        for (var k = 0; k < Math.max(8, screens.length); k++) {
          set += screens[(k + r * 2) % screens.length];
        }
        wallRows += '<ul class="wall__row" data-dir="' + (r % 2 ? 'right' : 'left') + '">' + set + set + '</ul>';
      }
      wall.innerHTML = wallRows;
      var wallSection = wall.closest('section');
      if (wallSection) {
        watchLive(wallSection,
          function () { wallSection.classList.add('is-live'); },
          function () { wallSection.classList.remove('is-live'); });
      }
    }
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

  /* --- top certifications ----------------------------------------------------
     Hand-picked and in order. Each entry looks for its badge in the generated
     Credly data by name, which supplies the badge art and, unless the entry
     carries its own link, the verification URL. Entries with no Credly badge
     show a drawn tile and link to their Coursera record instead; if a badge for
     one is claimed on Credly later, the next run of tools/fetch-credly.ps1
     brings it in and the art switches over on its own. */
  var TOP_CERTS = [
    { title: 'IBM Full Stack Software Developer Professional Certificate', issuer: 'IBM',
      short: 'Full Stack Software Developer', match: /^IBM Full Stack Software Developer Professional Certificate/ },
    { title: 'IBM DevOps and Software Engineering', issuer: 'IBM',
      short: 'DevOps and Software Engineering', match: /DevOps and Software Engineering/i,
      url: 'https://www.coursera.org/account/accomplishments/specialization/0WBW5H35WJ6Z' },
    { title: 'IBM iOS and Android Mobile App Developer', issuer: 'IBM',
      short: 'iOS and Android Mobile App Developer', match: /iOS and Android Mobile App Developer/i,
      url: 'https://www.coursera.org/account/accomplishments/specialization/O1M3S36HZAI3' },
    { title: 'IBM AI Developer Professional Certificate', issuer: 'IBM',
      short: 'AI Developer', match: /^IBM AI Developer Professional Certificate/ },
    { title: 'IBM Data Engineering Professional Certificate', issuer: 'IBM',
      short: 'Data Engineering', match: /^IBM Data Engineering Professional Certificate/ },
    { title: 'IBM Data Analytics with Excel and R Professional Certificate', issuer: 'IBM',
      short: 'Data Analytics with Excel and R', match: /^IBM Data Analytics with Excel and R/ },
    { title: 'IBM Cybersecurity Analyst Professional Certificate', issuer: 'IBM',
      short: 'Cybersecurity Analyst', match: /^IBM Cybersecurity Analyst Professional Certificate/ },
    { title: 'Akamai Network Engineering', issuer: 'Akamai',
      short: 'Network Engineering', match: /Akamai Network Engineering/i,
      url: 'https://www.coursera.org/account/accomplishments/specialization/XT2SPB1CKIB0' },
    { title: 'Hands-on Internet of Things', issuer: 'Coursera',
      short: 'Hands-on Internet of Things', match: /Hands-on Internet of Things/i,
      url: 'https://www.coursera.org/account/accomplishments/specialization/4F3MLFX4DZ3C' },
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
      return '<li>' + credentialLink(c, 'bio__badge', credentialArt(c, '220x220')) + '</li>';
    }).join('');
  }

  var marquee = $('#credlyMarquee');
  if (!marquee) { return; }

  function badgeMarkup(c) {
    return credentialLink(c, 'credly-badge', '<span class="credly-badge__image">' + credentialArt(c, '220x220') + '</span>');
  }

  // Each row opens with its share of the top ten, in order, then its share of
  // everything else, newest first. Both rows show their first badges at the
  // left edge on load, whichever way they drift.
  var rows = $$('[data-credly-track]', marquee);
  function share(list, rowIndex) {
    var per = Math.ceil(list.length / rows.length);
    return list.slice(rowIndex * per, rowIndex * per + per);
  }
  rows.forEach(function (track, rowIndex) {
    var rowCerts = share(TOP, rowIndex).concat(share(REST, rowIndex));
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
