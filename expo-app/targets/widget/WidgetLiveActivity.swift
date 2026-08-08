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

private let brandGreen = Color(red: 139 / 255, green: 150 / 255, blue: 124 / 255)

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
                    .foregroundStyle(brandGreen)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Hidratação")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(litersLabel(context.state.currentLiters)) de \(litersLabel(context.state.goalLiters))")
                        .font(.headline)
                    ProgressView(value: progress(context.state))
                        .tint(brandGreen)
                }

                Spacer()

                Text("\(Int(progress(context.state) * 100))%")
                    .font(.title3.bold())
                    .foregroundStyle(brandGreen)
            }
            .padding(16)
            .activityBackgroundTint(Color(red: 247 / 255, green: 246 / 255, blue: 242 / 255))
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "drop.fill")
                        .foregroundStyle(brandGreen)
                        .font(.title2)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(Int(progress(context.state) * 100))%")
                        .font(.title3.bold())
                        .foregroundStyle(brandGreen)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(litersLabel(context.state.currentLiters)) de \(litersLabel(context.state.goalLiters))")
                            .font(.subheadline.bold())
                        ProgressView(value: progress(context.state))
                            .tint(brandGreen)
                    }
                }
            } compactLeading: {
                Image(systemName: "drop.fill")
                    .foregroundStyle(brandGreen)
            } compactTrailing: {
                Text(litersLabel(context.state.currentLiters))
                    .font(.caption2.bold())
                    .foregroundStyle(brandGreen)
            } minimal: {
                Image(systemName: "drop.fill")
                    .foregroundStyle(brandGreen)
            }
            .widgetURL(URL(string: "clubeflorescer://"))
            .keylineTint(brandGreen)
        }
    }
}

