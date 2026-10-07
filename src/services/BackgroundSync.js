import BackgroundFetch from 'react-native-background-fetch';
import {syncGroupAlarms} from './GroupsService';

// Synchronisation des alarmes de groupe SANS ouvrir l'app : Android réveille
// cette tâche toutes les ~15 min (WorkManager), même app fermée, et après un
// redémarrage du téléphone. Elle récupère les alarmes créées/modifiées par
// l'admin et recalcule les heures avec le fuseau actuel de l'appareil.

// Appelée quand l'app est complètement fermée (headless JS).
export const headlessSyncTask = async (event) => {
  const {taskId, timeout} = event;
  if (timeout) {
    BackgroundFetch.finish(taskId);
    return;
  }
  try {
    await syncGroupAlarms();
  } catch (e) {
    console.log('Headless sync failed:', e?.message);
  }
  BackgroundFetch.finish(taskId);
};

// Appelée au lancement de l'app : configure la tâche périodique.
export const startBackgroundSync = async () => {
  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // minutes (minimum imposé par Android)
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      async (taskId) => {
        try {
          await syncGroupAlarms();
        } catch (e) {
          console.log('Background sync failed:', e?.message);
        }
        BackgroundFetch.finish(taskId);
      },
      (taskId) => BackgroundFetch.finish(taskId),
    );
  } catch (e) {
    console.log('Background sync unavailable:', e?.message);
  }
};
