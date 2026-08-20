import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    bestAttempt = content

    guard let url = Self.imageURL(in: request.content.userInfo) else {
      contentHandler(content)
      return
    }

    Self.downloadAttachment(from: url) { attachment in
      if let attachment {
        content.attachments = [attachment]
      }
      contentHandler(content)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler, let bestAttempt {
      contentHandler(bestAttempt)
    }
  }

  private static func imageURL(in userInfo: [AnyHashable: Any]) -> URL? {
    let keys = ["imageUrl", "image", "image_url"]
    for key in keys {
      if let value = string(in: userInfo, key: key), let url = URL(string: value), url.scheme == "https" {
        return url
      }
    }
    if let body = userInfo["body"] as? [AnyHashable: Any] {
      return imageURL(in: body)
    }
    if let data = userInfo["data"] as? [AnyHashable: Any] {
      return imageURL(in: data)
    }
    return nil
  }

  private static func string(in dict: [AnyHashable: Any], key: String) -> String? {
    let value = dict[key]
    if let text = value as? String {
      let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
      return trimmed.isEmpty ? nil : trimmed
    }
    return nil
  }

  private static func downloadAttachment(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
    let task = URLSession.shared.downloadTask(with: url) { location, response, _ in
      let attachment = try? Self.makeAttachment(tempURL: location, response: response)
      completion(attachment)
    }
    task.resume()
  }

  private static func makeAttachment(tempURL: URL?, response: URLResponse?) throws -> UNNotificationAttachment {
    guard let tempURL else { throw URLError(.badURL) }
    let ext = suggestedExtension(response: response, url: tempURL)
    let dest = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ext)
    try FileManager.default.copyItem(at: tempURL, to: dest)
    return try UNNotificationAttachment(identifier: "push-image", url: dest)
  }

  private static func suggestedExtension(response: URLResponse?, url: URL) -> String {
    let mime = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""
    if mime.contains("png") { return ".png" }
    if mime.contains("gif") { return ".gif" }
    if mime.contains("webp") { return ".jpg" }
    let path = url.path.lowercased()
    if path.hasSuffix(".png") { return ".png" }
    if path.hasSuffix(".gif") { return ".gif" }
    return ".jpg"
  }
}
