# The IEG Field Manual

**The Identity and Execution Governance Field Manual**

> AI systems do not fail loudly. They fail quietly, and still act.

The IEG Field Manual is the public doctrine for governing consequential execution across AI agents, machine identities, software systems, models, tools, workflows, and infrastructure.

It provides practitioners with:

* Failure models
* Execution-stack analysis
* Countermeasures
* Protected Action patterns
* Authority requirements
* Evidence requirements
* ExecutionReceipt concepts
* Framework mappings
* Assessment methods
* Operational governance guidance

> **Govern what systems may cause.**

> **Free doctrine. Open knowledge. Paid enforcement.**

Published openly by BlockSiFr.

## Sites

- Canonical: https://ieg.blocksifr.com
- Legacy redirect: https://dastor.blocksifr.com (formerly DASTOR)
- Repository: https://github.com/BlockSiFr/ieg-field-manual

## Read

| Path | Purpose |
|------|---------|
| `/` | Field manual home |
| `/manual` | Chapter index |
| `/chapters/*` | Individual chapters |
| `/execution-stack` | Execution-stack analysis |
| `/assessment` | Assessment methods |
| `/about` | Publication identity and continuity |
| `/sample` | Open sample chapter |

Doctrine on this site is free to read. Enforcement products (Execution Exchange, CortexTrace, and related BlockSiFr controls) are separate and paid.

## Develop

```bash
npm install
npm run dev
npm run build
```

Astro site. Production ships to Azure Static Web Apps (`swa-blocksifr-dastor-prod`).

## Migration

The IEG Field Manual, formerly **DASTOR**, is the direct continuation of the same body of work. This is a publication rename and domain cutover, not a new manual.

| Before | After |
|--------|--------|
| Publication name: DASTOR | The IEG Field Manual (Identity and Execution Governance Field Manual) |
| Canonical host: `dastor.blocksifr.com` | `ieg.blocksifr.com` |
| GitHub posture: local / prior DASTOR packaging | `BlockSiFr/ieg-field-manual` |

What stayed continuous:

* Chapter paths and history preserved where possible
* Visual system unchanged (design tokens retained)
* Doctrine remains public; access gates were removed from primary reading paths
* Evidence and ExecutionReceipt concepts carry forward under IEG naming

What redirected:

* `https://dastor.blocksifr.com/*` → `https://ieg.blocksifr.com/*` (path-preserving client redirect; legacy host remains bound)
* Citations may still mention DASTOR; treat IEG Field Manual as the current title and note “formerly DASTOR” where clarity helps

See `CHANGELOG.md` for the v1.0 rename notes.

## License

* Written doctrine: **CC BY 4.0** — see `CONTENT-LICENSE.md`
* Schemas and reference code: **Apache 2.0** — see `CONTENT-LICENSE.md`
* Trademarks: `TRADEMARKS.md` (open content does not grant trademark rights)

## Related BlockSiFr surfaces

* Execution Exchange / Control: https://app.blocksifr.com
* Corporate: https://blocksifr.com
* CortexTrace: https://cortextrace.com
