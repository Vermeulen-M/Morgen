import {useState, useEffect, useCallback} from 'react';
import {
  getAlarms,
  addAlarm,
  updateAlarm,
  deleteAlarm,
} from '../services/StorageService';

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
    setAlarms(prev => [...prev, newAlarm]);
    return newAlarm;
  }, []);

  const update = useCallback(async (id, updates) => {
    await updateAlarm(id, updates);
    setAlarms(prev =>
      prev.map(a => (a.id === id ? {...a, ...updates} : a)),
    );
  }, []);

  const remove = useCallback(async (id) => {
    await deleteAlarm(id);
    setAlarms(prev => prev.filter(a => a.id !== id));
  }, []);

  const toggle = useCallback(
    async (id) => {
      const alarm = alarms.find(a => a.id === id);
      if (alarm) await update(id, {enabled: !alarm.enabled});
    },
    [alarms, update],
  );

  return {alarms, loading, create, update, remove, toggle, reload: load};
};