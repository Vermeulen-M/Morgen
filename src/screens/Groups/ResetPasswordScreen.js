import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {useTheme} from '../../theme';
import {resetPasswordWithRecoveryCode} from '../../services/GroupsService';

// Mot de passe oublié : l'ID + le code de secours (affiché une seule fois à
// la création du profil, ou après une régénération) suffisent à définir un
// nouveau mot de passe, sans session active ni email réel.
const ResetPasswordScreen = ({navigation}) => {
  const {colors, spacing, radius} = useTheme();

  const [loginId, setLoginId] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReset = useCallback(async () => {
    const trimmedId = loginId.trim();
    const trimmedCode = recoveryCode.trim();
    if (!trimmedId || !trimmedCode || !newPassword) {
      Alert.alert('Champs requis', 'Remplis les trois champs.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Mot de passe trop court', 'Choisis au moins 6 caractères.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert('Les mots de passe ne correspondent pas', 'Vérifie les deux champs.');
      return;
    }

    setSaving(true);
    try {
      await resetPasswordWithRecoveryCode(trimmedId, trimmedCode, newPassword);
      Alert.alert(
        'Password changed',
        "You can now log in with your new password. This recovery code has been used up — generate a new one from your profile once you're back in.",
        [{text: 'OK', onPress: () => navigation.replace('Login')}],
      );
    } catch (e) {
      console.error('Reset password error:', e);
      Alert.alert('Erreur', e?.message || 'ID ou code de secours incorrect.');
    } finally {
      setSaving(false);
    }
  }, [loginId, recoveryCode, newPassword, newPasswordConfirm, navigation]);

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
          Reset password
        </Text>
        <TouchableOpacity onPress={handleReset} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : 'Reset'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        <View style={{padding: spacing.xl}}>
          <Text style={{
            fontSize: 13, color: colors.textSecondary, textAlign: 'center',
            marginBottom: spacing.xl, lineHeight: 19,
          }}>
            Enter your ID and the recovery code you saved when you created
            your profile, then choose a new password.
          </Text>

          <Text style={styles.sectionLabel(colors)}>YOUR ID</Text>
          <TextInput
            value={loginId}
            onChangeText={setLoginId}
            placeholder="e.g. A7K3M9QP"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            autoFocus
            style={{
              fontSize: 15, color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: radius.md, padding: spacing.lg,
              borderWidth: 0.5, borderColor: colors.borderSubtle,
              marginBottom: spacing.lg,
            }}
          />

          <Text style={styles.sectionLabel(colors)}>RECOVERY CODE</Text>
          <TextInput
            value={recoveryCode}
            onChangeText={setRecoveryCode}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="characters"
            style={{
              fontSize: 15, color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: radius.md, padding: spacing.lg,
              borderWidth: 0.5, borderColor: colors.borderSubtle,
              marginBottom: spacing.lg,
            }}
          />

          <Text style={styles.sectionLabel(colors)}>NEW PASSWORD</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Password (min. 6 characters)"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            style={{
              fontSize: 15, color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: radius.md, padding: spacing.lg,
              borderWidth: 0.5, borderColor: colors.borderSubtle,
              marginBottom: spacing.md,
            }}
          />
          <TextInput
            value={newPasswordConfirm}
            onChangeText={setNewPasswordConfirm}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            style={{
              fontSize: 15, color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: radius.md, padding: spacing.lg,
              borderWidth: 0.5, borderColor: colors.borderSubtle,
            }}
          />
        </View>
      </KeyboardAvoidingView>
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

export default ResetPasswordScreen;
