import React, {useState, useCallback} from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, ScrollView,
  TouchableOpacity, Switch, StatusBar, Image, Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {
  getProfile, getStreak, getStats,
  getWellness, updateWellnessField,
} from '../../services/StorageService';
import {
  hasProfile, getWellnessProfile, updateWellnessProfile,
} from '../../services/GroupsService';

const WELLNESS_OPTIONS = {
  goal: {
    title: 'My goal',
    choices: ['Lose weight', 'Build muscle', 'Improve sleep', 'Be more productive', 'Just consistency'],
  },
  activityLevel: {
    title: 'Activity level',
    choices: ['Sedentary', 'Light', 'Moderate', 'Active', 'Very active'],
  },
  nutrition: {
    title: 'Nutrition preference',
    choices: ['No preference', 'Vegetarian', 'Vegan', 'Low carb', 'Balanced'],
  },
};

const SettingRow = ({emoji, title, subtitle, right, onPress, colors, typography, spacing}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    style={{
      backgroundColor: colors.surface, padding: spacing.lg,
      borderBottomColor: colors.borderSubtle, borderBottomWidth: 0.5,
      flexDirection: 'row', alignItems: 'center',
    }}
    activeOpacity={onPress ? 0.7 : 1}>
    <Text style={{fontSize: 20, marginRight: 14, width: 28}}>{emoji}</Text>
    <View style={{flex: 1}}>
      <Text style={[typography.body, {color: colors.text, fontWeight: '500'}]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.caption, {color: colors.textSecondary, marginTop: 2}]}>{subtitle}</Text>
      ) : null}
    </View>
    {right}
  </TouchableOpacity>
);

const Section = ({title, children, colors, typography, spacing, radius}) => (
  <View style={{marginBottom: spacing.xl}}>
    <Text style={[typography.label, {color: colors.accent, paddingHorizontal: spacing.xl, marginBottom: spacing.sm}]}>
      {title}
    </Text>
    <View style={{borderRadius: radius.lg, overflow: 'hidden', marginHorizontal: spacing.xl, borderWidth: 0.5, borderColor: colors.borderSubtle}}>
      {children}
    </View>
  </View>
);

