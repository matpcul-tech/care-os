# Cutover: managed Supabase → self-hosted (get off their logs)

This moves CareCircle from the managed Supabase cloud onto your own stack:
same Supabase software, your host, your logs. When it's done and verified, you
pause/delete the managed project.

> Do a **dry run against a staging clone first.** This touches auth accounts,
> PHI, and encrypted document blobs; a mistake can lock users out or lose data.

## The three make-or-break rules

1. **`VAULT_KEY_HEX` must be byte-for-byte identical to the managed
   deployment.** Vault documents *and* MFA secrets are AES-256-GCM-encrypted
   with it. Copy it from the current app's env (e.g. Vercel → Project →
   Settings → Environment Variables). Lose it and every vault file / MFA
   secret becomes undecryptable — there is no recovery.

2. **`JWT_SECRET` and the anon/service keys are a matched set.** The self-hosted
   `ANON_KEY`/`SERVICE_ROLE_KEY` must be JWTs signed with the self-hosted
   `JWT_SECRET` (that's what `generate-keys.mjs` produces). Do **not** paste the
   managed project's anon/service keys into the self-hosted stack unless you
   also reuse its `JWT_SECRET`. Changing `JWT_SECRET` just means existing login
   sessions end and users sign in again — passwords are unaffected (see #3).

3. **Match the auth version.** Users' passwords migrate because GoTrue stores
   bcrypt hashes in `auth.users` and the data is copied verbatim. For the COPY
   to load cleanly, the self-hosted GoTrue image must be **the same major
   version or newer** than the managed project's. Check the managed version
   (Supabase → Project Settings → Infrastructure) and bump the `auth` image pin
   in `docker-compose.yml` if needed.

## Prerequisites

- The self-hosted stack running on your host (`docker compose up -d`) with app
  migrations applied (`./scripts/apply-migrations.sh`) and `smoke-test.sh`
  green — see [README.md](./README.md).
- The managed project's **direct** DB URI (Settings → Database → Connection
  string → URI, port 5432 — not the 6543 pooler).
- The managed project's **service_role key** (Settings → API).
- `pg_dump`/`psql` clients v15, Node 18+.
- The current `VAULT_KEY_HEX`.

## Steps

### 0. Freeze writes (recommended)
Put the app in maintenance / stop accepting writes for the cutover window so no
new data lands in the managed project after you dump it.

### 1. Export from the managed project
```bash
cd self-host
export MANAGED_DB_URL="postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
./scripts/export-from-managed.sh          # writes dump/*.sql (PHI — keep safe)
```

### 2. Import the data into your stack
```bash
./scripts/import-to-selfhost.sh           # loads auth + public + storage rows
```

### 3. Copy the encrypted vault blobs
```bash
MANAGED_URL="https://<ref>.supabase.co" \
MANAGED_SERVICE_KEY="<managed service_role key>" \
SELFHOST_URL="https://api.yourdomain" \
SELFHOST_SERVICE_KEY="<self-hosted SERVICE_ROLE_KEY>" \
  node scripts/migrate-storage.mjs
```

### 4. Point the app at your stack
Update the app's env (Vercel, or wherever it runs) and redeploy:
```
NEXT_PUBLIC_SUPABASE_URL=https://api.yourdomain          # your gateway (TLS)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<self-hosted ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<self-hosted SERVICE_ROLE_KEY>
VAULT_KEY_HEX=<unchanged — same as managed>
```
`NEXT_PUBLIC_*` are compiled into the client bundle, so a **redeploy/rebuild is
required** for the URL/key change to take effect. (Or run the app in the same
stack via `docker-compose.app.yml` — see the README.)

### 5. Verify before you cut traffic over
- `./scripts/smoke-test.sh` green against the self-hosted gateway.
- Log in as a **real migrated user** (password should work).
- Open the **Vault** and download a file (proves blobs + `VAULT_KEY_HEX` +
  storage all line up).
- If a user had MFA, confirm the TOTP prompt still accepts their code.
- Spot-check row counts: `auth.users`, `care_circle`, `vault_files` match the
  managed project.

### 6. Decommission the managed project
Once you're satisfied and traffic is on your stack, **pause** the managed
Supabase project (reversible) for a cool-off period, then **delete** it. That's
the point PHI stops flowing through their infrastructure and logs.

### 7. Clean up
Delete the `dump/` files (they contain PHI) or move them to encrypted cold
storage.

## Rollback

Until step 6, rollback is just repointing the app's `NEXT_PUBLIC_SUPABASE_URL`
back to the managed project and redeploying — the managed data is untouched by
this process (all reads). Keep the managed project paused, not deleted, until
you've run on the self-hosted stack long enough to trust it.

## Notes

- `phi_access_log`, `user_mfa`, and `rate_limits` are intentionally **not**
  exported — they start fresh on the new stack (audit history restarts; users
  re-enroll MFA if their `user_mfa` rows weren't migrated). If you need to keep
  existing MFA enrollments, add `-t public.user_mfa` to the export and it will
  carry over (secrets stay valid because `VAULT_KEY_HEX` is unchanged).
- The import disables triggers during load, so backfilled rows don't spam the
  audit log. Post-import, triggers are active again automatically for new writes.
