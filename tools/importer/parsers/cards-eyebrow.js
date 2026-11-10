/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-eyebrow (JLL accordion-carousel tile row).
 *
 * On the homepage every .carousel-accordion-slide lives inside the
 * "Explore a brighter way" accordion carousel, whose panels (and their
 * cards-eyebrow blocks) are emitted by the tabs-stacked parser from the
 * component's data-config. To avoid duplicate cards this parser leaves any
 * slide inside div.accordion-carousel untouched — tabs-stacked replaces the
 * whole component.
 *
 * Standalone .carousel-accordion-slide rows (outside an accordion carousel)
 * are converted here: one row per card.
 *   cell 1: image | cell 2: eyebrow <p>, <h3> title, description <p>, link
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

function el(document, tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function cardRow(document, col) {
  const card = col.querySelector('.carousel-accordion-card') || col;
  const img = col.querySelector('img');
  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  const paras = [...card.querySelectorAll('p')];
  // eyebrow = paragraph before the heading, description = paragraph after it
  const eyebrow = heading ? paras.find((p) => p.compareDocumentPosition(heading) & 4) : null;
  const desc = heading ? paras.find((p) => heading.compareDocumentPosition(p) & 4) : paras[0];
  const link = card.querySelector('a[href]');

  let imageCell = '';
  if (img && img.getAttribute('src')) {
    const image = document.createElement('img');
    image.src = absUrl(img.getAttribute('src'));
    image.alt = img.getAttribute('alt') || '';
    imageCell = image;
  }

  const content = [];
  if (eyebrow && clean(eyebrow.textContent)) content.push(el(document, 'p', clean(eyebrow.textContent)));
  if (heading) content.push(el(document, 'h3', clean(heading.textContent)));
  if (desc && clean(desc.textContent)) content.push(el(document, 'p', clean(desc.textContent)));
  if (link) {
    const p = document.createElement('p');
    const a = el(document, 'a', clean(link.getAttribute('aria-label')) || 'Read more');
    a.href = absUrl(link.getAttribute('href'));
    p.append(a);
    content.push(p);
  }
  return content.length ? [imageCell, content] : null;
}

export default function parse(element, { document }) {
  if (!element.parentNode) return;
  // Owned by the tabs-stacked parser (reads all panels from data-config): no duplicates.
  if (element.closest('div.accordion-carousel, react-component[data-component="accordion-carousel"]')) return;

  const slide = element.matches('.carousel-accordion-slide')
    ? element
    : element.querySelector('.carousel-accordion-slide') || element;
  const cols = [...slide.children].filter((c) => c.querySelector('.carousel-accordion-card, h1, h2, h3, h4, h5, h6'));
  const cells = cols.map((col) => cardRow(document, col)).filter(Boolean);
  if (!cells.length) return;

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-eyebrow', cells });
  element.replaceWith(block);
}
