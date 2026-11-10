/*
 * Contained promo banner with a background image and a centered heading.
 * Follows the local hero block (image row + text row) and makes the whole
 * banner clickable through its CTA link, which renders as an arrow icon and
 * keeps its authored text as the accessible name.
 */

/** @param {Element} block */
export default function decorate(block) {
  const rows = [...block.children];
  const picture = block.querySelector('picture');
  const imageRow = picture ? rows.find((row) => row.contains(picture)) : null;

  if (imageRow) {
    imageRow.classList.add('hero-banner-image');
    // Keep only the picture in the image row when it shares a row with text
    const pictureCell = [...imageRow.children].find((cell) => cell.contains(picture));
    const otherCells = [...imageRow.children].filter((cell) => cell !== pictureCell);
    if (otherCells.length) {
      const textRow = document.createElement('div');
      textRow.append(...otherCells);
      imageRow.after(textRow);
    }
  } else {
    block.classList.add('no-image');
  }

  const textRow = [...block.children].find((row) => row !== imageRow);
  if (!textRow) return;
  textRow.classList.add('hero-banner-content');

  const heading = textRow.querySelector('h1, h2, h3, h4, h5, h6');
  const links = [...textRow.querySelectorAll('a[href]')];
  const cta = links[links.length - 1];
  if (!cta) return;

  block.classList.add('is-linked');
  const container = cta.closest('p') || cta.parentElement;
  container.classList.remove('button-container');
  container.classList.add('hero-banner-cta');
  cta.classList.remove('button', 'primary', 'secondary');
  cta.classList.add('hero-banner-cta-link');

  const text = cta.textContent.trim();
  if (heading && (!text || text === cta.href)) cta.setAttribute('aria-label', heading.textContent.trim());

  const label = document.createElement('span');
  label.className = 'hero-banner-cta-label';
  label.append(...cta.childNodes);
  const icon = document.createElement('span');
  icon.className = 'hero-banner-cta-icon';
  icon.setAttribute('aria-hidden', 'true');
  cta.append(label, icon);
}
