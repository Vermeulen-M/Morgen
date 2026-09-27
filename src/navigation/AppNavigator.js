import React from 'react';
import {View, Text, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useTheme} from '../theme';

import AlarmListScreen from '../screens/Alarm/AlarmListScreen';
import CreateAlarmScreen from '../screens/Alarm/CreateAlarmScreen';
import AlarmRingingScreen from '../screens/Alarm/AlarmRingingScreen';
import QRScanScreen from '../screens/Alarm/QRScanScreen';
import PlannerScreen from '../screens/Planner/PlannerScreen';
import GroupsScreen from '../screens/Groups/GroupsScreen';
import CreateGroupScreen from '../screens/Groups/CreateGroupScreen';
import JoinGroupScreen from '../screens/Groups/JoinGroupScreen';
import GroupDetailScreen from '../screens/Groups/GroupDetailScreen';
import ProfileSetupScreen from '../screens/Groups/ProfileSetupScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const AlarmStack = createStackNavigator();
const GroupsStack = createStackNavigator();

const TAB_ICONS = {
  Alarms:   '◷',
  Planner:  '▦',
  Groups:   '⊙',
  Settings: '✦',
};

const TabIcon = ({name, focused, color}) => (
  <View style={{alignItems: 'center', justifyContent: 'center', width: 32, height: 28}}>
    <Text style={{
      fontSize: name === 'Alarms' ? 40 : name === 'Groups' ? 20 : 26,
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
      <AlarmStack.Screen
        name="QRScan"
        component={QRScanScreen}
        options={{presentation: 'fullScreenModal', gestureEnabled: false}}
      />
    </AlarmStack.Navigator>
  );
};

const GroupsNavigator = () => {
  const {colors} = useTheme();
  return (
    <GroupsStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {backgroundColor: colors.background},
      }}>
      <GroupsStack.Screen name="GroupsList" component={GroupsScreen} />
      <GroupsStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{presentation: 'modal'}}
      />
      <GroupsStack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{presentation: 'modal'}}
      />
      <GroupsStack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{presentation: 'modal'}}
      />
      <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </GroupsStack.Navigator>
  );
};

const AppNavigator = ({navigationRef}) => {
  const {colors} = useTheme();

  return (
    <NavigationContainer ref={navigationRef}>
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
        <Tab.Screen name="Groups" component={GroupsNavigator} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;