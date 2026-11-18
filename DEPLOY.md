# Deploying Encyclopedia Bogdannica

Frontend on Vercel, backend (Django API) on Render with managed Postgres,
uploaded images in an S3-compatible bucket.

## 1. Media bucket (once)

Create a bucket on Cloudflare R2 (free tier) or AWS S3 and allow public reads
(or keep it private and set `AWS_QUERYSTRING_AUTH=true`). Create an access key
with read/write on that bucket. Note:

- bucket name
- access key id / secret
- endpoint URL (R2 only): `https://<account-id>.r2.cloudflarestorage.com`
- public hostname: R2 `pub-xxxx.r2.dev` or AWS `<bucket>.s3.<region>.amazonaws.com`

## 2. Backend on Render

1. Push the repo to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repo. `render.yaml` creates
   the `bogdannica-api` web service and the `bogdannica-db` Postgres database.
3. Fill the env vars marked `sync: false` in the service's **Environment** tab:

   | Variable | Value |
   |---|---|
   | `DJANGO_ALLOWED_HOSTS` | `bogdannica-api.onrender.com` (your service hostname) |
   | `CORS_ALLOWED_ORIGINS` | `https://<your-app>.vercel.app` |
   | `BACKEND_URL` | `https://bogdannica-api.onrender.com` |
   | `FRONTEND_URL` | `https://<your-app>.vercel.app` |
   | `AWS_*` | from step 1 |

   Optional e-mail vars are listed in `backend/.env.example`.
4. Deploy. `build.sh` installs deps, runs `collectstatic` and `migrate`.
5. Create the first admin. The free plan has no Shell tab, so add three
   env vars in the **Environment** tab: `DJANGO_SUPERUSER_USERNAME`,
   `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD`. Saving triggers a
   redeploy and `build.sh` creates the account. Then delete the three vars.
   (Paid plans can instead run `python manage.py createsuperuser` in **Shell**.)

Any other host (Railway, Fly.io, a VPS) works too: run `build.sh`, then start
with the `web` command from `backend/Procfile`, with the same env vars.

## 3. Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory**: `frontend` (Vite is auto-detected).
3. **Environment Variables**: `VITE_API_URL` = `https://bogdannica-api.onrender.com`
   (no trailing slash). This is baked in at build time, so set it *before*
   deploying; if you change it later, trigger a redeploy.
4. Deploy. `frontend/vercel.json` rewrites all routes to `index.html` for
   React Router.
5. Go back to Render and make sure `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL`
   match the Vercel URL exactly (scheme included). Add a custom domain to both
   sides later if you want stable URLs.

## Moving existing local data

The production database starts empty. To carry over local SQLite content:

```bash
cd backend
python manage.py dumpdata accounts memes --natural-foreign --natural-primary --indent 2 > dump.json
# then, with DATABASE_URL pointing at production:
python manage.py loaddata dump.json
```

Locally uploaded images in `backend/media/` must be copied into the bucket
under the `media/` prefix (or re-uploaded through the app).

## Local development

Nothing changes: with no `DATABASE_URL` and no `AWS_STORAGE_BUCKET_NAME`,
SQLite and `backend/media/` are used as before. Copy `backend/.env.example`
to `backend/.env` to get started.
