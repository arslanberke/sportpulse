import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Shared data

/// Next-event payload written by the app via ExtensionStorage
/// (App Group UserDefaults, key "nextEvent").
struct NextEvent: Codable {
  var title: String
  var leagueName: String?
  var channels: String?
  var startsAt: Date
}

let appGroup = "group.com.sportpulse.app"

func readNextEvent() -> NextEvent? {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: "nextEvent"),
    let data = raw.data(using: .utf8)
  else { return nil }
  let decoder = JSONDecoder()
  decoder.dateDecodingStrategy = .iso8601
  return try? decoder.decode(NextEvent.self, from: data)
}

// MARK: - Home-screen widget

struct NextEventEntry: TimelineEntry {
  let date: Date
  let event: NextEvent?
}

struct NextEventProvider: TimelineProvider {
  func placeholder(in _: Context) -> NextEventEntry {
    NextEventEntry(
      date: .now,
      event: NextEvent(
        title: "Galatasaray vs Fenerbahçe",
        leagueName: "Süper Lig",
        channels: "beIN Sports",
        startsAt: .now.addingTimeInterval(3600)
      )
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (NextEventEntry) -> Void) {
    completion(NextEventEntry(date: .now, event: readNextEvent() ?? placeholder(in: context).event))
  }

  func getTimeline(in _: Context, completion: @escaping (Timeline<NextEventEntry>) -> Void) {
    let event = readNextEvent()
    let entry = NextEventEntry(date: .now, event: event)
    // Refresh after the event starts (or in an hour when there is none).
    let reload = event.map { max($0.startsAt, .now.addingTimeInterval(60)) }
      ?? .now.addingTimeInterval(3600)
    completion(Timeline(entries: [entry], policy: .after(reload)))
  }
}

struct NextEventWidgetView: View {
  var entry: NextEventEntry

  var body: some View {
    if let event = entry.event {
      VStack(alignment: .leading, spacing: 4) {
        if let league = event.leagueName {
          Text(league.uppercased())
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.secondary)
        }
        Text(event.title)
          .font(.headline)
          .lineLimit(2)
        Spacer(minLength: 2)
        if event.startsAt > .now {
          Text(event.startsAt, style: .timer)
            .font(.title3.weight(.bold))
            .monospacedDigit()
            .foregroundStyle(.tint)
        } else {
          Text(event.startsAt, style: .time)
            .font(.title3.weight(.bold))
        }
        if let channels = event.channels, !channels.isEmpty {
          Label(channels, systemImage: "tv")
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    } else {
      VStack(spacing: 4) {
        Image(systemName: "sportscourt")
          .font(.title2)
          .foregroundStyle(.secondary)
        Text("No upcoming events")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
}

struct NextEventWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "NextEventWidget", provider: NextEventProvider()) { entry in
      NextEventWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Next event")
    .description("Countdown to your next followed event.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Live Activity (Dynamic Island countdown)

struct EventActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var startsAt: Date
  }

  var title: String
  var leagueName: String?
  var channels: String?
}

struct EventLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: EventActivityAttributes.self) { context in
      // Lock screen banner
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(context.attributes.title).font(.headline).lineLimit(1)
          if let channels = context.attributes.channels {
            Label(channels, systemImage: "tv").font(.caption).foregroundStyle(.secondary)
          }
        }
        Spacer()
        Text(context.state.startsAt, style: .timer)
          .font(.title2.weight(.bold))
          .monospacedDigit()
          .frame(maxWidth: 90)
      }
      .padding()
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.attributes.title).font(.headline).lineLimit(2)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.state.startsAt, style: .timer)
            .font(.title3.weight(.bold))
            .monospacedDigit()
            .frame(maxWidth: 70)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let channels = context.attributes.channels {
            Label(channels, systemImage: "tv").font(.caption)
          }
        }
      } compactLeading: {
        Image(systemName: "sportscourt")
      } compactTrailing: {
        Text(context.state.startsAt, style: .timer)
          .monospacedDigit()
          .frame(maxWidth: 44)
      } minimal: {
        Image(systemName: "sportscourt")
      }
    }
  }
}

// MARK: - Bundle

@main
struct SportPulseWidgets: WidgetBundle {
  var body: some Widget {
    NextEventWidget()
    EventLiveActivity()
  }
}
