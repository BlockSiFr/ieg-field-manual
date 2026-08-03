# Threat model — ieg.blocksifr.com

## Assets

- Protected manuscript and sample PDFs
- Lead/consent records
- Signed download capability
- Brand/reputation integrity

## Threats and controls

| Threat | Control |
|---|---|
| Lead-form abuse | Rate limits, validation, optional CAPTCHA |
| Email bombing | ACS throttling; confirm before send; stub when unconfigured |
| Download-link sharing | Short TTL signed URLs; no permanent public blob URLs |
| Blob enumeration | Private containers; no public access |
| CRM injection | Zod validation; adapter isolation |
| Stored content injection | Static generation; encode outputs |
| Unauthorized manuscript publication | Public/protected classification; leak scan in `verify-assets` |
| Build/supply-chain compromise | Lockfile, CI audit, secret scan |
| Analytics exposure | No PII/manuscript in events |
| Env leakage | Key Vault; no secrets in frontend |

## Residual risk

Production email/CRM/storage credentials not yet provisioned in this compute cell—delivery runs in stub mode until configured.
