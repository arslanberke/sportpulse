import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Bir bildirime dokunuldugunda ilgili ekrani acar.
 *
 * Hatirlatici ve mac sonu bildirimleri `data.eventId` tasir; haftalik ozet
 * yalnizca turunu bildirir ve ana ekranda birakilir. Bu kanca olmadan her
 * bildirim uygulamayi yalnizca aciyor, dokunma hedefsiz kaliyordu.
 *
 * Uygulama kapaliyken dokunulan bildirim de ele alinir: o dokunma uygulama
 * baslamadan once gerceklestigi icin dinleyiciye hic ulasmaz, bu yuzden son
 * yanit ayrica okunur.
 */
function eventIdFrom(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const eventId = (data as { eventId?: unknown }).eventId;
  return typeof eventId === 'string' && eventId ? eventId : null;
}

function openEvent(data: unknown): void {
  const eventId = eventIdFrom(data);
  if (eventId) router.push({ pathname: '/event/[id]', params: { id: eventId } });
}

export function useNotificationNavigation() {
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (handledColdStart.current || !response) return;
      handledColdStart.current = true;
      openEvent(response.notification.request.content.data);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Soguk baslangicta ayni yanit iki kez gelebilir.
      handledColdStart.current = true;
      openEvent(response.notification.request.content.data);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
