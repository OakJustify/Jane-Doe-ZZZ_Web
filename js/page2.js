/**
 * PAGE 2 JS : AGENT FILE
 * Dimuat oleh js/main.js, yang memanggil init(elemenHalaman) setelah
 * html/page2.html masuk ke DOM dan destroy() saat pindah halaman.
 *
 * Isi:
 *  1. Tab "Combat Record" — isi skill di-render dari objek SKILLS di bawah.
 *     UNTUK GANTI KARAKTER: cukup edit objek SKILLS ini.
 *  2. Audio player theme song (play/pause + seek + waktu).
 *  3. Efek tilt 3D ringan pada foto (nonaktif di layar sentuh /
 *     prefers-reduced-motion).
 */
(() => {
  'use strict';

  /* ------------------------------------------------
     DATA SKILL (konten placeholder — ringkasan wiki publik)
     label  = nama tab
     items  = daftar { name, desc } yang tampil di panel
     ------------------------------------------------ */
  const SKILLS = [
    {
      id: 'basic',
      label: 'Basic',
      items: [
        { name: 'Basic Attack: Dancing Blades', desc: 'Unleashes up to 6 rapid slashes ahead, dealing Physical DMG.' },
        { name: 'Basic Attack: Salchow Jump', desc: 'While in the Passion state, hold attack: rapid consecutive slashes followed by a finishing strike. Jane is invulnerable during the finisher.' },
      ],
    },
    {
      id: 'dodge',
      label: 'Dodge',
      items: [
        { name: 'Dodge: Phantom', desc: 'A quick slide dodge. Jane has an extra dodge, alternating between two dodges before entering Passion — and can pass through enemies once she is in it.' },
        { name: 'Dodge Counter: Swift Shadow', desc: 'After a Perfect Dodge: multiple slashes followed by a downward thrust. Invulnerable while active.' },
      ],
    },
    {
      id: 'assist',
      label: 'Assist',
      items: [
        { name: 'Quick Assist: Dark Thorn', desc: 'Multiple slashes plus a downward thrust when the on-field ally is launched.' },
        { name: 'Defensive Assist: Last Defense', desc: 'Parries the enemy attack, dealing massive Daze.' },
        { name: 'Assist Follow-Up: Gale Sweep', desc: 'Leaps up and slashes, then executes a wide sweeping slash across a large area.' },
      ],
    },
    {
      id: 'special',
      label: 'Special',
      items: [
        { name: 'Special Attack: Aerial Sweep', desc: 'Leaps into the air for a series of kicks, then sweeps across. Anti-Interrupt level is increased.' },
        { name: 'EX Special Attack: Aerial Sweep – Clearout', desc: 'With enough Energy: a massive Physical DMG version. Invulnerable while active.' },
      ],
    },
    {
      id: 'chain',
      label: 'Chain',
      items: [
        { name: 'Chain Attack: Flowers of Sin', desc: 'Slashes enemies in a large area. Jane enters the Passion state with max Passion Stream.' },
        { name: 'Ultimate: Final Curtain', desc: 'Back-and-forth slashes across a large area, followed by a finishing strike. Grants Passion and max Passion Stream.' },
      ],
    },
    {
      id: 'core',
      label: 'Core',
      items: [
        { name: 'Core Passive: Insight', desc: 'Hits inflict the Gnawed state (10s). Assault against Gnawed enemies can crit — CRIT Rate scales with Anomaly Proficiency — and Flinch lasts 5s longer.' },
        { name: 'Additional Ability: Sore Spot', desc: 'With an Anomaly or same-Faction squadmate: +20% Physical Anomaly Buildup Rate, plus 15% more against enemies already suffering an Attribute Anomaly.' },
      ],
    },
  ];

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia('(pointer: fine)');

  let cleanups = [];

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  /* ------------------------------------------------
     1. Tab Combat Record
     ------------------------------------------------ */
  function setupSkills(page) {
    const tabsEl = page.querySelector('[data-skills-tabs]');
    const panelEl = page.querySelector('[data-skills-panel]');
    if (!tabsEl || !panelEl) return;

    // Buat tombol tab dari data
    const tabs = SKILLS.map((skill, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'skill-tab';
      tab.id = `skill-tab-${skill.id}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(index === 0));
      tab.tabIndex = index === 0 ? 0 : -1;
      tab.textContent = skill.label;
      tabsEl.appendChild(tab);
      return tab;
    });

    let active = 0;

    function renderPanel(index) {
      const skill = SKILLS[index];
      panelEl.setAttribute('aria-labelledby', `skill-tab-${skill.id}`);
      panelEl.innerHTML = skill.items
        .map(
          (item) => `
          <div class="skill-entry">
            <p class="skill-entry__name"></p>
            <p class="skill-entry__desc"></p>
          </div>`
        )
        .join('');
      // Isi teks lewat textContent (bukan template literal) supaya aman
      panelEl.querySelectorAll('.skill-entry').forEach((entry, i) => {
        entry.querySelector('.skill-entry__name').textContent = skill.items[i].name;
        entry.querySelector('.skill-entry__desc').textContent = skill.items[i].desc;
      });

      // Picu ulang animasi fade-up tiap ganti tab
      panelEl.classList.remove('is-switching');
      void panelEl.offsetWidth;
      panelEl.classList.add('is-switching');
    }

    function selectTab(index, focus = true) {
      active = (index + SKILLS.length) % SKILLS.length;
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === active));
        tab.tabIndex = i === active ? 0 : -1;
      });
      renderPanel(active);
      if (focus) tabs[active].focus();
    }

    tabs.forEach((tab, i) => on(tab, 'click', () => selectTab(i, false)));

    // Navigasi keyboard sesuai pola ARIA tabs
    on(tabsEl, 'keydown', (event) => {
      const keys = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: SKILLS.length - 1 };
      if (event.key in keys) {
        event.preventDefault();
        selectTab(keys[event.key]);
      }
    });

    renderPanel(0);
  }

  /* ------------------------------------------------
     2. Audio player theme song
     ------------------------------------------------ */
  function setupPlayer(page) {
    const toggle = page.querySelector('[data-player-toggle]');
    const audio = page.querySelector('[data-player-audio]');
    const seek = page.querySelector('[data-player-seek]');
    const currentEl = page.querySelector('[data-player-current]');
    const durationEl = page.querySelector('[data-player-duration]');
    if (!toggle || !audio || !seek || !currentEl || !durationEl) return;

    const fmt = (sec) => {
      if (!Number.isFinite(sec)) return '--:--';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    };

    function setPlaying(playing) {
      toggle.classList.toggle('is-playing', playing);
      toggle.setAttribute('aria-pressed', String(playing));
      toggle.setAttribute('aria-label', playing ? 'Pause theme song' : 'Play theme song');
    }

    on(toggle, 'click', () => {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });

    on(audio, 'play', () => setPlaying(true));
    on(audio, 'pause', () => setPlaying(false));
    on(audio, 'ended', () => { audio.currentTime = 0; });

    on(audio, 'loadedmetadata', () => {
      durationEl.textContent = fmt(audio.duration);
    });

    on(audio, 'timeupdate', () => {
      if (!audio.duration) return;
      const ratio = audio.currentTime / audio.duration;
      seek.value = Math.round(ratio * 1000);
      seek.style.setProperty('--fill', `${ratio * 100}%`);
      currentEl.textContent = fmt(audio.currentTime);
    });

    on(seek, 'input', () => {
      if (!audio.duration) return;
      audio.currentTime = (seek.value / 1000) * audio.duration;
    });

    // Jangan biarkan lagu lanjut setelah pindah halaman
    cleanups.push(() => audio.pause());
  }

  /* ------------------------------------------------
     3. Efek tilt 3D pada foto (desktop saja)
     ------------------------------------------------ */
  function setupTilt(page) {
    const card = page.querySelector('[data-tilt]');
    if (!card || !finePointerQuery.matches || reduceMotionQuery.matches) return;

    const MAX_DEG = 5; // kemiringan maksimum

    on(card, 'pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      // Matikan transisi selama mengikuti kursor supaya tidak terasa lambat
      card.style.transition = 'none';
      card.style.transform =
        `rotate(0deg) perspective(700px) rotateY(${x * MAX_DEG}deg) rotateX(${-y * MAX_DEG}deg)`;
    });

    on(card, 'pointerleave', () => {
      card.style.transition = ''; // transisi CSS aktif lagi -> kembali halus
      card.style.transform = '';
    });
  }

  /* ------------------------------------------------
     Daftar ke main.js
     ------------------------------------------------ */
  function init(page) {
    setupSkills(page);
    setupPlayer(page);
    setupTilt(page);
  }

  function destroy() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  }

  window.ZZZ.pages.page2 = { init, destroy };
})();
