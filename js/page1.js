/**
 * PAGE 1 JS
 * Hanya dipakai di halaman 1. Dimuat oleh js/main.js, yang memanggil
 * init(elemenHalaman) setelah html/page1.html masuk ke DOM dan
 * destroy() saat pindah ke halaman lain.
 *
 * Isi:
 *  - memilih video background sesuai lebar layar
 *  - loop video (melewati intro), dan diam kalau pengguna minta "reduced motion"
 *  - panel platform bisa dilipat
 *  - trailer di dialog
 */
(() => {
  'use strict';

  // Sama dengan breakpoint mobile di css/global.css
  const mobileQuery = window.matchMedia('(max-width: 640px)');
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let cleanups = [];

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  /* ------------------------------------------------
     1. Video background
     ------------------------------------------------ */
  function setupBackgroundVideo(video) {
    if (!video) return;

    const startAt = () => Number(video.dataset.start) || 0;
    const play = () => video.play().catch(() => {});

    function applySource() {
      const mobile = mobileQuery.matches;
      const src = mobile ? video.dataset.srcMobile : video.dataset.srcDesktop;
      if (video.dataset.active === src) return;

      video.dataset.active = src;
      // Mobile: mulai dari 0. Desktop: lompati intro logo (atur lewat data-start-desktop di html)
      video.dataset.start = mobile ? '0' : (video.dataset.startDesktop || '0');
      video.src = src;
      video.load();
      if (!reduceMotionQuery.matches) play();
    }

    on(video, 'loadedmetadata', () => {
      if (reduceMotionQuery.matches) {
        // Pengguna minta minim gerakan: tampilkan satu frame diam, tanpa play
        video.currentTime = Math.min(mobileQuery.matches ? 2 : 20, video.duration || 2);
        video.pause();
      } else if (startAt() > 0) {
        video.currentTime = startAt();
      }
    });

    // Loop manual, supaya loop berikutnya juga melewati intro
    on(video, 'ended', () => {
      video.currentTime = startAt();
      play();
    });

    on(mobileQuery, 'change', applySource);
    applySource();
  }

  /* ------------------------------------------------
     2. Panel platform (kanan bawah) bisa dilipat
     ------------------------------------------------ */
  function setupStores(page) {
    const stores = page.querySelector('.stores');
    const toggle = page.querySelector('[data-stores-toggle]');
    const panel = page.querySelector('.stores__panel');
    if (!stores || !toggle || !panel) return;

    on(toggle, 'click', () => {
      const open = stores.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Collapse platform list' : 'Expand platform list');
      panel.inert = !open;
    });
  }

  /* ------------------------------------------------
     3. Trailer (dialog)
     Memakai file video desktop milikmu. Baru dimuat saat tombol play ditekan.
     ------------------------------------------------ */
  function setupTrailer(page, bgVideo) {
    const openBtn = page.querySelector('[data-trailer-open]');
    const dialog = page.querySelector('.trailer');
    if (!openBtn || !dialog) return;

    if (typeof dialog.showModal !== 'function') {
      openBtn.hidden = true; // browser lama tanpa <dialog>
      return;
    }

    const trailerVideo = dialog.querySelector('.trailer__video');
    const closeBtn = dialog.querySelector('[data-trailer-close]');

    on(openBtn, 'click', () => {
      if (!trailerVideo.getAttribute('src')) trailerVideo.src = trailerVideo.dataset.src;
      if (bgVideo) bgVideo.pause();
      dialog.showModal();
      trailerVideo.muted = false;
      trailerVideo.play().catch(() => {});
    });

    on(closeBtn, 'click', () => dialog.close());

    // Klik di luar video (backdrop) menutup dialog
    on(dialog, 'click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    // Dipanggil untuk tombol Close, tombol Esc, maupun dialog.close()
    on(dialog, 'close', () => {
      trailerVideo.pause();
      if (bgVideo && !reduceMotionQuery.matches) bgVideo.play().catch(() => {});
    });

    cleanups.push(() => {
      if (dialog.open) dialog.close();
    });
  }

  /* ------------------------------------------------
     Daftar ke main.js
     ------------------------------------------------ */
  function init(page) {
    const bgVideo = page.querySelector('.bg-video');
    setupBackgroundVideo(bgVideo);
    setupStores(page);
    setupTrailer(page, bgVideo);
  }

  function destroy() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  }

  window.ZZZ.pages.page1 = { init, destroy };
})();
