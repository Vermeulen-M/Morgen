import notifee, {
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
} from '@notifee/react-native';

export const createAlarmChannel = async () => {
  await notifee.createChannel({
    id: 'morgen_alarm',
    name: 'Morgen Alarms',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
  });
};

export const scheduleAlarm = async (alarm) => {
  await createAlarmChannel();

  const [hours, minutes] = alarm.time.split(':').map(Number);

  const now = new Date();
  const trigger = new Date();
  trigger.setHours(hours, minutes, 0, 0);

  if (trigger.getTime() <= now.getTime()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  console.log('=== MORGEN ALARM ===');
  console.log('Alarm time string:', alarm.time);
  console.log('Hours:', hours, 'Minutes:', minutes);
  console.log('Trigger time:', trigger.toLocaleString());
  console.log('===================');

  await notifee.createTriggerNotification(
    {
      id: String(alarm.id),
      title: '⏰ Morgen',
      body: alarm.label || 'Wake up! Complete your challenge.',
      android: {
        channelId: 'morgen_alarm',
        importance: AndroidImportance.HIGH,
        fullScreenAction: {
          id: 'alarm_screen',
        },
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        sound: 'default',
        vibrationPattern: [300, 500],
      },
      data: {
        alarmId: String(alarm.id),
        challenge: alarm.challenge || 'shake',
        shakeCount: String(alarm.shakeCount || 20),
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: trigger.getTime(),
    },
  );
};

export const cancelAlarm = async (alarmId) => {
  await notifee.cancelNotification(String(alarmId));
};

export const cancelAllAlarms = async () => {
  await notifee.cancelAllNotifications();
};

export const requestPermissions = async () => {
  await notifee.requestPermission();
};

export const createDownloadChannel = async () => {
  await notifee.createChannel({
    id: 'morgen_downloads',
    name: 'Morgen Downloads',
    importance: AndroidImportance.DEFAULT,
  });
};

export const notifyDownload = async (title, body) => {
  await createDownloadChannel();
  await notifee.displayNotification({
    title: `⬇️ ${title}`,
    body,
    android: {
      channelId: 'morgen_downloads',
      importance: AndroidImportance.DEFAULT,
      pressAction: {id: 'default'},
    },
  });
};