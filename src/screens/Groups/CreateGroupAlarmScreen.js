import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import {useTheme} from '../../theme';
import {createGroupAlarm, syncGroupAlarms} from '../../services/GroupsService';
import {getDeviceTimeZone} from '../../services/NotificationService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CHALLENGES = [
  {id: null, title: 'None', desc: 'Just tap "I\'m awake"'},
  {id: 'shake', title: 'Shake It', desc: 'Shake the phone 20 times'},
  {id: 'sequence', title: 'Sequence', desc: 'Repeat a button pattern'},
  {id: 'workout', title: 'Workout', desc: 'Move in front of the camera'},
];

const pad = n => String(n).padStart(2, '0');

const Stepper = ({value, onUp, onDown, colors}) => (
  <View style={{alignItems: 'center', width: 90}}>
    <TouchableOpacity onPress={onUp} style={{padding: 10}}>
      <Text style={{color: colors.accent, fontSize: 18}}>▲</Text>
    </TouchableOpacity>
    <Text style={{fontSize: 64, fontWeight: '700', letterSpacing: -2, color: colors.text}}>
      {pad(value)}
    </Text>
    <TouchableOpacity onPress={onDown} style={{padding: 10}}>
      <Text style={{color: colors.accent, fontSize: 18}}>▼</Text>
    </TouchableOpacity>
  </View>
);

const CreateGroupAlarmScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const {groupId} = route.params;

  const [hours, setHours] = useState(7);
  const [minutes, setMinutes] = useState(0);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [challenge, setChallenge] = useState(null);
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [tzMode, setTzMode] = useState('same_instant');
  const [kind, setKind] = useState('repeat'); // 'repeat' | 'once'
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const [dYear, setDYear] = useState(tomorrow.getFullYear());
  const [dMonth, setDMonth] = useState(tomorrow.getMonth() + 1);
  const [dDay, setDDay] = useState(tomorrow.getDate());
  const adminZone = getDeviceTimeZone();
  const [saving, setSaving] = useState(false);

  const toggleDay = useCallback(i => {
    setDays(prev => (prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort()));
  }, []);

  const handleSave = useCallback(async () => {
    let date = null;
    if (kind === 'once') {
      const check = new Date(dYear, dMonth - 1, dDay, hours, minutes);
      if (check.getMonth() !== dMonth - 1) {
        Alert.alert('Invalid date', 'This day does not exist in that month.');
        return;
      }
      if (check.getTime() <= Date.now()) {
        Alert.alert('Date in the past', 'Pick a date and time in the future.');
        return;
      }
      date = `${dYear}-${pad(dMonth)}-${pad(dDay)}`;
    } else if (days.length === 0) {
      Alert.alert('Pick at least one day');
      return;
    }
    // Lien de réunion optionnel : on n'accepte que https:// (sécurité).
    let cleanLink = link.trim();
    if (cleanLink && !/^https?:\/\//i.test(cleanLink)) cleanLink = `https://${cleanLink}`;
    if (cleanLink && !/^https:\/\/[^\s]+$/i.test(cleanLink)) {
      Alert.alert('Invalid link', 'The meeting link must start with https://');
      return;
    }
    setSaving(true);
    try {
      await createGroupAlarm(groupId, {
        time: `${pad(hours)}:${pad(minutes)}`,
        days: kind === 'once' ? [] : days,
        date,
        challenge,
        timezoneMode: tzMode,
        timezone: adminZone,
        note: note.trim(),
        link: cleanLink || null,
      });
      await syncGroupAlarms();
      navigation.goBack();
    } catch (e) {
      console.error('Create group alarm error:', e);
      Alert.alert('Erreur', e?.message || "Impossible de créer l'alarme.");
    } finally {
      setSaving(false);
    }
  }, [groupId, hours, minutes, days, challenge, note, tzMode, adminZone, kind, dYear, dMonth, dDay, link, navigation]);

  const label = {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 12,
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {
        paddingHorizontal: spacing.xl,
        borderBottomColor: colors.borderSubtle, borderBottomWidth: 0.5,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{fontSize: 15, color: colors.accent}}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 17, fontWeight: '600', color: colors.text}}>Group Alarm</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{padding: spacing.xl, paddingBottom: 80}}>
        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl}}>
          <Stepper value={hours} colors={colors}
            onUp={() => setHours(h => (h + 1) % 24)}
            onDown={() => setHours(h => (h + 23) % 24)} />
          <Text style={{fontSize: 56, color: colors.textTertiary, marginHorizontal: 4}}>:</Text>
          <Stepper value={minutes} colors={colors}
            onUp={() => setMinutes(m => (m + 5) % 60)}
            onDown={() => setMinutes(m => (m + 55) % 60)} />
        </View>

        <Text style={label}>Time zone</Text>
        {[
          {id: 'same_instant', title: 'Same moment for everyone',
           desc: `${pad(hours)}:${pad(minutes)} in your time zone (${adminZone}), converted to each member's local time`},
          {id: 'local', title: "Each member's local time",
           desc: `Rings at ${pad(hours)}:${pad(minutes)} on every member's own clock`},
        ].map(o => (
          <TouchableOpacity key={o.id} onPress={() => setTzMode(o.id)} style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            padding: spacing.lg, marginBottom: spacing.sm,
            borderWidth: 1.5, borderColor: tzMode === o.id ? colors.accent : 'transparent',
          }}>
            <Text style={{fontSize: 15, fontWeight: '600', color: colors.text}}>{o.title}</Text>
            <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>{o.desc}</Text>
          </TouchableOpacity>
        ))}
        <View style={{height: spacing.lg}} />

        <View style={{flexDirection: 'row', marginBottom: spacing.xl, gap: 8}}>
          {[{id: 'repeat', t: 'Repeating'}, {id: 'once', t: 'One time'}].map(k => (
            <TouchableOpacity key={k.id} onPress={() => setKind(k.id)} style={{
              flex: 1, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center',
              backgroundColor: kind === k.id ? colors.accent : colors.surface,
            }}>
              <Text style={{fontSize: 14, fontWeight: '700', color: kind === k.id ? '#fff' : colors.textSecondary}}>
                {k.t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {kind === 'once' ? (
          <>
            <Text style={label}>Date</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.xl}}>
              <View style={{alignItems: 'center', width: 80}}>
                <TouchableOpacity onPress={() => setDDay(v => (v % 31) + 1)} style={{padding: 8}}>
                  <Text style={{color: colors.accent, fontSize: 16}}>▲</Text>
                </TouchableOpacity>
                <Text style={{fontSize: 32, fontWeight: '700', color: colors.text}}>{pad(dDay)}</Text>
                <TouchableOpacity onPress={() => setDDay(v => ((v + 29) % 31) + 1)} style={{padding: 8}}>
                  <Text style={{color: colors.accent, fontSize: 16}}>▼</Text>
                </TouchableOpacity>
              </View>
              <View style={{alignItems: 'center', width: 80}}>
                <TouchableOpacity onPress={() => setDMonth(v => (v % 12) + 1)} style={{padding: 8}}>
                  <Text style={{color: colors.accent, fontSize: 16}}>▲</Text>
                </TouchableOpacity>
                <Text style={{fontSize: 32, fontWeight: '700', color: colors.text}}>{pad(dMonth)}</Text>
                <TouchableOpacity onPress={() => setDMonth(v => ((v + 10) % 12) + 1)} style={{padding: 8}}>
                  <Text style={{color: colors.accent, fontSize: 16}}>▼</Text>
                </TouchableOpacity>
              </View>
              <View style={{alignItems: 'center', width: 100}}>
                <TouchableOpacity onPress={() => setDYear(v => v + 1)} style={{padding: 8}}>
                  <Text style={{color: colors.accent, fontSize: 16}}>▲</Text>
                </TouchableOpacity>
                <Text style={{fontSize: 32, fontWeight: '700', color: colors.text}}>{dYear}</Text>
                <TouchableOpacity
                  onPress={() => setDYear(v => Math.max(new Date().getFullYear(), v - 1))}
                  style={{padding: 8}}>
                  <Text style={{color: colors.accent, fontSize: 16}}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: -12, marginBottom: spacing.xl}}>
              day / month / year
            </Text>
          </>
        ) : (
          <>
        <Text style={label}>Days</Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl}}>
          {DAYS.map((d, i) => {
            const on = days.includes(i);
            return (
              <TouchableOpacity key={d} onPress={() => toggleDay(i)} style={{
                width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? colors.accent : colors.surface,
              }}>
                <Text style={{fontSize: 11, fontWeight: '700', color: on ? '#fff' : colors.textSecondary}}>
                  {d.charAt(0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
          </>
        )}

        <Text style={label}>Challenge (optional)</Text>
        {CHALLENGES.map(c => {
          const on = challenge === c.id;
          return (
            <TouchableOpacity key={String(c.id)} onPress={() => setChallenge(c.id)} style={{
              backgroundColor: colors.surface, borderRadius: radius.lg,
              padding: spacing.lg, marginBottom: spacing.sm,
              borderWidth: 1.5, borderColor: on ? colors.accent : 'transparent',
            }}>
              <Text style={{fontSize: 15, fontWeight: '600', color: colors.text}}>{c.title}</Text>
              <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>{c.desc}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={[label, {marginTop: spacing.lg}]}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Morning run at 6!"
          placeholderTextColor={colors.textTertiary}
          maxLength={80}
          style={{
            fontSize: 15, color: colors.text, backgroundColor: colors.surface,
            borderRadius: radius.md, padding: spacing.lg,
            borderWidth: 0.5, borderColor: colors.borderSubtle,
          }}
        />
        <Text style={[label, {marginTop: spacing.lg}]}>Meeting link (optional)</Text>
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="https://zoom.us/j/..."
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{
            fontSize: 15, color: colors.text, backgroundColor: colors.surface,
            borderRadius: radius.md, padding: spacing.lg,
            borderWidth: 0.5, borderColor: colors.borderSubtle,
          }}
        />
        <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: spacing.lg, lineHeight: 18}}>
          Every approved member gets this alarm on their phone.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
});

export default CreateGroupAlarmScreen;
