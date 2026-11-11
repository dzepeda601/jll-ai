import { createOptimizedPicture } from '../../scripts/aem.js';
import { createTag } from '../../scripts/shared.js';

/*
 * Cards with an eyebrow line. Follows the local cards block's default
 * decoration (ul > li > article, image + body wrappers) and adds:
 * - the first paragraph before the heading becomes the eyebrow
 * - the last link becomes an icon-style CTA that keeps its authored text
 *   as the accessible name
 * - `tiles` option: text-only filled tiles in a wrapping grid, the whole tile
 *   links out (styles in cards-eyebrow.css; a linked heading is accepted too)
 * - `links` option: same content as tiles, rendered as unfilled text links
 *   (title with a chevron, description below) in a two-column grid; in a
 *   `split` section the default content sits beside it
 * - `grid` option: default rows as image-top cards in a wrapping grid, the
 *   whole card links out (CSS only; a card without an image gets a placeholder)
 */

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]));
  });
}

function splitCells(row) {
  const cells = [...row.children];
  const imageCell = cells.find((cell) => cell.querySelector('picture')
    && cell.textContent.trim() === '');
  const picture = imageCell ? null : row.querySelector('picture');
  const image = createTag('div', { class: 'cards-eyebrow-card-image' });
  const body = createTag('div', { class: 'cards-eyebrow-card-body' });

  if (imageCell) {
    image.append(...imageCell.childNodes);
  } else if (picture) {
    // single-cell rows: pull the picture (and its empty paragraph) out of the content
    const holder = picture.parentElement;
    image.append(picture);
    if (holder && holder !== row && holder.tagName === 'P' && !holder.textContent.trim()) holder.remove();
  }

  cells.filter((cell) => cell !== imageCell).forEach((cell) => body.append(...cell.childNodes));
  return { image: image.childNodes.length ? image : null, body };
}

/*
 * tiles option: when the heading itself is the tile's only link, keep the
 * heading text and move the link into its own CTA paragraph.
 */
function moveHeadingLink(body, heading) {
  const link = heading?.querySelector('a[href]');
  if (!link || [...body.querySelectorAll('a[href]')].length > 1) return;
  const cta = link.cloneNode(true);
  link.replaceWith(...link.childNodes);
  const p = createTag('p', {}, cta);
  body.append(p);
}

function decorateBody(body, isTiles = false) {
  const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'P' && !prev.classList.contains('button-container') && prev.textContent.trim()) {
        prev.classList.add('cards-eyebrow-card-eyebrow');
        break;
      }
      prev = prev.previousElementSibling;
    }
  }

  if (isTiles) moveHeadingLink(body, heading);

  const links = [...body.querySelectorAll('a[href]')];
  const cta = links[links.length - 1];
  if (!cta) return;

  const container = cta.closest('p') || cta.parentElement;
  container.classList.remove('button-container');
  container.classList.add('cards-eyebrow-card-cta');
  cta.classList.remove('button', 'primary', 'secondary');
  cta.classList.add('cards-eyebrow-card-cta-link');

  const url = new URL(cta.href, window.location.href);
  if (url.origin !== window.location.origin) cta.classList.add('is-external');

  // A pasted URL is not a useful accessible name; fall back to the heading.
  const text = cta.textContent.trim();
  if (heading && (!text || text === cta.href)) cta.setAttribute('aria-label', heading.textContent.trim());

  const label = createTag('span', { class: 'cards-eyebrow-card-cta-label' });
  label.append(...cta.childNodes);
  const icon = createTag('span', { class: 'cards-eyebrow-card-cta-icon', 'aria-hidden': 'true' });
  cta.append(label, icon);
}

/** @param {Element} block */
export default function decorate(block) {
  const ul = createTag('ul');
  const isTiles = block.classList.contains('tiles') || block.classList.contains('links');

  [...block.children].forEach((row) => {
    const { image, body } = splitCells(row);
    decorateBody(body, isTiles);
    const article = createTag('article', { class: 'cards-eyebrow-card' });
    if (image) article.append(image);
    else article.classList.add('cards-eyebrow-card-text-only');
    article.append(body);
    ul.append(createTag('li', {}, article));
  });

  optimizePictures(ul);
  block.replaceChildren(ul);
}
