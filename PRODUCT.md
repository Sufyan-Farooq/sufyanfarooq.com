# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitors to Sufyan's personal portfolio: prospective employers are the current priority, alongside clients and collaborators.

## Product Purpose

Present Sufyan Mohammed Farooq as a builder who uses technology to solve business needs and make people's lives easier. Showcase his background, selected work, skills, experience, and contact options so visitors can explore the projects and get in touch.

## Positioning

Updated 30 October 2026 at the user's request: an ops and automation builder. Headline: "I keep systems running and automate the rest." The foundation is 3+ years of production support at Digival. The proof is self-hosted apps, CI/CD, AI agent automation and scripting. Target roles: DevOps and cloud support, automation and AI agents, application support. Do not claim a DevOps job title or DevOps employment. Label Kubernetes, Helm, Argo CD, Prometheus and Grafana as training. Describe websites by what was delivered rather than emphasizing payment. Do not add claims beyond the confirmed experience, the user's CVs (DevOps, Agent Engineer, latest; October 2026) and project sources.

Confirmed from the user's CVs: ~300 exam sessions a year behind the dashboard; AWS email delivery queuing diagnosis; 30% reduction in ticket response times from bilingual documentation; bilingual voice booking agent (Vapi/Retell, OpenAI, n8n); Meta click-to-WhatsApp AI sales agent (n8n, OpenAI, WhatsApp Business API); Python health monitoring daemon; AI coding agents in daily work. Not used publicly: the "99%+ SLA" and "Reliability Coordinator" title variants from older CVs, and private client repos (customs clearance, Bulker, others). The user said private work cannot be disclosed yet.

## Capabilities and Constraints

The site is a single-page portfolio served by the Express server. It includes a live service board (`/api/status`, probing the deployed apps every 5 minutes; `/status.svg` for the GitHub README), the latest run of its own deploy pipeline (`/api/pipeline`), project links, work experience, a stack overview, contact links (email, WhatsApp, phone, LinkedIn, GitHub, CV) and a contact form, and responsive navigation. Check history and outage incidents persist in stats.json under `monitor`; the board shows uptime only after an hour of data and states the last recorded outage. Visits are still recorded (`/api/stats`) but no longer shown on the page. Preserve existing content and working features during the visual overhaul unless the user asks to change them.

## Brand Commitments

The existing name, logo, portrait, and supplied portfolio content are the current identity assets. The user supplied Mawarith and TurnUp screenshots as visual references for the overhaul.

## Evidence on Hand

Portfolio copy and existing project details are in `index.html`; identity assets are in `assets/`. The user added two past client websites, [Omar Global LLC](https://omergloballlc.com/) and [NAQL](https://naqlapp.com/), and identified TurnUp and Mawarith as visual references. The site contains no user-provided testimonials. The retained CV confirms university platforms serving 2,000+ users, an API dashboard that reduced daily verification from approximately two hours to under five minutes, 98% client satisfaction, and 50+ defect escalations. Preserve these supplied facts without amplification.

## Product Principles

- Keep the portfolio's supplied facts and project descriptions intact.
- Make the work and contact paths easy to find.
- Keep existing interactive features usable across screen sizes.
- Do not invent testimonials, outcomes, or audience-specific claims.
- Describe the work through the business needs it serves, using only confirmed project facts.

## Open Decisions

- Employment is the current priority. Show immediate availability, transferable iqama, Jeddah location, and relocation flexibility.
- Lead with Digival experience and the dashboard outcome, then feature Riyasat and business websites. Keep TurnUp in supporting personal project/deployment work and link its live application at https://turnup.sufyanfarooq.com/. The user confirmed it is live on 20 October 2026.
- Offer the CV at `assets/cv/Sufyan_Farooq_CV.pdf` through the hero, navigation, contact section, footer, and quick actions. Since 30 October 2026 it is generated from `assets/cv/cv.html` (same navy and studio-grey look as the site) by printing that page to PDF with headless Chrome; edit the HTML, then re-export. Keep it consistent with the role-specific CVs in the jobs-mail workspace.
- Education is BCA, with MBA in progress in the final year. Professional DevOps employment is not claimed.

## Confirmed project corrections 20 October 2026

- Remove the AI & Systems Defense Lab. The user rejected it as an inaccurate representation; do not restore it or infer security experience from it.
- NAQL includes both its public logistics website at https://naqlapp.com/ and the Truck Dispatcher TMS at https://app.naqlapp.com/. The latter is access-controlled, not an open public demo.
- The current Truck Dispatcher implementation handoff and code support dispatch, fleet/driver assignments, delivery evidence, and billing readiness. Do not infer live payment, Bayan, ZATCA, bank, or continuous GPS integrations.
- Show NAQL alongside selected applications, after Riyasat. Consolidate the earlier generic TMS entry into NAQL.

- Use **naqlapp** as the displayed project name, as explicitly requested by the user. It includes the landing page and Truck Dispatcher TMS.

- Do not showcase the email outreach automation tool on the public portfolio or CV. It is used to contact employers, and the user explicitly asked to remove it from public-facing projects. Preserve the mailer itself.
