# Cloudflare dependency-install repair

The supplied deployment log for c008c2f identifies the fatal error as npm 10.8.2 rejecting package-lock.json because esbuild 0.28.2 and its platform packages were absent. The earlier npm 11.9.0 clean install and GitHub checks accepted that lockfile, so those checks did not reproduce the host's installer.

Reproduced with `npx --yes npm@10.8.2 ci --dry-run --ignore-scripts --no-audit --no-fund`. Repaired with `npx --yes npm@10.8.2 install --package-lock-only --ignore-scripts --no-audit --no-fund`. The repair adds missing package entries; it changes no existing package versions. CI now installs npm 10.8.2 before the clean install, tests and production build.

There is also a runtime configuration mismatch: Cloudflare selects Node 18.20.8 despite the committed .node-version containing 24. The dependency engine warnings in the log require a newer Node runtime. Set NODE_VERSION to 24 in the Epistable Pages project's Preview and Production build variables, or remove the conflicting override so the repository file is honoured. This is a hosting setting, not an Auth/Supabase change. Cloudflare documents this setting at https://developers.cloudflare.com/pages/configuration/build-image/.

The dashboard was inaccessible behind Cloudflare security verification, so no hosting settings were changed by this repair. Frontend release still requires a passing Cloudflare preview and authenticated desktop/mobile verification before merging.
