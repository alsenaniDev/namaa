import { Platform } from 'react-native';
import type { Commitment, Subscription } from '../types';

const NOTIF_HOUR = 9;
const NOTIF_MINUTE = 0;
const CHANNEL_ID = 'reminders';

type NotificationsModule = typeof import('expo-notifications');

let modulePromise: Promise<NotificationsModule | null> | null = null;

function loadModule(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  if (!modulePromise) {
    modulePromise = import('expo-notifications')
      .then((m) => m as NotificationsModule)
      .catch(() => null);
  }
  return modulePromise;
}

export async function initNotifications(): Promise<void> {
  const N = await loadModule();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'تذكيرات نماء',
        importance: N.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }
  } catch {
    // Notification setup should never block the app from opening.
  }
}

export async function requestPermissions(): Promise<boolean> {
  const N = await loadModule();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await N.requestPermissionsAsync();
    return !!requested.granted;
  } catch {
    return false;
  }
}

export async function cancelAllScheduled(): Promise<void> {
  const N = await loadModule();
  if (!N) return;
  try {
    await N.cancelAllScheduledNotificationsAsync();
  } catch {
    // noop
  }
}

function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.max(1, Math.min(28, Math.trunc(day)));
}

function parseRenewalDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    NOTIF_HOUR,
    NOTIF_MINUTE,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

let syncToken = 0;

export async function syncReminders(opts: {
  enabled: boolean;
  commitments: Commitment[];
  subscriptions: Subscription[];
}): Promise<void> {
  const N = await loadModule();
  if (!N) return;

  const myToken = ++syncToken;
  await cancelAllScheduled();
  if (myToken !== syncToken) return;
  if (!opts.enabled) return;

  const granted = await requestPermissions();
  if (myToken !== syncToken || !granted) return;

  for (const commitment of opts.commitments) {
    if (myToken !== syncToken) return;
    if (!commitment.isActive || commitment.isRecurring === false) continue;
    try {
      await N.scheduleNotificationAsync({
        content: {
          title: 'تذكير بالتزام',
          body: `${commitment.title} يستحق اليوم`,
          data: { type: 'commitment', id: commitment.id },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.CALENDAR,
          day: clampDay(commitment.dueDay),
          hour: NOTIF_HOUR,
          minute: NOTIF_MINUTE,
          repeats: true,
          channelId: CHANNEL_ID,
        },
      });
    } catch {
      // Skip invalid rows without breaking the whole reminder batch.
    }
  }

  const now = Date.now();
  for (const subscription of opts.subscriptions) {
    if (myToken !== syncToken) return;
    if (!subscription.isActive) continue;
    const renewal = parseRenewalDate(subscription.nextRenewalDate);
    if (!renewal) continue;
    const triggerDate = new Date(renewal.getTime() - 24 * 60 * 60 * 1000);
    if (triggerDate.getTime() <= now) continue;

    try {
      await N.scheduleNotificationAsync({
        content: {
          title: 'تجديد اشتراك قادم',
          body: `${subscription.name} يتجدد غداً`,
          data: { type: 'subscription', id: subscription.id },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: CHANNEL_ID,
        },
      });
    } catch {
      // Skip invalid rows without breaking the whole reminder batch.
    }
  }
}
