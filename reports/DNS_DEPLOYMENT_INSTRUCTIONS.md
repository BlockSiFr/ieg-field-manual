# DNS deployment instructions — dastor.blocksifr.com

**Registrar/DNS:** GoDaddy (`ns39.domaincontrol.com` / `ns40.domaincontrol.com`)  
**Do not skip validation.** Azure SWA custom domain is waiting on these records.

## Azure target (already provisioned)

| Item | Value |
|---|---|
| Resource group | `rg-blocksifr-dastor-prod` |
| Static Web App | `swa-blocksifr-dastor-prod` |
| Default hostname | `https://orange-forest-04055830f.7.azurestaticapps.net/` |
| Custom domain status | `Validating` |
| Validation method | `dns-txt-token` |

## Required GoDaddy DNS records

Add these under domain **blocksifr.com**:

| Type | Host/Name | Value | TTL |
|---|---|---|---|
| TXT | `asuid.dastor` | `_bfi0pdhmvpividlis1dekm07vzxkou8` | 600 (or 300) |
| CNAME | `dastor` | `orange-forest-04055830f.7.azurestaticapps.net` | 600 (or 300) |

Notes:
- GoDaddy host fields are usually without the apex domain (use `dastor` and `asuid.dastor`, not FQDNs).
- Do **not** create an A record for `dastor`.
- After both records propagate, Azure should move status to `Ready` automatically (often 5–30 minutes).

## Verification

```bash
dig +short TXT asuid.dastor.blocksifr.com
dig +short CNAME dastor.blocksifr.com
curl -I https://dastor.blocksifr.com/
az staticwebapp hostname list -n swa-blocksifr-dastor-prod -g rg-blocksifr-dastor-prod -o table
```

## Rollback

1. Remove CNAME `dastor` and TXT `asuid.dastor` in GoDaddy.
2. Optionally: `az staticwebapp hostname delete -n swa-blocksifr-dastor-prod -g rg-blocksifr-dastor-prod --hostname dastor.blocksifr.com`
3. Site remains available at `https://orange-forest-04055830f.7.azurestaticapps.net/`

## Propagation

TTL 600 → expect minutes; global caches up to 48h in rare cases.
