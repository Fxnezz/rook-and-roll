import Combine
import SwiftUI
import UIKit
import WebKit

@MainActor
final class ArcadeBrowserModel: NSObject, ObservableObject {
    @Published private(set) var currentURL = AppConfig.baseURL
    @Published private(set) var canGoBack = false
    @Published private(set) var canGoForward = false
    @Published private(set) var isLoading = false
    @Published private(set) var progress = 0.0
    @Published var errorMessage: String?

    let webView: WKWebView
    private var progressObservation: NSKeyValueObservation?
    private var backObservation: NSKeyValueObservation?
    private var forwardObservation: NSKeyValueObservation?

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true

        let bridge = WKUserContentController()
        bridge.addUserScript(WKUserScript(
            source: """
                window.SamsArcadeNative = {
                  isNativeApp: true,
                  platform: 'ios',
                  haptic: function(kind) {
                    window.webkit.messageHandlers.arcadeNative.postMessage({ type: 'haptic', kind: kind || 'light' });
                  },
                  share: function(url) {
                    window.webkit.messageHandlers.arcadeNative.postMessage({ type: 'share', url: url || location.href });
                  }
                };
                document.documentElement.dataset.nativeApp = 'ios';
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        ))
        configuration.userContentController = bridge

        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()

        bridge.add(WeakScriptMessageHandler(delegate: self), name: "arcadeNative")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 14 / 255, green: 17 / 255, blue: 23 / 255, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor

        let refresh = UIRefreshControl()
        refresh.tintColor = UIColor(red: 244 / 255, green: 180 / 255, blue: 81 / 255, alpha: 1)
        refresh.addTarget(self, action: #selector(refreshControlChanged(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] view, _ in
            Task { @MainActor in self?.progress = view.estimatedProgress }
        }
        backObservation = webView.observe(\.canGoBack, options: [.new]) { [weak self] view, _ in
            Task { @MainActor in self?.canGoBack = view.canGoBack }
        }
        forwardObservation = webView.observe(\.canGoForward, options: [.new]) { [weak self] view, _ in
            Task { @MainActor in self?.canGoForward = view.canGoForward }
        }

        load(path: "/play")
    }

    func load(path: String) {
        load(url: AppConfig.url(for: path))
    }

    func load(url: URL) {
        errorMessage = nil
        var request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 30)
        request.setValue("SamArcade-iOS/1.0", forHTTPHeaderField: "X-Sams-Arcade-Client")
        webView.load(request)
    }

    func reload() {
        errorMessage = nil
        webView.reload()
    }

    func goBack() {
        if webView.canGoBack { webView.goBack() }
    }

    func goForward() {
        if webView.canGoForward { webView.goForward() }
    }

    func openDeepLink(_ url: URL) {
        guard url.scheme == "samsarcade" else { return }
        let path = "/" + ([url.host, url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: "/"))
        load(path: path)
    }

    @objc private func refreshControlChanged(_ sender: UIRefreshControl) {
        reload()
        sender.endRefreshing()
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func updateLocation() {
        if let url = webView.url { currentURL = url }
    }

    private func haptic(_ kind: String) {
        switch kind {
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "error": UINotificationFeedbackGenerator().notificationOccurred(.error)
        case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

extension ArcadeBrowserModel: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true
        errorMessage = nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
        progress = 1
        updateLocation()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        errorMessage = error.localizedDescription
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        errorMessage = error.localizedDescription
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        if navigationAction.targetFrame == nil, AppConfig.internalHosts.contains(url.host ?? "") {
            webView.load(navigationAction.request)
            decisionHandler(.cancel)
            return
        }

        if url.scheme == "https" || url.scheme == "http" {
            if AppConfig.internalHosts.contains(url.host ?? "") {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
            return
        }

        if ["mailto", "tel"].contains(url.scheme ?? "") {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }
}

extension ArcadeBrowserModel: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            if AppConfig.internalHosts.contains(url.host ?? "") { load(url: url) }
            else { UIApplication.shared.open(url) }
        }
        return nil
    }
}

extension ArcadeBrowserModel: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "arcadeNative", let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        if type == "haptic" {
            haptic(body["kind"] as? String ?? "light")
        } else if type == "share", let value = body["url"] as? String, let url = URL(string: value) {
            let controller = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let root = scene.keyWindow?.rootViewController else { return }
            controller.popoverPresentationController?.sourceView = root.view
            root.present(controller, animated: true)
        }
    }
}

private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
