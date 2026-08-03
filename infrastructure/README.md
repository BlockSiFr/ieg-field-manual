# DASTOR Azure infrastructure

Bicep modules provision Static Web App, Storage (private sample/manual containers + leads table), Key Vault, Log Analytics, and Application Insights.

## Deploy (after authorization)

```bash
az group create -n rg-blocksifr-dastor-prod -l eastus
az deployment group create \
  -g rg-blocksifr-dastor-prod \
  -f infrastructure/main.bicep \
  -p infrastructure/parameters/prod.bicepparam
```

Do not hardcode subscription IDs or secrets. Wire SWA ↔ Functions and managed identity role assignments in a follow-on pass when cloud.deploy is authorized.
