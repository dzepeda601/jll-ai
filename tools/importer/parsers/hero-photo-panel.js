/* eslint-disable */
/* global WebImporter */

/**
 * Parser: hero-photo-panel (JLL jumppoint "Our fields of expertise" and the people banner).
 *
 * Sources (preferred input is data-config, rendered DOM as fallback):
 *   div.jumppoint > react-component[data-component="jumppoint"]
 *     { title, description, imagePath, imageAltText, destinations: [ { title, url } ] }
 *   div.banner (bannerType "people") > react-component[data-component="banner"]
 *     { peopleTitle, peopleDescription, peopleCTATitle, peopleCTAUrl, imagePath, imageAltText,
 *       peopleList: [ { firstName, lastName, jobTitle, photo, imageAlt, linkedin } ] }
 *
 * Block contract (blocks/hero-photo-panel/README.md):
 *   row 1: image
 *   row 2: panel content: H2, optional paragraph, bulleted list of links;
 *          people banner: cell 1 H2 + paragraph, one extra cell per person
 *          (portrait, H3 name, job title, LinkedIn link, profile link)
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
  return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtml(document, str) {
  const div = document.createElement('div');
  if (!str) return div;
  div.innerHTML = String(str);
  if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
  div.querySelectorAll('script, style').forEach((n) => n.remove());
  return div;
}

function readConfig(root, component) {
  const sel = `react-component[data-component="${component}"]`;
  const rc = root.matches(sel) ? root : root.querySelector(`${sel}[data-config]`);
  if (!rc) return null;
  try {
    return JSON.parse(rc.getAttribute('data-config') || 'null');
  } catch (e) {
    return null;
  }
}

function richParagraphs(document, container) {
  const out = [];
  const blocks = [...container.querySelectorAll('p, ul, ol')].filter((n) => !n.parentElement.closest('p, ul, ol'));
  const sources = blocks.length ? blocks : (clean(container.textContent) ? [container] : []);
  sources.forEach((src) => {
    const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : 'p';
    const node = document.createElement(tag);
    node.innerHTML = src.innerHTML;
    node.querySelectorAll('span, font, div').forEach((n) => n.replaceWith(...n.childNodes));
    node.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((attr) => {
        if (!(n.tagName === 'A' && attr.name === 'href')) n.removeAttribute(attr.name);
      });
      if (n.tagName === 'A') n.setAttribute('href', absUrl(n.getAttribute('href')));
    });
    if (clean(node.textContent)) out.push(node);
  });
  return out;
}

function makeImage(document, src, alt) {
  if (!src) return null;
  const img = document.createElement('img');
  img.src = absUrl(src);
  img.alt = clean(alt);
  return img;
}

function linkPara(document, href, label) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = absUrl(href);
  a.textContent = clean(label) || a.href;
  p.append(a);
  return p;
}

/** Photo from config, else the first rendered image outside a person card. */
function photo(document, root, cfg) {
  if (cfg.imagePath) return makeImage(document, cfg.imagePath, cfg.imageAltText);
  // a people banner without a banner image shows no photo (its only images are portraits)
  if (cfg.bannerType === 'people') return null;
  const img = root.querySelector('img');
  return img ? makeImage(document, img.getAttribute('src'), img.getAttribute('alt')) : null;
}

function jumppointRows(document, root, cfg) {
  const panel = [];
  const renderedTitle = root.querySelector('h2');
  const title = clean(decodeHtml(document, cfg.title).textContent) || clean(renderedTitle && renderedTitle.textContent);
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    panel.push(h2);
  }
  panel.push(...richParagraphs(document, decodeHtml(document, cfg.description)));

  let destinations = (cfg.destinations || []).map((d) => ({ label: clean(d.title), url: d.url }));
  if (!destinations.length) {
    destinations = [...root.querySelectorAll('a[href]')].map((a) => ({
      label: clean(a.textContent.replace(/chevron_right/g, '')),
      url: a.getAttribute('href'),
    }));
  }
  const ul = document.createElement('ul');
  destinations.filter((d) => d.url && d.label).forEach((d) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = absUrl(d.url);
    a.textContent = d.label;
    li.append(a);
    ul.append(li);
  });
  if (ul.children.length) panel.push(ul);
  return [panel];
}

