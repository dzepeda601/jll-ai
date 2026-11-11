/* eslint-disable */
/* global WebImporter */

/**
 * Parser: form (JLL Eloqua contact form -> project form block).
 *
 * Source: div.eloquaform > react-component[data-component="eloquaform"]. JLL's Eloqua
 * fields, privacy notice and submission endpoint are intentionally NOT reproduced
 * (customer decision): the page gets the project's own contact form.
 *
 * Block contract (blocks/form/form.js reads the block's links in order):
 *   row 1: link to the form definition (/forms/contact-us.json)
 *   row 2: link to the submit endpoint (the project's contact_us Cloudflare worker)
 * The section's H2 + paragraph come from the editorial before the form (default content,
 * written by the service-overview cleanup transformer).
 */

const FORM_DEFINITION = '/forms/contact-us.json';
const FORM_SUBMIT = 'https://demo.bbird.live/contact-us/';

function linkCell(document, href) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = href;
  return [a];
}

export default function parse(element, { document }) {
  const root = element.closest('div.eloquaform') || element;
  if (!root.parentNode) return;
  const cells = [
    [linkCell(document, FORM_DEFINITION)],
    [linkCell(document, FORM_SUBMIT)],
  ];
  const block = WebImporter.Blocks.createBlock(document, { name: 'form', cells });
  root.replaceWith(block);
}
