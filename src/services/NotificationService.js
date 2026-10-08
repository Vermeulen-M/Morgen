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

// --- Alarmes de groupe -----------------------------------------------------
// Une notification notifee TIMESTAMP ne sonne qu'une fois : on programme la
// prochaine occurrence qui tombe sur un des jours choisis (0 = dimanche …
// 6 = samedi, comme les alarmes perso). syncGroupAlarms() (GroupsService)
// reprogramme à chaque ouverture de l'app et après chaque sonnerie.

// Fuseau de cet appareil (ex. "Europe/Rome").
export const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const zoneParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const v = {};
  parts.forEach(p => { v[p.type] = p.value; });
  return {
    y: +v.year, m: +v.month - 1, d: +v.day,
    h: +v.hour % 24, min: +v.minute, s: +v.second,
  };
};

// Décalage (ms) du fuseau par rapport à UTC à cet instant.
const zoneOffsetMs = (timeZone, date) => {
  const p = zoneParts(date, timeZone);
  const asUtc = Date.UTC(p.y, p.m, p.d, p.h, p.min, p.s);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

// Instant exact où l'horloge murale de `timeZone` affiche y-m-d h:min.
const zonedWallTimeToDate = (y, m, d, h, min, timeZone) => {
  const guess = Date.UTC(y, m, d, h, min);
  let ts = guess - zoneOffsetMs(timeZone, new Date(guess));
  ts = guess - zoneOffsetMs(timeZone, new Date(ts)); // 2e passe : changement d'heure
  return new Date(ts);
};

// Prochaine occurrence. Sans `timeZone` : heure locale de cet appareil.
// Avec `timeZone` : l'heure est celle de ce fuseau (mode "même instant"),
// et les jours (0 = dimanche … 6) sont ceux de ce fuseau.
export const nextOccurrence = (time, days, timeZone = null, after = new Date()) => {
  const [hours, minutes] = time.split(':').map(Number);
  const allowed = Array.isArray(days) && days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
  const now = after;

  if (timeZone) {
    try {
      const base = zoneParts(now, timeZone);
      for (let offset = 0; offset < 9; offset++) {
        const cal = new Date(Date.UTC(base.y, base.m, base.d + offset));
        const target = zonedWallTimeToDate(
          cal.getUTCFullYear(), cal.getUTCMonth(), cal.getUTCDate(),
          hours, minutes, timeZone,
        );
        if (target.getTime() > now.getTime() && allowed.includes(cal.getUTCDay())) {
          return target;
        }
      }
      return null;
    } catch (e) {
      console.log('Timezone conversion failed, using device time:', e?.message);
    }
  }

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() > now.getTime() && allowed.includes(candidate.getDay())) {
      return candidate;
    }
  }
  return null;
};

// Fuseau à utiliser pour une alarme de groupe (null = heure locale du membre).
export const groupAlarmZone = (ga) =>
  ga.timezone_mode === 'same_instant' && ga.timezone ? ga.timezone : null;

// Heure "HH:MM" sur CET appareil pour une alarme de groupe (pour l'affichage).
export const deviceTimeForGroupAlarm = (ga) => {
  const zone = groupAlarmZone(ga);
  if (!zone) return ga.time;
  const next = ga.date ? dateOccurrence(ga) : nextOccurrence(ga.time, ga.days, zone);
  if (!next) return ga.time;
  return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`;
};

// Horizon de programmation à l'avance : l'alarme sonne même si l'app n'est
// pas rouverte (la synchro en arrière-plan complète la fenêtre ensuite).
export const GROUP_MAX_SLOTS = 400; // Android plafonne à ~500 alarmes par appli
const GROUP_HORIZON_DAYS = 365;

// Alarme à date précise ('YYYY-MM-DD' + heure) : un seul instant, aussi loin
// qu'on veut. En mode 'same_instant' l'heure est celle du fuseau de l'admin.
export const dateOccurrence = (ga) => {
  if (!ga.date) return null;
  const [y, m, d] = ga.date.split('-').map(Number);
  const [h, min] = ga.time.split(':').map(Number);
  const zone = groupAlarmZone(ga);
  let when;
  try {
    when = zone ? zonedWallTimeToDate(y, m - 1, d, h, min, zone) : new Date(y, m - 1, d, h, min, 0, 0);
  } catch {
    when = new Date(y, m - 1, d, h, min, 0, 0);
  }
  return when.getTime() > Date.now() ? when : null;
};

export const upcomingOccurrences = (ga, maxSlots = GROUP_MAX_SLOTS) => {
  if (ga.date) {
    const one = dateOccurrence(ga);
    return one ? [one] : [];
  }
  const zone = groupAlarmZone(ga);
  const limit = Date.now() + GROUP_HORIZON_DAYS * 24 * 3600 * 1000;
  const result = [];
  let after = new Date();
  while (result.length < maxSlots) {
    const next = nextOccurrence(ga.time, ga.days, zone, after);
    if (!next || next.getTime() > limit) break;
    result.push(next);
    after = new Date(next.getTime() + 60 * 1000);
  }
  return result;
};

export const groupNotificationId = (groupAlarmId, slot = 0) => `g_${groupAlarmId}_${slot}`;

export const cancelGroupAlarm = async (groupAlarmId) => {
  const ids = [`g_${groupAlarmId}`]; // ancien format
  for (let i = 0; i < GROUP_MAX_SLOTS + 4; i++) ids.push(groupNotificationId(groupAlarmId, i));
  await notifee.cancelTriggerNotifications(ids);
};

// Renvoie {count, until} : nombre de sonneries programmées et date de la dernière.
export const scheduleGroupAlarm = async (groupAlarm, groupName, maxSlots = GROUP_MAX_SLOTS) => {
  await createAlarmChannel();
  await cancelGroupAlarm(groupAlarm.id);

  const occurrences = upcomingOccurrences(groupAlarm, maxSlots);

  for (let i = 0; i < occurrences.length; i++) {
    await notifee.createTriggerNotification(
      {
        id: groupNotificationId(groupAlarm.id, i),
        title: groupName ? `⏰ ${groupName}` : '⏰ Morgen',
        body: groupAlarm.note || 'Group alarm — wake up!',
        android: {
          channelId: 'morgen_alarm',
          importance: AndroidImportance.HIGH,
          fullScreenAction: {id: 'alarm_screen'},
          pressAction: {id: 'default', launchActivity: 'default'},
          sound: 'default',
          vibrationPattern: [300, 500],
        },
        data: {
          alarmId: groupNotificationId(groupAlarm.id, i),
          groupAlarmId: String(groupAlarm.id),
          groupName: groupName || '',
          label: groupAlarm.note || '',
          link: groupAlarm.link || '',
          time: deviceTimeForGroupAlarm(groupAlarm),
          challenge: groupAlarm.challenge || 'none',
          shakeCount: '20',
        },
      },
      {type: TriggerType.TIMESTAMP, timestamp: occurrences[i].getTime()},
    );
  }
  return {
    count: occurrences.length,
    until: occurrences.length ? occurrences[occurrences.length - 1].getTime() : 0,
  };
};
