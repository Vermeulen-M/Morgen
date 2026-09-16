import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ALARMS: 'ac_alarms',
  PLANNER: 'ac_planner',
  GROUPS: 'ac_groups',
  PROFILE: 'ac_profile',
  STREAK: 'ac_streak',
  STATS: 'ac_stats',
};

const get = async (key) => {
  try {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const set = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const getAlarms = () => get(KEYS.ALARMS);
export const saveAlarms = (alarms) => set(KEYS.ALARMS, alarms);

export const addAlarm = async (alarm) => {
  const alarms = (await getAlarms()) || [];
  const newAlarm = {
    ...alarm,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  await saveAlarms([...alarms, newAlarm]);
  return newAlarm;
};

export const updateAlarm = async (id, updates) => {
  const alarms = (await getAlarms()) || [];
  const updated = alarms.map(a => (a.id === id ? {...a, ...updates} : a));
  await saveAlarms(updated);
};

export const deleteAlarm = async (id) => {
  const alarms = (await getAlarms()) || [];
  await saveAlarms(alarms.filter(a => a.id !== id));
};

export const getPlannerDay = async (dateStr) => {
  const planner = (await get(KEYS.PLANNER)) || {};
  return planner[dateStr] || null;
};

export const savePlannerDay = async (dateStr, data) => {
  const planner = (await get(KEYS.PLANNER)) || {};
  planner[dateStr] = data;
  await set(KEYS.PLANNER, planner);
};

export const getProfile = () => get(KEYS.PROFILE);
export const saveProfile = (profile) => set(KEYS.PROFILE, profile);

export const getStreak = () => get(KEYS.STREAK);
export const saveStreak = (streak) => set(KEYS.STREAK, streak);

export const updateStreak = async () => {
  const streak = (await getStreak()) || {current: 0, best: 0, lastDate: null};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (streak.lastDate === today) return streak;

  const newCurrent =
    streak.lastDate === yesterday ? streak.current + 1 : 1;
  const newStreak = {
    current: newCurrent,
    best: Math.max(newCurrent, streak.best),
    lastDate: today,
  };
  await saveStreak(newStreak);
  return newStreak;
};

export const getGroups = () => get(KEYS.GROUPS);
export const saveGroups = (groups) => set(KEYS.GROUPS, groups);