const SettingsScreen = ({navigation}) => {
  const {colors, typography, spacing, radius, isDark, themeMode, toggleTheme} = useTheme();
  const [profile, setProfile] = useState(null);
  const [streak, setStreak] = useState({current: 0});
  const [stats, setStats] = useState({totalChallengesCompleted: 0});
  const [wellness, setWellness] = useState({});

  useFocusEffect(
    useCallback(() => {
      getProfile().then(p => setProfile(p));
      getStreak().then(s => setStreak(s || {current: 0}));
      getStats().then(s => setStats(s || {totalChallengesCompleted: 0}));
      // Le wellness suit le profil (Supabase) une fois qu'il en existe un —
      // sinon il reste local à l'appareil (pas de profil = pas de compte serveur).
      hasProfile().then(hp => {
        if (hp) {
          getWellnessProfile().then(w => setWellness(w || {})).catch(() => {});
        } else {
          getWellness().then(w => setWellness(w || {}));
        }
      });
    }, []),
  );

  const handleWellnessField = useCallback((field) => {
    const {title, choices} = WELLNESS_OPTIONS[field];
    Alert.alert(title, undefined, [
      ...choices.map(choice => ({
        text: choice,
        onPress: async () => {
          try {
            const hp = await hasProfile();
            const updated = hp
              ? await updateWellnessProfile(field, choice)
              : await updateWellnessField(field, choice);
            setWellness(updated);
          } catch (e) {
            console.error('Update wellness error:', e);
          }
        },
      })),
      {text: 'Cancel', style: 'cancel'},
    ]);
  }, []);

  const handleEditProfile = useCallback(async () => {
    const hp = await hasProfile();
    navigation.navigate('Groups', {
      screen: hp ? 'ProfileSetup' : 'ProfileGate',
      params: {returnTo: 'Settings'},
    });
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{paddingHorizontal: spacing.xl, paddingTop: 16, paddingBottom: 20}}>
          <Text style={[typography.label, {color: colors.accent}]}>ALARM CHALLENGE</Text>
          <Text style={[typography.h1, {color: colors.text, marginTop: 2}]}>Settings</Text>
        </View>

        {/* Profile card */}
        <View style={{
          marginHorizontal: spacing.xl, backgroundColor: colors.surface,
          borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl,
          borderWidth: 0.5, borderColor: colors.borderSubtle, alignItems: 'center',
        }}>
          {profile?.photoUrl ? (
            <Image
              source={{uri: profile.photoUrl}}
              style={{width: 56, height: 56, borderRadius: 28}}
            />
          ) : (
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: colors.accentGlow,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{fontSize: 22, fontWeight: '700', color: colors.accent}}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={[typography.h2, {color: colors.text, marginTop: 12}]}>
            {profile?.name || 'No profile yet'}
          </Text>
          <Text style={[typography.body, {color: colors.textSecondary}]}>
            {(streak.current || 0)} day streak · {(stats.totalChallengesCompleted || 0)} challenges done
          </Text>
          <TouchableOpacity
            onPress={handleEditProfile}
            style={{
              backgroundColor: colors.surfaceHighlight, borderRadius: radius.full,
              marginTop: 14, paddingHorizontal: 20, paddingVertical: 8,
            }}>
            <Text style={[typography.bodySmall, {color: colors.accent, fontWeight: '600'}]}>
              {profile?.name ? 'Edit Profile' : 'Create Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <Section title="APPEARANCE" colors={colors} typography={typography} spacing={spacing} radius={radius}>
          <SettingRow
            emoji="🌙" title="Dark mode"
            subtitle={`Current: ${themeMode}`}
            colors={colors} typography={typography} spacing={spacing}
            right={
              <Switch
                value={isDark}
                onValueChange={v => toggleTheme(v ? 'dark' : 'light')}
                trackColor={{false: colors.border, true: colors.accentGlow}}
                thumbColor={isDark ? colors.accent : colors.textTertiary}
              />
            }
          />
          <SettingRow
            emoji="📱" title="Follow system theme"
            colors={colors} typography={typography} spacing={spacing}
            right={
              <Switch
                value={themeMode === 'system'}
                onValueChange={v => toggleTheme(v ? 'system' : isDark ? 'dark' : 'light')}
                trackColor={{false: colors.border, true: colors.accentGlow}}
                thumbColor={themeMode === 'system' ? colors.accent : colors.textTertiary}
              />
            }
          />
        </Section>

        {/* Challenges */}
        <Section title="CHALLENGES" colors={colors} typography={typography} spacing={spacing} radius={radius}>
          <SettingRow
            emoji="🫨" title="Default shake count" subtitle="20 shakes"
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => {}}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
          <SettingRow
            emoji="📷" title="Manage QR codes" subtitle="0 QR codes placed"
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => {}}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
          <SettingRow
            emoji="🎮" title="Sequence difficulty" subtitle="Medium (6 steps)"
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => {}}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
        </Section>

        {/* Wellness */}
        <Section title="WELLNESS PROFILE" colors={colors} typography={typography} spacing={spacing} radius={radius}>
          <SettingRow
            emoji="🎯" title="My goal" subtitle={wellness.goal || 'Not set'}
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => handleWellnessField('goal')}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
          <SettingRow
            emoji="🏋️" title="Activity level" subtitle={wellness.activityLevel || 'Not set'}
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => handleWellnessField('activityLevel')}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
          <SettingRow
            emoji="🥗" title="Nutrition preference" subtitle={wellness.nutrition || 'Not set'}
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => handleWellnessField('nutrition')}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
        </Section>

        {/* About */}
        <Section title="ABOUT" colors={colors} typography={typography} spacing={spacing} radius={radius}>
          <SettingRow
            emoji="⭐" title="Rate the app"
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => {}}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
          <SettingRow
            emoji="💬" title="Send feedback"
            colors={colors} typography={typography} spacing={spacing}
            onPress={() => {}}
            right={<Text style={[typography.body, {color: colors.textTertiary}]}>›</Text>}
          />
          <SettingRow
            emoji="ℹ️" title="Version" subtitle="1.0.0"
            colors={colors} typography={typography} spacing={spacing}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default SettingsScreen;