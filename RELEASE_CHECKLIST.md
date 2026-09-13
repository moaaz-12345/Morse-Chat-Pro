# Morse Chat Pro Release Checklist

## Windows

1. Set the production backend URL:

```powershell
$env:MORSE_SERVER_URL="https://morse-chat-pro.onrender.com"
```

2. Build the Windows installer:

```powershell
cd "E:\materal\Morse Project\MorseApp"
npm run build:win:prod
```

3. Upload these files to GitHub Releases:

- `MorseApp/dist/Morse-Chat-Pro-Setup-1.0.0.exe`
- `MorseApp/dist/Morse-Chat-Pro-Setup-1.0.0.exe.blockmap`
- `MorseApp/dist/latest.yml`

The `.blockmap` and `latest.yml` files are required for Electron auto update.

## Android

1. Create `MorseApp/android/keystore.properties` from `keystore.properties.example`.
2. Keep the generated `.jks` file private and backed up.
3. Build:

```powershell
cd "E:\materal\Morse Project\MorseApp"
$env:MORSE_SERVER_URL="https://morse-chat-pro.onrender.com"
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
npm run android:aab
```

4. Upload the AAB to Google Play Console.

## Landing page

Open:

```text
MorseApp/Html/download.html
```

When a GitHub Release is published, its button points to the latest release page.
