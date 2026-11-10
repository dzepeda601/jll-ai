/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // tools/importer/parsers/carousel-hero.js
  var ORIGIN = "https://www.jll.com";
  function absUrl(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN).href;
    } catch (e) {
      return value;
    }
  }
  function clean(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeText(document2, str) {
    if (!str) return "";
    const div = document2.createElement("div");
    div.innerHTML = String(str);
    let text = div.textContent;
    if (/<[a-z/]/i.test(text)) {
      div.innerHTML = text;
      text = div.textContent;
    }
    return clean(text);
  }
  function linkText(a) {
    const copy = a.cloneNode(true);
    copy.querySelectorAll("span").forEach((span) => {
      if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean(span.textContent))) span.remove();
    });
    return clean(copy.textContent);
  }
  function readConfig(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function createImage(document2, src, alt) {
    if (!src) return null;
    const img = document2.createElement("img");
    img.src = absUrl(src);
    img.alt = clean(alt);
    return img;
  }
  function createCta(document2, label, url) {
    const text = clean(label);
    if (!text && !url) return null;
    const p = document2.createElement("p");
    if (url) {
      const a = document2.createElement("a");
      a.href = absUrl(url);
      a.textContent = text || absUrl(url);
      p.append(a);
    } else {
      p.textContent = text;
    }
    return p;
  }
  function buildSlideRow(document2, slide, idx) {
    const imageCell = createImage(document2, slide.image, slide.alt) || "";
    const content = [];
    const heading = clean(slide.heading);
    const label = clean(slide.label);
    if (label && heading && label !== heading) {
      const p = document2.createElement("p");
      p.textContent = label;
      content.push(p);
    }
    if (heading) {
      const h = document2.createElement(idx === 0 ? "h1" : "h2");
      h.textContent = heading;
      content.push(h);
    }
    const cta = createCta(document2, slide.ctaLabel, slide.ctaUrl);
    if (cta) content.push(cta);
    return [imageCell, content];
  }
  function slidesFromConfig(document2, config) {
    if (!config || !Array.isArray(config.panels) || !config.panels.length) return null;
    return {
      title: decodeText(document2, config.title),
      slides: config.panels.map((panel) => ({
        image: panel.image && panel.image.imagePath,
        alt: panel.image && panel.image.imageAltText || "",
        heading: decodeText(document2, panel.title),
        label: decodeText(document2, panel.navigation && panel.navigation.title),
        ctaLabel: decodeText(document2, panel.cta && panel.cta.label),
        ctaUrl: panel.cta && panel.cta.url
      }))
    };
  }
  function slidesFromDom(root) {
    const slideEls = [...root.querySelectorAll(".carousel-panel__swiper .swiper-slide")].filter((el3) => !el3.classList.contains("swiper-slide-duplicate"));
    if (!slideEls.length) return null;
    const firstNav = root.querySelector(".carousel-panel__navigation");
    const titleEl = firstNav && firstNav.querySelector("h1, h2, h3, h4, h5, h6");
    const navLabels = firstNav ? [...firstNav.querySelectorAll("nav li")].map((li) => clean(li.textContent)) : [];
    return {
      title: titleEl ? clean(titleEl.textContent) : "",
      slides: slideEls.map((el3, idx) => {
        const tile = el3.querySelector(".carousel-panel-tile") || el3;
        const img = tile.querySelector("img");
        const heading = tile.querySelector("h1, h2, h3, h4, h5, h6");
        const link = tile.querySelector("a[href]");
        return {
          image: img && (img.getAttribute("src") || img.src),
          alt: img ? img.getAttribute("alt") || "" : "",
          heading: heading ? heading.textContent : "",
          label: navLabels[idx] || "",
          ctaLabel: link ? linkText(link) : "",
          ctaUrl: link ? link.getAttribute("href") : ""
        };
      })
    };
  }
  function parse(element, { document: document2 }) {
    const root = element.closest("div.carouselpanel") || element;
    if (!root.parentNode) return;
    const data = slidesFromConfig(document2, readConfig(root, "carouselpanel")) || slidesFromDom(root);
    if (!data || !data.slides.length) return;
    const cells = [];
    if (data.title) cells.push([data.title]);
    data.slides.forEach((slide, idx) => cells.push(buildSlideRow(document2, slide, idx)));
    const block = WebImporter.Blocks.createBlock(document2, { name: "carousel-hero", cells });
    root.replaceWith(block);
  }

  // tools/importer/parsers/tabs-stacked.js
  var ORIGIN2 = "https://www.jll.com";
  function absUrl2(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN2).href;
    } catch (e) {
      return value;
    }
  }
  function clean2(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeText2(document2, str) {
    if (!str) return "";
    const div = document2.createElement("div");
    div.innerHTML = String(str);
    let text = div.textContent;
    if (/<[a-z/]/i.test(text)) {
      div.innerHTML = text;
      text = div.textContent;
    }
    return clean2(text);
  }
  function toKebab(text) {
    return clean2(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function readConfig2(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function el(document2, tag, text) {
    const node = document2.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function panelsFromConfig(document2, config) {
    const multi = config && config.multiItem;
    if (!multi || !Array.isArray(multi.singleItemList) || !multi.singleItemList.length) return null;
    return {
      title: decodeText2(document2, multi.title),
      description: decodeText2(document2, multi.description),
      panels: multi.singleItemList.map((item) => ({
        title: decodeText2(document2, item.title),
        description: decodeText2(document2, item.description),
        tiles: (item.tiles || []).map((tile) => ({
          image: tile.imageUrl || "",
          alt: tile.imageDecorative ? "" : decodeText2(document2, tile.imageAlt),
          eyebrow: decodeText2(document2, tile.eyebrow),
          title: decodeText2(document2, tile.title),
          description: decodeText2(document2, tile.description),
          link: tile.ctaLink || "",
          linkText: decodeText2(document2, tile.ariaLabel)
        }))
      }))
    };
  }
  function panelsFromDom(root) {
    const navButtons = [...root.querySelectorAll(".carousel-navigation-wrapper nav button")];
    const slides = [...root.querySelectorAll(".swiper-slide")].filter((s) => !s.classList.contains("swiper-slide-duplicate"));
    if (!navButtons.length && !slides.length) return null;
    const count = Math.max(navButtons.length, slides.length);
    const panels = [];
    for (let i = 0; i < count; i += 1) {
      const btn = navButtons[i];
      const labelEl = btn && (btn.querySelector('span[id$="-label"]') || btn.querySelector("span"));
      const slide = slides[i];
      const tiles = [];
      if (slide) {
        const row = slide.querySelector(".carousel-accordion-slide");
        const cols = row ? [...row.children] : [];
        cols.forEach((col) => {
          const card = col.querySelector(".carousel-accordion-card");
          if (!card) return;
          const img = col.querySelector("img");
          const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
          const paras = [...card.querySelectorAll("p")];
          const eyebrow = paras.find((p) => heading && p.compareDocumentPosition(heading) & 4);
          const desc = paras.find((p) => heading && heading.compareDocumentPosition(p) & 4);
          const link = card.querySelector("a[href]");
          tiles.push({
            image: img ? img.getAttribute("src") || "" : "",
            alt: img ? img.getAttribute("alt") || "" : "",
            eyebrow: eyebrow ? clean2(eyebrow.textContent) : "",
            title: heading ? clean2(heading.textContent) : "",
            description: desc ? clean2(desc.textContent) : "",
            link: link ? link.getAttribute("href") : "",
            linkText: link ? clean2(link.getAttribute("aria-label")) : ""
          });
        });
      }
      panels.push({
        title: labelEl ? clean2(labelEl.textContent) : `Tab ${i + 1}`,
        description: "",
        tiles
      });
    }
    return { title: "", description: "", panels };
  }
  function buildCardsBlock(document2, tiles) {
    const cells = tiles.map((tile) => {
      let imageCell = "";
      if (tile.image) {
        const img = document2.createElement("img");
        img.src = absUrl2(tile.image);
        img.alt = tile.alt || "";
        imageCell = img;
      }
      const content = [];
      if (tile.eyebrow) content.push(el(document2, "p", tile.eyebrow));
      if (tile.title) content.push(el(document2, "h3", tile.title));
      if (tile.description) content.push(el(document2, "p", tile.description));
      if (tile.link) {
        const p = document2.createElement("p");
        const a = el(document2, "a", tile.linkText || "Read more");
        a.href = absUrl2(tile.link);
        p.append(a);
        content.push(p);
      }
      return [imageCell, content];
    });
    return WebImporter.Blocks.createBlock(document2, { name: "cards-eyebrow", cells });
  }
  function parse2(element, { document: document2 }) {
    const root = element.closest("div.accordion-carousel") || element;
    if (!root.parentNode) return;
    const data = panelsFromConfig(document2, readConfig2(root, "accordion-carousel")) || panelsFromDom(root);
    if (!data || !data.panels.length) return;
    const nodes = [];
    const headingEl = root.querySelector(".carousel-navigation-wrapper h2, h2");
    const headingText = headingEl ? clean2(headingEl.textContent) : data.title;
    let introText = data.description;
    if (headingEl) {
      const next = headingEl.nextElementSibling;
      if (next && next.tagName === "P" && clean2(next.textContent)) introText = clean2(next.textContent);
    }
    if (headingText) nodes.push(el(document2, "h2", headingText));
    if (introText) nodes.push(el(document2, "p", introText));
    const cells = [];
    const block = WebImporter.Blocks.createBlock(document2, { name: "tabs-stacked", cells });
    nodes.push(block);
    const usedIds = /* @__PURE__ */ new Set();
    data.panels.forEach((panel, idx) => {
      nodes.push(document2.createElement("hr"));
      if (panel.description) nodes.push(el(document2, "p", panel.description));
      if (panel.tiles.length) nodes.push(buildCardsBlock(document2, panel.tiles));
      const title = panel.title || `Tab ${idx + 1}`;
      let id = toKebab(title) || `tab-${idx + 1}`;
      while (usedIds.has(id)) id = `${id}-${idx + 1}`;
      usedIds.add(id);
      nodes.push(WebImporter.Blocks.createBlock(document2, {
        name: "Section Metadata",
        cells: [["Tab ID", id], ["Tab Title", title]]
      }));
    });
    root.replaceWith(...nodes);
  }

  // tools/importer/parsers/cards-eyebrow.js
  var ORIGIN3 = "https://www.jll.com";
  function absUrl3(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN3).href;
    } catch (e) {
      return value;
    }
  }
  function clean3(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function el2(document2, tag, text) {
    const node = document2.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function cardRow(document2, col) {
    const card = col.querySelector(".carousel-accordion-card") || col;
    const img = col.querySelector("img");
    const heading = card.querySelector("h1, h2, h3, h4, h5, h6");
    const paras = [...card.querySelectorAll("p")];
    const eyebrow = heading ? paras.find((p) => p.compareDocumentPosition(heading) & 4) : null;
    const desc = heading ? paras.find((p) => heading.compareDocumentPosition(p) & 4) : paras[0];
    const link = card.querySelector("a[href]");
    let imageCell = "";
    if (img && img.getAttribute("src")) {
      const image = document2.createElement("img");
      image.src = absUrl3(img.getAttribute("src"));
      image.alt = img.getAttribute("alt") || "";
      imageCell = image;
    }
    const content = [];
    if (eyebrow && clean3(eyebrow.textContent)) content.push(el2(document2, "p", clean3(eyebrow.textContent)));
    if (heading) content.push(el2(document2, "h3", clean3(heading.textContent)));
    if (desc && clean3(desc.textContent)) content.push(el2(document2, "p", clean3(desc.textContent)));
    if (link) {
      const p = document2.createElement("p");
      const a = el2(document2, "a", clean3(link.getAttribute("aria-label")) || "Read more");
      a.href = absUrl3(link.getAttribute("href"));
      p.append(a);
      content.push(p);
    }
    return content.length ? [imageCell, content] : null;
  }
  function parse3(element, { document: document2 }) {
    if (!element.parentNode) return;
    if (element.closest('div.accordion-carousel, react-component[data-component="accordion-carousel"]')) return;
    const slide = element.matches(".carousel-accordion-slide") ? element : element.querySelector(".carousel-accordion-slide") || element;
    const cols = [...slide.children].filter((c) => c.querySelector(".carousel-accordion-card, h1, h2, h3, h4, h5, h6"));
    const cells = cols.map((col) => cardRow(document2, col)).filter(Boolean);
    if (!cells.length) return;
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards-eyebrow", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-alternating.js
  var ORIGIN4 = "https://www.jll.com";
  function absUrl4(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN4).href;
    } catch (e) {
      return value;
    }
  }
  function clean4(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeHtml(document2, str) {
    const div = document2.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function richParagraphs(document2, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol")].filter((n) => !n.parentElement.closest("p, ul, ol"));
    const sources = blocks.length ? blocks : clean4(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      const node = document2.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span").forEach((span) => span.replaceWith(...span.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl4(n.getAttribute("href")));
      });
      if (clean4(node.textContent)) out.push(node);
    });
    return out;
  }
  function readConfig3(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function visibleText(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll("span").forEach((span) => {
      if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean4(span.textContent))) span.remove();
    });
    return clean4(copy.textContent);
  }
  function cardsFromConfig(document2, config) {
    if (!config || !Array.isArray(config.featuredCards) || !config.featuredCards.length) return null;
    const imageFirst = config.firstCardAssetAlignment !== "right";
    return config.featuredCards.map((card, idx) => ({
      image: card.image && card.image.imageUrl,
      alt: card.image && card.image.imageAlt || "",
      eyebrow: clean4(decodeHtml(document2, card.eyebrow).textContent),
      title: clean4(decodeHtml(document2, card.title).textContent),
      description: richParagraphs(document2, decodeHtml(document2, card.description)),
      links: (card.links || []).map((l) => ({ label: clean4(decodeHtml(document2, l.label).textContent), url: l.url })),
      imageFirst: idx % 2 === 0 ? imageFirst : !imageFirst
    }));
  }
  function cardsFromDom(document2, root) {
    const articles = [...root.querySelectorAll("article.featured-card, .featured-card")].filter((a, i, arr) => !arr.some((o) => o !== a && o.contains(a)));
    if (!articles.length) return null;
    return articles.map((article) => {
      const img = article.querySelector(".featured-card__media-container img, img");
      const eyebrow = article.querySelector(".featured-card__eyebrow");
      const heading = article.querySelector(".featured-card__title, h1, h2, h3");
      const desc = article.querySelector(".featured-card__description");
      const row = article.querySelector(".featured-card__row");
      const flipped = row && (row.classList.contains("featured-card__flipped") || row.classList.contains("flex-row-reverse"));
      const links = [...article.querySelectorAll(".featured-card__link")].map((wrap) => {
        const a = wrap.querySelector("a[href]");
        return { label: visibleText(a || wrap), url: a ? a.getAttribute("href") : "" };
      });
      return {
        image: img && img.getAttribute("src"),
        alt: img ? img.getAttribute("alt") || "" : "",
        eyebrow: eyebrow ? clean4(eyebrow.textContent) : "",
        title: heading ? clean4(heading.textContent) : "",
        description: desc ? richParagraphs(document2, desc) : [],
        links,
        imageFirst: !flipped
      };
    });
  }
  function buildRow(document2, card) {
    let imageCell = "";
    if (card.image) {
      const img = document2.createElement("img");
      img.src = absUrl4(card.image);
      img.alt = card.alt;
      imageCell = img;
    }
    const text = [];
    if (card.eyebrow) {
      const p = document2.createElement("p");
      p.textContent = card.eyebrow;
      text.push(p);
    }
    if (card.title) {
      const h2 = document2.createElement("h2");
      h2.textContent = card.title;
      text.push(h2);
    }
    text.push(...card.description);
    card.links.forEach((link) => {
      if (!link.label && !link.url) return;
      const p = document2.createElement("p");
      if (link.url) {
        const a = document2.createElement("a");
        a.href = absUrl4(link.url);
        a.textContent = link.label || absUrl4(link.url);
        p.append(a);
      } else {
        p.textContent = link.label;
      }
      text.push(p);
    });
    return card.imageFirst ? [imageCell, text] : [text, imageCell];
  }
  function parse4(element, { document: document2 }) {
    const root = element.closest("div.featuredcardlist") || element;
    if (!root.parentNode) return;
    const cards = cardsFromConfig(document2, readConfig3(root, "featuredcardlist")) || cardsFromDom(document2, root);
    if (!cards || !cards.length) return;
    const cells = cards.map((card) => buildRow(document2, card));
    const block = WebImporter.Blocks.createBlock(document2, { name: "columns-alternating", cells });
    root.replaceWith(block);
  }

  // tools/importer/parsers/carousel-split.js
  var ORIGIN5 = "https://www.jll.com";
  function absUrl5(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN5).href;
    } catch (e) {
      return value;
    }
  }
  function clean5(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeHtml2(document2, str) {
    const div = document2.createElement("div");
    if (!str) return div;
    div.innerHTML = String(str);
    if (/<[a-z/]/i.test(div.textContent)) div.innerHTML = div.textContent;
    div.querySelectorAll("script, style").forEach((n) => n.remove());
    return div;
  }
  function richParagraphs2(document2, container) {
    const out = [];
    const blocks = [...container.querySelectorAll("p, ul, ol")].filter((n) => !n.parentElement.closest("p, ul, ol"));
    const sources = blocks.length ? blocks : clean5(container.textContent) ? [container] : [];
    sources.forEach((src) => {
      const tag = /^(UL|OL)$/.test(src.tagName) ? src.tagName.toLowerCase() : "p";
      const node = document2.createElement(tag);
      node.innerHTML = src.innerHTML;
      node.querySelectorAll("span").forEach((span) => span.replaceWith(...span.childNodes));
      node.querySelectorAll("*").forEach((n) => {
        [...n.attributes].forEach((attr) => {
          if (!(n.tagName === "A" && attr.name === "href")) n.removeAttribute(attr.name);
        });
        if (n.tagName === "A") n.setAttribute("href", absUrl5(n.getAttribute("href")));
      });
      if (clean5(node.textContent)) out.push(node);
    });
    return out;
  }
  function visibleText2(node) {
    const copy = node.cloneNode(true);
    copy.querySelectorAll("span").forEach((span) => {
      if (!span.children.length && /^[a-z]+(_[a-z]+)*$/.test(clean5(span.textContent))) span.remove();
    });
    return clean5(copy.textContent);
  }
  function readConfig4(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function slidesFromConfig2(document2, config) {
    if (!config || !Array.isArray(config.tiles) || !config.tiles.length) return null;
    return {
      title: clean5(decodeHtml2(document2, config.title).textContent),
      slides: config.tiles.map((tile) => ({
        image: tile.imageUrl || "",
        alt: tile.carouselNotDecorativeImage ? clean5(decodeHtml2(document2, tile.imageAlt || tile.title).textContent) : "",
        eyebrow: clean5(decodeHtml2(document2, tile.eyebrow).textContent),
        title: clean5(decodeHtml2(document2, tile.title).textContent),
        description: richParagraphs2(document2, decodeHtml2(document2, tile.description)),
        ctaLabel: clean5(decodeHtml2(document2, tile.ctaTitle).textContent),
        ctaUrl: tile.ctaLink || ""
      }))
    };
  }
  function slidesFromDom2(document2, root) {
    const slideEls = [...root.querySelectorAll(".swiper-wrapper > .swiper-slide")].filter((s) => !s.classList.contains("swiper-slide-duplicate"));
    if (!slideEls.length) return null;
    const titleEl = [...root.querySelectorAll("h2")].find((h) => !h.closest(".swiper-slide"));
    return {
      title: titleEl ? clean5(titleEl.textContent) : "",
      slides: slideEls.map((slide) => {
        const img = slide.querySelector("img");
        const heading = slide.querySelector("h1, h2, h3, h4, h5, h6");
        const eyebrow = heading && heading.previousElementSibling && heading.previousElementSibling.tagName === "P" ? heading.previousElementSibling : null;
        const desc = heading ? heading.nextElementSibling : null;
        const links = [...slide.querySelectorAll("a[href]")].filter((a) => !desc || !desc.contains(a));
        const cta = links[links.length - 1];
        return {
          image: img ? img.getAttribute("src") || "" : "",
          alt: img ? img.getAttribute("alt") || "" : "",
          eyebrow: eyebrow ? clean5(eyebrow.textContent) : "",
          title: heading ? clean5(heading.textContent) : "",
          description: desc ? richParagraphs2(document2, desc) : [],
          ctaLabel: cta ? visibleText2(cta) : "",
          ctaUrl: cta ? cta.getAttribute("href") : ""
        };
      })
    };
  }
  function buildRow2(document2, slide) {
    let media = "";
    if (slide.image) {
      const img = document2.createElement("img");
      img.src = absUrl5(slide.image);
      img.alt = slide.alt || "";
      media = img;
    }
    const content = [];
    if (slide.eyebrow) {
      const p = document2.createElement("p");
      p.textContent = slide.eyebrow;
      content.push(p);
    }
    if (slide.title) {
      const h3 = document2.createElement("h3");
      h3.textContent = slide.title;
      content.push(h3);
    }
    content.push(...slide.description);
    if (slide.ctaUrl || slide.ctaLabel) {
      const p = document2.createElement("p");
      if (slide.ctaUrl) {
        const a = document2.createElement("a");
        a.href = absUrl5(slide.ctaUrl);
        a.textContent = slide.ctaLabel || "Read more";
        p.append(a);
      } else {
        p.textContent = slide.ctaLabel;
      }
      content.push(p);
    }
    return [media, content];
  }
  function parse5(element, { document: document2 }) {
    if (!element.parentNode) return;
    if (element.querySelector("table") && !element.querySelector(".swiper-slide")) return;
    const root = element.closest("div.carouselsingledouble") || element;
    const data = slidesFromConfig2(document2, readConfig4(root, "carouselsingledouble")) || slidesFromDom2(document2, element);
    if (!data || !data.slides.length) return;
    const cells = data.slides.map((slide) => buildRow2(document2, slide));
    const block = WebImporter.Blocks.createBlock(document2, { name: "carousel-split", cells });
    if (data.title) {
      const h2 = document2.createElement("h2");
      h2.textContent = data.title;
      element.replaceWith(h2, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/parsers/hero-banner.js
  var ORIGIN6 = "https://www.jll.com";
  function absUrl6(url) {
    if (!url) return "";
    const value = String(url).trim();
    if (!value || value.startsWith("#") || /^(mailto|tel|javascript):/i.test(value)) return value;
    try {
      return new URL(value.startsWith("//") ? `https:${value}` : value, ORIGIN6).href;
    } catch (e) {
      return value;
    }
  }
  function clean6(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }
  function decodeText3(document2, str) {
    if (!str) return "";
    const div = document2.createElement("div");
    div.innerHTML = String(str);
    let text = div.textContent;
    if (/<[a-z/]/i.test(text)) {
      div.innerHTML = text;
      text = div.textContent;
    }
    return clean6(text);
  }
  function readConfig5(root, component) {
    const rc = root.matches && root.matches(`react-component[data-component="${component}"]`) ? root : root.querySelector(`react-component[data-component="${component}"][data-config]`);
    if (!rc) return null;
    try {
      return JSON.parse(rc.getAttribute("data-config"));
    } catch (e) {
      return null;
    }
  }
  function parse6(element, { document: document2 }) {
    if (!element.parentNode) return;
    const config = readConfig5(element, "banner");
    const img = element.querySelector("img");
    const headingEl = element.querySelector("h1, h2, h3, h4, h5, h6");
    const linkEl = element.querySelector("a[href]");
    const image = config && config.imagePath || img && img.getAttribute("src") || "";
    const alt = config && config.imageAltText || img && img.getAttribute("alt") || "";
    const title = config && decodeText3(document2, config.ctaTitle) || (headingEl ? clean6(headingEl.textContent) : "");
    const url = config && config.ctaLinkUrl || linkEl && linkEl.getAttribute("href") || "";
    const label = config && decodeText3(document2, config.ctaPrimaryTitle) || title;
    if (!image && !title) return;
    const cells = [];
    if (image) {
      const picture = document2.createElement("img");
      picture.src = absUrl6(image);
      picture.alt = clean6(alt);
      cells.push([picture]);
    }
    const content = [];
    if (title) {
      const h2 = document2.createElement("h2");
      h2.textContent = title;
      content.push(h2);
    }
    if (url) {
      const p = document2.createElement("p");
      const a = document2.createElement("a");
      a.href = absUrl6(url);
      a.textContent = label || absUrl6(url);
      p.append(a);
      content.push(p);
    }
    if (content.length) cells.push([content]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/jll-cleanup.js
  var ICON_NAMES = /* @__PURE__ */ new Set([
    "arrow_forward",
    "arrow_back",
    "arrow_downward",
    "arrow_upward",
    "chevron_left",
    "chevron_right",
    "play_arrow",
    "pause",
    "open_in_new",
    "expand_more",
    "expand_less",
    "keyboard_arrow_down",
    "keyboard_arrow_up",
    "search",
    "menu",
    "close",
    "north_east"
  ]);
  function removeAll(root, selectors) {
    selectors.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el3) => el3.remove());
    });
  }
  function removeIconSpans(root) {
    root.querySelectorAll("span").forEach((span) => {
      if (span.children.length) return;
      const text = (span.textContent || "").trim();
      if (ICON_NAMES.has(text)) span.remove();
    });
  }
  function removeSlideAnnouncements(root) {
    removeAll(root, [".swiper-notification", ".swiper-pagination"]);
    root.querySelectorAll("[aria-live]").forEach((el3) => {
      if (!el3.children.length) el3.remove();
    });
    root.querySelectorAll("div, span, p").forEach((el3) => {
      if (el3.children.length) return;
      if (/^Slide \d+ of \d+/i.test((el3.textContent || "").trim())) el3.remove();
    });
  }
  function normalizeScene7Images(root) {
    root.querySelectorAll("img").forEach((img) => {
      let src = img.getAttribute("src") || "";
      if (!src.includes("/is/image/")) return;
      if (src.startsWith("//")) src = `https:${src}`;
      try {
        const url = new URL(src, "https://s7d1.scene7.com");
        const keep = url.search.replace(/^\?/, "").split("&").filter((p) => p && !/^(wid|hei|fmt|fit)=/.test(p));
        keep.push("fit=constrain,0", "wid=1600", "fmt=jpg");
        img.setAttribute("src", `${url.origin}${url.pathname}?${keep.join("&")}`);
      } catch (e) {
      }
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.removeAttribute("loading");
      const picture = img.closest("picture");
      if (picture) picture.querySelectorAll("source").forEach((s) => s.remove());
    });
  }
  function transform(hookName, element, payload) {
    const root = element;
    if (hookName === "beforeTransform") {
      removeAll(root, [
        ".cmp-experiencefragment--header",
        "div.experiencefragment:has(.cmp-experiencefragment--header)",
        "footer.experiencefragment",
        ".cmp-experiencefragment--footer",
        "header",
        "footer",
        ".cmp-page__skiptomaincontent",
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        ".onetrust-pc-dark-filter",
        "iframe.ot-text-resize",
        // Qualtrics site-intercept survey popup ("Share your feedback")
        '[class^="QSI"]',
        '[id^="QSI"]',
        '[class*=" QSI"]'
      ]);
      root.querySelectorAll("div.experiencefragment").forEach((el3) => {
        if (!el3.textContent.trim() && !el3.querySelector("img")) el3.remove();
      });
      removeAll(root, [
        "div.spotlightbroadcaster",
        "div.ghost"
      ]);
      root.querySelectorAll("div.embed").forEach((el3) => {
        if (!el3.querySelector("iframe, img, video, a") && !el3.textContent.trim()) el3.remove();
      });
      root.querySelectorAll("react-component").forEach((rc) => {
        if (rc.hasAttribute("data-config")) return;
        if (!rc.children.length && !rc.textContent.trim()) {
          const wrapper = rc.parentElement;
          rc.remove();
          if (wrapper && wrapper.matches("div.aem-GridColumn") && !wrapper.children.length && !wrapper.textContent.trim()) {
            wrapper.remove();
          }
        }
      });
      removeAll(root, [
        ".carousel-panel__nav-buttons",
        ".carousel-panel__nav-button-prev",
        ".carousel-panel__nav-button-next",
        ".swiper-button-prev",
        ".swiper-button-next"
      ]);
      removeSlideAnnouncements(root);
      removeIconSpans(root);
      removeAll(root, ["script", "style", "noscript", "link"]);
    }
    if (hookName === "afterTransform") {
      removeIconSpans(root);
      removeSlideAnnouncements(root);
      removeAll(root, [
        "header",
        "footer",
        "#onetrust-consent-sdk",
        ".cmp-page__skiptomaincontent",
        "iframe",
        "script",
        "style",
        "noscript",
        "link",
        "source",
        '[class^="QSI"]',
        '[id^="QSI"]',
        '[class*=" QSI"]'
      ]);
      root.querySelectorAll('img[src*="qualtrics.com"]').forEach((img) => {
        const container = img.closest("p, div") || img;
        const prev = container.previousElementSibling;
        if (prev && prev.tagName === "P" && /share your feedback/i.test(prev.textContent)) prev.remove();
        container.remove();
      });
      root.querySelectorAll("*").forEach((el3) => {
        [...el3.attributes].forEach((attr) => {
          const n = attr.name;
          if (n.startsWith("data-cmp-") || n.startsWith("data-analytics") || n.startsWith("data-track") || n === "data-config" || n === "data-component" || n === "data-state" || n === "onclick") {
            el3.removeAttribute(n);
          }
        });
      });
      normalizeScene7Images(root);
    }
  }

  // tools/importer/transformers/jll-sections.js
  var MARKER = "data-excat-section-id";
  function findSectionElement(root, section) {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (const sel of selectors) {
      if (!sel) continue;
      try {
        const el3 = root.querySelector(sel);
        if (el3) return el3;
      } catch (e) {
      }
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const doc = element.ownerDocument || document;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const el3 = findSectionElement(element, section);
        if (!el3 || !el3.parentNode) continue;
        const isFirst = i === 0;
        if (isFirst && !section.style) continue;
        const hr = doc.createElement("hr");
        if (section.style) hr.setAttribute(MARKER, section.id);
        if (isFirst) hr.setAttribute("data-excat-first-section", "true");
        el3.parentNode.insertBefore(hr, el3);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section.style) continue;
        const metadata = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
        if (marker && marker.parentNode) {
          marker.parentNode.insertBefore(metadata, marker.nextSibling);
          marker.removeAttribute(MARKER);
          if (marker.hasAttribute("data-excat-first-section")) {
            marker.remove();
          }
          continue;
        }
        const el3 = findSectionElement(element, section);
        if (el3 && el3.parentNode) {
          el3.parentNode.insertBefore(metadata, el3.nextSibling);
        }
      }
      element.querySelectorAll(`hr[${MARKER}]`).forEach((hr) => {
        hr.removeAttribute(MARKER);
        if (hr.hasAttribute("data-excat-first-section")) hr.remove();
      });
      element.querySelectorAll("hr[data-excat-first-section]").forEach((hr) => hr.remove());
    }
  }

  // tools/importer/import-home.js
  var PAGE_TEMPLATE = {
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
          'react-component[data-component="accordion-carousel"]'
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
  var parsers = {
    "carousel-hero": parse,
    "tabs-stacked": parse2,
    "cards-eyebrow": parse3,
    "columns-alternating": parse4,
    "carousel-split": parse5,
    "hero-banner": parse6
  };
  var sectionTransformers = [transform2];
  var fragmentTransformers = [];
  var lateTransformers = [...sectionTransformers, ...fragmentTransformers];
  var transformers = [transform, ...lateTransformers];
  var earlyTransformers = transformers.filter((fn) => !lateTransformers.includes(fn));
  var CATALOG = Boolean(PAGE_TEMPLATE.pageCleanup || PAGE_TEMPLATE.blocks.some((b) => b.pageInstances));
  function executeTransformers(hookName, element, payload, list = transformers) {
    var _a, _b;
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: ((_b = (_a = payload.params) == null ? void 0 : _a.targets) == null ? void 0 : _b.template) || PAGE_TEMPLATE });
    list.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template, url) {
    const pageBlocks = [];
    const pageKey = (u) => {
      try {
        const { origin, pathname } = new URL(u);
        return `${origin}${pathname.replace(/\/$/, "")}`;
      } catch (e) {
        return u;
      }
    };
    const key = pageKey(url);
    const claim = (blockDef, selector) => {
      let matches = [];
      try {
        matches = document2.querySelectorAll(selector);
      } catch (e) {
        return;
      }
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
  function markPageTargets(payload) {
    const { document: document2, params } = payload;
    executeTransformers("beforeTransform", document2.body, payload, earlyTransformers);
    const blocks = findBlocksOnPage(document2, PAGE_TEMPLATE, params.originalURL).map(({ name, selector, element }, i) => {
      element.setAttribute("data-excat-block", String(i));
      return { name, selector };
    });
    const sections = (PAGE_TEMPLATE.sections || []).map((section, i) => {
      const target = (section.selector || []).map((s) => {
        try {
          return document2.querySelector(s);
        } catch (e) {
          return null;
        }
      }).find(Boolean);
      if (!target) return section;
      target.setAttribute("data-excat-section", String(i));
      return __spreadProps(__spreadValues({}, section), { selector: [`[data-excat-section="${i}"]`] });
    });
    params.targets = { blocks, template: __spreadProps(__spreadValues({}, PAGE_TEMPLATE), { sections }) };
  }
  var import_home_default = {
    preprocess: (payload) => {
      if (CATALOG) markPageTargets(payload);
    },
    transform: (payload) => {
      const { document: document2, url, params } = payload;
      const main = document2.body;
      params.fragments = [];
      if (!params.targets) markPageTargets(payload);
      const pageBlocks = params.targets.blocks.map((block, i) => __spreadProps(__spreadValues({}, block), { element: document2.querySelector(`[data-excat-block="${i}"]`) })).filter((block) => block.element);
      executeTransformers("beforeTransform", main, __spreadProps(__spreadValues({}, payload), { pageBlocks }), lateTransformers);
      pageBlocks.forEach((block) => {
        if (!main.contains(block.element)) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document: document2, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document2.createElement("hr"));
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      params.fragments.forEach(({ element }) => {
        executeTransformers("afterTransform", element, payload, earlyTransformers);
        WebImporter.rules.transformBackgroundImages(element, document2);
        WebImporter.rules.adjustImageUrls(element, url, params.originalURL);
      });
      const { pathname } = new URL(params.originalURL);
      const rawPath = (pathname.endsWith("/") ? `${pathname}index` : pathname).replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath);
      return [{
        element: main,
        path,
        report: { title: document2.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }, ...params.fragments];
    }
  };
  return __toCommonJS(import_home_exports);
})();
