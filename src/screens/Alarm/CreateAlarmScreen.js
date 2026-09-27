import React, {useState, useCallback, useRef} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert, Platform, PermissionsAndroid,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {captureRef} from 'react-native-view-shot';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import {useTheme} from '../../theme';
import {useAlarms} from '../../hooks/useAlarms';
import {notifyDownload} from '../../services/NotificationService';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const generateQrValue = () =>
  `MORGEN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const CHALLENGES = [
  {id: 'shake', symbol: '≋', title: 'Shake It', desc: 'Shake your phone X times', color: '#FF6B00'},
  {id: 'qr', symbol: '⊞', title: 'QR Hunt', desc: 'Scan a QR code in your home', color: '#1B2B6B'},
  {id: 'sequence', symbol: '◈', title: 'Sequence', desc: 'Repeat a button pattern', color: '#00C896'},
  {id: 'workout', symbol: '↑', title: 'Workout', desc: 'Move in front of camera 20 sec', color: '#FFB020'},
];

const SOUNDS = [
  {id: 'default', label: 'Classic'},
  {id: 'digital', label: 'Digital'},
  {id: 'gentle', label: 'Gentle'},
  {id: 'intense', label: 'Intense'},
];

const TimePicker = ({value, onChange, colors}) => {
  const [hours24, minutes] = value.split(':').map(Number);
  const isPM = hours24 >= 12;
  const hour12 = hours24 % 12 || 12;

  const incH = () => {
    const newH = (hours24 + 1) % 24;
    onChange(`${String(newH).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };
  const decH = () => {
    const newH = (hours24 - 1 + 24) % 24;
    onChange(`${String(newH).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };
  const incM = () => {
    const newM = (minutes + 1) % 60;
    onChange(`${String(hours24).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };
  const decM = () => {
    const newM = (minutes - 1 + 60) % 60;
    onChange(`${String(hours24).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };
  const toggleAmPm = () => {
    const newH = isPM ? hours24 - 12 : hours24 + 12;
    onChange(`${String(newH).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  return (
    <View style={styles.timePicker}>
      <View style={styles.timeColumn}>
        <TouchableOpacity onPress={incH} style={styles.timeArrow}>
          <Text style={{color: colors.accent, fontSize: 18, fontWeight: '300'}}>▲</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 72, fontWeight: '700', letterSpacing: -3, color: colors.text, textAlign: 'center'}}>
          {String(hour12).padStart(2, '0')}
        </Text>
        <TouchableOpacity onPress={decH} style={styles.timeArrow}>
          <Text style={{color: colors.accent, fontSize: 18, fontWeight: '300'}}>▼</Text>
        </TouchableOpacity>
      </View>
      <Text style={{fontSize: 72, fontWeight: '300', color: colors.textTertiary, marginBottom: 8}}>:</Text>
      <View style={styles.timeColumn}>
        <TouchableOpacity onPress={incM} style={styles.timeArrow}>
          <Text style={{color: colors.accent, fontSize: 18, fontWeight: '300'}}>▲</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 72, fontWeight: '700', letterSpacing: -3, color: colors.text, textAlign: 'center'}}>
          {String(minutes).padStart(2, '0')}
        </Text>
        <TouchableOpacity onPress={decM} style={styles.timeArrow}>
          <Text style={{color: colors.accent, fontSize: 18, fontWeight: '300'}}>▼</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={toggleAmPm}
        style={{backgroundColor: colors.surfaceHighlight, borderRadius: 12, padding: 14, marginLeft: 12}}>
        <Text style={{fontSize: 18, fontWeight: '600', color: colors.accent}}>
          {isPM ? 'PM' : 'AM'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const CreateAlarmScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const {create, update} = useAlarms();
  const editAlarm = route?.params?.alarm;

  const [time, setTime] = useState(editAlarm?.time || '07:00');
  const [label, setLabel] = useState(editAlarm?.label || '');
  const [days, setDays] = useState(editAlarm?.days || [1, 2, 3, 4, 5]);
  const [challenge, setChallenge] = useState(editAlarm?.challenge || 'shake');
  const [shakeCount, setShakeCount] = useState(editAlarm?.shakeCount || 20);
  const [qrValue, setQrValue] = useState(editAlarm?.qrValue || generateQrValue());
  const [sound, setSound] = useState(editAlarm?.sound || 'default');
  const [saving, setSaving] = useState(false);
  const qrViewRef = useRef(null);

  const toggleDay = useCallback(i => {
    setDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort());
  }, []);

  const handleSavePhoto = useCallback(async () => {
    if (!qrViewRef.current) return;

    try {
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission refusée', "Impossible d'enregistrer le QR code sans accès au stockage.");
          return;
        }
      }

      const fileUri = await captureRef(qrViewRef, {format: 'png', quality: 1});
      await CameraRoll.save(fileUri, {type: 'photo'});
      await notifyDownload('QR code téléchargé', 'Enregistré dans ta galerie photo.');
    } catch (e) {
      console.error('QR save error:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer le QR code.");
    }
  }, []);

  const handleSavePdf = useCallback(async () => {
    if (!qrViewRef.current) return;

    try {
      const base64Img = await captureRef(qrViewRef, {format: 'png', quality: 1, result: 'base64'});

      const html = `
        <html>
          <body style="text-align:center; font-family:sans-serif; padding:40px;">
            <h2>QR code Morgen</h2>
            <p>Imprime cette page et cache-la quelque part dans ta maison.<br/>
            Tu devras scanner ce QR code pour éteindre ton alarme.</p>
            <img src="data:image/png;base64,${base64Img}" width="220" height="220" />
            <p style="color:#888; font-size:12px;">${qrValue}</p>
          </body>
        </html>
      `;

      const pdf = await RNHTMLtoPDF.convert({
        html,
        fileName: `morgen-qr-${qrValue}`,
        base64: false,
      });

      await Share.open({
        url: Platform.OS === 'android' ? `file://${pdf.filePath}` : pdf.filePath,
        type: 'application/pdf',
        failOnCancel: false,
      });

      await notifyDownload('QR code (PDF) téléchargé', 'Prêt à imprimer ou à partager.');
    } catch (e) {
      console.error('QR pdf error:', e);
      Alert.alert('Erreur', 'Impossible de générer le PDF.');
    }
  }, [qrValue]);

  const handleDownloadQr = useCallback(() => {
    Alert.alert('Télécharger le QR code', 'Choisis un format', [
      {text: 'Photo', onPress: handleSavePhoto},
      {text: 'PDF', onPress: handleSavePdf},
      {text: 'Annuler', style: 'cancel'},
    ]);
  }, [handleSavePhoto, handleSavePdf]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const alarmData = {time, label, days, challenge, shakeCount, qrValue, sound, enabled: true};
    try {
      console.log('=== SAVING ALARM ===', alarmData);
      if (editAlarm) {
        console.log('Updating alarm:', editAlarm.id);
        await update(editAlarm.id, alarmData);
      } else {
        console.log('Creating new alarm');
        await create(alarmData);
      }
      console.log('Alarm saved successfully');
      navigation.goBack();
    } catch (e) {
      console.error('Save alarm error:', e);
      console.error('Error details:', JSON.stringify(e));
    } finally {
      setSaving(false);
    }
  }, [time, label, days, challenge, shakeCount, qrValue, sound, editAlarm, create, update, navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {
        paddingHorizontal: spacing.xl,
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 0.5,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{fontSize: 15, color: colors.accent}}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 17, fontWeight: '600', color: colors.text}}>
          {editAlarm ? 'Edit Alarm' : 'New Alarm'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{padding: spacing.xl, paddingBottom: 100}} showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel(colors)}>TIME</Text>
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.xl,
          padding: 28, alignItems: 'center', marginBottom: spacing.xl,
          shadowColor: '#000', shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        }}>
          <TimePicker value={time} onChange={setTime} colors={colors} />
        </View>

        <Text style={styles.sectionLabel(colors)}>LABEL</Text>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Wake up, champ..."
          placeholderTextColor={colors.textTertiary}
          style={{
            fontSize: 15, color: colors.text,
            backgroundColor: colors.surface,
            borderRadius: radius.md, padding: spacing.lg,
            borderWidth: 0.5, borderColor: colors.borderSubtle,
            marginBottom: spacing.xl,
          }}
        />

        <Text style={styles.sectionLabel(colors)}>REPEAT</Text>
        <View style={{flexDirection: 'row', gap: 6, marginBottom: spacing.xl}}>
          {DAYS.map((day, i) => {
            const active = days.includes(i);
            return (
              <TouchableOpacity
                key={day}
                onPress={() => toggleDay(i)}
                style={{
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderRadius: radius.md,
                  borderColor: active ? colors.accent : colors.border,
                  borderWidth: 0.5, width: 40, height: 40,
                  alignItems: 'center', justifyContent: 'center',
                }}
                activeOpacity={0.75}>
                <Text style={{
                  fontSize: 10, fontWeight: '700',
                  color: active ? '#fff' : colors.textSecondary,
                  letterSpacing: 0.5,
                }}>
                  {day.toUpperCase().slice(0, 2)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel(colors)}>CHALLENGE</Text>
        {CHALLENGES.map(ch => {
          const active = challenge === ch.id;
          return (
            <React.Fragment key={ch.id}>
              <TouchableOpacity
                onPress={() => setChallenge(ch.id)}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  borderColor: active ? ch.color : colors.borderSubtle,
                  borderWidth: active ? 1.5 : 0.5,
                  padding: spacing.lg, marginBottom: spacing.sm,
                  flexDirection: 'row', alignItems: 'center',
                }}
                activeOpacity={0.75}>
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: ch.color + '18',
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                }}>
                  <Text style={{fontSize: 26, color: ch.color, fontWeight: '200'}}>{ch.symbol}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 16, fontWeight: '600', color: active ? ch.color : colors.text}}>
                    {ch.title}
                  </Text>
                  <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>{ch.desc}</Text>
                </View>
                {active && (
                  <View style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: ch.color, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              {active && ch.id === 'shake' && (
                <View style={{
                  backgroundColor: colors.surfaceHighlight,
                  borderRadius: radius.md, padding: spacing.lg,
                  marginBottom: spacing.sm,
                }}>
                  <Text style={{fontSize: 13, color: colors.textSecondary, fontWeight: '500'}}>
                    Number of shakes
                  </Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12}}>
                    <TouchableOpacity
                      onPress={() => setShakeCount(Math.max(5, shakeCount - 1))}
                      style={{
                        backgroundColor: colors.surface, borderRadius: radius.sm,
                        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                      }}>
                      <Text style={{fontSize: 24, color: colors.accent, fontWeight: '300'}}>−</Text>
                    </TouchableOpacity>
                    <Text style={{fontSize: 36, fontWeight: '700', color: colors.text, marginHorizontal: 28}}>
                      {shakeCount}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShakeCount(Math.min(100, shakeCount + 1))}
                      style={{
                        backgroundColor: colors.surface, borderRadius: radius.sm,
                        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                      }}>
                      <Text style={{fontSize: 24, color: colors.accent, fontWeight: '300'}}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {active && ch.id === 'qr' && (
                <View style={{
                  backgroundColor: colors.surfaceHighlight,
                  borderRadius: radius.md, padding: spacing.lg,
                  marginBottom: spacing.sm, alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 13, color: colors.textSecondary, fontWeight: '500',
                    textAlign: 'center', marginBottom: 16, lineHeight: 18,
                  }}>
                    Imprime ce QR code (ou affiche-le sur un autre écran) et cache-le
                    quelque part dans ta maison. Tu devras le scanner pour éteindre l'alarme.
                  </Text>
                  <View
                    ref={qrViewRef}
                    collapsable={false}
                    style={{backgroundColor: '#fff', padding: 16, borderRadius: radius.md}}>
                    <QRCode value={qrValue} size={160} />
                  </View>
                  <Text style={{fontSize: 11, color: colors.textTertiary, marginTop: 10}}>
                    {qrValue}
                  </Text>
                  <View style={{flexDirection: 'row', gap: 20, marginTop: 14}}>
                    <TouchableOpacity onPress={handleDownloadQr}>
                      <Text style={{color: colors.accent, fontWeight: '600', fontSize: 13}}>
                        Télécharger
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setQrValue(generateQrValue())}>
                      <Text style={{color: colors.accent, fontWeight: '600', fontSize: 13}}>
                        Générer un nouveau code
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </React.Fragment>
          );
        })}

        <Text style={[styles.sectionLabel(colors), {marginTop: spacing.xl}]}>
          SOUND
        </Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {SOUNDS.map(s => {
            const active = sound === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSound(s.id)}
                style={{
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderRadius: radius.full,
                  borderColor: active ? colors.accent : colors.border,
                  borderWidth: 0.5, paddingHorizontal: 18, paddingVertical: 10,
                }}
                activeOpacity={0.75}>
                <Text style={{fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.textSecondary}}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  timePicker: {flexDirection: 'row', alignItems: 'center', gap: 12},
  timeColumn: {alignItems: 'center'},
  timeArrow: {padding: 10},
  sectionLabel: (colors) => ({
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, color: colors.textTertiary,
    textTransform: 'uppercase', marginBottom: 12,
  }),
});

export default CreateAlarmScreen;