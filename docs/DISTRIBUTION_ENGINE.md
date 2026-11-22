# Consequence Intelligence Distribution Engine

## Positioning
Make the public IEG site useful enough to **solve an immediate problem**, **circulate within teams**, and **create justified demand** for scoped consequence assessments.

## Visitor journey
1. **Discover**: Find the site from a focused sector problem, a shared template, or a colleague's consequence brief.
2. **Learn**: Read a targeted, non-promotional explanation of the consequence and the necessary evidence.
3. **Use**: Draft a consequence question in the client-only `/brief` tool.
4. **Export**: Download Markdown, copy the brief, or share the *tool link only*. The user's case text is never automatically shared.
5. **Review**: Discuss a documented hypothesis and appropriate validation process with colleagues.
6. **Convert**: Request a scoped assessment at `/assessment` when independent technical or financial verification is needed.

## Core assets
- `/brief`: free Consequence Brief Builder; four scenarios, illustrative templates, nine completeness requirements, evidence ladder, copy and Markdown export.
- `/toolkit`: open templates for a consequence brief, evidence classification, and board-level decision questions.
- Four use-case pages: `/consequences/security-spend`, `/consequences/ai-agents`, `/consequences/data-center`, `/consequences/software-change`.
- The original manual and chapters remain available.

## Distribution channels
- Practitioner education: point to an exact useful artifact, not the company homepage.
- Referrals: the exported brief includes the public method link; the Share button never includes personal or case data.
- Search: sitemap-indexed, canonical use-case pages with differentiated substance and structured Article / WebApplication / CollectionPage metadata.
- Partnerships: allow appropriately attributed reuse of templates under the existing CC BY 4.0 publication license.
- Academy training and workshops: start with the free worksheet and promote a governed assessment only if the work requires it.

## Instrumentation contract
Privacy-safe event names are declared in `src/lib/analytics.ts` and emitted only when existing `PUBLIC_ANALYTICS_ENABLED` is true:
- `dastor_brief_started`
- `dastor_brief_example_loaded`
- `dastor_brief_copied`
- `dastor_brief_downloaded`
- `dastor_brief_tool_shared`
- `dastor_brief_assessment_clicked`

**No user-entered case contents, personal data, or access tokens** belong in event payloads. Event hooks alone are not a reporting pipeline. An opt-in analytics consumer must be configured and verified to produce conversion reports.

## Metrics when analytics is connected
- Tool activation = distinct starts / distinct tool visits
- Qualified engagement = distinct downloads / distinct starts
- Distribution = distinct shares / distinct downloads
- Conversion = assessment requests accepted / distinct brief starts
- Evidence quality = brief completeness and meaningful test results, not percentage claims from browser input
- Channel quality = accepted leads with validated source consent and attribution

Do not publish invented conversion counts or claim independent verification based on form fields.

## Weekly operating cadence
- Publish one rigorous evidence-based answer to a sector-specific question with a practical example and link back to the brief.
- Distribute to a few relevant professional communities and partners without unsolicited bulk outreach.
- Invite educators and consultants to reuse the free templates with attribution.
- Review anonymous funnel counts (if instrumentation is configured), onboarding friction, actual qualified assessment requests, and unanswered questions.
- Improve the tool based on documented user problems, not vanity traffic.

## Release gates
- CI tests, content validations and Astro build green.
- Manual and chapter paths preserved.
- Browser/mobile check: sector switch, example load, gap display, Markdown download, clipboard fallback, link share, keyboard navigation.
- No data leakage: URL contains only an allowlisted scenario; no draft serialization, storage, or auto-submission.
- Existing Azure SWA production credential provisioned securely and production smoke checks pass.

The GitHub production credential was missing in the preceding deployment. A successful merge or preview must not be represented as a live release.
