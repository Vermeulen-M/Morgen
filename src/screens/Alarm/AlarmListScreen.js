import React, {useCallback, useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Switch, StatusBar, SafeAreaView, Animated, Image,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {useAlarms} from '../../hooks/useAlarms';
import {getStreak, getProfile} from '../../services/StorageService';
import {hasProfile} from '../../services/GroupsService';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CHALLENGE_CONFIG = {
  shake:    {symbol: '≋', label: 'Shake',    color: '#FF6B00'},
  qr:       {symbol: '⊞', label: 'QR Hunt',  color: '#1B2B6B'},
  sequence: {symbol: '◈', label: 'Sequence', color: '#00C896'},
  workout:  {symbol: '↑', label: 'Workout',  color: '#FFB020'},
};

const DecoBg = ({colors}) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <View style={{
      position: 'absolute', top: -100, right: -100,
      width: 300, height: 300, borderRadius: 150,
      backgroundColor: '#FF6B0018',
    }} />
    <View style={{
      position: 'absolute', bottom: 80, left: -80,
      width: 220, height: 220, borderRadius: 110,
      backgroundColor: '#1B2B6B12',
    }} />
    <View style={{
      position: 'absolute', top: 320, right: -40,
      width: 140, height: 140, borderRadius: 70,
      backgroundColor: '#FF6B0010',
    }} />
  </View>
);

const AlarmCard = ({alarm, onToggle, onPress, onDelete, index, isDark}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const {colors, spacing, radius} = useTheme();
  const [showDelete, setShowDelete] = useState(false);

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
        onPress={() => {
          if (showDelete) {
            setShowDelete(false);
          } else {
            onPress();
          }
        }}
        onLongPress={() => setShowDelete(true)}
        delayLongPress={400}
        activeOpacity={0.9}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 8},
          shadowOpacity: isDark ? 0.5 : 0.12,
          shadowRadius: 16,
          elevation: 8,
          overflow: 'hidden',
        }}>
        {alarm.enabled && !showDelete && (
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
                  fontSize: 48, fontWeight: '800', letterSpacing: -2,
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

        {/* Delete overlay */}
        {showDelete && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.88)',
            borderRadius: radius.xl,
            alignItems: 'center', justifyContent: 'center',
            padding: spacing.lg,
          }}>
            <Text style={{
              fontSize: 14, fontWeight: '600', color: '#fff',
              marginBottom: spacing.lg, textAlign: 'center',
            }}>
              Delete this alarm?
            </Text>
            <View style={{flexDirection: 'row', gap: 12, width: '100%'}}>
              <TouchableOpacity
                onPress={() => setShowDelete(false)}
                style={{
                  flex: 1, paddingVertical: 12,
                  backgroundColor: colors.surfaceHighlight,
                  borderRadius: radius.lg, alignItems: 'center',
                }}>
                <Text style={{color: colors.text, fontWeight: '600', fontSize: 14}}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowDelete(false);
                  onDelete(alarm.id);
                }}
                style={{
                  flex: 1, paddingVertical: 12,
                  backgroundColor: '#FF3B30',
                  borderRadius: radius.lg, alignItems: 'center',
                }}>
                <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
      <Text style={{fontSize: 36, color: '#FF6B00', fontWeight: '200'}}>◷</Text>
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
        backgroundColor: '#FF6B00',
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
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState(null);
  const {colors, spacing, radius, isDark} = useTheme();
  const {alarms, loading, toggle, reload, remove} = useAlarms();

  useFocusEffect(
    useCallback(() => {
      reload();
      getStreak().then(data => {
        if (data) setStreak(data.current);
      });
      getProfile().then(p => setProfile(p));
    }, [reload]),
  );

  const handleCreate = useCallback(() => navigation.navigate('CreateAlarm'), [navigation]);
  const handlePress = useCallback(alarm => navigation.navigate('CreateAlarm', {alarm}), [navigation]);
  const handleProfilePress = useCallback(async () => {
    // Bouton façon ChatGPT en haut à droite : ouvre la connexion/création de
    // profil pour qui n'en a pas encore (débloque groupes, wellness partagé,
    // etc.), et sinon amène direct sur le profil existant.
    if (await hasProfile()) {
      navigation.navigate('Settings');
    } else {
      navigation.navigate('Groups', {
        screen: 'ProfileGate',
        params: {returnTo: 'Alarms'},
      });
    }
  }, [navigation]);
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
            color: '#FF6B00', textTransform: 'uppercase', marginBottom: 4,
          }}>
            Good morning
          </Text>
          <Text style={{
            fontSize: 28, fontWeight: '800',
            color: colors.text, letterSpacing: -0.5,
          }}>
            My Alarms
          </Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <TouchableOpacity
            onPress={handleProfilePress}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radius.full,
              borderWidth: 0.5, borderColor: colors.borderSubtle,
              paddingVertical: 8, paddingHorizontal: profile?.name ? 8 : 14,
              gap: 8,
            }}>
            {profile?.photoUrl ? (
              <Image
                source={{uri: profile.photoUrl}}
                style={{width: 22, height: 22, borderRadius: 11}}
              />
            ) : profile?.name ? (
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: colors.accentGlow,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{fontSize: 11, fontWeight: '700', color: colors.accent}}>
                  {profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={{fontSize: 13, fontWeight: '600', color: colors.text}}>
              {profile?.name ? 'Profile' : 'Sign in'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreate}
            style={{
              backgroundColor: '#FF6B00',
              width: 44, height: 44, borderRadius: 22,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#FF6B00',
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
            }}
            activeOpacity={0.85}>
            <Text style={{fontSize: 26, color: '#fff', fontWeight: '300', lineHeight: 32}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.statsRow, {paddingHorizontal: spacing.xl, marginBottom: spacing.lg}]}>
        <View style={{
          flex: 1, marginRight: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.xl, padding: spacing.lg,
          shadowColor: '#000', shadowOffset: {width: 0, height: 4},
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12, elevation: 4, overflow: 'hidden',
        }}>
          <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#FF6B00'}} />
          <Text style={{fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8, marginTop: 4}}>
            Day Streak
          </Text>
          <Text style={{fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1}}>{streak}</Text>
          <Text style={{fontSize: 11, color: '#FF6B00', fontWeight: '600', marginTop: 4}}>Keep it up</Text>
        </View>

        <View style={{
          flex: 1, marginLeft: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.xl, padding: spacing.lg,
          shadowColor: '#000', shadowOffset: {width: 0, height: 4},
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12, elevation: 4, overflow: 'hidden',
        }}>
          <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#1B2B6B'}} />
          <Text style={{fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8, marginTop: 4}}>
            Active
          </Text>
          <Text style={{fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1}}>{activeCount}</Text>
          <Text style={{fontSize: 11, color: '#1B2B6B', fontWeight: '600', marginTop: 4}}>Alarms on</Text>
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
        contentContainerStyle={{paddingHorizontal: spacing.xl, paddingBottom: 100, flexGrow: 1}}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <EmptyState onPress={handleCreate} colors={colors} spacing={spacing} radius={radius} />
        ) : null}
        renderItem={({item, index}) => (
          <AlarmCard
            alarm={item}
            onToggle={toggle}
            onPress={() => handlePress(item)}
            onDelete={remove}
            index={index}
            isDark={isDark}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 20},
  statsRow: {flexDirection: 'row'},
  cardTop: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  timeRow: {flexDirection: 'row', alignItems: 'flex-end'},
  cardBottom: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  daysRow: {flexDirection: 'row', alignItems: 'center'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60},
});

export default AlarmListScreen;