/*
 * Stat tiles, based on the local cards block (one row per card, rendered as
 * ul > li). Each row holds a stat value and its label, either in one cell
 * (value paragraph first, label below) or in two cells (value | label).
 * The first text element becomes the value; the rest is the label.
 * `small` option: text tiles. A heading (if any) is the tile title, styled
 * smaller than a figure; a tile may hold only the label.
 */

const HEADINGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

/** @param {Element} block */
export default function decorate(block) {
  const ul = document.createElement('ul');
  const isSmall = block.classList.contains('small');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-stats-card';
    const nodes = [...row.children].flatMap((cell) => {
      const kids = [...cell.children];
      if (kids.length) return kids;
      // plain text cell: wrap it in a paragraph
      if (!cell.textContent.trim()) return [];
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      return [p];
    });

    const filled = nodes.filter((el) => el.textContent.trim());
    if (!filled.length) return;
    const value = isSmall ? filled.find((el) => HEADINGS.includes(el.tagName)) : filled[0];
    if (value) {
      value.classList.add('cards-stats-value');
      li.append(value);
    }
    filled.filter((el) => el !== value).forEach((el) => {
      el.classList.add('cards-stats-label');
      li.append(el);
    });
    ul.append(li);
  });

  block.replaceChildren(ul);
}
