import React from 'react';
import {View, Text, SafeAreaView, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '../../theme';

const GroupsScreen = () => {
  const {colors, typography, spacing, radius} = useTheme();

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={{paddingHorizontal: spacing.xl, paddingTop: 16, paddingBottom: 20}}>
        <Text style={[typography.label, {color: colors.accent}]}>ALARM CHALLENGE</Text>
        <Text style={[typography.h1, {color: colors.text, marginTop: 2}]}>Groups</Text>
      </View>
      <View style={styles.center}>
        <Text style={{fontSize: 64, marginBottom: 24}}>👥</Text>
        <Text style={[typography.h2, {color: colors.text, textAlign: 'center'}]}>
          Group Alarms
        </Text>
        <Text style={[typography.body, {
          color: colors.textSecondary, textAlign: 'center',
          marginTop: 8, paddingHorizontal: 40,
        }]}>
          Create shared alarms for your family, roommates or team.
        </Text>
        <TouchableOpacity style={{
          backgroundColor: colors.surfaceHighlight, borderRadius: radius.full,
          marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
        }}>
          <Text style={[typography.body, {color: colors.accent, fontWeight: '600'}]}>
            Coming in v2
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});

export default GroupsScreen;