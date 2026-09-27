# Android APK

Owner request (2026-09-27): an installable Android build, so testers whose phones could not open the web game can play.

`android/` is a small wrapper app. It is a full-screen WebView that plays the built game from the APK itself, so no network is needed. `MainActivity.serve` serves the files under the reserved `https://appassets.androidplatform.net` origin, because WebView blocks the game's relative `fetch` calls on `file://`. The system bars are hidden, the screen stays on, and both orientations work.

The game files are copied from `dist/` at build time (the `copyGame` task). Two things are left out:
- `review/`: review material, 61 MB.
- The six scene PNGs that the game now loads as WebP.

Result: about 65 MB, 148 files. The app uses the same build as the website, lazy loading and all.

## Build

Needs JDK 17+, Gradle 8.11+ and the Android SDK (`platforms;android-35`, `build-tools;35.0.0`). The SDK downloads from `dl.google.com`, so a cloud environment needs network access that allows it.

```
export ANDROID_HOME=/path/to/android-sdk   # or put sdk.dir in android/local.properties
npm run apk                                # npm run build, then gradle assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

Set `APK_VERSION_CODE` and `APK_VERSION_NAME` to number a release. A phone only installs an update over an older copy if the version code is higher and the APK is signed with the same key.

## Signing

Builds are signed with the Gradle debug key. Each machine and each cloud container has its own debug key, so an APK from a new container cannot install over one from an old container: testers must uninstall first. For a stable key (sideloading updates, or the Play Store), create a release keystore once and keep it outside the repo. `*.keystore` and `*.jks` are ignored. Losing that key means users must uninstall to update.

## Verification

- No Android emulator runs here (no KVM), so the WebView itself was not run on a device.
- The APK's own game files were unpacked, served, and checked with `tests/lazy-assets-browser.mjs`, `tests/hud-polish-browser.mjs` and the roster, Spark, Turtle, Panda combat, pacing and painted-VFX suites. All passed.
- `frog-canon` and `water-browser` fetch the original scene PNGs to prove they are untouched. The APK leaves those files out on purpose, so those two suites are run against the website build instead.
