/* =============================================================
   Zenless Zone Zero — Their Secret Histories (fan-made)
   Vanilla JS. No dependencies, no build step required to run.

   Modules
     1. helpers        — tiny DOM utilities + reduced-motion flag
     2. header         — solidifies on scroll
     3. mobileNav      — drawer open/close
     4. newsFilter     — tabbed category filter
     5. roster         — faction filter + Agent selection
     6. trailerModal   — native <dialog>, lazy <video> src
     7. heroVideo      — mute toggle + offscreen pause
     8. reveal         — IntersectionObserver scroll-in
     9. toast + misc   — placeholder links, pre-register form
   ============================================================= */

(() => {
  'use strict';

  /* ---------- 1. helpers ------------------------------------- */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Toast timer so repeated clicks don't queue messages. */
  let toastTimer = 0;

  /* ---------- Agent data -------------------------------------
     Single source of truth for the roster. Keys must match the
     `data-agent` values on the roster buttons.
     `portrait: null` renders the holographic placeholder instead.
     ------------------------------------------------------------ */
  const AGENTS = {
    jane: {
      name: 'Jane Doe',
      title: 'The Anomaly',
      code: '#JD-001',
      faction: 'cunning-hound',
      factionLabel: 'Cunning Hound',
      attribute: 'Physical',
      role: 'Anomaly · Duel',
      color: '#ff5500',
      quote: '“Every city has a shadow. Mine learned to fight back.”',
      stats: { impact: 92, technique: 88, speed: 74 },
      portrait: 'pictures/JaneDoe.png',
    },
    anby: {
      name: 'Anby Demara',
      title: 'Little Spark',
      code: '#AD-014',
      faction: 'cunning-hound',
      factionLabel: 'Cunning Hound',
      attribute: 'Electric',
      role: 'Stun · Anomaly',
      color: '#ff5500',
      quote: '“I\'m not a weapon. I\'m the one holding the trigger.”',
      stats: { impact: 78, technique: 72, speed: 86 },
      portrait: null,
    },
    corin: {
      name: 'Corin Wickes',
      title: 'Housekeeper',
      code: '#CW-207',
      faction: 'victoria',
      factionLabel: 'Victoria Housekeeping',
      attribute: 'Physical',
      role: 'Physical · Anomaly',
      color: '#4ea8ff',
      quote: '“Cleaning is just a polite word for ‘make it disappear.’”',
      stats: { impact: 84, technique: 70, speed: 62 },
      portrait: null,
    },
    grace: {
      name: 'Grace Howard',
      title: 'Maid of the R&P',
      code: '#GH-118',
      faction: 'victoria',
      factionLabel: 'Victoria Housekeeping',
      attribute: 'Ice',
      role: 'Drive · Rupture',
      color: '#4ea8ff',
      quote: '“Perfection is a budget question, not a talent.”',
      stats: { impact: 76, technique: 90, speed: 68 },
      portrait: null,
    },
    burnice: {
      name: 'Burnice White',
      title: 'Freckle-Faced Troublemaker',
      code: '#BW-330',
      faction: 'sons-of-calydon',
      factionLabel: 'Sons of Calydon',
      attribute: 'Fire',
      role: 'Fire · Burn',
      color: '#ffe600',
      quote: '“You want a show? Don\'t blink. Or blink. I don\'t care.”',
      stats: { impact: 88, technique: 74, speed: 70 },
      portrait: null,
    },
    caesar: {
      name: 'Caesar King',
      title: 'Bootleg Boss',
      code: '#CK-402',
      faction: 'sons-of-calydon',
      factionLabel: 'Sons of Calydon',
      attribute: 'Physical',
      role: 'Defense · Drive',
      color: '#ffe600',
      quote: '“Rules are a suggestion. Results are the only receipt.”',
      stats: { impact: 90, technique: 80, speed: 52 },
      portrait: null,
    },
  };

  const DEFAULT_TRAILER = 'videos/Background_Page1.webm';
  const DEFAULT_TRAILER_TITLE = 'Midnight Signal — Gameplay Trailer';

  /* ---------- 2. sticky header ------------------------------- */

  function initHeader() {
    const header = $('#site-header');
    if (!header) return;

    let ticking = false;

    const update = () => {
      header.dataset.scrolled = String(window.scrollY > 24);
      ticking = false;
    };

    // rAF-throttled: one write per frame instead of one per scroll event.
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  /* ---------- 3. mobile drawer ------------------------------- */

  function initMobileNav() {
    const toggle = $('#nav-toggle');
    const menu   = $('#mobile-menu');
    if (!toggle || !menu) return;

    const iconOpen  = $('[data-icon="open"]', toggle);
    const iconClose = $('[data-icon="close"]', toggle);

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.dataset.open = String(open);
      menu.classList.toggle('hidden', !open);
      iconOpen.classList.toggle('hidden', open);
      iconClose.classList.toggle('hidden', !open);
    };

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close after tapping a destination.
    $$('a', menu).forEach((link) => link.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset when the desktop nav takes over.
    window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });

    setOpen(false);
  }

  /* ---------- 4. news tab filter ----------------------------- */

  function initNewsFilter() {
    const grid  = $('#news-grid');
    const tabs  = $$('input[name="news-filter"]');
    if (!grid || !tabs.length) return;

    const cards  = $$('[data-category]', grid);
    const labels = $$('[data-tab]');
    const empty  = $('#news-empty');

    const apply = (category) => {
      let visible = 0;

      cards.forEach((card) => {
        const show = category === 'all' || card.dataset.category === category;
        card.classList.toggle('hidden', !show);
        if (show) visible += 1;
      });

      // Mirror state onto the labels for styling + assistive tech.
      labels.forEach((label) => {
        label.dataset.active = String($(`#${label.htmlFor}`).checked);
      });

      if (empty) empty.classList.toggle('hidden', visible > 0);
    };

    tabs.forEach((tab) => {
      tab.addEventListener('change', () => {
        if (tab.checked) apply(tab.value);
      });
    });

    apply('all');
  }

  /* ---------- 5. agent roster ------------------------------- */

  function initRoster() {
    const list   = $('#agent-roster');
    const filter = $('#faction-filter');
    if (!list || !filter) return;

    const file = {
      root:       $('[data-agent-file]'),
      section:    $('#agents'),
      img:        $('[data-portrait-img]'),
      fallback:   $('[data-portrait-fallback]'),
      holoMono:   $('[data-holo-mono]'),
      code:       $('[data-agent-code]'),
      badge:      $('[data-faction-badge]'),
      attribute:  $('[data-attribute]'),
      name:       $('[data-agent-name]'),
      title:      $('[data-agent-title]'),
      quote:      $('[data-agent-quote]'),
      bars:       $$('[data-stat-bar]'),
    };

    /** Image cache so swapping back to an Agent is instant. */
    const preloaded = new Set();

    const monogram = (name) =>
      name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

    /* Build one roster button. Mirrors the markup in landing.html so the
       page still renders sensibly with JavaScript disabled. */
    const buttonHTML = (key, agent) => `
      <li data-faction="${agent.faction}">
        <button type="button" role="option" data-agent="${key}" data-selected="false" aria-selected="false"
                style="--agent-c: ${agent.color}"
                class="group relative w-full overflow-hidden clip-corner border border-white/10 bg-glass/60 p-3 text-left transition-all duration-300
                       group-hover:agent-accent-glow data-[selected=true]:agent-accent-glow">
          <span class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style="background: radial-gradient(120% 80% at 50% 0%, rgb(from var(--agent-c) r g b / 0.28), transparent 70%);" aria-hidden="true"></span>
          <span class="relative flex items-center gap-3">
            <span class="grid h-12 w-12 shrink-0 place-items-center clip-corner bg-ink font-display text-lg font-extrabold italic text-white/70">${monogram(agent.name)}</span>
            <span class="min-w-0">
              <span class="block truncate font-display text-lg font-bold uppercase leading-none transition-colors duration-300 group-hover:agent-accent-text">${agent.name}</span>
              <span class="mt-1 block truncate text-[11px] uppercase tracking-wider text-mist">${agent.role}</span>
            </span>
          </span>
        </button>
      </li>`;

    /* --- render --- */

    function renderRoster(visibleKeys) {
      list.innerHTML = visibleKeys.map((k) => buttonHTML(k, AGENTS[k])).join('');

      $$('[data-agent]', list).forEach((btn) => {
        btn.addEventListener('click', () => select(btn.dataset.agent));
      });
    }

    function select(key) {
      const agent = AGENTS[key];
      if (!agent) return;

      $$('[data-agent]', list).forEach((btn) => {
        const on = btn.dataset.agent === key;
        btn.dataset.selected = String(on);
        btn.setAttribute('aria-selected', String(on));
      });

      // Recolor the whole section (heading wash + file panel + bars).
      if (file.section) file.section.style.setProperty('--accent', agent.color);
      if (file.root) file.root.style.setProperty('--accent', agent.color);

      // Portrait (or hologram placeholder). Uses the `hidden` *attribute*
      // so it can never collide with a display utility.
      if (file.img && file.fallback) {
        if (agent.portrait) {
          file.img.src = agent.portrait;
          file.img.alt = agent.name;
          file.img.hidden = false;
          file.fallback.hidden = true;

          if (!preloaded.has(agent.portrait)) {
            preloaded.add(agent.portrait);
            const pre = new Image();
            pre.src = agent.portrait;
          }
        } else {
          file.img.hidden = true;
          file.fallback.hidden = false;
        }
      }
      if (file.holoMono) file.holoMono.textContent = monogram(agent.name);

      // Text fields
      if (file.code)      file.code.textContent = agent.code;
      if (file.badge)     file.badge.textContent = agent.factionLabel;
      if (file.attribute) file.attribute.textContent = agent.attribute;
      if (file.name)      file.name.textContent = agent.name;
      if (file.title)     file.title.textContent = agent.title;
      if (file.quote)     file.quote.textContent = agent.quote;

      // Stats — widths transition via CSS, numbers update instantly.
      const values = [agent.stats.impact, agent.stats.technique, agent.stats.speed];
      file.bars.forEach((bar, i) => {
        const value = values[i] ?? 0;
        const fill  = bar.firstElementChild;
        const label = bar.parentElement?.querySelector('[data-stat-value]');
        if (fill)  fill.style.width = `${value}%`;
        if (label) label.textContent = String(value);
        bar.dataset.value = String(value);
      });
    }

    /* --- faction filtering --- */

    const applyFaction = (faction) => {
      const keys = Object.keys(AGENTS).filter(
        (k) => faction === 'all' || AGENTS[k].faction === faction
      );

      // If the currently selected Agent is filtered out, select the first visible one.
      const current = $('[data-selected="true"]', list)?.dataset.agent;
      const keep = current && keys.includes(current);

      renderRoster(keys);

      if (!keep) select(keys[0]);
      else select(current);
    };

    $$('input[name="faction"]', filter).forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) applyFaction(input.value);
      });
    });

    // Initial paint
    renderRoster(Object.keys(AGENTS));
    select('jane');
  }

  /* ---------- 6. trailer modal ------------------------------ */

  function initTrailer() {
    const dlg = $('#trailer-dialog');
    if (!dlg) return;

    const video    = $('[data-trailer-video]', dlg);
    const titleEl  = $('[data-trailer-title]', dlg);
    const closeBtn = $('[data-trailer-close]', dlg);
    const supportsModal = typeof dlg.showModal === 'function';

    /** Reset playback and free the decoder by dropping the source. */
    const release = () => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const close = () => {
      if (supportsModal) dlg.close();
      else dlg.removeAttribute('open');
    };

    $$('[data-trailer-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Attach the source only now — nothing downloads until asked for.
        if (video) {
          video.src = btn.dataset.trailerSrc || DEFAULT_TRAILER;
          video.currentTime = 0;
        }
        if (titleEl) {
          titleEl.textContent = btn.dataset.trailerLabel || DEFAULT_TRAILER_TITLE;
        }

        if (supportsModal) {
          if (!dlg.open) dlg.showModal();
        } else {
          dlg.setAttribute('open', '');
        }
        if (video) video.play().catch(() => { /* autoplay blocked: controls remain */ });
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);

    // Click on the ::backdrop area (i.e. outside the inner box) closes it.
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) close();
    });

    // Fires for Esc, the close button, the backdrop, and the no-showModal
    // fallback path — so cleanup lives here and runs exactly once.
    dlg.addEventListener('close', release);
  }

  /* ---------- 7. hero video + mute toggle -------------------- */

  function initHeroVideo() {
    const video = $('[data-hero-video]');
    const btn   = $('#sound-toggle');
    if (!video) return;

    const iconOn  = btn ? $('[data-icon="on"]', btn)  : null;
    const iconOff = btn ? $('[data-icon="off"]', btn) : null;

    // Respect reduced-motion: hold a single frame instead of looping.
    if (reducedMotion.matches) {
      video.autoplay = false;
      video.pause();
    } else {
      // Autoplay can still be refused (data saver, low power) — don't throw.
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    }

    // Don't burn CPU decoding footage nobody can see.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          if (!reducedMotion.matches && video.paused) {
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
        } else if (!video.paused) {
          video.pause();
        }
      }, { threshold: 0.05 });
      io.observe(video);
    }

    if (!btn) return;

    // A toggle button keeps a STABLE accessible name and flips aria-pressed.
    // Changing the label alongside aria-pressed would break the semantics.
    const paint = (muted) => {
      video.muted = muted;
      btn.dataset.muted = String(muted);
      btn.setAttribute('aria-pressed', String(muted));
      iconOn.classList.toggle('hidden', muted);
      iconOff.classList.toggle('hidden', !muted);
    };

    paint(video.muted);

    btn.addEventListener('click', () => {
      const next = !video.muted;
      // Unmuting is a user gesture, so playback is allowed here.
      if (!next && video.paused) {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      paint(next);
    });
  }

  /* ---------- 8. scroll reveal ------------------------------- */

  function initReveal() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

    const targets = $$('#news [data-category], #media .glass, #pre-register h2, #pre-register form, footer .glass, #agents article');

    targets.forEach((el, i) => {
      el.classList.add('reveal');
      // Stagger siblings for a cascade instead of one big pop.
      el.style.setProperty('--reveal-delay', `${(i % 6) * 70}ms`);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);           // one-shot: never animate back
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    targets.forEach((el) => io.observe(el));
  }

  /* ---------- 9. toast, placeholders, form ------------------- */

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('translate-y-4', 'opacity-0');

    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.add('translate-y-4', 'opacity-0');
    }, 2400);
  }

  function initPlaceholders() {
    // Anything intentionally not wired to a destination yet.
    const messages = {
      placeholder: 'This link is a placeholder on the fan demo.',
      'news-open': 'Full article view is not part of this demo.',
      'agent-open': 'The full Agent file lives on page 2 of this project.',
    };

    $$('[data-social]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showToast(`${a.dataset.social} link is a placeholder.`);
      });
    });

    Object.entries(messages).forEach(([attr, msg]) => {
      $$(`[data-${attr}]`).forEach((el) => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          showToast(msg);
        });
      });
    });
  }

  function initPreRegister() {
    const form  = $('[data-preregister]');
    const hint  = $('[data-preregister-hint]');
    if (!form || !hint) return;

    const original = hint.textContent;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('input[type="email"]', form);
      const value = (email?.value || '').trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

      if (!valid) {
        hint.textContent = 'Enter a valid email address.';
        hint.classList.add('text-volt');
        email?.focus();
        return;
      }

      hint.textContent = 'Thanks! This fan demo does not store or send anything.';
      hint.classList.remove('text-volt');
      form.reset();

      window.setTimeout(() => { hint.textContent = original; }, 5000);
    });
  }

  /* ---------- copyright year ------------------------------- */

  function initYear() {
    const el = $('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- boot ------------------------------------------ */

  function init() {
    initHeader();
    initMobileNav();
    initNewsFilter();
    initRoster();
    initTrailer();
    initHeroVideo();
    initReveal();
    initPlaceholders();
    initPreRegister();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();