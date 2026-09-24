/**
 * MAIN JS (ROOT)
 *
 * Tugas file ini:
 *  1. Memuat html/pageN.html ke dalam #main-content (SPA sederhana).
 *  2. Memuat js/pageN.js untuk halaman itu (kalau ada), lalu memanggil
 *     ZZZ.pages.pageN.init(elemenHalaman) dan destroy() saat pindah halaman.
 *  3. Menangani tombol yang dipakai di semua halaman lewat atribut data-action:
 *       goto   -> pindah halaman   (data-page="page2")
 *       sound  -> mute / unmute video background
 *       share  -> bagikan / salin link
 *       soon   -> tampilkan toast "coming soon" (data-msg="...")
 *
 * Cara menambah halaman baru (mis. page3):
 *  - buat html/page3.html, css/page3.css (lalu @import di css/main.css),
 *    dan js/page3.js kalau perlu
 *  - daftarkan di objek PAGES di bawah
 *  - di js/page3.js isi: ZZZ.pages.page3 = { init(page) {}, destroy() {} }
 *
 * PENTING: file ini memakai fetch(), jadi website harus dibuka lewat
 * local server (Live Server di VS Code, atau `python -m http.server`),
 * bukan dengan double-click index.html.
 */
(() => {
  'use strict';

  const PAGES = {
    page1: { html: 'html/page1.html', js: 'js/page1.js' },
    page2: { html: 'html/page2.html', js: null }, // dummy, belum punya js
  };
  const DEFAULT_PAGE = 'page1';

  const root = document.getElementById('main-content');
  const toastEl = document.getElementById('toast');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scriptCache = new Map();

  let navToken = 0;
  let toastTimer = null;

  // Objek publik: dipakai oleh js/pageN.js
  window.ZZZ = { pages: {}, current: null, loadPage, toast };

  /* ------------------------------------------------
     Utilitas
     ------------------------------------------------ */
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function loadScript(src) {
    if (!src) return Promise.resolve();
    if (!scriptCache.has(src)) {
      scriptCache.set(
        src,
        new Promise((resolve, reject) => {
          const el = document.createElement('script');
          el.src = src;
          el.onload = resolve;
          el.onerror = () => {
            scriptCache.delete(src);
            reject(new Error(`Gagal memuat ${src}`));
          };
          document.head.appendChild(el);
        })
      );
    }
    return scriptCache.get(src);
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  /* ------------------------------------------------
     Pemuat halaman
     ------------------------------------------------ */
  async function loadPage(name) {
    if (!PAGES[name]) name = DEFAULT_PAGE;
    if (ZZZ.current === name && root.firstElementChild) return;

    const token = ++navToken;
    const outgoing = root.querySelector('.page');

    // Keluar dulu: fade out halaman lama
    if (outgoing) {
      outgoing.classList.remove('active');
      const oldPage = ZZZ.pages[ZZZ.current];
      if (oldPage && oldPage.destroy) oldPage.destroy();
      if (!reduceMotion.matches) await wait(320);
      if (token !== navToken) return;
    }

    try {
      const response = await fetch(PAGES[name].html);
      if (!response.ok) throw new Error(`${PAGES[name].html}: ${response.status} ${response.statusText}`);
      const html = await response.text();
      await loadScript(PAGES[name].js);
      if (token !== navToken) return;

      root.innerHTML = html;
      const page = root.querySelector('.page');
      ZZZ.current = name;

      const pageApi = ZZZ.pages[name];
      if (pageApi && pageApi.init) pageApi.init(page);

      // Dua frame supaya transisi opacity (fade in) benar-benar berjalan
      requestAnimationFrame(() => requestAnimationFrame(() => page.classList.add('active')));
    } catch (error) {
      showLoadError(error);
    }
  }

  function showLoadError(error) {
    console.error(error);
    const openedAsFile = location.protocol === 'file:';
    root.innerHTML = `
      <div style="min-height:100vh;display:grid;place-content:center;gap:12px;padding:24px;text-align:center;max-width:560px;margin:auto;font-family:sans-serif">
        <h2>Halaman tidak bisa dimuat</h2>
        <p style="color:#c9c3c8;line-height:1.5">
          ${openedAsFile
            ? 'Website dibuka langsung dari file. Jalankan lewat local server, mis. ekstensi <b>Live Server</b> di VS Code, atau perintah <code>python -m http.server</code> di folder proyek.'
            : 'Cek nama file di objek PAGES pada js/main.js dan pastikan file-nya ada.'}
        </p>
        <p style="color:#8a848a;font-size:.85rem">${String(error.message).replace(/</g, '&lt;')}</p>
      </div>`;
  }

  function routeFromHash() {
    const name = location.hash.replace('#', '');
    loadPage(PAGES[name] ? name : DEFAULT_PAGE);
  }

  function goTo(name) {
    if (name === ZZZ.current) {
      // Sudah di halaman ini (mis. tombol Home): kembali ke atas
      const content = root.querySelector('.page__content');
      if (content) content.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      return;
    }
    location.hash = name;
  }

  /* ------------------------------------------------
     Aksi bersama (delegasi klik, sekali saja)
     ------------------------------------------------ */
  function toggleSound(button) {
    const video = document.querySelector('.bg-video');
    if (!video) {
      toast('This page has no audio');
      return;
    }
    video.muted = !video.muted;
    button.classList.toggle('is-muted', video.muted);
    button.setAttribute('aria-pressed', String(!video.muted));
    button.setAttribute('aria-label', video.muted ? 'Unmute background video' : 'Mute background video');
    if (!video.muted) video.play().catch(() => {});
  }

  async function share() {
    const data = { title: document.title, url: location.href };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (_) {
        /* dibatalkan pengguna */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(location.href);
      toast('Link copied');
    } catch (_) {
      toast('Copy the link from the address bar');
    }
  }

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;

    switch (el.dataset.action) {
      case 'goto':
        goTo(el.dataset.page);
        break;
      case 'sound':
        toggleSound(el);
        break;
      case 'share':
        share();
        break;
      case 'soon':
        toast(el.dataset.msg || 'Coming soon');
        break;
    }
  });

  window.addEventListener('hashchange', routeFromHash);

  // Muat halaman pertama saat web dibuka
  document.addEventListener('DOMContentLoaded', routeFromHash);
})();
