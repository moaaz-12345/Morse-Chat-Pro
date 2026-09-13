# Morse Chat Pro Android Build

Morse Chat Pro uses Capacitor to package the existing HTML/CSS/JavaScript frontend as an Android app. The frontend is not rewritten.

## What the Android prepare step does

- Generates `MorseApp/JS/app-config.js` with the production backend URL.
- Copies `Html`, `CSS`, `JS`, `assets`, and `Audio` into `MorseApp/www`.
- Adds a root `index.html` that opens `Html/login.html`.
- Copies `assets/notification.mp3` into Android `res/raw` for notification sound support.
- Runs `cap sync android`.

## Required local tools

- Android Studio / Android SDK
- JDK 21
- Node.js / npm

On this machine the working paths are:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME="C:\Users\moaaz\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT="C:\Users\moaaz\AppData\Local\Android\Sdk"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

## Production backend

The Android app currently targets:

```txt
https://morse-chat-pro.onrender.com
```

Before Android builds, set:

```powershell
$env:MORSE_SERVER_URL="https://morse-chat-pro.onrender.com"
```

## Build debug APK for testing

```powershell
cd "E:\materal\Morse Project\MorseApp"
$env:MORSE_SERVER_URL="https://morse-chat-pro.onrender.com"
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME="C:\Users\moaaz\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT="C:\Users\moaaz\AppData\Local\Android\Sdk"
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
npm run android:debug
```

Output:

```txt
MorseApp/android/app/build/outputs/apk/debug/app-debug.apk
```

## Build release APK / AAB

```powershell
npm run android:apk
npm run android:aab
```

Outputs:

```txt
MorseApp/android/app/build/outputs/apk/release/app-release-unsigned.apk
MorseApp/android/app/build/outputs/bundle/release/app-release.aab
```

## Production signing

For Play Store or public distribution, create and protect your own release keystore. Do not commit it to GitHub.

Recommended next step: configure Android Studio signing from:

```txt
Build > Generate Signed Bundle / APK
```

Choose:

- Android App Bundle for Google Play.
- APK for direct installation distribution.

Keep the keystore password private.
