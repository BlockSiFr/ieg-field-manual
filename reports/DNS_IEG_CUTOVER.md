# DNS cutover - ieg.blocksifr.com

Canonical publication domain for The IEG Field Manual (formerly DASTOR).

## Azure Static Web App

| Field | Value |
|---|---|
| Resource group | `rg-blocksifr-dastor-prod` |
| Static Web App | `swa-blocksifr-dastor-prod` |
| Default host | `orange-forest-04055830f.7.azurestaticapps.net` |

## GoDaddy records (blocksifr.com)

Create:

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT | `asuid.ieg` | (SWA validation token - run `az staticwebapp hostname set` after CNAME, or copy from Azure portal custom domain blade) | 600 |
| CNAME | `ieg` | `orange-forest-04055830f.7.azurestaticapps.net` | 600 |

Keep existing:

| Type | Host | Value |
|---|---|---|
| CNAME | `dastor` | `orange-forest-04055830f.7.azurestaticapps.net` |

Legacy `dastor.blocksifr.com` continues to serve the same SWA and client-redirects to `ieg.blocksifr.com` preserving path.

## After DNS propagates

```bash
az account set --subscription cd7ed6be-9872-448f-ae4e-4d7ede52d818
az staticwebapp hostname set -g rg-blocksifr-dastor-prod -n swa-blocksifr-dastor-prod --hostname ieg.blocksifr.com
az staticwebapp hostname list -g rg-blocksifr-dastor-prod -n swa-blocksifr-dastor-prod -o table
curl -I https://ieg.blocksifr.com/
curl -I https://dastor.blocksifr.com/chapters/ai-is-not-software
```

## Validation

- Homepage title: The IEG Field Manual
- No primary "DASTOR" brand lockup
- Free access CTAs (Read the Manual)
- Legacy path redirects preserve chapter URLs
