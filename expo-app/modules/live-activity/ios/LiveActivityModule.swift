import ActivityKit
import ExpoModulesCore

public class LiveActivityModule: Module {
  private var currentActivityId: String?

  public func definition() -> ModuleDefinition {
    Name("LiveActivityModule")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    AsyncFunction("startWaterActivity") { (currentLiters: Double, goalLiters: Double) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

      for activity in Activity<WaterActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }

      let attributes = WaterActivityAttributes(startedAt: Date())
      let state = WaterActivityAttributes.ContentState(currentLiters: currentLiters, goalLiters: goalLiters)

      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: .init(state: state, staleDate: nil)
        )
        self.currentActivityId = activity.id
        return true
      } catch {
        return false
      }
    }

    AsyncFunction("updateWaterActivity") { (currentLiters: Double, goalLiters: Double) -> Bool in
      guard #available(iOS 16.2, *) else { return false }

      guard let activity = Activity<WaterActivityAttributes>.activities.first else {
        return false
      }

      let state = WaterActivityAttributes.ContentState(currentLiters: currentLiters, goalLiters: goalLiters)
      await activity.update(.init(state: state, staleDate: nil))
      return true
    }

    AsyncFunction("endWaterActivity") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }

      for activity in Activity<WaterActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      self.currentActivityId = nil
      return true
    }

    AsyncFunction("syncWaterActivity") { (currentLiters: Double, goalLiters: Double) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

      let state = WaterActivityAttributes.ContentState(currentLiters: currentLiters, goalLiters: goalLiters)

      if let activity = Activity<WaterActivityAttributes>.activities.first {
        await activity.update(.init(state: state, staleDate: nil))
        return true
      }

      let attributes = WaterActivityAttributes(startedAt: Date())
      do {
        let activity = try Activity.request(
          attributes: attributes,
          content: .init(state: state, staleDate: nil)
        )
        self.currentActivityId = activity.id
        return true
      } catch {
        return false
      }
    }
  }
}
