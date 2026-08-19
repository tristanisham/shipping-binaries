// Browser entry for the shared Markdown module.
//
// `npm run build:js` bundles this to public/js/post-markdown.js (esbuild,
// IIFE), which the write page loads before the Editor.js inline script. The
// serializer and importer therefore have one implementation: the Worker
// imports post-markdown.ts directly, the editor reads these globals.

import {
  markdownInline,
  markdownToBlocks,
  parseMarkdownImport,
  parseShippingBinariesMarkdown,
  postToMarkdown,
} from "./post-markdown.js";

declare global {
  interface Window {
    createShippingBinariesMarkdown: typeof postToMarkdown;
    markdownInline: typeof markdownInline;
    markdownToEditorBlocks: typeof markdownToBlocks;
    parseMarkdownImport: typeof parseMarkdownImport;
    parseShippingBinariesMarkdown: typeof parseShippingBinariesMarkdown;
  }
}

window.createShippingBinariesMarkdown = postToMarkdown;
window.markdownInline = markdownInline;
window.markdownToEditorBlocks = markdownToBlocks;
window.parseMarkdownImport = parseMarkdownImport;
window.parseShippingBinariesMarkdown = parseShippingBinariesMarkdown;
