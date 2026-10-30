---
name: Sufyan Farooq Portfolio
description: A working ops console that proves operations skill by checking its own services live.
colors:
  navy: "#0e1b3f"
  navy-2: "#16234c"
  navy-3: "#1c2a55"
  studio: "#efefef"
  studio-2: "#e3e2e3"
  studio-3: "#d6d6da"
  line-navy: "#26345f"
  line-studio: "#cfd1d8"
  line-strong-navy: "#3b4a79"
  line-strong-studio: "#9ea6ba"
  ink-on-navy: "#f2f2f2"
  ink-2-on-navy: "#c9cfdd"
  muted-on-navy: "#9aa4bf"
  ink-on-studio: "#0e1b3f"
  ink-2-on-studio: "#2b3a63"
  muted-on-studio: "#535e7a"
  ok: "#6fe39a"
  ok-on-studio: "#1d8a4a"
  bad: "#ff8a8a"
  bad-on-studio: "#c2333f"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 4.7vw, 4.6rem)"
    fontWeight: 760
    fontStretch: "wdth 110"
    lineHeight: 0.98
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.8vw, 3.4rem)"
    fontWeight: 740
    fontStretch: "wdth 112"
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.15rem–1.55rem"
    fontWeight: 700
    fontStretch: "wdth 112"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "0.75rem–0.78rem"
    fontWeight: 400
    fontVariantNumeric: "tabular-nums"
rounded:
  control: "2px"
  lamp: "50%"
spacing:
  gutter: "clamp(16px, 4vw, 40px)"
  wrap: "1240px"
  section-y: "clamp(72px, 10vw, 136px)"
components:
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.control}"
    height: "50px"
    padding: "0 22px"
  button-line:
    backgroundColor: "transparent"
    borderColor: "{colors.line-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "50px"
  status-board:
    backgroundColor: "{colors.panel}"
    borderColor: "{colors.line}"
    shadow: "0 24px 60px -30px rgba(0,0,0,0.7)"
  status-chip:
    borderColor: "{colors.line}"
    textColor: "{colors.muted}"
    typography: "{typography.data}"
  input:
    backgroundColor: "{colors.ground}"
    borderColor: "{colors.line-strong}"
    focusBorderColor: "{colors.signal}"
    rounded: "{rounded.control}"
---

# Design System: Sufyan Farooq Portfolio

## Overview

**Creative North Star: "The ops console that checks itself"**

The page is a working status board rather than a brochure. Its first viewport pairs a plain claim, "I keep systems running and automate the rest.", with a panel that measures the apps Sufyan built: real HTTP codes, latency and 24-hour uptime, fetched from the site's own server. The rest of the page reads like an operator's notes: a problem → action → result log from Digival, shipped apps with live status chips, a ledger of AI agents and infrastructure work, the site's own deploy pipeline with its latest real GitHub Actions run, and a stack split honestly into work, projects and training.

It refuses two defaults: the dev-portfolio hero (portrait, gradient, skill-icon grid) and the neon-on-black hacker costume.

**Key characteristics:**
- The palette is sampled from Sufyan's portrait: the navy of his shirt and the light grey of the studio backdrop. The page should feel like the photo.
- Two fields alternate: navy (hero, work, stack, footer) and studio grey (experience, pipeline, contact). Fields meet edge to edge.
- There is no separate accent hue. The action colour is the opposite field's colour: a studio-grey button on navy, a navy button on grey.
- Green and red appear only for measured state (and for the availability lamp).
- Hairline rules and 2px corners. Panels carry depth; sections are separated by rules or a field change.

The user chose this in October 2026. Their goal was a blue that matches their photo; earlier graphite/amber and indigo/aqua versions were dropped (the latter for looking AI-generated).

## Colors

Tokens are semantic (`--ground`, `--panel`, `--ink`, `--ink-2`, `--muted`, `--signal`, `--signal-ink`, `--ok`, `--bad`). The navy field is the default; the `.theme-studio` class remaps every token for the grey field, so components never hard-code a field.

