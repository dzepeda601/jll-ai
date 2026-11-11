import { getMetadata } from '../../scripts/aem.js';

/*
 * Alternating image + text rows. Follows the local columns block: each row is
 * a flex row, a cell holding only a picture is the image column. The authored
 * cell order decides which side the image sits on at desktop widths, so authors
 * alternate rows by swapping cells. On small screens the image always comes first.
 *
 * Video media (auto-detected; the `video` class option is accepted but not
 * required): a cell whose
 * only content is a Brightcove player link (players.brightcove.net), optionally
 * with an image used as the poster, renders as a click-to-play facade that
 * loads the player iframe on demand. The play button label can be overridden
 * with page metadata (video-label-play).
 */

const VIDEO_HOST = 'players.brightcove.net';
const DEFAULT_PLAY_LABEL = 'Play video';

function findVideoLink(cell) {
  const links = [...cell.querySelectorAll('a[href]')];
  if (links.length !== 1) return null;
  const [link] = links;
  let url;
  try {
    url = new URL(link.href, window.location.href);
  } catch (e) {
    return null;
  }
  if (url.hostname !== VIDEO_HOST) return null;
  // the cell must hold nothing but the link (and an optional poster image)
  if (cell.textContent.trim() !== link.textContent.trim()) return null;
  if (cell.querySelector('h1, h2, h3, h4, h5, h6')) return null;
  return link;
}

function decorateVideo(cell, link) {
  const url = new URL(link.href, window.location.href);
  const text = link.textContent.trim();
  const title = text && text !== link.href && !text.startsWith('http') ? text : '';
  const playLabel = getMetadata('video-label-play') || DEFAULT_PLAY_LABEL;
  const poster = cell.querySelector('picture');

  const facade = document.createElement('div');
  facade.className = 'columns-alternating-video';
  if (poster) {
    poster.querySelector('img')?.setAttribute('alt', '');
    facade.append(poster);
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'columns-alternating-video-play';
  button.setAttribute('aria-label', title ? `${playLabel}: ${title}` : playLabel);
  const icon = document.createElement('span');
  icon.className = 'columns-alternating-video-play-icon';
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon);
  facade.append(button);

  button.addEventListener('click', () => {
    url.searchParams.set('autoplay', 'true');
    const iframe = document.createElement('iframe');
    iframe.src = url.href;
    iframe.title = title || playLabel;
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.loading = 'lazy';
    facade.replaceChildren(iframe);
    facade.classList.add('is-playing');
    iframe.focus();
  }, { once: true });

  cell.replaceChildren(facade);
  cell.classList.add('columns-alternating-video-col');
}

function markEyebrow(cell) {
  const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return;
  let prev = heading.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'P' && !prev.classList.contains('button-container')
      && !prev.querySelector('picture') && prev.textContent.trim()) {
      prev.classList.add('columns-alternating-eyebrow');
      return;
    }
    prev = prev.previousElementSibling;
  }
}

/** @param {Element} block */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-alternating-row');
    const cells = [...row.children];

    cells.forEach((cell) => {
      const pic = cell.querySelector('picture');
      const isImageOnly = pic && cell.textContent.trim() === '';
      const videoLink = isImageOnly ? null : findVideoLink(cell);
      if (isImageOnly) {
        cell.classList.add('columns-alternating-img-col');
      } else if (videoLink) {
        cell.classList.add('columns-alternating-img-col');
        decorateVideo(cell, videoLink);
      } else {
        cell.classList.add('columns-alternating-text-col');
        markEyebrow(cell);
      }
    });

    if (cells[0]?.classList.contains('columns-alternating-img-col')) {
      row.classList.add('columns-alternating-image-start');
    } else if (cells.some((cell) => cell.classList.contains('columns-alternating-img-col'))) {
      row.classList.add('columns-alternating-image-end');
    }
  });
}
