import { createOptimizedPicture, getMetadata } from '../../scripts/aem.js';

/*
 * Full-bleed hero carousel, based on the block library carousel.
 * - Each row is a slide: cell 1 image, cell 2 text (optional nav label
 *   paragraph, heading, description, CTA link).
 * - A short paragraph before the heading is used as the slide's label in the
 *   title navigator (and removed from the slide); otherwise the heading is used.
 * - An optional row with a single text cell (no image) is the navigator title.
 * - Screen-reader labels can be overridden with page metadata
 *   (carousel-label-role-description, -controls, -previous, -next, -show-slide).
 */

const DEFAULT_LABELS = {
  'role-description': 'Carousel',
  controls: 'Carousel slide controls',
  previous: 'Previous slide',
  next: 'Next slide',
  'show-slide': 'Show slide {index} of {total}',
};

function getLabels() {
  return Object.fromEntries(Object.entries(DEFAULT_LABELS)
    .map(([key, fallback]) => [key, getMetadata(`carousel-label-${key}`) || fallback]));
}

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img, idx) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', idx === 0, [{ media: '(min-width: 900px)', width: '2000' }, { width: '900' }]));
  });
}

let carouselCount = 0;

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;
  block.querySelectorAll('.carousel-hero-slide').forEach((slide, idx) => {
    const isActive = idx === slideIndex;
    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    slide.querySelectorAll('a, button').forEach((el) => {
      if (isActive) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });
  block.querySelectorAll('.carousel-hero-nav-item button').forEach((button, idx) => {
    if (idx === slideIndex) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

function showSlide(block, slideIndex) {
  const slides = block.querySelectorAll('.carousel-hero-slide');
  if (!slides.length) return;
  const index = (slideIndex + slides.length) % slides.length;
  block.querySelector('.carousel-hero-slides').scrollTo({
    top: 0,
    left: slides[index].offsetLeft,
    behavior: 'smooth',
  });
  updateActiveSlide(block, index);
}

function bindEvents(block) {
  block.querySelectorAll('.carousel-hero-nav-item button').forEach((button, idx) => {
    button.addEventListener('click', () => showSlide(block, idx));
  });
  block.querySelector('.carousel-hero-prev')?.addEventListener('click', () => {
    showSlide(block, Number(block.dataset.activeSlide) - 1);
  });
  block.querySelector('.carousel-hero-next')?.addEventListener('click', () => {
    showSlide(block, Number(block.dataset.activeSlide) + 1);
  });

  const slides = [...block.querySelectorAll('.carousel-hero-slide')];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(block, slides.indexOf(entry.target));
    });
  }, { threshold: 0.5 });
  slides.forEach((slide) => observer.observe(slide));
}

function createSlide(row, idx, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-hero-slide';
  slide.id = `${id}-slide-${idx}`;

  const cells = [...row.children];
  const imageCell = cells.find((cell) => cell.querySelector('picture')) || null;
  const contentCell = cells.find((cell) => cell !== imageCell) || document.createElement('div');
  if (imageCell) {
    imageCell.className = 'carousel-hero-slide-image';
    slide.append(imageCell);
  }
  contentCell.className = 'carousel-hero-slide-content';
  slide.append(contentCell);

  const heading = contentCell.querySelector('h1, h2, h3, h4, h5, h6');
  let label = heading?.textContent.trim() || '';
  const first = contentCell.firstElementChild;
  if (heading && first && first !== heading && first.tagName === 'P'
    && !first.classList.contains('button-container') && first.textContent.trim()) {
    label = first.textContent.trim();
    first.remove();
  }
  if (heading) {
    heading.id = heading.id || `${slide.id}-title`;
    slide.setAttribute('aria-labelledby', heading.id);
  }

  return { slide, label };
}

/** @param {Element} block */
export default function decorate(block) {
  carouselCount += 1;
  const id = `carousel-hero-${carouselCount}`;
  block.id = id;
  const labels = getLabels();

  const rows = [...block.children];
  const titleRow = rows.find((row) => row.children.length === 1 && !row.querySelector('picture'));
  const slideRows = rows.filter((row) => row !== titleRow);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', labels['role-description']);

  const container = document.createElement('div');
  container.className = 'carousel-hero-slides-container';
  const slidesList = document.createElement('ul');
  slidesList.className = 'carousel-hero-slides';
  container.append(slidesList);

  const navItems = [];
  slideRows.forEach((row, idx) => {
    const { slide, label } = createSlide(row, idx, id);
    slidesList.append(slide);
    navItems.push(label || labels['show-slide']
      .replace('{index}', idx + 1).replace('{total}', slideRows.length));
  });

  const children = [container];

  if (slideRows.length > 1) {
    const buttons = document.createElement('div');
    buttons.className = 'carousel-hero-navigation-buttons';
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-hero-prev';
    prev.setAttribute('aria-label', labels.previous);
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-hero-next';
    next.setAttribute('aria-label', labels.next);
    buttons.append(prev, next);
    container.append(buttons);

    const nav = document.createElement('nav');
    nav.className = 'carousel-hero-nav';
    nav.setAttribute('aria-label', labels.controls);

    if (titleRow) {
      const title = document.createElement('p');
      title.className = 'carousel-hero-nav-title';
      title.textContent = titleRow.textContent.trim();
      nav.append(title);
    }

    const list = document.createElement('ol');
    list.className = 'carousel-hero-nav-list';
    navItems.forEach((text, idx) => {
      const item = document.createElement('li');
      item.className = 'carousel-hero-nav-item';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-controls', `${id}-slide-${idx}`);
      button.textContent = text;
      item.append(button);
      list.append(item);
    });
    nav.append(list);
    children.push(nav);
  }

  optimizePictures(slidesList);
  block.replaceChildren(...children);
  updateActiveSlide(block, 0);
  if (slideRows.length > 1) bindEvents(block);
}
