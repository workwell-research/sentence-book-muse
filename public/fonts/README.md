# Notebook fonts

The notebook offers English and Japanese choices independently. The selected fonts govern both the screen and PDF, including wrapping. UI labels retain the existing system sans; these fonts are for the paper.

| UI choice | Font / source | License |
| --- | --- | --- |
| Readability Italic (default) | **Sentence Notebook Readability**, derived from EMS Readability Italic, itself derived from Source Sans Pro Light by Paul D. Hunt / Adobe | SIL OFL 1.1: [EMS](../licenses/EMS-OFL.txt), [Source Sans copyright/license](../licenses/SourceSans-OFL.txt) |
| EMS Tech | **Sentence Notebook Tech**, derived from EMS Tech, itself derived from Architects Daughter by Kimberly Geswein | SIL OFL 1.1: [EMS](../licenses/EMS-OFL.txt), [Architects Daughter copyright/license](../licenses/ArchitectsDaughter-OFL.txt) |
| 整った丸文字 | **Sentence Notebook Print**, derived from EMS Delight, itself derived from Delius by Natalia Raices | SIL OFL 1.1: [EMS](../licenses/EMS-OFL.txt), [Delius copyright/license](../licenses/Delius-OFL.txt) |
| 軽やかなペン文字 | **Sentence Notebook Pen**, derived from EMS Neato, itself derived from Bad Script by Roman Shchyukin / Gaslight | SIL OFL 1.1: [EMS](../licenses/EMS-OFL.txt), [Bad Script copyright/license](../licenses/BadScript-OFL.txt) |
| 繊細な手書き (default) | **Klee One Regular**, Fontworks / The Klee Project Authors | [SIL OFL 1.1](../licenses/Klee-OFL.txt) |
| やわらかな手書き | **Zen Kurenaido Regular**, Yoshimichi Ohira / The Zen Kurenaido Project Authors | [SIL OFL 1.1](../licenses/ZenKurenaido-OFL.txt) |

## Sources and modifications — 2026-10-27

- [EMS SVG fonts](https://gitlab.com/oskay/svg-fonts): `fonts/EMS/EMSDelight.svg`, `EMSNeato.svg`, `EMSReadabilityItalic.svg` and `EMSTech.svg`. Stroke fonts by Sheldon B. Michaels; SVG conversion by Windell H. Oskay. Original SVG metadata is retained in `assets/fonts/`. The EMS directory's OFL is a generic template, so the original metadata and each upstream base font's copyright/license are also retained. No GPL Hershey Text extension code is incorporated.
- [Source Sans license](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md); [Architects Daughter license](https://github.com/google/fonts/blob/main/ofl/architectsdaughter/OFL.txt).
- [Delius license](https://github.com/google/fonts/blob/main/ofl/delius/OFL.txt); [Bad Script license](https://github.com/google/fonts/blob/main/ofl/badscript/OFL.txt).
- [Klee source](https://github.com/fontworks-fonts/Klee/blob/master/fonts/ttf/KleeOne-Regular.ttf); [Zen Kurenaido source](https://github.com/googlefonts/zen-kurenaido/blob/main/fonts/ttf/ZenKurenaido-Regular.ttf). TTF files are unmodified. WOFF2 files are losslessly repackaged full fonts, with no outline/glyph/name changes. Only the selected WOFF2 loads for screen text; the selected original TTF is fetched on PDF export.

English derivatives retain real centerlines, normalized to the app's 200-unit coordinate model. Readability, Tech and Print use source scale 0.2; Pen uses 0.145 to fit tall ascenders/descenders into the same rules. Polyline points receive local cubic tangents, preserving endpoints and sharp corners. Print reorders B and reverses C/f for writing direction. Pen, Readability and Tech reserve real overhangs in each advance so independent letters stay separated. Tech titles alone receive a 25-model-unit optical lift (0.70625mm at the current title size); body strokes retain their natural baseline. This layout adjustment does not alter the source glyphs. Curved source paths remain curves; quote/dash aliases are added. Derivatives, generated data and their build script remain OFL; they are not claimed as first-party hackathon font artwork or endorsed by the original authors.

Rebuild centerlines with `npm run font:build` (Node dependencies + Python 3 XML parser). Rebuild Japanese advances with `node scripts/build-note-text-metrics.mjs`. Repackage WOFF2 with fontTools 4.60.2 + brotli in an isolated environment: `TTFont(path).flavor = 'woff2'`, then save. Exact original TTF hashes are recorded with coverage/advances in `text-metrics*.json`; source/output hashes are in `docs/font-assets.json`.

The owner selected Readability Italic as the default on 2026-10-27; Klee One remains the Japanese default. All four English centerline datasets are currently bundled for immediate switching. The two additions increased the production main chunk by about 68.32kB gzip; they are not lazy-loaded. Selected Japanese font loading and full PDF embedding remain separate costs.

Japanese is static handwritten-style text, without pen animation. All four English choices animate actual vector strokes. PDF embeds the complete selected Japanese TTF: prior partial subsets lost kana outlines. English PDF paths are not searchable/selectable text. Full embedding increases download size.

Previous Cutlings source/readme/OFL and M PLUS 1p TTF/OFL remain as historical provenance; they are not selected by the active notebook. Lora remains the interface wordmark under its separate OFL.
