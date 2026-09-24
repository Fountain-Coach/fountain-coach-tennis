// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "TennisWebKitAcceptance",
  platforms: [.macOS(.v13)],
  products: [.executable(name: "TennisWebKitAcceptance", targets: ["TennisWebKitAcceptance"])],
  targets: [.executableTarget(name: "TennisWebKitAcceptance")]
)
