# Publishing the Crossplane Explorer Plugin

Step-by-step guide to build and publish this plugin to [Artifact Hub](https://artifacthub.io/) so users can discover and install it via Headlamp's Plugin Catalog.

Based on: [Headlamp Publishing Docs](https://headlamp.dev/docs/latest/development/plugins/publishing)

---

## Prerequisites

- A **GitHub repository** containing this plugin code
- **Git** initialized and pushed to GitHub

---

## Step 1: Configure artifacthub-repo.yml

Edit `artifacthub-repo.yml` and replace the placeholders:

```yaml
owners:
  - name: Your Name          # ← Your name
    email: you@example.com   # ← Your email
```

This proves you own the repository to Artifact Hub.

---

## Step 2: Build and Package the Plugin

From the plugin root directory:

```bash
npm install
npm run build
npm run package
```

This will:

1. Build the plugin for production
2. Create `crossplane-explorer-plugin-0.1.0.tar.gz`
3. Print the **checksum** (e.g., `Tarball checksum (sha256): b8856149706c929607ce79fa4ba8c8da2a31cff4fcd601194f20059cf189ab82`)

If you get a new checksum, update `artifacthub-pkg.yml` → `headlamp/plugin/archive-checksum` to use it in the format: `SHA256:<checksum>`.

---

## Step 3: Configure artifacthub-pkg.yml

Edit `artifacthub-pkg.yml` and replace placeholders with your repo details:

| Placeholder        | Replace with                                      |
|--------------------|---------------------------------------------------|
| `<YOUR_ORG>`       | Your GitHub org or username (e.g., `vinishsoman`) |
| `<YOUR_REPO>`      | Repository name (e.g., `crossplane-explorer-plugin`) |
| `logoURL`          | Full URL to your logo (e.g., raw GitHub URL)      |

The `archive-url` must point to the tarball in a **GitHub Release** (created in Step 4).

---

## Step 4: Create a GitHub Release

1. Go to your GitHub repo → **Releases** → **Create a new release**
2. **Tag:** `v0.1.0` (must match `version` in artifacthub-pkg.yml)
3. **Title:** e.g., `v0.1.0` or `Crossplane Explorer Plugin 0.1.0`
4. **Description:** Optional release notes
5. **Attach assets:** Upload `crossplane-explorer-plugin-0.1.0.tar.gz`
6. Click **Publish release**

The tarball URL will be:
```
https://github.com/<YOUR_ORG>/<YOUR_REPO>/releases/download/v0.1.0/crossplane-explorer-plugin-0.1.0.tar.gz
```

Make sure this matches `headlamp/plugin/archive-url` in `artifacthub-pkg.yml`.

---

## Step 5: Push Config Files to GitHub

```bash
git add artifacthub-repo.yml artifacthub-pkg.yml
git commit -m "Add Artifact Hub configuration for plugin publishing"
git push origin main
```

---

## Step 6: Register Repository in Artifact Hub

1. Go to [Artifact Hub](https://artifacthub.io/)
2. Sign in or create an account
3. Click **Add** in your Control Panel
4. Choose **Headlamp plugin** as the repository kind
5. Enter:
   - **Name:** e.g., `crossplane-explorer`
   - **URL:** Your GitHub repo URL (e.g., `https://github.com/vinishsoman/crossplane-explorer-plugin`)
6. Click **Add**

Artifact Hub will scan the repo. If `artifacthub-repo.yml` and `artifacthub-pkg.yml` are correct, your plugin will appear.

---

## Step 7: Enable in Headlamp

Users can install the plugin via the Plugin Catalog in Headlamp:

1. Open Headlamp → **Plugins** (or **Plugin Catalog**)
2. Turn off **"Only official plugins"** if your plugin is not yet official/allow-listed
3. Find **Crossplane Explorer** and install

---

## Checklist Summary

- [ ] Edit `artifacthub-repo.yml` (name, email)
- [ ] Run `npm install && npm run build && npm run package`
- [ ] Update `artifacthub-pkg.yml` (org, repo, logoURL, checksum if changed)
- [ ] Create GitHub release with tag `v0.1.0` and attach the tarball
- [ ] Push `artifacthub-repo.yml` and `artifacthub-pkg.yml` to GitHub
- [ ] Register the repo in Artifact Hub as a Headlamp plugin

---

## Future Releases

For new versions (e.g., v0.2.0):

1. Bump `version` in `package.json`
2. Run `npm run build && npm run package`
3. Update `artifacthub-pkg.yml` with new version, archive-url, and checksum
4. Create a new GitHub release with the new tag and tarball
5. Push the changes
