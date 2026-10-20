# Oracle deployment

GitHub Actions checks pull requests and pushes to `main`. After checks pass,
pushes to `main` deploy to https://sufyanfarooq.com. The workflow can also be
started manually from the Actions tab on `main`.

Checks validate JavaScript syntax, exercise stored visit totals and recording
against an isolated temporary server, validate the deployment script, and build
the production Docker image.

Production runs in `/home/ubuntu/apps/sufyanfarooq.com`. Compose binds
`data/stats.json` into the container; `.env` supplies `VISIT_SALT`. Neither file
is committed or copied into the image. Deployment backs up stats under
`/home/ubuntu/backups`, checks that visits have not decreased, and restores the
previous image if container startup or local health checks fail. Deployments
briefly recreate the portfolio container. Other apps are unaffected.

Repository secrets: `ORACLE_DEPLOY_KEY` (dedicated restricted SSH private key)
and `ORACLE_KNOWN_HOSTS` (verified server host key). The server authorizes this
key with `restrict,command="/usr/local/bin/deploy-sufyanfarooq"`. That root-owned
script only accepts `deploy <SHA>` for the current `main` tip and serializes runs
with `flock`. Changes to `ops/deploy-oracle.sh` require reinstalling it on the
server with the administrator SSH key; CI cannot replace its own SSH restriction.

To redeploy the current commit, use Actions → Check and deploy portfolio → Run
workflow on `main`. To roll back site changes, revert the unwanted commit and
push the revert to `main`.

## Public CV

The portfolio serves the main-email comprehensive CV from
`assets/cv/Sufyan_Farooq_CV.pdf`. Download links in the hero, navigation,
contact section, footer, and command palette all use this same file.
Its source is `../jobs-mail/resume/campaign/Sufyan_Farooq_CV.pdf` in the
local workspace. When the canonical CV changes, copy the latest PDF into
this path before deploying. Keep the dev-email copy for email outreach.
