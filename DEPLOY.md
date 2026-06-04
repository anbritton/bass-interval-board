# Put the app on your phone (free GitHub Pages)

## Step 1 — Turn on the publisher (one time)

1. Open **https://github.com/anbritton/bass-interval-board/actions**
2. Click **“Publish site to gh-pages”** → **Run workflow** → **Run workflow** (green button).
3. Wait until the run has a **green checkmark** (~1 minute).

## Step 2 — Turn on Pages (this fixes the 404)

1. Open **https://github.com/anbritton/bass-interval-board/settings/pages**
2. Under **Build and deployment**, find **Branch** (not “GitHub Actions”).
3. Choose:
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`
4. Click **Save**.

## Step 3 — Open on your phone

After 1–2 minutes:

**https://anbritton.github.io/bass-interval-board/**

---

## Still 404?

- Repo must be **Public** (Settings → General → change visibility).
- **Actions** must be allowed (Settings → Actions → General → Allow all actions).
- Confirm the **gh-pages** branch exists (branch dropdown on the repo home page).
- Use a **desktop browser** for Settings → Pages if the phone app hides options.

## Why `localhost` fails on a phone

`localhost` on the phone means the phone itself, not your Mac. Use the GitHub URL above instead.
