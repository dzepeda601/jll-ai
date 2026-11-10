/*
 * Alternating image + text rows. Follows the local columns block: each row is
 * a flex row, a cell holding only a picture is the image column. The authored
 * cell order decides which side the image sits on at desktop widths, so authors
 * alternate rows by swapping cells. On small screens the image always comes first.
 */

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
      if (isImageOnly) {
        cell.classList.add('columns-alternating-img-col');
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
