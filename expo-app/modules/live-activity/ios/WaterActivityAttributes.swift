import ActivityKit
import Foundation

// Must stay in sync (same property names/types) with the copy in
// targets/widget/WidgetLiveActivity.swift — the app and the widget
// extension are separate compiled targets, so the struct is duplicated
// rather than shared, which is the standard ActivityKit pattern.
struct WaterActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var currentLiters: Double
    var goalLiters: Double
  }

  var startedAt: Date
}
