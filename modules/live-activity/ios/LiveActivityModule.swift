import ActivityKit
import ExpoModulesCore

// Mirrors EventActivityAttributes in targets/widget/Widgets.swift — ActivityKit
// matches activities across targets by the attribute type's name and shape.
struct EventActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startsAt: Date
  }

  var title: String
  var leagueName: String?
  var channels: String?
}

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Function("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    /// Starts a countdown Live Activity; returns its id or throws.
    AsyncFunction("startEventActivity") {
      (title: String, leagueName: String?, channels: String?, startsAtIso: String) -> String in
      guard #available(iOS 16.2, *) else {
        throw LiveActivityUnsupportedException()
      }
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      guard let startsAt = formatter.date(from: startsAtIso)
        ?? ISO8601DateFormatter().date(from: startsAtIso)
      else {
        throw InvalidDateException(startsAtIso)
      }

      let attributes = EventActivityAttributes(
        title: title, leagueName: leagueName, channels: channels)
      let content = ActivityContent(
        state: EventActivityAttributes.ContentState(startsAt: startsAt),
        staleDate: startsAt.addingTimeInterval(60 * 60))
      let activity = try Activity.request(attributes: attributes, content: content)
      return activity.id
    }

    /// Ends every running event activity (e.g. on logout or unfollow).
    AsyncFunction("endAllEventActivities") { () in
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<EventActivityAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }
}

class LiveActivityUnsupportedException: Exception {
  override var reason: String { "Live Activities require iOS 16.2+" }
}

class InvalidDateException: GenericException<String> {
  override var reason: String { "Invalid ISO date: \(param)" }
}
