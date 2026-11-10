/* eslint-disable */
/* global WebImporter */

/**
 * JLL sections transformer.
 *
 * beforeTransform: inserts <hr> section breaks before every non-first section
 * (while the parser target elements still exist). Styled sections get a temporary
 * data-excat-section-id marker on their <hr>; a styled first section gets a
 * temporary marked <hr> that is removed again in afterTransform.
 *
 * afterTransform: inserts a Section Metadata block (style) directly AFTER the
 * section's marker <hr>, i.e. at the start of that section. Placing it at the start
 * (rather than at the end) keeps the style with the correct section even when a
 * parser emits additional sections of its own (tabs-stacked appends panel sections
 * with Tab ID / Tab Title metadata right after its block in section 2).
 */

const MARKER = 'data-excat-section-id';

function findSectionElement(root, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // invalid selector, try next
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const doc = element.ownerDocument || document;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(element, section);
      if (!el || !el.parentNode) continue;
      const isFirst = i === 0;
      if (isFirst && !section.style) continue;
      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(MARKER, section.id);
      if (isFirst) hr.setAttribute('data-excat-first-section', 'true');
      el.parentNode.insertBefore(hr, el);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const metadata = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });

      const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
      if (marker && marker.parentNode) {
        marker.parentNode.insertBefore(metadata, marker.nextSibling);
        marker.removeAttribute(MARKER);
        if (marker.hasAttribute('data-excat-first-section')) {
          // First section must not open with an empty section
          marker.remove();
        }
        continue;
      }

      // Fallback: marker lost, append after surviving section element
      const el = findSectionElement(element, section);
      if (el && el.parentNode) {
        el.parentNode.insertBefore(metadata, el.nextSibling);
      }
    }

    // Safety: strip any leftover markers
    element.querySelectorAll(`hr[${MARKER}]`).forEach((hr) => {
      hr.removeAttribute(MARKER);
      if (hr.hasAttribute('data-excat-first-section')) hr.remove();
    });
    element.querySelectorAll('hr[data-excat-first-section]').forEach((hr) => hr.remove());
  }
}
