/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, {EventType} from '@notifee/react-native';

// Handler background — intercepte la notification et ouvre AlarmRingingScreen
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS || type === EventType.DELIVERED) {
    const {notification} = detail;
    if (notification?.data?.alarmId) {
      // L'app va s'ouvrir via fullScreenAction
      console.log('Background alarm triggered:', notification.data);
    }
  }
});

AppRegistry.registerComponent(appName, () => App);