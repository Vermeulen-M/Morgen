import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {useTheme} from '../../theme';
import {loginWithEmail} from '../../services/GroupsService';

// Reconnecte un profil déjà sécurisé (email+mot de passe) sur cet appareil —
// utile après une réinstallation ou sur un nouveau téléphone.
const LoginScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const onDone = route?.params?.onDone;
  const returnTo = route?.params?.returnTo;
  const goBackOrReturn = useCallback(() => {
    if (returnTo) {
      navigation.navigate(returnTo);
    } else {
      navigation.goBack();
    }
  }, [returnTo, navigation]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Champs requis', 'Entre ton email et ton mot de passe.');
      return;
    }

    setSaving(true);
    try {
      const profile = await loginWithEmail(trimmedEmail, password);
      if (!profile) {
        Alert.alert(
          'Profil introuvable',
          "Ce compte existe mais n'a pas de profil. Contacte le support si ça semble anormal.",
        );
        return;
      }
      onDone?.();
      goBackOrReturn();
    } catch (e) {
      console.error('Login error:', e);
      Alert.alert('Erreur', e?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setSaving(false);
    }
  }, [email, password, onDone, goBackOrReturn]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {
        paddingHorizontal: spacing.xl,
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 0.5,
      }]}>
        <TouchableOpacity onPress={goBackOrReturn}>
          <Text style={{fontSize: 15, color: colors.accent}}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 17, fontWeight: '600', color: colors.text}}>
          Log in
        </Text>
        <TouchableOpacity onPress={handleLogin} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : 'Log in'}
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
            Only works if this profile was secured with an email and
            password on another device.
          </Text>

          <Text style={styles.sectionLabel(colors)}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus
            style={{
              fontSize: 15, color: colors.text,
              backgroundColor: colors.surface,
              borderRadius: radius.md, padding: spacing.lg,
              borderWidth: 0.5, borderColor: colors.borderSubtle,
              marginBottom: spacing.lg,
            }}
          />

          <Text style={styles.sectionLabel(colors)}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
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

export default LoginScreen;
