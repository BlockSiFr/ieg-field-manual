# Deployment

1. Provision with Bicep (`infrastructure/main.bicep`) after `cloud.deploy` authorization.
2. Configure GitHub secrets: `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. Upload gated sample to `dastor-samples` container.
4. Set Function app settings from Key Vault references.
5. Attach custom domain `ieg.blocksifr.com` (see DNS instructions).
6. Verify `/api/health`, sample request, and headers.