- **Navy field:** ground `{colors.navy}`, panels `{colors.navy-2}` / `{colors.navy-3}`, rules `{colors.line-navy}`, ink `{colors.ink-on-navy}`, reading copy `{colors.ink-2-on-navy}`, metadata `{colors.muted-on-navy}` (6.8:1). Buttons are studio grey with navy text.
- **Studio field:** ground `{colors.studio}`, panels `{colors.studio-2}` / `{colors.studio-3}`, rules `{colors.line-studio}`, ink `{colors.ink-on-studio}`, reading copy `{colors.ink-2-on-studio}`, metadata `{colors.muted-on-studio}` (5.6:1). Buttons are navy with grey text; form fields are studio grey.
- **Measured state:** `{colors.ok}` / `{colors.bad}` on navy, `{colors.ok-on-studio}` / `{colors.bad-on-studio}` on grey.

**The Photo Rule.** Every colour on the page is either in the portrait or reports a measurement. No added accent hue, no gradients, no glow.

## Typography

The hero states one identity ("Support engineer who builds, ships and runs real apps.") and names target roles once, in the availability sentence. Do not add keyword rows or middot metadata strips; write sentences.

**Archivo** carries every voice through its width axis: expanded (wdth 110–118) for display, headings and the wordmark; normal width for reading. **Martian Mono** is used strictly for measured or machine data: HTTP codes, latency, uptime, timestamps, commit hashes, stack lines and key numbers. It is never used for paragraphs or as a "technical" costume.

- **Display:** 760, `clamp(2.5rem, 4.7vw, 4.6rem)`, line-height 0.98, tracking -0.025em, balanced.
- **Headline:** 740, `clamp(2rem, 3.8vw, 3.4rem)`, line-height 1.
- **Title:** 650–720, 1.15–1.55rem, expanded.
- **Body:** 400, 17px, line-height 1.6; lead copy 1.12rem.
- **Data:** Martian Mono 0.75–0.78rem, tabular numerals. Nothing functional goes below 12px.

## Layout

Content wraps at 1240px with a `clamp(16px, 4vw, 40px)` gutter. The hero and section heads use a 7:5 split; the Digival log is a three-column problem / action / result table that collapses to stacked rows with the result first under 820px. Projects are a two-column grid; the pipeline is a five-step horizontal flow that turns vertical under 1080px. The top bar is sticky; under 1080px its links move into a full-screen drawer. Under 560px the board hides its 24h column and buttons go full width.

## Motion

One authored moment: status rows resolve one after another (140ms apart) as live results arrive. Everything else is short hover and focus transitions on the `cubic-bezier(0.16, 1, 0.3, 1)` ease-out. Reduced motion applies results instantly and turns off smooth scrolling.

## Components

- **Status board:** panel with a header (title and live summary lamp), a table of services (name with status dot, HTTP, latency, 24h), and a footer that states when and how often the checks run.
- **Status chip:** small mono chip on each project card, coloured from the same checks.
- **Log row:** problem (ink-2), action (ink), result (mono number in signal).
- **Flow step:** square marker in the signal colour on the rule, mono step number, expanded name, one-line description; sits on the studio-grey field.
- **Buttons:** signal (filled with the opposite field colour) for the main action, line (outlined) for secondary.
- **Top bar:** small round portrait beside the name, five links in page order, one CV button. No clock, no shortcuts.
- **Footer:** the full name as a close; no counters.
- **Removed after the October 2026 critique:** Ctrl/⌘K palette, Jeddah clock, visitor counter, discipline keyword row, card shadows on the board.

## Do / Don't

- Do show measured data where a claim could go.
- Do label training work as training.
- Don't add gradients, glass, glowing neon edges or icon-card grids.
- Don't use mono for prose, or add any hue that isn't in the portrait or a measured state.
