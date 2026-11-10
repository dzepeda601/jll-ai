import { createOptimizedPicture, getMetadata } from '../../scripts/aem.js';

/*
 * Split-slide carousel, based on the block library carousel.
 * - Each row is a slide: cell 1 media (image, or a link to an .mp4 video with
 *   an optional image used as the poster), cell 2 text (optional eyebrow
 *   paragraph, heading, description, CTA link).
 * - Prev/next buttons sit above the slides; one slide is shown at a time.
 * - Screen-reader labels can be overridden with page metadata
 *   (carousel-label-role-description, -previous, -next).
 */

const DEFAULT_LABELS = {
  'role-description': 'Carousel',
  previous: 'Previous slide',
  next: 'Next slide',
};

function getLabels() {
  return Object.fromEntries(Object.entries(DEFAULT_LABELS)
    .map(([key, fallback]) => [key, getMetadata(`carousel-label-${key}`) || fallback]));
}

function optimizePictures(scope) {
  scope.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt || '', false, [{ width: '900' }]));
  });
}

function decorateVideo(mediaCell) {
  const link = [...mediaCell.querySelectorAll('a[href]')]
    .find((a) => /\.mp4$/i.test(new URL(a.href, window.location.href).pathname));
  if (!link) return;
  const video = document.createElement('video');
  video.controls = true;
  video.preload = 'none';
  video.playsInline = true;
  const poster = mediaCell.querySelector('img');
  if (poster) video.poster = poster.currentSrc || poster.src;
  const source = document.createElement('source');
  source.src = link.href;
  source.type = 'video/mp4';
  video.append(source);
  if (link.textContent.trim() && link.textContent.trim() !== link.href) {
    video.setAttribute('aria-label', link.textContent.trim());
  }
  mediaCell.replaceChildren(video);
  mediaCell.classList.add('is-video');
}

let carouselCount = 0;

function updateActiveSlide(block, slideIndex) {
  block.dataset.activeSlide = slideIndex;
  block.querySelectorAll('.carousel-split-slide').forEach((slide, idx) => {
    const isActive = idx === slideIndex;
    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    slide.querySelectorAll('a, video').forEach((el) => {
      if (isActive) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
    if (!isActive) slide.querySelectorAll('video').forEach((video) => video.pause());
  });
}

function showSlide(block, slideIndex) {
  const slides = block.querySelectorAll('.carousel-split-slide');
  if (!slides.length) return;
  const index = (slideIndex + slides.length) % slides.length;
  block.querySelector('.carousel-split-slides').scrollTo({
    top: 0,
    left: slides[index].offsetLeft,
    behavior: 'smooth',
  });
  updateActiveSlide(block, index);
}

function bindEvents(block) {
  block.querySelector('.carousel-split-prev').addEventListener('click', () => {
    showSlide(block, Number(block.dataset.activeSlide) - 1);
  });
  block.querySelector('.carousel-split-next').addEventListener('click', () => {
    showSlide(block, Number(block.dataset.activeSlide) + 1);
  });

  const slides = [...block.querySelectorAll('.carousel-split-slide')];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(block, slides.indexOf(entry.target));
    });
  }, { threshold: 0.5 });
  slides.forEach((slide) => observer.observe(slide));
}

function createSlide(row, idx, id) {
  const slide = document.createElement('li');
  slide.className = 'carousel-split-slide';
  slide.id = `${id}-slide-${idx}`;

  const cells = [...row.children];
  const mediaCell = cells.length > 1 ? cells[0] : null;
  const contentCell = cells.length > 1 ? cells[1] : cells[0];

  if (mediaCell) {
    mediaCell.className = 'carousel-split-slide-media';
    decorateVideo(mediaCell);
    slide.append(mediaCell);
  }
  contentCell.className = 'carousel-split-slide-content';
  slide.append(contentCell);

  const heading = contentCell.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    const first = contentCell.firstElementChild;
    if (first && first !== heading && first.tagName === 'P'
      && !first.classList.contains('button-container') && first.textContent.trim()) {
      first.classList.add('carousel-split-slide-eyebrow');
    }
    heading.id = heading.id || `${slide.id}-title`;
    slide.setAttribute('aria-labelledby', heading.id);
  }

  const cta = [...contentCell.querySelectorAll('a[href]')].pop();
  const ctaParagraph = cta?.closest('p');
  if (ctaParagraph && ctaParagraph.textContent.trim() === cta.textContent.trim()) {
    ctaParagraph.classList.add('carousel-split-slide-cta');
    if (new URL(cta.href, window.location.href).origin !== window.location.origin) {
      cta.classList.add('is-external');
    }
  }

  return slide;
}

/** @param {Element} block */
export default function decorate(block) {
  carouselCount += 1;
  const id = `carousel-split-${carouselCount}`;
  block.id = id;
  const labels = getLabels();

  const rows = [...block.children].filter((row) => row.children.length);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', labels['role-description']);

  const slidesList = document.createElement('ul');
  slidesList.className = 'carousel-split-slides';
  rows.forEach((row, idx) => slidesList.append(createSlide(row, idx, id)));
  optimizePictures(slidesList);

  const children = [];
  if (rows.length > 1) {
    const buttons = document.createElement('div');
    buttons.className = 'carousel-split-navigation-buttons';
    [['carousel-split-prev', labels.previous], ['carousel-split-next', labels.next]]
      .forEach(([className, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.setAttribute('aria-label', label);
        buttons.append(button);
      });
    children.push(buttons);
  }
  children.push(slidesList);

  block.replaceChildren(...children);
  updateActiveSlide(block, 0);
  if (rows.length > 1) bindEvents(block);
}
