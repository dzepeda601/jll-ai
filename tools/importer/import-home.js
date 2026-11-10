/* eslint-disable */
/* global WebImporter */

import carouselHeroParser from './parsers/carousel-hero.js';
import tabsStackedParser from './parsers/tabs-stacked.js';
import cardsEyebrowParser from './parsers/cards-eyebrow.js';
import columnsAlternatingParser from './parsers/columns-alternating.js';
import carouselSplitParser from './parsers/carousel-split.js';
import heroBannerParser from './parsers/hero-banner.js';
import cleanupTransformer from './transformers/jll-cleanup.js';
import sectionsTransformer from './transformers/jll-sections.js';

const PAGE_TEMPLATE = {
  "name": "home",
  "urls": [
    "https://www.jll.com/en-us/"
  ],
  "representativeUrl": "https://www.jll.com/en-us/",
  "description": "JLL homepage: spotlight hero carousel, expandable 'Explore a brighter way' panels with card sliders, alternating featured rows, 'More to explore' news carousel and a contact banner.",
  "urlPattern": "/*",
  "blocks": [
    {
      "name": "carousel-hero",
      "instances": [
        "div.carouselpanel",
        ".carousel-panel"
      ]
    },
    {
      "name": "tabs-stacked",
      "instances": [
        "div.accordion-carousel",
        "react-component[data-component=\"accordion-carousel\"]"
      ]
    },
    {
      "name": "cards-eyebrow",
      "instances": [
        "div.accordion-carousel .carousel-accordion-slide"
      ]
    },
    {
      "name": "columns-alternating",
      "instances": [
        "div.featuredcardlist",
        ".featured-card-list"
      ]
    },
    {
      "name": "carousel-split",
      "instances": [
        "div.carouselsingledouble .swiper",
        "div.carouselsingledouble"
      ]
    },
    {
      "name": "hero-banner",
      "instances": [
        "div.banner.aem-GridColumn"
      ]
    }
  ],
  "sections": [
    {
      "id": "section-1-hero-carousel",
      "name": "Spotlight stories hero carousel",
      "selector": [
        "div.carouselpanel"
      ],
      "style": null,
      "blocks": [
        "carousel-hero"
      ],
      "defaultContent": []
    },
    {
      "id": "section-2-explore",
      "name": "Explore a brighter way",
      "selector": [
        "div.bg-container div.accordion-carousel",
        "div.accordion-carousel"
      ],
      "style": "split",
      "blocks": [
        "tabs-stacked",
        "cards-eyebrow"
      ],
      "defaultContent": [
        "div.accordion-carousel h2",
        "div.accordion-carousel h2 + p"
      ]
    },
    {
      "id": "section-3-featured",
      "name": "Featured offerings",
      "selector": [
        "div.bg-container div.featuredcardlist",
        "div.featuredcardlist"
      ],
      "style": "beige",
      "blocks": [
        "columns-alternating"
      ],
      "defaultContent": []
    },
    {
      "id": "section-4-more-to-explore",
      "name": "More to explore",
      "selector": [
        "div.bg-container div.carouselsingledouble",
        "div.carouselsingledouble"
      ],
      "style": "beige-gradient",
      "blocks": [
        "carousel-split"
      ],
      "defaultContent": [
        "div.carouselsingledouble h2"
      ]
    },
    {
      "id": "section-5-contact-banner",
      "name": "Contact us today banner",
      "selector": [
        "div.banner.aem-GridColumn"
      ],
      "style": null,
      "blocks": [
        "hero-banner"
      ],
      "defaultContent": []
    }
  ]
};

const parsers = {
  'carousel-hero': carouselHeroParser,
  'tabs-stacked': tabsStackedParser,
  'cards-eyebrow': cardsEyebrowParser,
  'columns-alternating': columnsAlternatingParser,
  'carousel-split': carouselSplitParser,
  'hero-banner': heroBannerParser,
};
// Late transformers change the DOM (section <hr> markers, shared fragments), so their beforeTransform
// runs after block discovery.
const sectionTransformers = [sectionsTransformer];
const fragmentTransformers = [];
const lateTransformers = [...sectionTransformers, ...fragmentTransformers];
const transformers = [cleanupTransformer, ...lateTransformers];
const earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
// Catalog selectors (pageInstances, pageCleanup) count the <script> and <hr> elements the importer
// removes before transform, so a catalog template finds its targets in preprocess.
const CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));

function executeTransformers(hookName, element, payload, list = transformers) {
  const enhancedPayload = { ...payload, template: payload.params?.targets?.template || PAGE_TEMPLATE };
  list.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template, url) {
  const pageBlocks = [];
  const pageKey = (u) => {
    try { const { origin, pathname } = new URL(u); return `${origin}${pathname.replace(/\/$/, '')}`; }
    catch { return u; }
  };
  const key = pageKey(url);
  const claim = (blockDef, selector) => {
    let matches = [];
    try { matches = document.querySelectorAll(selector); } catch { return; }
    matches.forEach((element) => {
      if (pageBlocks.some((b) => b.element === element || b.element.contains(element) || element.contains(b.element))) return;
      pageBlocks.push({ name: blockDef.name, selector, element });
    });
  };
  template.blocks.forEach((blockDef) => {
    const entry = Object.entries(blockDef.pageInstances || {}).find(([u]) => pageKey(u) === key);
    (entry ? entry[1] : []).forEach((selector) => claim(blockDef, selector));
  });
  template.blocks.forEach((blockDef) => (blockDef.instances || []).forEach((selector) => claim(blockDef, selector)));
  return pageBlocks;
}

// Runs the early transformers, then marks each block and section target with an attribute: the
// importer re-creates the body before transform, so only attributes survive, not element references.
function markPageTargets(payload) {
  const { document, params } = payload;
  executeTransformers('beforeTransform', document.body, payload, earlyTransformers);
  const blocks = findBlocksOnPage(document, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
    element.setAttribute('data-excat-block', String(i));
    return { name, selector };
  });
  const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
    const target = (section.selector || []).map((s) => { try { return document.querySelector(s); } catch { return null; } }).find(Boolean);
    if (!target) return section;
    target.setAttribute('data-excat-section', String(i));
    return { ...section, selector: [`[data-excat-section="${i}"]`] };
  });
  params.targets = { blocks, template: { ...PAGE_TEMPLATE, sections } };
}

export default {
  preprocess: (payload) => {
    if (CATALOG) markPageTargets(payload);
  },
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;
    params.fragments = [];

    if (!params.targets) markPageTargets(payload);
    const pageBlocks = params.targets.blocks
      .map((block, i) => ({ ...block, element: document.querySelector(`[data-excat-block="${i}"]`) }))
      .filter((block) => block.element);
    executeTransformers('beforeTransform', main, { ...payload, pageBlocks }, lateTransformers);

    pageBlocks.forEach((block) => {
      if (!main.contains(block.element)) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // A fragment's nodes left `main` before afterTransform: finalize it the same way, without the
    // page-only section breaks and metadata.
    params.fragments.forEach(({ element }) => {
      executeTransformers('afterTransform', element, payload, earlyTransformers);
      WebImporter.rules.transformBackgroundImages(element, document);
      WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
    });

    // A folder URL (trailing slash, e.g. /en-us/) maps to that folder's index document.
    const { pathname } = new URL(params.originalURL);
    const rawPath = (pathname.endsWith('/') ? `${pathname}index` : pathname).replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }, ...params.fragments];
  },
};
