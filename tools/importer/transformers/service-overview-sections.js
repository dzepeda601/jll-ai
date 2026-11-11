/* eslint-disable */
/* global WebImporter */

/**
 * JLL service-overview sections transformer.
 * Only acts for the service-overview template (home keeps jll-sections.js).
 *
 * Service pages are a flat list of AEM grid components (hero, stats, dynamiclist,
 * banner, jumppoint, carousel, accordion, editorial, form, ...). Every component starts
 * a new section, except:
 *   - the eloqua form, which stays in the section of the editorial (H2 + text) before it
 *   - consecutive side-content banners, which become rows of one columns-alternating block
 * payload.template.sections describes the representative page; a section whose selector
 * matches a component and has a style gets a Section Metadata block (none are styled yet).
 *
 * beforeTransform (after block discovery, before parsing): inserts the <hr> breaks while
 * the component elements still exist; styled sections get a temporary marker.
 * afterTransform: adds Section Metadata after marked <hr>s and removes the markers.
 *
 * Also used by the service-detail template. There, a component that the cleanup
 * transformer marked with data-excat-style (full-width message -> "statement",
 * secondary navigation -> "link-bar") gets that section style as well.
 *
 * Also used by the service-landing template (same rules as service-detail); there a
 * section heading component (converted to an H2 by the cleanup transformer) stays in the
 * section of the component that follows it.
 *
 * Also used by the service-design template, with the service-landing rules, and by the
 * services-hub template, with the service-overview rules.
 */

const TEMPLATE = 'service-overview';
const DETAIL_TEMPLATE = 'service-detail';
const LANDING_TEMPLATE = 'service-landing';
const DESIGN_TEMPLATE = 'service-design';
const HUB_TEMPLATE = 'services-hub';
const STYLE_MARK = 'data-excat-style';
const OWN_STYLE = 'style:';
const MARKER = 'data-excat-section-id';
const LAYOUT_ONLY = 'div.spacer, div.separator, div.ghost';

function isTemplate(payload) {
  const name = payload && payload.template && payload.template.name;
  return name === TEMPLATE || name === DETAIL_TEMPLATE || name === LANDING_TEMPLATE || name === DESIGN_TEMPLATE
    || name === HUB_TEMPLATE;
}

function isSideBanner(node) {
  return Boolean(node && node.matches('div.banner') && node.querySelector('.c-side-content, react-component[data-component="banner"]')
    && /"bannerType"\s*:\s*"sideContent"/.test((node.querySelector('react-component[data-config]') || { getAttribute: () => '' }).getAttribute('data-config') || ''));
}

/** Top-level authorable components of the AEM grid, in document order. */
function components(root) {
  return [...root.querySelectorAll('div.aem-Grid > div')].filter((node) => {
    if (node.matches(LAYOUT_ONLY)) return false;
    // layout containers holding a nested grid are not components themselves
    if (node.querySelector(':scope > div.cmp-container > div.aem-Grid, :scope > div.aem-Grid')) return false;
    // only outermost components (a component never nests another grid item)
    const outer = node.parentElement && node.parentElement.closest('div.aem-Grid > div');
    if (outer && !outer.querySelector(':scope > div.cmp-container > div.aem-Grid, :scope > div.aem-Grid')) return false;
    return true;
  });
}

function styleFor(node, sections, detail = false) {
  const own = detail && node.getAttribute(STYLE_MARK);
  if (own) return { id: `${OWN_STYLE}${own}`, style: own };
  const match = sections.find((section) => section.style && (section.selector || []).some((sel) => {
    try { return node.matches(sel); } catch (e) { return false; }
  }));
  return match || null;
}

export default function transform(hookName, element, payload) {
  if (!isTemplate(payload)) return;
  const document = element.ownerDocument;
  const sections = Array.isArray(payload.template.sections) ? payload.template.sections : [];
  const landing = payload.template.name === LANDING_TEMPLATE || payload.template.name === DESIGN_TEMPLATE;
  const detail = payload.template.name === DETAIL_TEMPLATE || landing;

  if (hookName === 'beforeTransform') {
    const list = components(element);
    list.forEach((node, i) => {
      const prev = list[i - 1];
      const styled = styleFor(node, sections, detail);
      if (i === 0) {
        if (styled) {
          const hr = document.createElement('hr');
          hr.setAttribute(MARKER, styled.id);
          hr.setAttribute('data-excat-first-section', 'true');
          node.before(hr);
        }
        return;
      }
      if (node.matches('div.eloquaform') && prev && prev.matches('div.editorial')) return;
      if (isSideBanner(node) && isSideBanner(prev)) return;
      // service-detail: a featured tile belongs to the editorial heading right before it
      if (detail && node.matches('div.featuredtile') && prev && prev.matches('div.editorial')) return;
      // service-landing: a section heading belongs to the component right after it
      if (landing && prev && prev.matches('div.sectionheading')) {
        // the break before the heading takes this component's section style
        const hr = prev.previousElementSibling;
        if (styled && hr && hr.tagName === 'HR' && !hr.hasAttribute(MARKER)) hr.setAttribute(MARKER, styled.id);
        return;
      }
      const hr = document.createElement('hr');
      if (styled) hr.setAttribute(MARKER, styled.id);
      node.before(hr);
    });
  }

  if (hookName === 'afterTransform') {
    [...element.querySelectorAll(`hr[${MARKER}]`)].forEach((hr) => {
      const marker = hr.getAttribute(MARKER) || '';
      const section = detail && marker.startsWith(OWN_STYLE)
        ? { style: marker.slice(OWN_STYLE.length) }
        : sections.find((s) => s.id === marker);
      if (section && section.style) {
        const metadata = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        hr.after(metadata);
      }
      hr.removeAttribute(MARKER);
      if (hr.hasAttribute('data-excat-first-section')) hr.remove();
    });
  }
}
