/* eslint-disable */
/* global WebImporter */

/**
 * JLL cleanup transformer.
 *
 * beforeTransform: removes global chrome that would interfere with block matching
 * (header/footer experience fragments, skip link, OneTrust, empty widgets, carousel
 * controls, icon-font ligature spans, screen-reader slide announcements).
 * It deliberately keeps react-component[data-config] attributes intact: the
 * tabs-stacked parser reads the accordion-carousel JSON config to get all panels.
 *
 * afterTransform: final sweep (icon spans / live regions copied by parsers,
 * tracking attributes, leftover empty wrappers) and Scene7 image normalization.
 */

const ICON_NAMES = new Set([
  'arrow_forward', 'arrow_back', 'arrow_downward', 'arrow_upward',
  'chevron_left', 'chevron_right', 'play_arrow', 'pause', 'open_in_new',
  'expand_more', 'expand_less', 'keyboard_arrow_down', 'keyboard_arrow_up',
  'search', 'menu', 'close', 'north_east',
]);

function removeAll(root, selectors) {
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  });
}

/** Remove material-symbol ligature spans (e.g. <span>arrow_forward</span>). */
function removeIconSpans(root) {
  root.querySelectorAll('span').forEach((span) => {
    if (span.children.length) return;
    const text = (span.textContent || '').trim();
    if (ICON_NAMES.has(text)) span.remove();
  });
}

/** Remove visually-hidden "Slide 1 of 4: ..." announcements and swiper live regions. */
function removeSlideAnnouncements(root) {
  removeAll(root, ['.swiper-notification', '.swiper-pagination']);
  // Only leaf live regions: Swiper puts aria-live on .swiper-wrapper (real slide content)
  root.querySelectorAll('[aria-live]').forEach((el) => {
    if (!el.children.length) el.remove();
  });
  root.querySelectorAll('div, span, p').forEach((el) => {
    if (el.children.length) return;
    if (/^Slide \d+ of \d+/i.test((el.textContent || '').trim())) el.remove();
  });
}

/** Normalize Scene7 image URLs to an absolute, fixed rendition and drop responsive attrs. */
function normalizeScene7Images(root) {
  root.querySelectorAll('img').forEach((img) => {
    let src = img.getAttribute('src') || '';
    if (!src.includes('/is/image/')) return;
    if (src.startsWith('//')) src = `https:${src}`;
    try {
      const url = new URL(src, 'https://s7d1.scene7.com');
      // Rebuild the query by hand: URLSearchParams would encode the comma in fit=constrain,0.
      // Without fit=constrain,0 Scene7 pads the image with white up to the requested width.
      const keep = url.search.replace(/^\?/, '').split('&')
        .filter((p) => p && !/^(wid|hei|fmt|fit)=/.test(p));
      keep.push('fit=constrain,0', 'wid=1600', 'fmt=jpg');
      img.setAttribute('src', `${url.origin}${url.pathname}?${keep.join('&')}`);
    } catch (e) {
      // leave src untouched if it cannot be parsed
    }
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.removeAttribute('loading');
    const picture = img.closest('picture');
    if (picture) picture.querySelectorAll('source').forEach((s) => s.remove());
  });
}

/**
 * Point raw AEM DAM originals (www.jll.com/content/dam/...jpg|png, often 10-30MB) at the
 * published 1280px web rendition. Edge Delivery rejects images over 20MB.
 */
function useDamWebRenditions(root) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (!/^https:\/\/www\.jll\.com\/content\/dam\/[^?#]+\.(jpe?g|png)(\?[^#]*)?$/i.test(src)) return;
    const base = src.split('?')[0];
    img.setAttribute('src', `${base}/jcr:content/renditions/cq5dam.web.1280.1280.jpeg`);
  });
}

export default function transform(hookName, element, payload) {
  const root = element;

  if (hookName === 'beforeTransform') {
    // Global header / footer experience fragments, skip link, cookie consent
    removeAll(root, [
      '.cmp-experiencefragment--header',
      'div.experiencefragment:has(.cmp-experiencefragment--header)',
      'footer.experiencefragment',
      '.cmp-experiencefragment--footer',
      'header',
      'footer',
      '.cmp-page__skiptomaincontent',
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '.onetrust-pc-dark-filter',
      'iframe.ot-text-resize',
      // Qualtrics site-intercept survey popup ("Share your feedback")
      '[class^="QSI"]',
      '[id^="QSI"]',
      '[class*=" QSI"]',
    ]);
    // Header wrapper fallback (in case :has is unsupported)
    root.querySelectorAll('div.experiencefragment').forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img')) el.remove();
    });

    // Empty / non-authorable widgets
    removeAll(root, [
      'div.spotlightbroadcaster',
      'div.ghost',
    ]);
    root.querySelectorAll('div.embed').forEach((el) => {
      if (!el.querySelector('iframe, img, video, a') && !el.textContent.trim()) el.remove();
    });
    // Empty react-component roots outside of authorable components (e.g. body-level portals).
    // Keep any that carry a data-config (parsers read it) or have content.
    root.querySelectorAll('react-component').forEach((rc) => {
      if (rc.hasAttribute('data-config')) return;
      if (!rc.children.length && !rc.textContent.trim()) {
        const wrapper = rc.parentElement;
        rc.remove();
        if (wrapper && wrapper.matches('div.aem-GridColumn') && !wrapper.children.length && !wrapper.textContent.trim()) {
          wrapper.remove();
        }
      }
    });

    // Carousel prev/next controls (hero carousel and news carousel)
    removeAll(root, [
      '.carousel-panel__nav-buttons',
      '.carousel-panel__nav-button-prev',
      '.carousel-panel__nav-button-next',
      '.swiper-button-prev',
      '.swiper-button-next',
    ]);

    removeSlideAnnouncements(root);
    removeIconSpans(root);

    // Scripts / styles / noscript / link tags
    removeAll(root, ['script', 'style', 'noscript', 'link']);
  }

  if (hookName === 'afterTransform') {
    removeIconSpans(root);
    removeSlideAnnouncements(root);
    removeAll(root, [
      'header', 'footer', '#onetrust-consent-sdk', '.cmp-page__skiptomaincontent',
      'iframe', 'script', 'style', 'noscript', 'link', 'source',
      '[class^="QSI"]', '[id^="QSI"]', '[class*=" QSI"]',
    ]);
    // Qualtrics intercept fallback: its close-button image is served from qualtrics.com
    root.querySelectorAll('img[src*="qualtrics.com"]').forEach((img) => {
      const container = img.closest('p, div') || img;
      const prev = container.previousElementSibling;
      if (prev && prev.tagName === 'P' && /share your feedback/i.test(prev.textContent)) prev.remove();
      container.remove();
    });

    // Tracking / framework attributes (data-config no longer needed after parsing)
    root.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const n = attr.name;
        if (
          n.startsWith('data-cmp-')
          || n.startsWith('data-analytics')
          || n.startsWith('data-track')
          || n === 'data-config'
          || n === 'data-component'
          || n === 'data-state'
          || n === 'onclick'
        ) {
          el.removeAttribute(n);
        }
      });
    });

    normalizeScene7Images(root);
    useDamWebRenditions(root);
  }
}
