# Scroll-controlled 1.2% introduction

The original information guide, FR0512 steps, calculator, privacy settings, recipient details and verification flags are unchanged. The introduction precedes the old hero. It is not a modal and never captures wheel or touch scrolling.

Native WebGL renders fixed numeric outlines with front/back faces, extruded sides, bevels and procedural metallic lighting. No runtime packages, video frames, external fonts, analytics or paid generation services are used. Pointer movement adds a small tilt on fine-pointer devices. Scrolling separates the four glyphs and moves them away from the camera. Returning up reverses the effect.

## Maintenance

- `src/locales/intro3d.json`: RU/LT/EN/PL/DE/UK copy. English uses a decimal point.
- `src/assets/intro3d.js`: geometry, shaders, motion and visibility handling.
- `src/assets/percent3d-mesh.js`: fixed numeral artwork; see the adjacent attribution notice. No font file is distributed.
- `src/assets/intro3d.css`: isolated styling.
- `scripts/build-intro3d.mjs`: post-build transformation for root and six index pages, never privacy pages. All copy remains in static HTML.
- Run `npm run build` and `npm test`. Never edit generated `docs` by hand.
- `scripts/check-intro3d.mjs`: development-only Chromium checks for desktop/mobile, all languages, reversed scroll, links, no overflow, no initial external requests and reduced-motion/no-JS/no-WebGL fallbacks.

Reduced motion and compact viewports use a non-pinned composition. If WebGL is unavailable or its context is lost, static typography and working links remain. Rendering pauses offscreen, in hidden tabs and between interactions. Printing excludes the decorative introduction.

The copy does not claim that unallocated tax money disappears or returns to the taxpayer. The visitor chooses the recipient; the parish is not preselected.
