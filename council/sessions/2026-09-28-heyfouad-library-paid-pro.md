# Council — 2026-09-28 — Heyfouad Library as paid Pro

## Idea (flat)
Heyfouad Library is a web app (installable, works offline) built by one developer, a Moroccan cybersecurity/IT professional, first for himself. It bundles many personal-productivity tools in one private workspace: notebook, task board, calendar, daily habits with streaks and goals that break into tasks, a bookmark/"save links" manager, articles & media, a course tracker, document storage, a vault, a news board, a medication catalog, analytics, and shared team workspaces synced through Supabase. It is free today; the interface shows a "Pro" tier but there is no pricing or payment yet. The plan to make money would be a paid Pro subscription for individuals or small teams.

## Believer
- Pain: Moroccan SOC analyst / IT admin (~28) at a bank, telecom, MSSP or government body — shift work, cert study, saves dozens of CVE write-ups, tracks habits, keeps ID scans "somewhere safe", juggles Notion, Todoist, Google Calendar, a read-later app and Drive, and works on restricted networks where cloud tools fail.
- Today: Notion Plus $10/mo + Todoist Pro $4/mo + Raindrop Pro $28/yr ≈ $16–17/mo ≈ 160 MAD (vendor pricing pages); 2–3 h/week lost to switching (assumption); sensitive documents in US clouds.
- Why now: Pocket shut down 8 July 2025 and Omnivore in Nov 2024; Notion moved full AI to the $20 Business plan (May 2025); AI coding lets one developer ship ~14 modules; PWAs + Supabase free tier.
- Best case (18 months): 10k weekly actives, 4% on Pro at $4/mo + 40 teams at $30/mo ≈ $2.8k MRR (assumption).
- Must be true: real offline-first operation and a verifiable end-to-end-encrypted vault, one-click imports, Morocco-compatible payments (Stripe doesn't support Moroccan merchants → Paddle or CMI), trust positioning, and one killer workflow (save CVE link → study task → course goal).

## Skeptic
- Won't pay: the SOC analyst ("upload my ID scans to a one-person app on Supabase? I'd flag that in a phishing review"); banks and government employers (unapproved SaaS = shadow IT, blocked at the proxy); anyone already on free tiers.
- Competitors: Anytype (local-first, E2E, open source, free sync), Obsidian, Logseq, Joplin, AppFlowy; Karakeep/Linkwarden/Linkding for links; Bitwarden/KeePassXC for vaults; Telegram saved messages, spreadsheets, a USB key.
- Too close to see: the persona runs free tiers, so the real alternative costs $0; Moroccan law 09-08/CNDP rules for health and ID data stored abroad (assumption); "distrust US clouds" contradicts syncing through Supabase.
- Year-one death: no buyer; the founder is the only daily user; 14 modules plus sync plus E2E eat the evenings; Pro never gets a price. Paddle supports Morocco, so trust and focus are the blockers, not payments.
- Weakest argument: the $2.8k MRR best case isn't worth it; the "why now" applies to US paying users; "AI lets one dev ship 14 modules" also means anyone can; the must-haves are all unbuilt; the wedge comes last.
- Survivable version: drop the vault, meds and team sync; ship a free, local-only cert study tracker built around CVE → task → course.

## Investor
- Price: nobody pays today. The only sellable thing is a certification study + CPE tracker at $36/yr, annual billing only (assumption). The reason to pay again is CPE renewal: CISSP needs 120 CPE credits every 3 years (ISC2) and Security+ needs 50 CEUs every 3 years (CompTIA).
- Unit economics: Paddle charges 5% + $0.50 (≈ $2.30/yr on annual; monthly billing ≈ 22% in fees). Supabase Pro at $25/mo is needed once uploads grow, ≈ $3/user/yr at 100 payers. Margin ≈ $30.70/user/yr, but 100 payers means about $12/hour for the founder at 5 h/week of upkeep (assumption).
- First ten customers: direct messages to people asking about exam dates in 3 Moroccan/francophone Security+/CEH/CISSP Telegram/Discord groups plus LinkedIn; a 60-second demo of one workflow; a founding seat at $36/yr with a 15-minute onboarding call.
- Cheapest test: a one-page site with a real price and a checkout (Paddle or a 360 MAD bank transfer), a demo video and 30 direct messages, ≈ $15. Pass = 5 payments in 7 days; fail = 0–1.
- Would invest: NO. There is no proven demand; the sellable feature is unbuilt; the vault, meds and team modules add legal and trust risk; the founder's time is limited; the upside is small. Would revisit after 10 people have paid for the study tracker alone.

## Judge
VERDICT: KILL

WHY: The Skeptic made the strongest argument. The Believer's "$16–17/mo saving" is really $0 for a persona on free tiers, and the "trusted offline vault for security pros" collapses once ID scans and medications sit in an unaudited one-person app on US-hosted Supabase. The Believer was the weakest argument, since it rests on an assumed $2.8k MRR and a "why now" aimed at paying US users. The Investor's money test settles it: a 14-module workspace with zero payers and no price fails "5 paid in 7 days" by definition. The Skeptic and the Investor were right, and independently agreed that the only thing anyone might pay for is a different, smaller product: a cert study and CPE tracker. Keep Heyfouad Library as your personal tool and stop treating it as a business.

BIGGEST RISK: No one but you will ever pay for any of this, and you'll spend your evenings maintaining 14 modules without ever finding out.

DE-RISK IT: Today, send 10 direct messages to people asking about exam dates or CPEs in Moroccan/francophone Security+/CEH/CISSP Telegram or Discord groups: "How do you track your CPE credits and study plan today? If a tool turned saved write-ups into study tasks and auto-logged CPEs, would you take a founding seat at $36/year? Reply YES and I'll send the invoice when it's ready." If fewer than 2 reply YES, drop the commercial plan entirely.

IF FIX FIRST: Not applicable to the workspace. Only a separate product is worth testing: a local-first cert study and CPE tracker built around one workflow (save CVE link → study task → CPE logged), with no vault, meds or team features. Build it only after at least 5 people have paid upfront.
