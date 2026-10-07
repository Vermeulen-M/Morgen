import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Image, Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '../../theme';
import {
  createOrUpdateProfile, uploadAvatarPhoto, updateWellnessProfile,
  linkEmailToProfile, createAccountWithId, regenerateRecoveryCode,
} from '../../services/GroupsService';
import {getProfile, getWellness} from '../../services/StorageService';

const ProfileSetupScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const onDone = route?.params?.onDone;
  // Quand on ouvre cet écran depuis un autre onglet (ex: Settings), on veut
  // revenir sur cet onglet plutôt que sur l'écran précédent dans Groups.
  const returnTo = route?.params?.returnTo;
  const goBackOrReturn = useCallback(() => {
    if (returnTo) {
      navigation.navigate(returnTo);
    } else {
      navigation.goBack();
    }
  }, [returnTo, navigation]);

  const [name, setName] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Ne sert qu'à savoir si on ÉDITE un profil déjà existant (pour montrer la
  // section "Secure your profile") — un profil qu'on vient tout juste de
  // créer n'a encore rien à sécuriser tant qu'il n'est pas sauvegardé.
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securing, setSecuring] = useState(false);
  const [secured, setSecured] = useState(false);
  // ID de connexion du profil (affiché pour qu'on puisse le retrouver tant
  // qu'on est connecté). Absent sur les anciens profils anonymes.
  const [loginId, setLoginId] = useState(null);

  // Mot de passe choisi à la création d'un NOUVEAU profil (pas pour éditer
  // un profil existant — le mot de passe ne se change pas ici).
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  // Une fois le compte créé, on affiche l'ID + le code de secours une seule
  // fois — l'utilisateur doit confirmer les avoir notés avant de continuer.
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  React.useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setName(p.name || '');
        setLocalPhotoUri(p.photoUrl || null);
        setIsExistingProfile(true);
        setLoginId(p.loginId || null);
      }
      setLoaded(true);
    });
  }, []);

  const handleSecureProfile = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Champs requis', 'Entre un email et un mot de passe.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Mot de passe trop court', 'Choisis au moins 6 caractères.');
      return;
    }

    setSecuring(true);
    try {
      await linkEmailToProfile(trimmedEmail, password);
      setSecured(true);
      Alert.alert(
        'Profil sécurisé',
        "Tu peux maintenant te reconnecter avec cet email sur n'importe quel appareil.",
      );
    } catch (e) {
      console.error('Secure profile error:', e);
      Alert.alert('Erreur', e?.message || "Impossible de sécuriser le profil pour le moment.");
    } finally {
      setSecuring(false);
    }
  }, [email, password]);

  const handlePickPhoto = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 512,
      maxHeight: 512,
    });
    if (result.didCancel) return;
    const uri = result.assets?.[0]?.uri;
    if (uri) setLocalPhotoUri(uri);
  }, []);

  const applyLocalWellness = useCallback(async () => {
    // Si des réglages wellness existaient déjà en local (avant qu'un profil
    // existe), on les rattache au profil maintenant qu'il y en a un.
    const localWellness = await getWellness();
    if (localWellness && Object.keys(localWellness).length > 0) {
      for (const [field, value] of Object.entries(localWellness)) {
        await updateWellnessProfile(field, value);
      }
    }
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nom requis', "Choisis un nom pour ton profil de groupe.");
      return;
    }

    if (!isExistingProfile) {
      // Nouveau profil = nouveau compte (ID généré + mot de passe choisi
      // ici) — plus d'auth anonyme.
      if (!newPassword || newPassword.length < 6) {
        Alert.alert('Mot de passe trop court', 'Choisis au moins 6 caractères.');
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        Alert.alert('Les mots de passe ne correspondent pas', 'Vérifie les deux champs.');
        return;
      }
    }

    setSaving(true);
    try {
      if (!isExistingProfile) {
        // Le compte doit exister avant d'envoyer la photo (l'upload a besoin
        // d'une session) : on crée le compte, puis on rattache la photo.
        const credentials = await createAccountWithId({
          name: trimmed, photoUrl: null, password: newPassword,
        });
        if (localPhotoUri && localPhotoUri.startsWith('file')) {
          const uploaded = await uploadAvatarPhoto(localPhotoUri);
          if (uploaded) {
            await createOrUpdateProfile({name: trimmed, photoUrl: uploaded});
          }
        }
        await applyLocalWellness();
        // On affiche l'ID + le code de secours avant de fermer l'écran —
        // onDone()/goBackOrReturn() n'arrivent qu'après confirmation.
        setCreatedCredentials(credentials);
        return;
      }

      let photoUrl = localPhotoUri || null;
      if (localPhotoUri && localPhotoUri.startsWith('file')) {
        photoUrl = await uploadAvatarPhoto(localPhotoUri);
      }
      await createOrUpdateProfile({name: trimmed, photoUrl});
      await applyLocalWellness();

      onDone?.();
      goBackOrReturn();
    } catch (e) {
      console.error('Save profile error:', e);
      Alert.alert('Erreur', e?.message || "Impossible d'enregistrer ton profil pour le moment.");
    } finally {
      setSaving(false);
    }
  }, [
    name, localPhotoUri, isExistingProfile, newPassword, newPasswordConfirm,
    applyLocalWellness, onDone, goBackOrReturn,
  ]);

  const handleConfirmCredentialsSaved = useCallback(() => {
    onDone?.();
    goBackOrReturn();
  }, [onDone, goBackOrReturn]);

  const handleRegenerateRecoveryCode = useCallback(async () => {
    try {
      const code = await regenerateRecoveryCode();
      Alert.alert(
        'New recovery code',
        `${code}\n\nSave it now — it won't be shown again, and your old code no longer works.`,
      );
    } catch (e) {
      console.error('Regenerate recovery code error:', e);
      Alert.alert('Erreur', e?.message || 'Impossible de générer un nouveau code pour le moment.');
    }
  }, []);

  if (!loaded) return <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} />;

  if (createdCredentials) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={{padding: spacing.xl, flex: 1, justifyContent: 'center'}}>
          <Text style={{
            fontSize: 20, fontWeight: '700', color: colors.text,
            textAlign: 'center', marginBottom: spacing.md,
          }}>
            Save these now
          </Text>
          <Text style={{
            fontSize: 13, color: colors.textSecondary, textAlign: 'center',
            marginBottom: spacing.xl, lineHeight: 19,
          }}>
            This is the only time they'll be shown. You'll need your ID and
            password to log back in on another phone — and the recovery code
            if you ever forget your password.
          </Text>

          <Text style={styles.sectionLabel(colors)}>YOUR ID</Text>
          <Text selectable style={{
            fontSize: 22, fontWeight: '700', letterSpacing: 2, color: colors.accent,
            backgroundColor: colors.surface, borderRadius: radius.md,
            padding: spacing.lg, textAlign: 'center',
            borderWidth: 0.5, borderColor: colors.borderSubtle,
            marginBottom: spacing.lg,
          }}>
            {createdCredentials.loginId}
          </Text>

          <Text style={styles.sectionLabel(colors)}>RECOVERY CODE</Text>
          <Text selectable style={{
            fontSize: 18, fontWeight: '700', letterSpacing: 1, color: colors.text,
            backgroundColor: colors.surface, borderRadius: radius.md,
            padding: spacing.lg, textAlign: 'center',
            borderWidth: 0.5, borderColor: colors.borderSubtle,
            marginBottom: spacing.xl,
          }}>
            {createdCredentials.recoveryCode}
          </Text>

          <TouchableOpacity
            onPress={() => setConfirmedSaved(v => !v)}
            activeOpacity={0.8}
            style={{flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl}}>
            <View style={{
              width: 20, height: 20, borderRadius: 4, marginRight: spacing.md,
              borderWidth: 1.5, borderColor: colors.accent,
              backgroundColor: confirmedSaved ? colors.accent : 'transparent',
            }} />
            <Text style={{fontSize: 13, color: colors.textSecondary, flex: 1}}>
              I've saved my ID and recovery code somewhere safe.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmCredentialsSaved}
            disabled={!confirmedSaved}
            activeOpacity={0.85}
            style={{
              backgroundColor: confirmedSaved ? colors.accent : colors.surfaceHighlight,
              borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center',
            }}>
            <Text style={{
              color: confirmedSaved ? '#fff' : colors.textTertiary,
              fontWeight: '700', fontSize: 15,
            }}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          Your profile
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : (isExistingProfile ? 'Save' : 'Create')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{padding: spacing.xl, alignItems: 'center'}}>
        <Text style={{
          fontSize: 13, color: colors.textSecondary, textAlign: 'center',
          marginBottom: spacing.xl, lineHeight: 19,
        }}>
          A profile lets other people recognize you in a group — you only need
          one to create or join a group alarm.
        </Text>

        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
          {localPhotoUri ? (
            <Image
              source={{uri: localPhotoUri}}
              style={{
                width: 100, height: 100, borderRadius: 50,
                marginBottom: spacing.lg,
              }}
            />
          ) : (
            <View style={{
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: colors.surfaceHighlight,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <Text style={{fontSize: 34, color: colors.textTertiary, fontWeight: '200'}}>+</Text>
            </View>
          )}
          <Text style={{
            fontSize: 12, fontWeight: '600', color: colors.accent,
            textAlign: 'center', marginBottom: spacing.xl,
          }}>
            {localPhotoUri ? 'Change photo' : 'Add photo (optional)'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel(colors)}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textTertiary}
          autoFocus
          style={{
            width: '100%',
            fontSize: 15, color: colors.text,
            backgroundColor: colors.surface,
            borderRadius: radius.md, padding: spacing.lg,
            borderWidth: 0.5, borderColor: colors.borderSubtle,
          }}
        />

        {!isExistingProfile && (
          <View style={{width: '100%', marginTop: spacing.xl}}>
            <Text style={styles.sectionLabel(colors)}>CHOOSE A PASSWORD</Text>
            <Text style={{
              fontSize: 12, color: colors.textSecondary,
              marginBottom: spacing.lg, lineHeight: 18,
            }}>
              A unique ID will be generated for you. Together with this
              password, it's how you'll log back in on another phone.
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              style={{
                width: '100%',
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
              placeholder="Confirm password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              style={{
                width: '100%',
                fontSize: 15, color: colors.text,
                backgroundColor: colors.surface,
                borderRadius: radius.md, padding: spacing.lg,
                borderWidth: 0.5, borderColor: colors.borderSubtle,
              }}
            />
          </View>
        )}

        {isExistingProfile && (
          <View style={{width: '100%', marginTop: spacing.xl}}>
            <View style={{height: 0.5, backgroundColor: colors.borderSubtle, marginBottom: spacing.xl}} />

            {loginId && (
              <>
                <Text style={styles.sectionLabel(colors)}>YOUR ID</Text>
                <Text selectable style={{
                  fontSize: 22, fontWeight: '700', letterSpacing: 2, color: colors.accent,
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  padding: spacing.lg, textAlign: 'center', width: '100%',
                  borderWidth: 0.5, borderColor: colors.borderSubtle,
                  marginBottom: spacing.sm,
                }}>
                  {loginId}
                </Text>
                <Text style={{
                  fontSize: 12, color: colors.textSecondary,
                  marginBottom: spacing.xl, lineHeight: 18,
                }}>
                  You need this ID (and your password) to log back in on
                  another phone. Keep it somewhere safe.
                </Text>
              </>
            )}

            <Text style={styles.sectionLabel(colors)}>BACKUP EMAIL (RECOMMENDED)</Text>
            <Text style={{
              fontSize: 12, color: colors.textSecondary,
              marginBottom: spacing.lg, lineHeight: 18,
            }}>
              {secured
                ? "This profile can now also log in from any device with this email."
                : "If you ever lose your ID, you won't be able to get back into this profile. Add a real email so you can log in with it instead."}
            </Text>

            <TouchableOpacity
              onPress={handleRegenerateRecoveryCode}
              activeOpacity={0.8}
              style={{marginBottom: spacing.lg}}>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.accent}}>
                Generate a new recovery code
              </Text>
            </TouchableOpacity>

            {!secured && (
              <>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    width: '100%',
                    fontSize: 15, color: colors.text,
                    backgroundColor: colors.surface,
                    borderRadius: radius.md, padding: spacing.lg,
                    borderWidth: 0.5, borderColor: colors.borderSubtle,
                    marginBottom: spacing.md,
                  }}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                  style={{
                    width: '100%',
                    fontSize: 15, color: colors.text,
                    backgroundColor: colors.surface,
                    borderRadius: radius.md, padding: spacing.lg,
                    borderWidth: 0.5, borderColor: colors.borderSubtle,
                    marginBottom: spacing.lg,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSecureProfile}
                  disabled={securing}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: colors.surfaceHighlight, borderRadius: radius.lg,
                    paddingVertical: 14, alignItems: 'center',
                  }}>
                  <Text style={{color: colors.accent, fontWeight: '700', fontSize: 14}}>
                    {securing ? '...' : 'Secure profile'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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
    alignSelf: 'flex-start',
  }),
});

export default ProfileSetupScreen;
