import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Full-bleed photo with a white rounded panel overlapping its bottom edge.
 * Follows the local hero block: row 1 is the image, row 2 is the panel content.
 * - A list of links in the panel becomes a stacked link list with chevrons.
 * - A panel row with two cells lays them side by side from 900px
 *   (e.g. heading + description | person card).
 */

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]));
  });
}

function decorateLinkLists(scope) {
  scope.querySelectorAll('ul, ol').forEach((list) => {
    const items = [...list.children];
    const isLinkList = items.length && items.every((li) => {
      const a = li.querySelector('a[href]');
      return a && a.textContent.trim() === li.textContent.trim();
    });
    if (!isLinkList) return;
    list.classList.add('hero-photo-panel-links');
    items.forEach((li) => {
      const a = li.querySelector('a[href]');
      a.classList.remove('button', 'primary', 'secondary');
      a.closest('.button-container')?.classList.remove('button-container');
      a.classList.add('hero-photo-panel-link');
      const label = document.createElement('span');
      label.className = 'hero-photo-panel-link-label';
      label.append(...a.childNodes);
      const icon = document.createElement('span');
      icon.className = 'hero-photo-panel-link-icon';
      icon.setAttribute('aria-hidden', 'true');
      a.append(label, icon);
      li.replaceChildren(a);
    });
  });
}

/** @param {Element} block */
export default function decorate(block) {
  const rows = [...block.children];
  // the photo row holds only an image; pictures in panel cells (e.g. portraits) stay there
  const imageRow = rows.find((row) => row.querySelector('picture') && !row.textContent.trim());
  const picture = imageRow ? imageRow.querySelector('picture') : null;

  const media = document.createElement('div');
  media.className = 'hero-photo-panel-image';
  if (picture) media.append(picture);
  else block.classList.add('no-image');

  const panel = document.createElement('div');
  panel.className = 'hero-photo-panel-panel';

  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      if (row === imageRow && !cell.textContent.trim()) return;
      if (!cell.textContent.trim() && !cell.querySelector('img')) return;
      cell.className = 'hero-photo-panel-cell';
      panel.append(cell);
    });
  });
  if (panel.children.length > 1) panel.classList.add('is-split');

  decorateLinkLists(panel);
  block.replaceChildren(...(picture ? [media] : []), panel);
  optimizePictures(block);
}
