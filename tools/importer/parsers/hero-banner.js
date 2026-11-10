/* eslint-disable */
/* global WebImporter */

/**
 * Parser: hero-banner (JLL "Contact us today" CTA banner).
 *
 * Source: div.banner.aem-GridColumn > react-component[data-component="banner"].
 * Preferred input is the data-config JSON:
 *   { ctaTitle, ctaLinkUrl, imagePath, imageAltText }
 * Fallback: rendered banner (img, heading, wrapping <a href>).
 *
 * Block contract (blocks/hero-banner/README.md):
 *   Row 1: background image
 *   Row 2: heading (H2) + CTA link (the decorator makes the whole banner clickable)
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

export default function parse(element, { document }) {
  if (!element.parentNode) return;

  const config = readConfig(element, 'banner');
  const img = element.querySelector('img');
  const headingEl = element.querySelector('h1, h2, h3, h4, h5, h6');
  const linkEl = element.querySelector('a[href]');

  const image = (config && config.imagePath) || (img && img.getAttribute('src')) || '';
  const alt = (config && config.imageAltText) || (img && img.getAttribute('alt')) || '';
  const title = (config && decodeText(document, config.ctaTitle)) || (headingEl ? clean(headingEl.textContent) : '');
  const url = (config && config.ctaLinkUrl) || (linkEl && linkEl.getAttribute('href')) || '';
  const label = (config && decodeText(document, config.ctaPrimaryTitle)) || title;

  if (!image && !title) return;

  const cells = [];
  if (image) {
    const picture = document.createElement('img');
    picture.src = absUrl(image);
    picture.alt = clean(alt);
    cells.push([picture]);
  }

  const content = [];
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    content.push(h2);
  }
  if (url) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = absUrl(url);
    a.textContent = label || absUrl(url);
    p.append(a);
    content.push(p);
  }
  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
