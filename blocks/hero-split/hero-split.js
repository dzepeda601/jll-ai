import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Page-top hero with the text beside a contained, rounded image.
 * Follows the local hero block (an image row and a text row); a single row
 * with an image cell and a text cell works too.
 * - mobile: image on top, text below
 * - >= 900px: text column on the left, image column on the right
 * CTAs use the global buttons: bold link = primary, italic link = secondary.
 * - `side-image` option: the heading spans the full width on top; below it the
 *   image sits on the left and the rest of the text on the right (>= 900px)
 */

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', true, [
      { media: '(min-width: 900px)', width: '1600' },
      { width: '900' },
    ]));
  });
}

/** @param {Element} block */
export default function decorate(block) {
  const picture = block.querySelector('picture');
  const media = document.createElement('div');
  media.className = 'hero-split-media';
  const content = document.createElement('div');
  content.className = 'hero-split-content';

  if (picture) {
    const holder = picture.parentElement;
    media.append(picture);
    if (holder && holder.tagName === 'P' && !holder.textContent.trim()) holder.remove();
  } else {
    block.classList.add('no-image');
  }

  // everything that is not the image is the text column, in authored order
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      if (cell.textContent.trim() || cell.querySelector('a, img')) content.append(...cell.childNodes);
    });
  });

  // a paragraph before the heading is an eyebrow
  const heading = content.querySelector('h1, h2, h3');
  if (heading) {
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'P' && !prev.classList.contains('button-container') && prev.textContent.trim()) {
        prev.classList.add('hero-split-eyebrow');
        break;
      }
      prev = prev.previousElementSibling;
    }
  }

  // group consecutive CTAs so they sit on one row
  const buttons = [...content.querySelectorAll(':scope > .button-container')];
  if (buttons.length) {
    const actions = document.createElement('div');
    actions.className = 'hero-split-actions';
    buttons[0].before(actions);
    actions.append(...buttons);
  }

  const top = [];
  if (block.classList.contains('side-image') && heading) {
    const title = document.createElement('div');
    title.className = 'hero-split-title';
    const eyebrow = content.querySelector(':scope > .hero-split-eyebrow');
    if (eyebrow) title.append(eyebrow);
    title.append(heading);
    top.push(title);
  }

  block.replaceChildren(...top, ...(picture ? [media] : []), content);
  optimizePictures(media);
}
