/* eslint-disable */
/* global WebImporter */

/**
 * Parser: carousel-hero (JLL "Spotlight stories" hero carousel).
 *
 * Source: div.carouselpanel > react-component[data-component="carouselpanel"].
 * Preferred input is the component's data-config JSON
 *   { title, panels: [{ title, navigation: { title }, image: { imagePath, imageAltText }, cta: { label, url } }] }
 * Fallback: rendered swiper slides (.carousel-panel__swiper .swiper-slide).
 *
 * Block contract (blocks/carousel-hero/README.md):
 *   Row 1 (optional, single cell): navigator title ("Spotlight stories")
 *   Each following row = slide: cell 1 image | cell 2 optional nav label <p>, heading, CTA link
 *   Slide 1 heading is H1 (page title), the others H2. The nav label paragraph is only
 *   emitted when it differs from the heading (the decorator falls back to the heading).
 */

const ORIGIN = 'https://www.jll.com';

function absUrl(url) {
  if (!url) return '';
  const value = String(url).trim();
  if (!value || value.startsWith('#') || /^(mailto|tel|javascript):/i.test(value)) return value;
  try {
    return new URL(value.startsWith('//') ? `https:${value}` : value, ORIGIN).href;
  } catch (e) {
    return value;
  }
}

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function decodeText(document, str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerHTML = String(str);
  let text = div.textContent;
  if (/<[a-z/]/i.test(text)) {
    div.innerHTML = text;
    text = div.textContent;
  }
  return clean(text);
}

/** Visible link text without material-symbol ligature spans (e.g. "arrow_forward"). */
function linkText(a) {
  const copy = a.cloneNode(true);
  copy.querySelectorAll('span').forEach((span) => {
    if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean(span.textContent))) span.remove();
  });
  return clean(copy.textContent);
}

function readConfig(root, component) {
  const rc = (root.matches && root.matches(`react-component[data-component="${component}"]`))
    ? root
    : root.querySelector(`react-component[data-component="${component}"][data-config]`);
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config'));
  } catch (e) {
    return null;
  }
}

function createImage(document, src, alt) {
  if (!src) return null;
  const img = document.createElement('img');
  img.src = absUrl(src);
  img.alt = clean(alt);
  return img;
}

function createCta(document, label, url) {
  const text = clean(label);
  if (!text && !url) return null;
  const p = document.createElement('p');
  if (url) {
    const a = document.createElement('a');
    a.href = absUrl(url);
    a.textContent = text || absUrl(url);
    p.append(a);
  } else {
    p.textContent = text;
  }
  return p;
}

function buildSlideRow(document, slide, idx) {
  const imageCell = createImage(document, slide.image, slide.alt) || '';
  const content = [];
  const heading = clean(slide.heading);
  const label = clean(slide.label);
  if (label && heading && label !== heading) {
    const p = document.createElement('p');
    p.textContent = label;
    content.push(p);
  }
  if (heading) {
    const h = document.createElement(idx === 0 ? 'h1' : 'h2');
    h.textContent = heading;
    content.push(h);
  }
  const cta = createCta(document, slide.ctaLabel, slide.ctaUrl);
  if (cta) content.push(cta);
  return [imageCell, content];
}

function slidesFromConfig(document, config) {
  if (!config || !Array.isArray(config.panels) || !config.panels.length) return null;
  return {
    title: decodeText(document, config.title),
    slides: config.panels.map((panel) => ({
      image: panel.image && panel.image.imagePath,
      alt: (panel.image && panel.image.imageAltText) || '',
      heading: decodeText(document, panel.title),
      label: decodeText(document, panel.navigation && panel.navigation.title),
      ctaLabel: decodeText(document, panel.cta && panel.cta.label),
      ctaUrl: panel.cta && panel.cta.url,
    })),
  };
}

function slidesFromDom(root) {
  const slideEls = [...root.querySelectorAll('.carousel-panel__swiper .swiper-slide')]
    .filter((el) => !el.classList.contains('swiper-slide-duplicate'));
  if (!slideEls.length) return null;
  const firstNav = root.querySelector('.carousel-panel__navigation');
  const titleEl = firstNav && firstNav.querySelector('h1, h2, h3, h4, h5, h6');
  const navLabels = firstNav
    ? [...firstNav.querySelectorAll('nav li')].map((li) => clean(li.textContent))
    : [];
  return {
    title: titleEl ? clean(titleEl.textContent) : '',
    slides: slideEls.map((el, idx) => {
      const tile = el.querySelector('.carousel-panel-tile') || el;
      const img = tile.querySelector('img');
      const heading = tile.querySelector('h1, h2, h3, h4, h5, h6');
      const link = tile.querySelector('a[href]');
      return {
        image: img && (img.getAttribute('src') || img.src),
        alt: img ? img.getAttribute('alt') || '' : '',
        heading: heading ? heading.textContent : '',
        label: navLabels[idx] || '',
        ctaLabel: link ? linkText(link) : '',
        ctaUrl: link ? link.getAttribute('href') : '',
      };
    }),
  };
}

export default function parse(element, { document }) {
  const root = element.closest('div.carouselpanel') || element;
  if (!root.parentNode) return;

  const data = slidesFromConfig(document, readConfig(root, 'carouselpanel')) || slidesFromDom(root);
  if (!data || !data.slides.length) return;

  const cells = [];
  if (data.title) cells.push([data.title]);
  data.slides.forEach((slide, idx) => cells.push(buildSlideRow(document, slide, idx)));

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  root.replaceWith(block);
}
