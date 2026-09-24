import AppKit
import Foundation
import WebKit

struct Options {
  let url: URL
  let outputDirectory: URL
  let width: CGFloat
  let height: CGFloat

  init(arguments: [String]) throws {
    var url = URL(string: "http://127.0.0.1:8787/")!
    var outputDirectory = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent(".runtime/webkit-evidence")
    var width: CGFloat = 1280
    var height: CGFloat = 800
    var index = 1
    while index < arguments.count {
      switch arguments[index] {
      case "--url": index += 1; guard index < arguments.count, let value = URL(string: arguments[index]) else { throw NSError(domain: "TennisWebKitAcceptance", code: 2, userInfo: [NSLocalizedDescriptionKey: "--url requires a URL"]) }; url = value
      case "--output": index += 1; guard index < arguments.count else { throw NSError(domain: "TennisWebKitAcceptance", code: 2, userInfo: [NSLocalizedDescriptionKey: "--output requires a directory"]) }; outputDirectory = URL(fileURLWithPath: arguments[index], isDirectory: true)
      case "--width": index += 1; guard index < arguments.count, let value = Double(arguments[index]), value > 0 else { throw NSError(domain: "TennisWebKitAcceptance", code: 2, userInfo: [NSLocalizedDescriptionKey: "--width requires a positive number"]) }; width = CGFloat(value)
      case "--height": index += 1; guard index < arguments.count, let value = Double(arguments[index]), value > 0 else { throw NSError(domain: "TennisWebKitAcceptance", code: 2, userInfo: [NSLocalizedDescriptionKey: "--height requires a positive number"]) }; height = CGFloat(value)
      case "--help": print("Usage: TennisWebKitAcceptance [--url URL] [--output DIRECTORY] [--width N] [--height N]"); exit(0)
      default: throw NSError(domain: "TennisWebKitAcceptance", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unknown argument: \(arguments[index])"])
      }
      index += 1
    }
    guard url.scheme == "http" || url.scheme == "https" else { throw NSError(domain: "TennisWebKitAcceptance", code: 2, userInfo: [NSLocalizedDescriptionKey: "URL must use HTTP or HTTPS"]) }
    self.url = url
    self.outputDirectory = outputDirectory
    self.width = width
    self.height = height
  }
}

final class Runner: NSObject, WKNavigationDelegate {
  private let options: Options
  private let webView: WKWebView

  init(options: Options) {
    self.options = options
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()
    self.webView = WKWebView(frame: NSRect(x: 0, y: 0, width: options.width, height: options.height), configuration: configuration)
    super.init()
    self.webView.navigationDelegate = self
  }

  func start() {
    webView.load(URLRequest(url: options.url, cachePolicy: .reloadIgnoringLocalCacheData))
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    finish(error: error)
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    finish(error: error)
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    // Module scripts execute after didFinishNavigation. Give the landing
    // animation a bounded startup window before collecting semantic evidence.
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
      self?.captureLandingState()
    }
  }

  private func captureLandingState() {
    let script = """
    (() => {
      const links = [...document.querySelectorAll('a')].map(node => ({name: (node.innerText || node.getAttribute('aria-label') || '').trim(), href: node.getAttribute('href') || ''}));
      const buttons = [...document.querySelectorAll('button')].map(node => ({name: (node.innerText || node.getAttribute('aria-label') || '').trim(), hidden: node.hidden}));
      const headings = [...document.querySelectorAll('h1,h2,h3')].map(node => (node.innerText || '').trim()).filter(Boolean);
      const pong = document.querySelector('#pong-stage');
      const fallback = document.querySelector('#pong-fallback');
      const fallbackVisible = fallback ? getComputedStyle(fallback).display !== 'none' && !fallback.hidden : false;
      const result = {title: document.title, url: location.href, mainCount: document.querySelectorAll('main').length, headings, links, buttons, authGate: Boolean(document.querySelector('#auth-gate')), pong: pong ? {webgl: pong.dataset.webgl || 'not-started', error: pong.dataset.webglError || null, fallbackVisible} : null};
      if (result.mainCount < 1) throw new Error('No main landmark exposed');
      if (!headings.some(value => value.includes('Zusammen') || value.includes('Fountain Coach'))) throw new Error('Expected customer-facing heading not exposed');
      if (!links.some(value => value.href === '/app/' || value.href.endsWith('/app/'))) throw new Error('Planning entry link not exposed');
      if (result.pong?.webgl === 'not-started') throw new Error('Landing WebGL module did not become ready within the acceptance window');
      return result;
    })()
    """
    webView.evaluateJavaScript(script) { [weak self] value, error in
      guard let self else { return }
      if let error { self.finish(error: error); return }
      guard let result = value as? [String: Any] else { self.finish(error: NSError(domain: "TennisWebKitAcceptance", code: 3, userInfo: [NSLocalizedDescriptionKey: "Semantic result was not an object"])); return }
      self.capture(result: result)
    }
  }

  private func capture(result: [String: Any]) {
    do {
      try FileManager.default.createDirectory(at: options.outputDirectory, withIntermediateDirectories: true)
      let imageURL = options.outputDirectory.appendingPathComponent("webkit-\(UUID().uuidString).png")
      let evidenceURL = options.outputDirectory.appendingPathComponent("evidence.json")
      let snapshotConfiguration = WKSnapshotConfiguration()
      snapshotConfiguration.rect = CGRect(x: 0, y: 0, width: options.width, height: options.height)
      webView.takeSnapshot(with: snapshotConfiguration) { image, error in
        do {
          if let error { throw error }
          guard let image, let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { throw NSError(domain: "TennisWebKitAcceptance", code: 4, userInfo: [NSLocalizedDescriptionKey: "WebKit snapshot did not produce PNG data"]) }
          try png.write(to: imageURL, options: .atomic)
          let payload: [String: Any] = ["url": self.options.url.absoluteString, "viewport": ["width": self.options.width, "height": self.options.height], "semantic": result, "screenshot": imageURL.path, "timestamp": ISO8601DateFormatter().string(from: Date())]
          let json = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
          try json.write(to: evidenceURL, options: .atomic)
          print("PASS WebKit acceptance: \(evidenceURL.path)")
          NSApp.terminate(nil)
        } catch { self.finish(error: error) }
      }
    } catch { finish(error: error) }
  }

  private func finish(error: Error) {
    fputs("WebKit acceptance failed: \(error.localizedDescription)\n", stderr)
    NSApp.terminate(nil)
  }
}

do {
  let options = try Options(arguments: CommandLine.arguments)
  let application = NSApplication.shared
  application.setActivationPolicy(.prohibited)
  let runner = Runner(options: options)
  runner.start()
  application.run()
} catch {
  fputs("WebKit acceptance failed: \(error.localizedDescription)\n", stderr)
  exit(1)
}
