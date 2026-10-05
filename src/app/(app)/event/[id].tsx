import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Lottie } from "@/components/ui/lottie";
import { Screen } from "@/components/ui/screen";
import { EmptyCard, LoadingCard } from "@/components/ui/states";
import { GenericDetail } from "@/features/events/components/generic-detail";
import { MatchDetail } from "@/features/events/components/match-detail";
import { MotorsportDetail } from "@/features/events/components/motorsport-detail";
import { useEvent } from "@/features/events/hooks/use-events";
import { reminderTimes } from "@/features/events/lib/reminder-times";
import { useReminderPrefs } from "@/features/settings/hooks/use-reminder-prefs";
import { showAlert } from "@/lib/alert";
import { formatDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { shareEventIcs } from "@/lib/ics";
import {
  areLiveActivitiesEnabled,
  startEventActivity,
} from "../../../../modules/live-activity";

const successAnimation = require("../../../../assets/lottie/success.json");

/** Event detail: when, where to watch, calendar export, reminder times. */
export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { event, isLoading } = useEvent(id);
  const { data: prefs } = useReminderPrefs();

  const [showSuccess, setShowSuccess] = useState(false);
  if (isLoading) {
    return (
      <Screen>
        <View className="pt-4">
          <LoadingCard />
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <View className="pt-4">
          <EmptyCard
            iconName="help-circle-outline"
            message={t("event.notFound")}
          />
        </View>
      </Screen>
    );
  }

  const channels = event.channels ?? [];
  const allTriggers =
    prefs && event.status === "scheduled"
      ? reminderTimes(new Date(event.startsAt), prefs)
      : [];
  // Quiet hours can collapse several offsets onto the same time; show each once.
  const triggers = [
    ...new Map(allTriggers.map((d) => [d.toISOString(), d])).values(),
  ];

  const handleShareIcs = async () => {
    try {
      await shareEventIcs(
        event,
        channels.map((c) => c.name),
      );
      setShowSuccess(true);
    } catch {
      showAlert(t("event.couldNotShare"), t("common.tryAgain"));
    }
  };

  const handleShare = async () => {
    const channelNames = channels.map((c) => c.name).join(", ");
    const time = formatDateTime(event.startsAt);
    const message = channelNames
      ? t("event.shareMessageWithChannel", {
          title: event.title,
          time,
          channel: channelNames,
        })
      : t("event.shareMessage", { title: event.title, time });
    try {
      await Share.share({ message });
    } catch {
      showAlert(t("event.couldNotShare"), t("common.tryAgain"));
    }
  };

  const showLiveActivity =
    Platform.OS === "ios" &&
    event.status === "scheduled" &&
    areLiveActivitiesEnabled();
  const handleLiveActivity = async () => {
    try {
      await startEventActivity({
        title: event.title,
        leagueName: event.leagueName ?? null,
        channels: channels.map((c) => c.name).join(", ") || null,
        startsAtIso: event.startsAt,
      });
      showAlert(t("event.liveActivityStarted"), "");
    } catch {
      showAlert(t("common.somethingWentWrong"), t("common.tryAgain"));
    }
  };

  const actions = (
    <>
      <Button title={t("event.addToCalendar")} onPress={handleShareIcs} />
      <View className="mt-3">
        <Button
          title={t("event.share")}
          onPress={handleShare}
          variant="secondary"
        />
      </View>
      {showLiveActivity && (
        <View className="mt-3">
          <Button
            title={t("event.startLiveActivity")}
            onPress={handleLiveActivity}
            variant="secondary"
          />
        </View>
      )}
    </>
  );
  const isMotorsport = event.sportId === "f1" || event.sportId === "motogp";
  const isTeamMatch =
    (event.sportId === "football" || event.sportId === "basketball") &&
    Boolean(event.homeTeamName && event.awayTeamName);

  return (
    <>
      <Screen>
        {isTeamMatch ? (
          <MatchDetail
            event={event}
            reminders={triggers}
            onCalendar={handleShareIcs}
            onShare={handleShare}
            actions={
              showLiveActivity ? (
                <Button
                  title={t("event.startLiveActivity")}
                  onPress={handleLiveActivity}
                  variant="secondary"
                />
              ) : null
            }
          />
        ) : isMotorsport ? (
          <MotorsportDetail
            event={event}
            reminders={triggers}
            actions={actions}
          />
        ) : (
          <GenericDetail
            event={event}
            reminders={triggers}
            onCalendar={handleShareIcs}
            onShare={handleShare}
            actions={
              showLiveActivity ? (
                <Button
                  title={t("event.startLiveActivity")}
                  onPress={handleLiveActivity}
                  variant="secondary"
                />
              ) : null
            }
          />
        )}
      </Screen>
      {showSuccess && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(200)}
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        >
          <View className="items-center rounded-card bg-surface px-8 py-6 shadow-md">
            <Lottie
              source={successAnimation}
              size={120}
              loop={false}
              onFinish={() => setShowSuccess(false)}
            />
            <Text className="mt-1 text-base font-semibold text-ink">
              {t("event.addedToCalendar")}
            </Text>
          </View>
        </Animated.View>
      )}
    </>
  );
}
