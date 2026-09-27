import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert,
} from 'react-native';
import {useTheme} from '../../theme';
import {joinGroupWithCode, hasProfile} from '../../services/GroupsService';

const JoinGroupScreen = ({navigation}) => {
  const {colors, spacing, radius} = useTheme();
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  const handleJoin = useCallback(async () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      Alert.alert('Code invalide', 'Entre le code à 6 caractères que tu as reçu.');
      return;
    }

    if (!(await hasProfile())) {
      navigation.navigate('ProfileSetup', {
        onDone: () => navigation.replace('JoinGroup'),
      });
      return;
    }

    setSaving(true);
    try {
      await joinGroupWithCode(trimmed);
      Alert.alert(
        'Demande envoyée',
        "Un admin du groupe doit approuver ta demande avant que tu puisses voir les alarmes.",
        [{text: 'OK', onPress: () => navigation.replace('GroupsList')}],
      );
    } catch (e) {
      console.error('Join group error:', e);
      Alert.alert('Erreur', e?.message || 'Code invalide ou expiré.');
    } finally {
      setSaving(false);
    }
  }, [code, navigation]);

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
          Join a Group
        </Text>
        <TouchableOpacity onPress={handleJoin} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{padding: spacing.xl}}>
        <Text style={styles.sectionLabel(colors)}>INVITE CODE</Text>
        <TextInput
          value={code}
          onChangeText={t => setCode(t.toUpperCase())}
          placeholder="XXXXXX"
          placeholderTextColor={colors.textTertiary}
          autoFocus
          autoCapitalize="characters"
          maxLength={6}
          style={{
            fontSize: 28, fontWeight: '700', letterSpacing: 6,
            color: colors.text, textAlign: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.md, padding: spacing.lg,
            borderWidth: 0.5, borderColor: colors.borderSubtle,
          }}
        />
        <Text style={{
          fontSize: 12, color: colors.textSecondary,
          marginTop: spacing.lg, lineHeight: 18,
        }}>
          Ask whoever invited you for the 6-character code. It only works once
          and expires after a while — the group's admin still needs to approve
          you before you see any alarms.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 16,
  },
  sectionLabel: (colors) => ({
    fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, color: colors.textTertiary,
    textTransform: 'uppercase', marginBottom: 12,
  }),
});

export default JoinGroupScreen;
