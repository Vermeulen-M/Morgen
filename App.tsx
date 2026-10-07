import React, {useEffect} from 'react';
import {AppState} from 'react-native';
import {ThemeProvider} from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import {requestPermissions, createAlarmChannel} from './src/services/NotificationService';
import notifee, {EventType} from '@notifee/react-native';
import {navigationRef} from './src/navigation/NavigationRef';
import {syncGroupAlarms} from './src/services/GroupsService';
import {startBackgroundSync} from './src/services/BackgroundSync';

const App = () => {
  useEffect(() => {
    requestPermissions();
    createAlarmChannel();
    syncGroupAlarms();
    startBackgroundSync();

    // À chaque retour dans l'app, on recalcule les alarmes de groupe : si le
    // membre a changé de fuseau (voyage), l'heure locale s'ajuste toute seule.
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') syncGroupAlarms();
    });

    // Foreground event — quand l'app est ouverte
    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.DELIVERED || type === EventType.PRESS) {
        const data = detail.notification?.data;
        if (data?.alarmId && navigationRef.current) {
          navigationRef.current.navigate('AlarmRinging', {
            alarm: {
              id: data.alarmId,
              groupAlarmId: data.groupAlarmId || null,
              groupName: data.groupName || null,
              label: data.label || undefined,
              challenge: data.challenge || 'shake',
              shakeCount: parseInt(data.shakeCount || '20', 10),
              time: data.time || new Date().toTimeString().slice(0, 5),
            },
          });
        }
      }
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator navigationRef={navigationRef} />
    </ThemeProvider>
  );
};

export default App;