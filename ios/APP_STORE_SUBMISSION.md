# Sam's Arcade — App Store submission checklist

## What the owner must do

1. **Join the Apple Developer Program.** Enrol as an individual or organization at <https://developer.apple.com/programs/enroll/>. Apple lists the membership as US$99 per year, charged in local currency. Individual apps show the owner's legal name as the seller. Organizations need legal-entity verification and normally a D-U-N-S number.
2. **Finish the Xcode 26 setup.** Since 28 April 2026, Apple requires iOS uploads to use the iOS 26 SDK or later. Xcode 26.6 is now installed on this Mac, but you still need to open **Xcode → Settings → Components** and install the **iOS 26.5 platform** plus an iOS 26 simulator runtime.
3. **Accept Apple's local licence.** Run `sudo xcodebuild -license` in Terminal if Xcode asks. The screenshot service requested this after the update.
4. **Choose signing.** Open `ios/SamsArcade/SamsArcade.xcodeproj`, select the app target, choose your Apple team, and let Xcode manage signing.
5. **Confirm the bundle ID.** Proposed ID: `app.samsarcade.ios`. It must be unique and must exactly match the App Store Connect record. Change it before the first upload if needed; it cannot be changed after a build is uploaded.
6. **Create the App Store Connect record before uploading.** Use platform **iOS**, name **Sam's Arcade**, primary language **English (Australia)**, the matching bundle ID, and an internal SKU such as `SAMS-ARCADE-IOS-001`.
7. **Upload through Xcode.** Select **Any iOS Device**, use **Product → Archive**, then **Distribute App → App Store Connect → Upload**. Start with TestFlight before public review.
8. **Complete App Privacy and the age-rating questionnaire honestly.** Re-check every answer against the production database and infrastructure before submission.
9. **Add screenshots and submit for review.** Include review notes explaining that an account is optional and the reviewer can immediately use bot play.

## Prepared App Store metadata

- **Name:** Sam's Arcade
- **Subtitle:** Chess, bots and strategy
- **Primary category:** Games
- **Secondary category:** Strategy or Board
- **Promotional text:** Challenge personality-driven chess bots, train with puzzles, analyze positions, and explore a growing strategy arcade.
- **Keywords:** chess,bots,puzzles,strategy,board game,training,analysis,arcade
- **Support URL:** `https://sams-arcade.vercel.app/support`
- **Privacy Policy URL:** `https://sams-arcade.vercel.app/privacy`
- **Marketing URL:** `https://sams-arcade.vercel.app`
- **Copyright:** 2026 Sam's Arcade

### Description draft

Sam's Arcade is a complete chess and strategy playground built for players who want to play, experiment, and improve.

Challenge a roster of personality-driven chess bots, including the original Sam Core X1 engine. Build any bot-vs-bot matchup in Engine Arena, solve rated puzzles, train key patterns, analyze custom positions, and revisit your completed games.

Features include guest play, adjustable engine strength, pass-and-play chess, position setup, accessibility controls, board themes, move sounds, haptics, game history, ratings, achievements, and a growing collection of original arcade and board games.

An account is optional for guest modes. Create one when you want ratings, synced progress, social features, and saved history.

## Screenshot requirements

Upload between one and ten screenshots. Apple currently accepts several 6.9-inch iPhone sizes, including 1260×2736, 1290×2796, or 1320×2868 pixels in portrait. Because this build supports iPad, also provide a 13-inch iPad screenshot at 2064×2752 or 2048×2732 pixels. Capture at least: Games Hub, bot selection, a live chess game, Engine Arena, puzzles, and analysis.

## App Privacy starting point — verify before submitting

The service appears to process account identifiers and contact information, product interaction/gameplay, user-generated profile or report content, and security data such as IP/login events. These may be linked to an account when the user signs in. The current policy states no data sale and no cross-app advertising tracking. Confirm hosting, database, authentication, analytics, crash-reporting, and real-time providers before answering Apple's questionnaire.

## Age rating and review notes

Use Apple's current questionnaire instead of guessing a rating. Declare online interaction, messaging/chat, user-generated profile or report content, moderation controls, unrestricted web access status, and any chance-based content accurately. Do not select **Made for Kids** unless every part of the product and privacy process is intentionally designed to meet Apple's Kids Category requirements.

Suggested review note: “Sam's Arcade can be reviewed without an account. Open Bots, select Sam Core or another opponent, and start a game. The app adds native navigation, sharing, haptics, offline detection, safe external-link handling, deep links, and account controls around the full chess and strategy experience. Account deletion is available under Account → Delete account.”

## Before pressing Submit for Review

- Replace or confirm the support contact method shown on the public support page.
- Review the privacy policy with the owner and, if appropriate, a qualified privacy adviser.
- Test account creation, login, deletion, every external link, offline recovery, bot play, audio, and both portrait and landscape layouts on a real iPhone and iPad.
- Check that production is healthy and that no test or admin credentials appear in screenshots or review notes.
- If Google or another third-party login is exposed in the iOS app later, review Apple's Login Services rule and add an equivalent privacy-preserving login option when required.
