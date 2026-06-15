# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Russian-language **Typst** study-notes document (not a software project) — an exam crib for К. П. Кохась's Mathematical Analysis course (ITMO, S2 2026). The goal is to extract theorem proofs from lecture transcripts and weave the ~70 exam questions ("билеты") into one cross-linked chain. Only the билеты listed in `bilety-opr.csv` are in scope.

## Build

```sh
typst compile main.typ      # → main.pdf
typst watch main.typ        # auto-rebuild on edit
```

After any content edit, recompile and confirm it succeeds (it must stay at 0 errors). CI (`.github/workflows/build-typst.yml`) recompiles via the official Typst Docker image on every push to `master` and attaches `main.pdf` to a GitHub Release. PDFs are gitignored (except `releases/`), so the committed source is the single source of truth.

## Architecture

- **`main.typ`** — orchestrator: `#show: conf`, title, literary interludes (`#lit`), `#outline`, and `#include "chapters/0N-block.typ"` for the three thematic blocks, then appendices A–D and an afterword. The literary vignettes are intentional stylized prose (a "Fear and Loathing" pastiche) — do not "fix" them as if they were math.
- **`lib.typ`** — all styling and components. Read this before touching layout.
- **`chapters/0N-block.typ`** — the actual content, one file per block. These are large and hand-written.

### The cross-linking system (the non-obvious part)

Билеты reference each other to form a dependency graph; several layers are computed automatically, so edits must respect the data, not hand-rolled text:

- **Labels**: every билет heading carries `<op-bN-XX>` (definition) or `<th-bN-XX>` (theorem); `bN` = block, `XX` = ordinal. The displayed numbering "X.Y.Z" comes from Typst's heading counter (Y=1 for определения, Y=2 for теоремы).
- **`#svyazi(<lbl>, ...)`** under a билет renders "→ опирается на: …" AND emits hidden `<dep-edge>` metadata. `nuzhen-dlya()` (in the heading show-rule) transposes that graph to print "← нужен для: …" automatically — never write back-references by hand.
- **`obyaz`** (tuple in `lib.typ`) lists the mandatory exam билеты. The level-3 heading show-rule renders mandatory ones plain/black and marks every *optional* one with an amber left-rule + "★ необязательный" badge. Adding/removing a билет from `obyaz` is how you change that status.
- **`_metody`** (dict in `lib.typ`) is a hand-curated map of билет-label → method tags (horizontal "same trick, different билет" links invisible in the lecture order). It renders the "⟂ метод:" line and feeds the auto-generated Appendix C (`metody-svodka()`).
- **Cross-references are by name, never bare.** Do not write a plain `@th-…`/`@op-…` in prose — in the Russian locale it renders as "Раздел N" (just a number, no theorem name). Instead make the theorem's name the clickable link: `#link(<th-b1-05>)[теореме Барроу]`, with the name in the grammatically correct case (reuse the declined words already in the sentence). The `show ref` rule in `lib.typ` is a safety net: it renders any heading reference as its title-link (no "Раздел", no number), which is also what drives the auto "→ опирается на" / "← нужен для" lines and Appendix C. In the appendices, link the inline name/symbol with `#link` rather than emitting a number — the old `#bil(<lbl>)` (number-only link) helper is no longer used.

### Per-билет structure & components (`lib.typ`)

A theorem билет is **Билет/формулировка → Доказательство → Суть**, kept as distinct visual layers — never fuse the proof into the statement as a wall of text:

- `#opr[…]` — definition/statement (blue box).
- `#dok[…]` — proof (grey left-rule + indent, auto ∎). Break long proofs into airy paragraphs (blank line = new paragraph) at logical seams; do not change wording when only re-paragraphing.
- `#sut[…]` — short "essence" (amber left-rule), only for hard theorems.
- `#lek(n)` / `#lek(n, time: "12:57")` — citation to Kohás lecture *n* (links to YouTube, with `?t=` when a timecode is given). Use this to mark facts recovered from a lecture.
- `#viz(url)` — link to an interactive Desmos graph for geometric билеты.
- `#todo` — placeholder for content not yet extracted.

## Typst conventions specific to this document

These caused real misrenders; follow them exactly:

- **Use stacked fractions `a/b`, never the escaped inline slash `a\/b`.** The one exception: *inside* a superscript/subscript group `^(…)`/`_(…)` (exponents like `e^(theta\/(12n))`, integral limits like `integral_(-pi\/2)^(pi\/2)`) keep `\/`, because a stacked fraction renders cramped and tiny there. `sup\/inf` is alternation, not a fraction — also keep it.
- **Fraction numerator grouping**: `/` only takes the immediately-preceding atom. A function-call or operator numerator must be wrapped in parens, or it misparses: write `(f'(xi_k))/(g'(xi_k))`, `(o(t u))/t`, `(nabla f(a))/(norm(nabla f(a)))`, `(partial f)/(partial x_k)`. `abs(…)`, `sqrt(…)`, `x^a`, `(ln x)^beta` group correctly without extra parens.
- **Custom math macros** (defined in `lib.typ`, available everywhere in the doc): `dd` = differential (`integral f dd x` → ∫f dx), `limsup`/`liminf`, `eps` (= `sym.epsilon.alt`).
- Readability settings in `conf` (margin 2.4cm, `par leading 0.78em`, block-equation spacing 1.05em) were tuned deliberately for dense math pages — do not revert them.
- **When validating a snippet with the typst-mcp `typst_snippet_to_image` tool, the project macros (`dd`, `limsup`, …) are NOT defined** — substitute a placeholder (e.g. `d x` for `dd x`) in the throwaway snippet.

## Source material & generators

Proofs are extracted from, and cross-checked against:

- `clean/лекция_NN.txt` — cleaned lecture auto-subtitles (the primary source for proofs). Auto-transcription mangles theorem names and symbols — verify against the others.
- `examples/human.txt` — another student's notes with worked proofs; `examples/theorems.txt` — prior-year formulations.

Two **one-shot scaffolding scripts** produced the initial structure and must NOT be re-run over the hand-written chapters (they would clobber content):

- `clean_vtt.py` — raw `.vtt` → `clean/лекция_NN.txt`.
- `gen_structure.py` — `bilety-opr.csv` → empty labeled Typst scaffolding.

`Desmos-MCP/publish_viz.py` publishes the interactive graphs that `#viz` links to (builds Desmos state by hand and posts to the anonymous save endpoint). `Desmos-MCP/` and `txt/` (regenerable chapter text dumps) are gitignored.
