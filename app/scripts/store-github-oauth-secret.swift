import Foundation
import Security
import Darwin

let service = "Fountain-Coach.Tennis"
let account = "GITHUB_OAUTH_CLIENT_SECRET"

guard let input = "GitHub-Secret eingeben (unsichtbar): ".withCString({ getpass($0) }),
      input.pointee != 0 else {
    fputs("Kein Secret eingegeben.\n", stderr)
    exit(EXIT_FAILURE)
}

let secret = Data(String(cString: input).utf8)
let identityQuery: [CFString: Any] = [
    kSecClass: kSecClassGenericPassword,
    kSecAttrService: service,
    kSecAttrAccount: account
]

let attributes: [CFString: Any] = [
    kSecValueData: secret,
    kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
]

let updateStatus = SecItemUpdate(identityQuery as CFDictionary, attributes as CFDictionary)
if updateStatus == errSecItemNotFound {
    var addQuery = identityQuery
    attributes.forEach { addQuery[$0.key] = $0.value }
    let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
    guard addStatus == errSecSuccess else {
        fputs("Keychain-Speicherung fehlgeschlagen: \(addStatus)\n", stderr)
        exit(EXIT_FAILURE)
    }
} else if updateStatus != errSecSuccess {
    fputs("Keychain-Aktualisierung fehlgeschlagen: \(updateStatus)\n", stderr)
    exit(EXIT_FAILURE)
}

print("Keychain-Eintrag gespeichert: \(service)/\(account)")
