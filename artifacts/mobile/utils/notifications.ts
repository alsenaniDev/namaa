// // Local notification scheduler.
// //
// // Strategy: cancel-all + reschedule on every sync. This keeps the
// // implementation stateless (no IDs to persist) and tolerates edits / deletes
// // without bookkeeping. Cost is small — we only schedule a few dozen items.
// //
// // • Commitments  → monthly repeating reminder on dueDay at 09:00 local.
// // • Subscriptions → single one-shot reminder one day before nextRenewalDate
// //                   at 09:00 local. Re-evaluated next time the user edits.
// //
// // Notifications are native-only. Web silently no-ops.

// import { Platform } from 'react-native';
// import type { Commitment, Subscription } from '../types';

// const NOTIF_HOUR = 9;
// const NOTIF_MINUTE = 0;

// type NotificationsModule = typeof import('expo-notifications');

// let _modPromise: Promise<NotificationsModule | null> | null = null;
// function loadModule(): Promise<NotificationsModule | null> {
//   if (Platform.OS === 'web') return Promise.resolve(null);
//   if (!_modPromise) {
//     _modPromise = import('expo-notifications')
//       .then((m) => m as NotificationsModule)
//       .catch(() => null);
//   }
//   return _modPromise;
// }

// /** Configure foreground handler + Android channel. Safe to call multiple times. */
// export async function initNotifications(): Promise<void> {
//   const N = await loadModule();
//   if (!N) return;
//   try {
//     N.setNotificationHandler({
//       handleNotification: async () => ({
//         shouldShowBanner: true,
//         shouldShowList: true,
//         shouldPlaySound: true,
//         shouldSetBadge: false,
//       }),
//     });
//     if (Platform.OS === 'android') {
//       await N.setNotificationChannelAsync('reminders', {
//         name: 'تذكيرات نماء',
//         importance: N.AndroidImportance.DEFAULT,
//         vibrationPattern: [0, 250, 250, 250],
//         lightColor: '#10B981',
//       });
//     }
//   } catch {
//     /* noop */
//   }
// }

// /** Returns true if user granted permission (or was already granted). */
// export async function requestPermissions(): Promise<boolean> {
//   const N = await loadModule();
//   if (!N) return false;
//   try {
//     const cur = await N.getPermissionsAsync();
//     if (cur.granted) return true;
//     if (!cur.canAskAgain) return false;
//     const req = await N.requestPermissionsAsync();
//     return !!req.granted;
//   } catch {
//     return false;
//   }
// }

// export async function cancelAllScheduled(): Promise<void> {
//   const N = await loadModule();
//   if (!N) return;
//   try { await N.cancelAllScheduledNotificationsAsync(); } catch { /* noop */ }
// }

// function clampDay(day: number): number {
//   if (!Number.isFinite(day)) return 1;
//   return Math.max(1, Math.min(28, Math.trunc(day)));
// }

// function parseRenewalDate(iso: string): Date | null {
//   // Accept either YYYY-MM-DD or full ISO.
//   const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
//   if (!m) return null;
//   const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), NOTIF_HOUR, NOTIF_MINUTE, 0, 0);
//   return Number.isNaN(d.getTime()) ? null : d;
// }

// // Latest-run token: any sync call that started before the current one becomes
// // a no-op as soon as a newer call begins. This prevents interleaved
// // cancel-all + reschedule batches from leaving stale or duplicate schedules
// // when the user edits / imports / toggles rapidly.
// let _syncToken = 0;

// /**
//  * Cancel all and re-schedule reminders for the given items.
//  * No-ops on web. Silently swallows per-item errors so one bad row can't break
//  * the whole batch. Serialized via a monotonic token so only the latest call
//  * is allowed to schedule.
//  */
// export async function syncReminders(opts: {
//   enabled: boolean;
//   commitments: Commitment[];
//   subscriptions: Subscription[];
// }): Promise<void> {
//   const N = await loadModule();
//   if (!N) return;
//   const myToken = ++_syncToken;
//   await cancelAllScheduled();
//   if (myToken !== _syncToken) return;
//   if (!opts.enabled) return;

//   const granted = await requestPermissions();
//   if (myToken !== _syncToken) return;
//   if (!granted) return;

//   // ─── Commitments: monthly repeating at dueDay 09:00 ──────────────────────
//   for (const c of opts.commitments) {
//     if (myToken !== _syncToken) return;
//     if (!c.isActive || c.isRecurring === false) continue;
//     try {
//       await N.scheduleNotificationAsync({
//         content: {
//           title: 'تذكير بالتزام',
//           body: `${c.title} يستحق اليوم`,
//           data: { type: 'commitment', id: c.id },
//         },
//         trigger: {
//           type: N.SchedulableTriggerInputTypes.CALENDAR,
//           day: clampDay(c.dueDay),
//           hour: NOTIF_HOUR,
//           minute: NOTIF_MINUTE,
//           repeats: true,
//           channelId: 'reminders',
//         },
//       });
//     } catch { /* skip bad row */ }
//   }

//   // ─── Subscriptions: one-shot, one day before renewal ─────────────────────
//   const now = Date.now();
//   for (const s of opts.subscriptions) {
//     if (myToken !== _syncToken) return;
//     if (!s.isActive) continue;
//     const renewal = parseRenewalDate(s.nextRenewalDate);
//     if (!renewal) continue;
//     const trigger = new Date(renewal.getTime() - 24 * 60 * 60 * 1000);
//     if (trigger.getTime() <= now) continue;
//     try {
//       await N.scheduleNotificationAsync({
//         content: {
//           title: 'تجديد اشتراك قادم',
//           body: `${s.name} يتجدد غداً`,
//           data: { type: 'subscription', id: s.id },
//         },
//         trigger: {
//           type: N.SchedulableTriggerInputTypes.DATE,
//           date: trigger,
//           channelId: 'reminders',
//         },
//       });
//     } catch { /* skip bad row */ }
//   }
// }


export async function requestPermissions(): Promise<boolean> {
    console.log('Notifications are disabled in this development build.');
    return false;
}

export async function registerForPushNotificationsAsync(): Promise<null> {
    console.log('Push notifications are disabled in this development build.');
    return null;
}

export async function scheduleLocalNotification(): Promise<void> {
    console.log('Notifications are disabled in this development build.');
}

export async function cancelAllNotifications(): Promise<void> {
    console.log('Notifications are disabled in this development build.');
}
