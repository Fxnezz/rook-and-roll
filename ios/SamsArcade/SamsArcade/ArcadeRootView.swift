import SwiftUI
import WebKit

struct ArcadeRootView: View {
    @EnvironmentObject private var browser: ArcadeBrowserModel
    @EnvironmentObject private var network: NetworkStatus

    var body: some View {
        VStack(spacing: 0) {
            NativeHeader()

            if !network.isOnline {
                OfflineBanner(retry: browser.reload)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            if browser.isLoading {
                ProgressView(value: browser.progress)
                    .tint(Color(red: 244 / 255, green: 180 / 255, blue: 81 / 255))
                    .frame(height: 2)
            }

            ZStack {
                ArcadeWebView(webView: browser.webView)

                if let message = browser.errorMessage, network.isOnline {
                    LoadErrorView(message: message, retry: browser.reload)
                }
            }

            NativeTabBar()
        }
        .background(Color(red: 14 / 255, green: 17 / 255, blue: 23 / 255))
        .animation(.easeInOut(duration: 0.2), value: network.isOnline)
    }
}

private struct NativeHeader: View {
    @EnvironmentObject private var browser: ArcadeBrowserModel

    var body: some View {
        HStack(spacing: 16) {
            Button(action: browser.goBack) {
                Image(systemName: "chevron.backward")
            }
            .disabled(!browser.canGoBack)

            Button(action: browser.goForward) {
                Image(systemName: "chevron.forward")
            }
            .disabled(!browser.canGoForward)

            VStack(alignment: .leading, spacing: 1) {
                Text("SAM'S ARCADE")
                    .font(.caption2.weight(.black))
                    .tracking(1.2)
                    .foregroundStyle(Color(red: 244 / 255, green: 180 / 255, blue: 81 / 255))
                Text("Play. Train. Improve.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button(action: browser.reload) {
                Image(systemName: "arrow.clockwise")
            }

            ShareLink(item: browser.currentURL) {
                Image(systemName: "square.and.arrow.up")
            }
        }
        .font(.body.weight(.semibold))
        .foregroundStyle(.white)
        .padding(.horizontal, 18)
        .padding(.vertical, 11)
        .background(.ultraThinMaterial)
        .accessibilityElement(children: .contain)
    }
}

private struct NativeTabBar: View {
    @EnvironmentObject private var browser: ArcadeBrowserModel

    private let tabs: [(String, String, String)] = [
        ("Play", "gamecontroller.fill", "/play"),
        ("Bots", "cpu.fill", "/play/bot"),
        ("Puzzles", "puzzlepiece.fill", "/puzzles"),
        ("Train", "chart.line.uptrend.xyaxis", "/training"),
        ("Me", "person.crop.circle.fill", "/account")
    ]

    var body: some View {
        HStack {
            ForEach(tabs, id: \.0) { tab in
                Button {
                    browser.load(path: tab.2)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.1)
                            .font(.system(size: 18, weight: .semibold))
                        Text(tab.0)
                            .font(.system(size: 10, weight: .bold))
                    }
                    .frame(maxWidth: .infinity)
                }
                .accessibilityLabel(tab.0)
            }
        }
        .foregroundStyle(Color(red: 244 / 255, green: 180 / 255, blue: 81 / 255))
        .padding(.top, 9)
        .padding(.horizontal, 8)
        .background(.ultraThinMaterial)
    }
}

private struct OfflineBanner: View {
    let retry: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.slash")
            Text("You're offline. Saved pages may still work.")
                .font(.caption.weight(.semibold))
            Spacer()
            Button("Retry", action: retry)
                .font(.caption.weight(.bold))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 9)
        .foregroundStyle(.white)
        .background(Color.orange.opacity(0.82))
    }
}

private struct LoadErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "exclamationmark.arrow.triangle.2.circlepath")
                .font(.system(size: 38))
                .foregroundStyle(.orange)
            Text("Couldn't load Sam's Arcade")
                .font(.headline)
            Text(message)
                .font(.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Button("Try again", action: retry)
                .buttonStyle(.borderedProminent)
                .tint(.orange)
        }
        .padding(28)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 22))
        .padding()
    }
}

private struct ArcadeWebView: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
