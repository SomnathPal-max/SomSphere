# TWA (Trusted Web Activity) APK Build Guide

This guide explains how to wrap the SomSphere Progressive Web App (PWA) into a distributable native Android APK / AAB using **Trusted Web Activity (TWA)**. TWAs allow your PWA to run in a full-screen, native Android app container leveraging the device's Chrome browser engine with zero browser UI.

## Prerequisites

To build a TWA locally, your development machine requires:
1. **Node.js**: v14.0 or above.
2. **Java Development Kit (JDK)**: JDK 11 is highly recommended.
3. **Android SDK Command-line Tools**: Installed via Android Studio to compile the APK.

## Step 1: Verify PWA Assets

Ensure your PWA generates and serves the following correctly:
- `manifest.json`: Found in `public/manifest.json`. Ensure `start_url`, `theme_color`, `background_color`, and `icons` are accurately pointing to your production site.
- `service-worker.js`: Found in `public/service-worker.js` to ensure the app works offline.

## Step 2: Set up Digital Asset Links
For a TWA to launch without showing the Chrome URL bar at the top, Android must verify you own both the App and the Web Domain.
Create a `.well-known/assetlinks.json` file on your hosted web domain:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.somsphere.app",
    "sha256_cert_fingerprints": [
      "YOUR_APP_SIGNING_KEY_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```
*Note: You will generate the SHA256 fingerprint during the build phase.*

## Step 3: Initialize Bubblewrap
Google provides a CLI tool called **Bubblewrap** that automatically generates the Android Studio project from your `manifest.json`.

In an empty directory locally, run:
```bash
npx @bubblewrap/cli init --manifest="https://your-production-somsphere-domain.com/manifest.json"
```

Bubblewrap will prompt you to configure:
1. **Application Name**: (e.g., SomSphere)
2. **Package Name**: (e.g., com.somsphere.app)
3. **Display Mode**: standalone
4. **KeyStore Setup**: It will ask to create a keystore file for signing the APK. Create one and save the password.

## Step 4: Build the APK
Once the project is initialized, generate the final `.apk` and `.aab` packages by running:

```bash
npx @bubblewrap/cli build
```

This will produce:
- `app-release-bundle.aab`: To upload to the Google Play Store.
- `app-release-signed.apk`: To directly sideload and distribute to users.

## Step 5: Finalize Verification
After building, Bubblewrap will output the SHA256 fingerprint of your new signing key. 
1. Copy that fingerprint.
2. Update the `.well-known/assetlinks.json` file on your web server with the new fingerprint.
3. Your TWA is now ready to run natively on Android devices without URL bars!
