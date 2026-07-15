import SwiftUI

@main
struct SamsArcadeApp: App {
    @StateObject private var browser = ArcadeBrowserModel()
    @StateObject private var network = NetworkStatus()

    var body: some Scene {
        WindowGroup {
            ArcadeRootView()
                .environmentObject(browser)
                .environmentObject(network)
                .preferredColorScheme(.dark)
                .onOpenURL { browser.openDeepLink($0) }
        }
    }
}