function personCell(document, root, person, landing = false) {
  const name = clean(`${person.firstName || ''} ${person.lastName || ''}`);
  const cell = [];
  const portrait = makeImage(document, person.photo, person.imageAlt || name);
  if (portrait) cell.push(portrait);
  if (name) {
    const h3 = document.createElement('h3');
    h3.textContent = name;
    cell.push(h3);
  }
  if (clean(person.jobTitle)) {
    const p = document.createElement('p');
    p.textContent = clean(person.jobTitle);
    cell.push(p);
  }
  if (person.linkedin) {
    // the rendered LinkedIn link is icon-only; its aria-label holds the service name
    const pinned = [...root.querySelectorAll('[data-excat-href]')]
      .find((n) => n.getAttribute('data-excat-href') === person.linkedin);
    const aria = pinned ? pinned.getAttribute('data-excat-label') || '' : '';
    const label = aria.split(',').map(clean).find((part) => /linkedin/i.test(part)) || 'LinkedIn';
    cell.push(linkPara(document, person.linkedin, label));
  }
  // profile link: rendered text link next to the person's name
  const profile = [...root.querySelectorAll('a[href]')].find((a) => {
    const aria = a.getAttribute('aria-label') || '';
    // service-landing / service-detail: skip the person's icon-only email / phone links ("mail", "call")
    if (landing && /^(mailto|tel):/i.test(a.getAttribute('href') || '')) return false;
    return name && aria.includes(name) && !/linkedin/i.test(aria) && clean(a.textContent);
  });
  if (profile) cell.push(linkPara(document, profile.getAttribute('href'), profile.textContent));
  return cell;
}

/**
 * Service landing pages: shifting image links banner (bannerType "shiftingImageLinks"),
 *   { links: [ { button: { label, url }, image: { file, imageAlt } } ] }
 * -> the first link's image (the rest only swap in on hover) and a list of links.
 * The rendered H2 ("Content links") is visually hidden on the source, so it is dropped.
 */
function shiftingLinkRows(document, root, cfg) {
  let links = (cfg.links || []).map((l) => ({ label: clean(l.button && l.button.label), url: l.button && l.button.url }));
  if (!links.length) {
    links = [...root.querySelectorAll('li a[href]')].map((a) => ({
      label: clean(a.textContent.replace(/arrow_forward/g, '')),
      url: a.getAttribute('href'),
    }));
  }
  const ul = document.createElement('ul');
  links.filter((l) => l.url && l.label).forEach((l) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = absUrl(l.url);
    a.textContent = l.label;
    li.append(a);
    ul.append(li);
  });
  return ul.children.length ? [[ul]] : [[]];
}

function shiftingLinkImage(document, root, cfg) {
  const first = (cfg.links || []).find((l) => l.image && l.image.file);
  if (first) return makeImage(document, first.image.file, cfg.imageDecorative ? '' : first.image.imageAlt);
  const img = root.querySelector('img');
  return img ? makeImage(document, img.getAttribute('src'), img.getAttribute('alt')) : null;
}

function peopleRows(document, root, cfg, landing = false) {
  const panel = [];
  const title = clean(decodeHtml(document, cfg.peopleTitle).textContent);
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    panel.push(h2);
  }
  panel.push(...richParagraphs(document, decodeHtml(document, cfg.peopleDescription)));
  if (cfg.peopleCTAUrl) panel.push(linkPara(document, cfg.peopleCTAUrl, cfg.peopleCTATitle));
  if (cfg.seeMoreExpertsCTAUrl) panel.push(linkPara(document, cfg.seeMoreExpertsCTAUrl, cfg.seeMoreExpertsCTATitle));
  const people = (cfg.peopleList || []).map((person) => personCell(document, root, person, landing)).filter((c) => c.length);
  return [panel, ...people];
}

export default function parse(element, { document, params }) {
  // the profile-link fix (skip mailto / tel icon links) applies to these templates only
  const templateName = params && params.targets && params.targets.template && params.targets.template.name;
  const landing = templateName === 'service-landing' || templateName === 'service-detail';
  const root = element.closest('div.jumppoint, div.banner') || element;
  if (!root.parentNode) return;

  let cfg = readConfig(root, 'jumppoint');
  let row;
  if (cfg || root.matches('div.jumppoint')) {
    cfg = cfg || {};
    row = jumppointRows(document, root, cfg);
  } else {
    cfg = readConfig(root, 'banner') || {};
    if (cfg.bannerType === 'shiftingImageLinks') {
      row = shiftingLinkRows(document, root, cfg);
    } else {
      if (cfg.bannerType && cfg.bannerType !== 'people') return;
      row = peopleRows(document, root, cfg, landing);
    }
  }
  if (!row.some((cell) => cell.length)) return;

  const cells = [];
  const image = cfg.bannerType === 'shiftingImageLinks' ? shiftingLinkImage(document, root, cfg) : photo(document, root, cfg);
  if (image) cells.push([image]);
  cells.push(row);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-photo-panel', cells });
  root.replaceWith(block);
}
