import {useState, useEffect, useCallback} from 'react';
import {
  getAlarms,
  addAlarm,
  updateAlarm,
  deleteAlarm,
} from '../services/StorageService';
import {
  scheduleAlarm,
  cancelAlarm,
} from '../services/NotificationService';

export const useAlarms = () => {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAlarms();
    setAlarms(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (alarmData) => {
    const newAlarm = await addAlarm(alarmData);
    if (newAlarm.enabled) {
      await scheduleAlarm(newAlarm);
    }
    setAlarms(prev => [...prev, newAlarm]);
    return newAlarm;
  }, []);

const update = useCallback(async (id, updates) => {
  await cancelAlarm(id);
  await updateAlarm(id, updates);
  const updatedAlarm = {...updates, id};
  if (updates.enabled !== false) {
    await scheduleAlarm(updatedAlarm);
  }
  setAlarms(prev =>
    prev.map(a => (a.id === id ? {...a, ...updates} : a)),
  );
}, []);


  const remove = useCallback(async (id) => {
    await deleteAlarm(id);
    await cancelAlarm(id);
    setAlarms(prev => prev.filter(a => a.id !== id));
  }, []);

  const toggle = useCallback(
    async (id) => {
      const alarm = alarms.find(a => a.id === id);
      if (alarm) {
        const newEnabled = !alarm.enabled;
        await updateAlarm(id, {enabled: newEnabled});
        if (newEnabled) {
          await scheduleAlarm({...alarm, enabled: true});
        } else {
          await cancelAlarm(id);
        }
        setAlarms(prev =>
          prev.map(a => (a.id === id ? {...a, enabled: newEnabled} : a)),
        );
      }
    },
    [alarms],
  );

  return {alarms, loading, create, update, remove, toggle, reload: load};
};