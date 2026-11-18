# Production deployment: IEG Field Manual

This repository builds the public IEG Field Manual, including the canonical
Consequence Intelligence thesis at `/consequence-intelligence`.

**Current release boundary:** merging source changes is not proof of publishing.
The GitHub `Production` workflow must succeed and the public site must serve
the expected content before any release is marked live.

## Azure Static Web Apps credential

The production pipeline uses Azure Static Web Apps deployment-token authentication.
It currently requires the GitHub secret:

`AZURE_STATIC_WEB_APPS_API_TOKEN`

Configure it in **GitHub > BlockSiFr/ieg-field-manual > Settings > Environments >
production > Environment secrets**. A repository-level Actions secret of the
same name is also supported. Do not enter the token into chat, source, logs,
issues, or a pull request.

Obtain the token from the Azure portal for the **existing, correctly bound**
Static Web App. Previous deployment documentation identifies the resource as
`swa-blocksifr-dastor-prod`; confirm its identity and domain binding in Azure
before copying or regenerating any token.

The `preview` environment may use a separate secret with the same name.
Preview builds and tests run even if the token is absent; preview deployment is
explicitly reported as skipped.

## Release process

1. Ensure the intended deployment resource serves `ieg.blocksifr.com`.
2. Configure the deployment credential in the GitHub `production` environment.
3. Review and approve any environment deployment protections.
4. Merge a CI-green change into `main` or explicitly dispatch `Production`.
5. Confirm required content validation, asset checks, tests, and Astro build succeed.
6. Confirm the Azure SWA upload completes successfully.
7. Confirm the post-deploy smoke check finds the category thesis text at
   `https://ieg.blocksifr.com/consequence-intelligence`.
8. Inspect mobile and desktop layout and ensure existing manual/chapter links work.

If the token is missing, the release fails visibly before attempting an upload.
A green build without a successful upload and production smoke check is **not**
evidence that the page is live.

## Production smoke checks

```bash
curl -fL https://ieg.blocksifr.com/consequence-intelligence
curl -fL https://ieg.blocksifr.com/manual
curl -fL https://ieg.blocksifr.com/api/health
```

The `/api/health` endpoint is deployment-specific; check the actual API
configuration and do not infer API health from the static page alone.

## Escalation

- **Credential failure:** Check GitHub environment secret scope, Azure resource
  identity, and deployment-token rotation.
- **Upload failure:** Inspect the Azure/static-web-apps-deploy job log, resource
  binding, artifact paths, and token permissions.
- **Post-deploy smoke failure:** Inspect DNS, custom-domain mapping, SWA routes,
  and whether the deployment published the intended `dist` artifact.
- **Unauthorized change:** Follow the approved Control/Execution Exchange
  authority and production release process. Do not bypass STEP_UP decisions.

## Scope clarification

The corporate homepage `blocksifr.com` and application `app.blocksifr.com`
are separate deployments. This repository does not contain their identifiable
production frontend source. Changes here do not publish those properties.
