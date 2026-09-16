import React, {useCallback, useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Switch, StatusBar, SafeAreaView, Animated,
} from 'react-native';
import {useTheme} from '../../theme';
import {useAlarms} from '../../hooks/useAlarms';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CHALLENGE_CONFIG = {
  shake:    {symbol: '≋', label: 'Shake',    color: '#FF4D6A'},
  qr:       {symbol: '⊞', label: 'QR Hunt',  color: '#7C5CFC'},
  sequence: {symbol: '◈', label: 'Sequence', color: '#00E896'},
  workout:  {symbol: '↑', label: 'Workout',  color: '#FFB020'},
};

const DecoBg = ({colors}) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={{
      position: 'absolute', top: -100, right: -100,
      width: 300, height: 300, borderRadius: 150,
      backgroundColor: colors.accent + '25',
    }} />
    <View style={{
      position: 'absolute', bottom: 80, left: -80,
      width: 220, height: 220, borderRadius: 110,
      backgroundColor: '#FF4D6A18',
    }} />
    <View style={{
      position: 'absolute', top: 320, right: -40,
      width: 140, height: 140, borderRadius: 70,
      backgroundColor: '#00E89615',
    }} />
  </View>
);

const AlarmCard = ({alarm, onToggle, onPress, index}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const {colors, spacing, radius} = useTheme();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400,
      delay: index * 60, useNativeDriver: true,
    }).start();
  }, []);

  const [h, m] = alarm.time.split(':');
  const hour24 = parseInt(h, 10);
  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const ch = CHALLENGE_CONFIG[alarm.challenge] || CHALLENGE_CONFIG.shake;

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{translateY: fadeAnim.interpolate({inputRange: [0,1], outputRange: [16,0]})}],
      marginBottom: spacing.md,
    }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
          overflow: 'hidden',
        }}>
        {alarm.enabled && (
          <View style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 3, backgroundColor: ch.color,
          }} />
        )}
        <View style={{padding: spacing.lg}}>
          <View style={styles.cardTop}>
            <View>
              {alarm.label ? (
                <Text style={{
                  fontSize: 10, fontWeight: '600', letterSpacing: 1.5,
                  color: colors.textTertiary, marginBottom: 6, textTransform: 'uppercase',
                }}>
                  {alarm.label}
                </Text>
              ) : null}
              <View style={styles.timeRow}>
                <Text style={{
                  fontSize: 48, fontWeight: '700', letterSpacing: -2,
                  color: alarm.enabled ? colors.text : colors.textTertiary,
                }}>
                  {String(hour12).padStart(2, '0')}:{m}
                </Text>
                <Text style={{
                  fontSize: 15, fontWeight: '500',
                  color: colors.textSecondary,
                  marginLeft: 6, marginBottom: 8,
                }}>
                  {ampm}
                </Text>
              </View>
            </View>
            <Switch
              value={alarm.enabled}
              onValueChange={() => onToggle(alarm.id)}
              trackColor={{false: colors.surfaceHighlight, true: ch.color + '55'}}
              thumbColor={alarm.enabled ? ch.color : colors.textTertiary}
            />
          </View>
          <View style={{height: 0.5, backgroundColor: colors.borderSubtle, marginVertical: 12}} />
          <View style={styles.cardBottom}>
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => {
                const active = alarm.days?.includes(i);
                return (
                  <View key={i} style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: active ? ch.color : 'transparent',
                    borderWidth: active ? 0 : 1,
                    borderColor: colors.borderSubtle,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 4,
                  }}>
                    <Text style={{
                      fontSize: 8, fontWeight: '700',
                      color: active ? '#fff' : colors.textTertiary,
                    }}>
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: ch.color + '15',
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
              gap: 5,
            }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: ch.color,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{fontSize: 13, color: '#fff', fontWeight: '400'}}>
                  {ch.symbol}
                </Text>
              </View>
              <Text style={{fontSize: 11, fontWeight: '600', color: ch.color}}>
                {ch.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const EmptyState = ({onPress, colors, spacing, radius}) => (
  <View style={styles.empty}>
    <View style={{
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.surfaceHighlight,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: spacing.xl,
    }}>
      <Text style={{fontSize: 36, color: colors.accent, fontWeight: '200'}}>◷</Text>
    </View>
    <Text style={{fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
      No alarms yet
    </Text>
    <Text style={{
      fontSize: 14, color: colors.textSecondary,
      textAlign: 'center', marginTop: 8,
      paddingHorizontal: 40, lineHeight: 22,
    }}>
      Create your first challenge alarm and start winning your mornings
    </Text>
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.accent,
        borderRadius: radius.xl,
        marginTop: spacing.xl,
        paddingHorizontal: 28, paddingVertical: 14,
      }}
      activeOpacity={0.85}>
      <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>
        + New Alarm
      </Text>
    </TouchableOpacity>
  </View>
);

const AlarmListScreen = ({navigation}) => {
  const [streak] = useState(0);
  const {colors, typography, spacing, radius, isDark} = useTheme();
  const {alarms, loading, toggle} = useAlarms();

  const handleCreate = useCallback(() => navigation.navigate('CreateAlarm'), [navigation]);
  const handlePress = useCallback(alarm => navigation.navigate('CreateAlarm', {alarm}), [navigation]);
  const activeCount = alarms.filter(a => a.enabled).length;

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <DecoBg colors={colors} />
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, {paddingHorizontal: spacing.xl}]}>
        <View>
          <Text style={{
            fontSize: 11, fontWeight: '600', letterSpacing: 1.5,
            color: colors.accent, textTransform: 'uppercase', marginBottom: 4,
          }}>
            Good morning
          </Text>
          <Text style={{fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5}}>
            My Alarms
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCreate}
          style={{
            backgroundColor: colors.accent,
            width: 44, height: 44, borderRadius: 22,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: colors.accent,
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
          }}
          activeOpacity={0.85}>
          <Text style={{fontSize: 26, color: '#fff', fontWeight: '300', lineHeight: 32}}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statsRow, {paddingHorizontal: spacing.xl, marginBottom: spacing.lg}]}>
        <View style={{
          flex: 1, marginRight: spacing.sm,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          shadowColor: '#000', shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
        }}>
          <Text style={{fontSize: 28, color: '#FF6B35', fontWeight: '300', marginBottom: 4}}>◈</Text>
          <Text style={{fontSize: 28, fontWeight: '700', color: colors.text}}>{streak}</Text>
          <Text style={{fontSize: 10, fontWeight: '600', letterSpacing: 1, color: colors.textTertiary, marginTop: 2}}>
            DAY STREAK
          </Text>
        </View>
        <View style={{
          flex: 1, marginLeft: spacing.sm,
          backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
          shadowColor: '#000', shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
        }}>
          <Text style={{fontSize: 28, color: colors.accent, fontWeight: '300', marginBottom: 4}}>◷</Text>
          <Text style={{fontSize: 28, fontWeight: '700', color: colors.text}}>{activeCount}</Text>
          <Text style={{fontSize: 10, fontWeight: '600', letterSpacing: 1, color: colors.textTertiary, marginTop: 2}}>
            ACTIVE
          </Text>
        </View>
      </View>

      {alarms.length > 0 && (
        <Text style={{
          fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
          color: colors.textTertiary, textTransform: 'uppercase',
          paddingHorizontal: spacing.xl, marginBottom: spacing.md,
        }}>
          Scheduled · {alarms.length}
        </Text>
      )}

      <FlatList
        data={alarms}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingBottom: 100, flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <EmptyState onPress={handleCreate} colors={colors} spacing={spacing} radius={radius} />
        ) : null}
        renderItem={({item, index}) => (
          <AlarmCard alarm={item} onToggle={toggle} onPress={() => handlePress(item)} index={index} />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16, paddingBottom: 20,
  },
  statsRow: {flexDirection: 'row'},
  cardTop: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  timeRow: {flexDirection: 'row', alignItems: 'flex-end'},
  cardBottom: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  daysRow: {flexDirection: 'row', alignItems: 'center'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60},
});

export default AlarmListScreen;