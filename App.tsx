import React, {useEffect} from 'react';
import {ThemeProvider} from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import {requestPermissions, createAlarmChannel} from './src/services/NotificationService';
import notifee, {EventType} from '@notifee/react-native';
import {navigationRef} from './src/navigation/NavigationRef';

const App = () => {
  useEffect(() => {
    requestPermissions();
    createAlarmChannel();

    // Foreground event — quand l'app est ouverte
    const unsubscribe = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.DELIVERED || type === EventType.PRESS) {
        const data = detail.notification?.data;
        if (data?.alarmId && navigationRef.current) {
          navigationRef.current.navigate('AlarmRinging', {
            alarm: {
              id: data.alarmId,
              challenge: data.challenge || 'shake',
              shakeCount: parseInt(data.shakeCount || '20', 10),
              time: new Date().toTimeString().slice(0, 5),
            },
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator navigationRef={navigationRef} />
    </ThemeProvider>
  );
};

export default App;