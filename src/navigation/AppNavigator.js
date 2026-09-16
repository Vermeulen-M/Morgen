import React from 'react';
import {View, Text, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useTheme} from '../theme';

import AlarmListScreen from '../screens/Alarm/AlarmListScreen';
import CreateAlarmScreen from '../screens/Alarm/CreateAlarmScreen';
import AlarmRingingScreen from '../screens/Alarm/AlarmRingingScreen';
import PlannerScreen from '../screens/Planner/PlannerScreen';
import GroupsScreen from '../screens/Groups/GroupsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const AlarmStack = createStackNavigator();

const TAB_ICONS = {
  Alarms:   '◷',
  Planner:  '▦',
  Groups:   '⊙',
  Settings: '✦',
};

const TabIcon = ({name, focused, color}) => (
  <View style={{alignItems: 'center', justifyContent: 'center', width: 32, height: 28}}>
    <Text style={{
      fontSize: 26,
      color: color,
      opacity: focused ? 1 : 0.45,
      lineHeight: 30,
    }}>
      {TAB_ICONS[name]}
    </Text>
    {focused && (
      <View style={{
        position: 'absolute',
        bottom: -2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: color,
      }} />
    )}
  </View>
);

const AlarmNavigator = () => {
  const {colors} = useTheme();
  return (
    <AlarmStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {backgroundColor: colors.background},
      }}>
      <AlarmStack.Screen name="AlarmList" component={AlarmListScreen} />
      <AlarmStack.Screen
        name="CreateAlarm"
        component={CreateAlarmScreen}
        options={{presentation: 'modal'}}
      />
      <AlarmStack.Screen
        name="AlarmRinging"
        component={AlarmRingingScreen}
        options={{presentation: 'fullScreenModal', gestureEnabled: false}}
      />
    </AlarmStack.Navigator>
  );
};

const AppNavigator = () => {
  const {colors} = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 0.5,
            height: Platform.OS === 'ios' ? 84 : 62,
            paddingBottom: Platform.OS === 'ios' ? 28 : 8,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 1,
          },
          tabBarIcon: ({focused, color}) => (
            <TabIcon name={route.name} focused={focused} color={color} />
          ),
        })}>
        <Tab.Screen name="Alarms" component={AlarmNavigator} />
        <Tab.Screen name="Planner" component={PlannerScreen} />
        <Tab.Screen name="Groups" component={GroupsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;