# az_container_application_repo

Node.js frontend for Mobile Construction Management, deployed to Azure Container Apps
(`ca-mcm-<env>-frontend`). Infrastructure lives in
[`ramugiri/az_container_app`](https://github.com/ramugiri/az_container_app).

## Run locally

```bash
npm test
npm start            # http://localhost:8080  (health: /health)
docker build -t mcm-frontend . && docker run -p 8080:8080 mcm-frontend
```

No runtime dependencies; Node 20+.

## Pipeline

`.github/workflows/deploy.yml`

| Trigger | What happens |
|---|---|
| Pull request to `main` | `npm test` |
| Push to `main` | test -> build -> push to ACR -> deploy to **dev** |
| Run workflow (manual) | same, to the chosen environment |

Deploy steps:

1. Finds the registry in `rg-mcm-<env>-canadacentral-001`.
2. The registry is private-only, so the runner's IP is allowed through the ACR
   firewall for the push and removed afterwards (even on failure).
3. Pushes `madg-construction-observations:<git-sha>` and `:latest`.
4. `az containerapp update` to the SHA tag (revision suffix `r<sha7>`), sets ingress
   target port 8080 if needed, and waits for the revision to report Healthy.

If the container app does not exist yet, the image is still pushed and the deploy
step is skipped with a warning - run the infra pipeline, which creates the app from
`:latest`.

## Setup (once per environment)

GitHub -> Settings -> Environments -> `dev`, with secrets:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | app registration `gh-az-mcm-app-infra` |
| `AZURE_TENANT_ID` | tenant ID |
| `AZURE_SUBSCRIPTION_ID` | target subscription |

The app registration needs a federated credential with subject
`repo:ramugiri@43937740/az_container_application_repo@1395228835:environment:<env>`
(and the legacy form `repo:ramugiri/az_container_application_repo:environment:<env>`),
plus `AcrPush` on the registry and rights to update the container app.

## Access

The Container Apps environment is internal (ILB), so the app URL resolves only
inside the VNet. See the infra repo for exposing it via Application Gateway.
