# Security architecture

- Azure Static Web Apps + Functions
- Private Blob containers for samples/manual
- Key Vault for secrets; managed identity preferred
- Strict CSP and security headers via `staticwebapp.config.json`
- Zod validation on all write APIs
- CRM adapter with queue fallback (no silent lead loss)
- Commerce feature-flagged off by default
