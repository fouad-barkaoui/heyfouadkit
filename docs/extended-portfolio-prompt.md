# Build brief — Fouad Barkaoui, extended portfolio

> Hand this whole file to a build session (Claude Code, Cursor, v0…) as the first message.
> Everything under **Verified content** is taken from the live "Meet the Founder" page in Kanz
> (https://kanz-workspace.vercel.app/#/portfolio). Use it as written. Anything marked **TODO** is
> missing — ask for it or leave a clearly marked placeholder. **Never invent** jobs, dates,
> numbers, clients, certificates or testimonials.

---

## 1. What we are building

A standalone personal site — the **extended** version of the "About the Founder" page inside Kanz.
The in-app page is a compact profile card; this site is where each project gets a full case study,
the stack gets context, and recruiters, clients and collaborators can understand in two minutes
who Fouad is and what he can build.

**Audience, in order:** SOC / security hiring managers → founders and teams who need a fullstack
builder → the security and dev community.

**The one thing a visitor should leave with:** *a security-minded builder who ships real products
fast — and builds them secure by default.*

---

## 2. Verified content

### Identity
- **Name:** Fouad Barkaoui
- **Location:** Morocco (show live local time and the gap to the visitor's time, e.g. "1h ahead")
- **Languages:** Darija · Arabic · French · English
- **Email (public):** fouadbr2001@gmail.com — with a copy-to-clipboard button
- **Portrait:** `public/fouad-portrait-512.jpg` in the Kanz repo (fouad-barkaoui/heyfouadkit)
- **Headline roles (rotate in the hero):** Beginner SOC Analyst · Fullstack Web Developer ·
  Programmer · Vibe Coder · Prompt Engineer · Problem Solver · Analytical Thinker ·
  Cybersecurity Enthusiast · Fast, Curious Learner
- **One-line role:** SOC analyst & fullstack developer — vibe coder & prompt engineer

### Bio (keep the voice)
1. I'm **Fouad Barkaoui** — a **beginner SOC analyst** and **fullstack web developer** from Morocco.
2. A **programmer**, **vibe coder** and **prompt engineer** who turns ideas into working products —
   fast, clean and **secure by default**.
3. My edge is **problem solving**: I break big, messy problems into small steps, stay curious, and
   keep learning how systems get built — and how they get attacked.

### Motto
"Inspired by the fear of **being average.**" — his own line. Do **not** attribute it to anyone
else, and do not add "— Unknown".

### Projects (newest first, all ongoing)

**Prompt Engine (PEbyFOUAD)** · *Founder & Developer* · Own product · **Live** · https://pebyfouad.vercel.app · since 2026-10
- Paste a prompt and a crawler reads it section by section: role, objective, context, rules, review and hand-off.
- Flags what is vague, risky or missing, word by word, using 11 quality rules and 26 security rules.
- Security rules follow his own detection taxonomy mapped to the OWASP LLM Top 10: injection, jailbreaks, leaked secrets and risky instructions.
- Gives a spec score, fixes ranked P1 to P3 and a rebuilt prompt you can crawl again until it scores 90+.
- Runs entirely in the browser, so no prompt leaves your machine. A Python tool measures each rule against a labeled test set.
- Tags: JavaScript · HTML & CSS · Canvas · Python · OWASP LLM Top 10 · Prompt injection · Vercel


**ASSAS** · *Founder & Security Developer* · Own SaaS · since 2026-09 · Morocco (Remote) · **In development**
- A SaaS that scans a full codebase for threats, bugs and violations of security rules.
- Checks authentication, encryption, session handling, input validation, rate limiting and error handling.
- Covers logging, backups, monitoring and dependency scanning, then reports every finding in one place.
- Monitors live targets with Firecrawl, crawling sites to catch new exposures as they appear.
- Built as a multi-tenant cloud service, one workspace per team.
- Tags: Python · Static analysis · Dependency scanning · Firecrawl · REST APIs · Docker · SaaS

**Kanz** · *Founder & Fullstack Developer* · Own product · **Live** · https://kanz-workspace.vercel.app · since 2026-09
- A private workspace that keeps notes, tasks, articles, courses, docs and analytics on one spatial canvas.
- Works offline first and syncs through Supabase, with row-level security on every table.
- Google sign-in, team invites and roles, and a private contact inbox.
- Designed the brand end to end: the KANZ wordmark, the star icon and the founder page.
- Tags: React · TypeScript · Vite · Tailwind CSS · Supabase · PostgreSQL · Vercel
- Shipped features you can show (all real, in the repo): English/Arabic with full right-to-left
  layout, light/dark/system theme, news feed, Salary Planner (admin beta + animated public
  preview), Medications catalog (Pro), cookie and terms onboarding, a "Start here" tour.

### Stack (grouped exactly like this)
- **Security:** ELK Stack · OpenSearch · Kibana · Threat intel (CTI) · OSINT · Firecrawl
- **Languages:** Python · TypeScript · JavaScript · SQL
- **Frontend:** React · Vite · Tailwind CSS · Three.js
- **Backend & data:** REST APIs · Supabase · PostgreSQL · IndexedDB
- **Infra & tools:** Kali Linux · Docker · Git · GitHub · Vercel

### Built with (logo wall — official logo files only, never redraw a brand)
Supabase · Vercel · GitHub · MITRE ATT&CK

### Socials
| Name | Handle / link | Status to show |
|---|---|---|
| Resume | PDF | **Soon** — "My resume is coming soon." |
| GitHub | fouad-barkaoui — https://github.com/fouad-barkaoui | **Building** — new account, repos on the way |
| LinkedIn | fouad-barkaoui — https://www.linkedin.com/in/fouad-barkaoui/ | **In progress** |
| Instagram | @heyfouad — https://www.instagram.com/heyfouad/ | live |
| Facebook | Fouad Barkaoui — https://www.facebook.com/share/16E8VLshmwD/ | live |

### Empty on purpose (show as "Soon", don't fill)
- **Experience:** "Roles, internships and positions will be listed here."
- **Recognition:** "Certificates, awards and programs will be listed here."

---

## 3. What "extended" adds — page plan

1. **Hero** — portrait, name in a bold display face, rotating role line, the one-line promise,
   two actions: *Write to me* (mailto) and *See the work* (scrolls to projects). Local time chip.
2. **About** — the three bio paragraphs, then a short "How I work" strip: break the problem down →
   build fast with AI → secure by default → ship and measure. Only claims already in the bio.
3. **Projects as case studies** — one long section per project:
   problem → what it does → how it is built (architecture sketch) → security decisions →
   status and what's next. For Kanz, embed real screenshots or a short screen recording of the
   live app; for ASSAS, a clearly labelled concept diagram (it is in development).
4. **Security corner** — what he practises: SOC monitoring with ELK/OpenSearch/Kibana, CTI and
   OSINT, MITRE ATT&CK mapping, Kali Linux. Present as *learning path / labs*, not as job titles.
5. **Stack** — the five groups above; optional one-line "where I used it" per tool, linking to the
   project that used it. No skill bars or percentages.
6. **Experience & Recognition** — the two "Soon" panels, styled so they look intentional.
7. **Motto** — the "being average." selection-box treatment from Kanz (big word in a highlighted
   selection with handle dots and gold sparkles).
8. **Contact** — email with copy button, socials with their status pills, a short form
   (name, email, message) — only if a backend is chosen; otherwise mailto.

---

## 4. Design direction (continuity with Kanz)

- **Feel:** a technical notebook — dashed construction lines, hatched dividers, handwritten margin
  notes ("say hi", "the basics", "what I'm building", "find me here", "milestones").
- **Type:** Source Sans 3 (body/UI), Unbounded (display, the motto word), Caveat (margin notes),
  JetBrains Mono (dates, tags, code).
- **Colour:** near-black `#06070b` / white `#ffffff` with one accent, acid lime `#e4f222`.
  Light theme mirrors it (`#fbfbfa` background, `#08090a` ink). One accent only.
- **Motion:** one orchestrated hero moment plus the rotating role. Everything else is still.
  Respect `prefers-reduced-motion`.
- **Bilingual:** English and Arabic with a toggle; Arabic flips to right-to-left; brand and tool
  names stay in Latin script.
- No mentions of AI tools, no sparkle icons, no em-dash-heavy copy; it should read as hand-made.
- Avoid: skill-percentage bars, fake stats ("100+ projects"), stock photos, testimonial carousels,
  every-card hover animations.

---

## 5. Technical requirements

- **Suggested stack:** Astro or Vite + React + TypeScript + Tailwind, deployed on Vercel.
- All content in one typed file (`content.ts` or `content/*.json`) so updates never touch layout.
  Mirror the shape above: `identity`, `bio`, `projects[]`, `stack[]`, `socials[]`, `soon[]`.
- Lighthouse 95+ on performance, accessibility, SEO and best practices; images as AVIF/WebP with
  sizes; fonts self-hosted.
- SEO: title, description, Open Graph image, `Person` JSON-LD with `sameAs` = the social links.
- Accessibility: semantic headings, visible focus, 4.5:1 contrast, alt text, keyboard-only usable.
- No trackers by default. If analytics are added, use cookieless (e.g. Vercel Analytics).

---

## 6. TODO — ask Fouad before publishing

- [ ] Domain / site name (e.g. `fouadbarkaoui.dev`?) and whether it links back to Kanz
- [ ] Resume PDF (the Resume card says "Soon")
- [ ] Any experience entries — roles, internships, dates, with what may be public
- [ ] Certificates or courses for Recognition
- [ ] Screenshots / recording of Kanz to use; ASSAS architecture details he is happy to share
- [ ] Other personal projects to add as smaller cards — candidates he has built:
      Sentinel Ops Console (SOC lab simulator), the "Hrbān" CVE tracker with SOC dashboard,
      the async CTI aggregation tool, the local AI Resume Optimizer Studio, Spatial Notes.
      **Confirm each one first**, and never include internal or employer work.
- [ ] Contact form backend (Supabase table, Formspree, or mailto only)

---

## 7. Done when

- Every fact on the page appears in section 2 or was confirmed by Fouad.
- EN and AR both read fully, with no layout breaks at 360 px, 768 px and 1440 px.
- Light and dark both pass contrast.
- Deployed preview URL shared for review.
