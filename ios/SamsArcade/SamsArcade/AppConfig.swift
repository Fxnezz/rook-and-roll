import Foundation

enum AppConfig {
    static let baseURL = URL(string: "https://sams-arcade.vercel.app")!
    static let internalHosts: Set<String> = [
        "sams-arcade.vercel.app",
        "sams-arcade-xxsambad-7983s-projects.vercel.app"
    ]

    static func url(for path: String) -> URL {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            return baseURL
        }
        return url
    }
}
