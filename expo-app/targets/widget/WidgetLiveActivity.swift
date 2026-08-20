import ActivityKit
import WidgetKit
import SwiftUI

struct WaterActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var currentLiters: Double
        var goalLiters: Double
    }

    var startedAt: Date
}

// Espelha tokens de água do app paciente (#5ba4d9 / #4a8fc4 / #edf5fb).
private let waterPrimary = Color(red: 91 / 255, green: 164 / 255, blue: 217 / 255)
private let waterAccent = Color(red: 74 / 255, green: 143 / 255, blue: 196 / 255)
private let waterSoftBg = Color(red: 237 / 255, green: 245 / 255, blue: 251 / 255)

private func progress(_ state: WaterActivityAttributes.ContentState) -> Double {
    guard state.goalLiters > 0 else { return 0 }
    return min(max(state.currentLiters / state.goalLiters, 0), 1)
}

private func litersLabel(_ value: Double) -> String {
    String(format: "%.1fL", value)
}

struct WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WaterActivityAttributes.self) { context in
            HStack(spacing: 14) {
                Image(systemName: "drop.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(waterPrimary)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Hidratação")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(litersLabel(context.state.currentLiters)) de \(litersLabel(context.state.goalLiters))")
                        .font(.headline)
                    ProgressView(value: progress(context.state))
                        .tint(waterPrimary)
                }

                Spacer()

                Text("\(Int(progress(context.state) * 100))%")
                    .font(.title3.bold())
                    .foregroundStyle(waterAccent)
            }
            .padding(16)
            .activityBackgroundTint(waterSoftBg)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "drop.fill")
                        .foregroundStyle(waterPrimary)
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(Int(progress(context.state) * 100))%")
                        .font(.title3.bold())
                        .foregroundStyle(waterAccent)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(litersLabel(context.state.currentLiters)) de \(litersLabel(context.state.goalLiters))")
                            .font(.subheadline.bold())
                        ProgressView(value: progress(context.state))
                            .tint(waterPrimary)
                    }
                }
            } compactLeading: {
                Image(systemName: "drop.fill")
                    .foregroundStyle(waterPrimary)
            } compactTrailing: {
                Text(litersLabel(context.state.currentLiters))
                    .font(.caption2.bold())
                    .foregroundStyle(waterAccent)
            } minimal: {
                Image(systemName: "drop.fill")
                    .foregroundStyle(waterPrimary)
            }
            .widgetURL(URL(string: "clubeflorescer://"))
            .keylineTint(waterPrimary)
        }
    }
}
