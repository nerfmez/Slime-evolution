# Import the supplied ready-to-publish build

This importer is for `Slime-ready-to-publish.zip` supplied on 2026-09-14.
**Installing this workflow does not upload or import the ZIP itself.**

## Upload from an iPad or any browser

1. Open this repository's **Releases** page and choose **Draft a new release**.
2. Create the tag `web-2026-09-14`, targeting the latest `main` commit. Attach the original `Slime-ready-to-publish.zip` and wait until the attachment finishes uploading.
3. Choose **Publish release**. Check **Actions → Import Slime ready-to-publish ZIP** for the result.

Do not publish the release before its ZIP has finished attaching. If the release was already published, attach the ZIP, then open the workflow's **Run workflow** button and enter the release tag.

The importer downloads that release asset on a GitHub runner. It verifies the archive SHA-256 and all extracted file bytes, then commits the 1,278 files under `published/2026-09-14/`. It does not run any code from the ZIP, replace source files, overwrite an existing import, force-push, change branch protection, or configure hosting. A branch policy that forbids the workflow push will cause a visible failure rather than being bypassed.

## Archive identity

- Original filename: `Slime-ready-to-publish.zip`
- Compressed bytes: `163804593`
- File count: `1278`
- Uncompressed bytes: `179497754`
- SHA-256: `a1f30902980df7d9a481f6ecb9b59419633f161826f43f8cf89033adcfba8a87`

The ZIP is an already-built static website containing `index.html`, `slime-motion.html`, `assets/`, and `review/`. It is not the editable Vite source snapshot and must not replace the repository root. A future host should use the imported directory as its static site root; do not run the old source build and assume it reproduces this ZIP. No hosting deployment is included here.

For a different ZIP, review and update the expected checksum, file count, byte count, destination and release trigger first. This intentionally rejects other builds rather than silently substituting them.
