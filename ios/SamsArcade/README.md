# Sam's Arcade for iPhone and iPad

This folder contains the native SwiftUI iOS app for Sam's Arcade. It uses Apple's WebKit for the live game experience and adds native navigation, pull-to-refresh, haptics, sharing, offline status, external-link handling, and `samsarcade://` deep links.

## Open and run

1. Install Xcode 26 or later. In **Xcode → Settings → Components**, install the iOS 26 platform and an iOS 26 simulator runtime.
2. In Terminal, accept Apple's licence with `sudo xcodebuild -license` if prompted.
3. Open `SamsArcade.xcodeproj`.
4. Select the `SamsArcade` target, open **Signing & Capabilities**, and choose your Apple Developer team.
5. Keep `app.samsarcade.ios` if Apple says it is available, or change it to a unique reverse-domain bundle ID you control. Use exactly the same ID in App Store Connect.
6. Choose an iPhone simulator or your connected iPhone and press Run.

## Release build

Set the destination to **Any iOS Device (arm64)**, then choose **Product → Archive**. In Organizer, use **Distribute App → App Store Connect → Upload**. Automatic signing is enabled.

The app targets iOS 17 and supports iPhone and iPad. Version is `1.0` and build is `1`; increase the build number for every App Store Connect upload.
