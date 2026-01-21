// src/global-fonts.css.js
import { globalStyle } from '@vanilla-extract/css';

// Figtree variable font - normal style
globalStyle('@font-face', {
  fontFamily: 'Figtree',
  src: 'url("./fonts/Figtree-VF_wght.woff2") format("woff2")',
  fontWeight: '100 900',
  fontStyle: 'normal',
  fontDisplay: 'swap',
});

// Figtree variable font - italic style
globalStyle('@font-face', {
  fontFamily: 'Figtree',
  src: 'url("./fonts/Figtree-Italic-VF_wght.woff2") format("woff2")',
  fontWeight: '100 900',
  fontStyle: 'italic',
  fontDisplay: 'swap',
});
