import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {useTheme} from '../../theme';
import {loginWithId, loginWithEmail} from '../../services/GroupsService';

// Reconnecte un profil existant sur cet appareil (par ID+mot de passe, ou
// par email s'il en a ajouté un) — utile après une réinstallation ou sur un
// nouveau téléphone.
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

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLogin = useCallback(async () => {
    const trimmedId = loginId.trim();
    if (!trimmedId || !password) {
      Alert.alert('Champs requis', 'Entre ton ID et ton mot de passe.');
      return;
    }

    setSaving(true);
    try {
      // Un ID généré n'a pas de "@" ; s'il y en a un, l'utilisateur a tapé
      // un email (profil sécurisé avec un email plus tôt) — on route vers
      // le bon chemin de connexion dans les deux cas.
      const profile = trimmedId.includes('@')
        ? await loginWithEmail(trimmedId, password)
        : await loginWithId(trimmedId, password);
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
      Alert.alert('Erreur', e?.message || 'ID/email ou mot de passe incorrect.');
    } finally {
      setSaving(false);
    }
  }, [loginId, password, onDone, goBackOrReturn]);

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
            Log back into an existing profile with its ID (or email, if you
            added one).
          </Text>

          <Text style={styles.sectionLabel(colors)}>ID OR EMAIL</Text>
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
              marginBottom: spacing.lg,
            }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ResetPassword')}
            activeOpacity={0.8}>
            <Text style={{fontSize: 12, fontWeight: '600', color: colors.accent, textAlign: 'center'}}>
              Forgot your password?
            </Text>
          </TouchableOpacity>
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
