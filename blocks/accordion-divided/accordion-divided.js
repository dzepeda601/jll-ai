import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Accordion with full-width rows separated by thin rules, based on the block
 * library accordion (details/summary per row).
 * - Row: cell 1 title, cell 2 rich-text content (paragraphs, lists, links).
 * - When items carry an image in their content, the block shows the open
 *   item's image beside the list from 900px (one item open at a time, the
 *   first open by default); on small screens the image stays inside the item.
 */

let accordionCount = 0;

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '900' }]));
  });
}

function showMedia(block, index) {
  block.querySelectorAll('.accordion-divided-media-item').forEach((item) => {
    item.hidden = Number(item.dataset.index) !== index;
  });
}

/** @param {Element} block */
export default function decorate(block) {
  accordionCount += 1;
  const groupName = `accordion-divided-${accordionCount}`;
  const list = document.createElement('div');
  list.className = 'accordion-divided-list';
  const media = document.createElement('div');
  media.className = 'accordion-divided-media';

  [...block.children].forEach((row) => {
    const [labelCell, ...bodyCells] = [...row.children];
    if (!labelCell) return;

    const summary = document.createElement('summary');
    summary.className = 'accordion-divided-item-label';
    const label = document.createElement('span');
    label.className = 'accordion-divided-item-title';
    // keep inline formatting, drop the paragraph/heading wrapper
    const blocks = [...labelCell.children];
    if (blocks.length === 1 && /^(P|H[1-6])$/.test(blocks[0].tagName)) label.append(...blocks[0].childNodes);
    else label.append(...labelCell.childNodes);
    const icon = document.createElement('span');
    icon.className = 'accordion-divided-item-icon';
    icon.setAttribute('aria-hidden', 'true');
    summary.append(label, icon);

    const body = document.createElement('div');
    body.className = 'accordion-divided-item-body';
    bodyCells.forEach((cell) => body.append(...cell.childNodes));

    const details = document.createElement('details');
    details.className = 'accordion-divided-item';
    details.append(summary, body);

    const picture = body.querySelector('picture');
    if (picture) {
      const index = list.children.length;
      const holder = picture.closest('p');
      if (holder && !holder.textContent.trim()) holder.classList.add('accordion-divided-item-image');
      const item = document.createElement('div');
      item.className = 'accordion-divided-media-item';
      item.dataset.index = index;
      item.append(picture.cloneNode(true));
      media.append(item);
      details.dataset.index = index;
    }
    list.append(details);
  });

  const items = [...list.children];
  const hasMedia = media.children.length > 0;
  if (hasMedia) {
    block.classList.add('has-media');
    // the side image follows the open item, so only one item is open at a time
    items.forEach((details) => { details.name = groupName; });
    if (items[0]) items[0].open = true;
    items.forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        items.forEach((other) => { if (other !== details) other.open = false; });
        if (details.dataset.index) showMedia(block, Number(details.dataset.index));
      });
    });
    block.replaceChildren(list, media);
    showMedia(block, Number(items.find((d) => d.dataset.index)?.dataset.index ?? 0));
    media.setAttribute('aria-hidden', 'true');
    media.querySelectorAll('img').forEach((img) => { img.loading = 'lazy'; });
  } else {
    block.replaceChildren(list);
  }

  optimizePictures(block);
}
