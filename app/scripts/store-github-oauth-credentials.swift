import Foundation
import Security
import Darwin

let service = "Fountain-Coach.Tennis"
let clientIDAccount = "GITHUB_OAUTH_CLIENT_ID"
let clientSecretAccount = "GITHUB_OAUTH_CLIENT_SECRET"

func fail(_ message: String) -> Never {
    fputs("Tennis OAuth credentials not stored: \(message)\n", stderr)
    exit(EXIT_FAILURE)
}

func valid(_ value: String, name: String) -> Data {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, trimmed == value, !value.contains("\n"), !value.contains("\r") else {
        fail("\(name) is empty or contains whitespace/newlines")
    }
    return Data(value.utf8)
}

func promptSecret(_ prompt: String) -> Data {
    guard let input = prompt.withCString({ getpass($0) }), input.pointee != 0 else {
        fail("GitHub client secret was not entered")
    }
    return valid(String(cString: input), name: "GitHub client secret")
}

func upsert(_ data: Data, account: String) {
    let identity: [CFString: Any] = [
        kSecClass: kSecClassGenericPassword,
        kSecAttrService: service,
        kSecAttrAccount: account
    ]
    let attributes: [CFString: Any] = [
        kSecValueData: data,
        kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    ]
    let updateStatus = SecItemUpdate(identity as CFDictionary, attributes as CFDictionary)
    if updateStatus == errSecItemNotFound {
        var addQuery = identity
        attributes.forEach { addQuery[$0.key] = $0.value }
        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        guard addStatus == errSecSuccess else { fail("Keychain add failed (status \(addStatus))") }
    } else if updateStatus != errSecSuccess {
        fail("Keychain update failed (status \(updateStatus))")
    }
}

print("Fountain Coach Tennis — GitHub OAuth credential setup")
print("Values are stored in macOS Keychain under \(service); they are never printed or written to a file.")
print("GitHub OAuth Client ID:", terminator: " ")
guard let clientID = readLine() else { fail("GitHub client ID was not entered") }
let clientIDData = valid(clientID, name: "GitHub client ID")
let clientSecretData = promptSecret("GitHub OAuth Client Secret (hidden): ")

upsert(clientIDData, account: clientIDAccount)
upsert(clientSecretData, account: clientSecretAccount)
print("Stored: \(service)/\(clientIDAccount)")
print("Stored: \(service)/\(clientSecretAccount)")
print("Secret values were not displayed.")
