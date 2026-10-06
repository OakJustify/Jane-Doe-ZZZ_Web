/**
 * PAGE 3 JS : MEDIA GALLERY
 * Dimuat oleh js/main.js, yang memanggil init(elemenHalaman) setelah
 * html/page3.html masuk ke DOM dan destroy() saat pindah halaman.
 *
 * Isi:
 *  1. Lightbox gambar — kartu beratribut data-lightbox, data-full, data-caption.
 *  2. Dialog video — kartu beratribut data-video-src, data-caption.
 *     Video hanya dimuat saat kartunya diklik; src dilepas lagi saat
 *     dialog ditutup supaya tidak terus mengunduh di background.
 *
 * Menambah item galeri = cukup tambah kartu baru di html/page3.html
 * dengan atribut yang sama. Tidak perlu menyentuh file ini.
 */
(() => {
  'use strict';

  let cleanups = [];

  function on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }

  const dialogSupported = (dialog) => dialog && typeof dialog.showModal === 'function';

  /* ------------------------------------------------
     1. Lightbox gambar
     ------------------------------------------------ */
  function setupLightbox(page) {
    const dialog = page.querySelector('.lightbox');
    if (!dialogSupported(dialog)) return;

    const img = dialog.querySelector('[data-lightbox-img]');
    const cap = dialog.querySelector('[data-lightbox-cap]');
    const closeBtn = dialog.querySelector('[data-lightbox-close]');

    page.querySelectorAll('[data-lightbox]').forEach((card) => {
      on(card, 'click', () => {
        img.src = card.dataset.full;
        img.alt = card.dataset.caption || '';
        cap.textContent = card.dataset.caption || '';
        dialog.showModal();
      });
    });

    on(closeBtn, 'click', () => dialog.close());

    // Klik backdrop (area gelap di luar gambar) menutup dialog
    on(dialog, 'click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    on(dialog, 'close', () => {
      img.src = ''; // lepas gambar besar saat ditutup
    });

    cleanups.push(() => { if (dialog.open) dialog.close(); });
  }

  /* ------------------------------------------------
     2. Dialog video
     ------------------------------------------------ */
  function setupVideoDialog(page) {
    const dialog = page.querySelector('.media-player');
    if (!dialogSupported(dialog)) return;

    const video = dialog.querySelector('[data-video-el]');
    const cap = dialog.querySelector('[data-video-cap]');
    const closeBtn = dialog.querySelector('[data-video-close]');

    page.querySelectorAll('[data-video-src]').forEach((card) => {
      on(card, 'click', () => {
        video.src = card.dataset.videoSrc;
        cap.textContent = card.dataset.caption || '';
        dialog.showModal();
        video.play().catch(() => {});
      });
    });

    on(closeBtn, 'click', () => dialog.close());

    on(dialog, 'click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    on(dialog, 'close', () => {
      video.pause();
      video.removeAttribute('src');
      video.load(); // batalkan sisa unduhan
    });

    cleanups.push(() => { if (dialog.open) dialog.close(); });
  }

  /* ------------------------------------------------
     Daftar ke main.js
     ------------------------------------------------ */
  function init(page) {
    setupLightbox(page);
    setupVideoDialog(page);
  }

  function destroy() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  }

  window.ZZZ.pages.page3 = { init, destroy };
})();
