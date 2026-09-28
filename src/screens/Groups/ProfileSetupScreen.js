import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Image, Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '../../theme';
import {
  createOrUpdateProfile, uploadAvatarPhoto, updateWellnessProfile,
  linkEmailToProfile,
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

  React.useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setName(p.name || '');
        setLocalPhotoUri(p.photoUrl || null);
        setIsExistingProfile(true);
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

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nom requis', "Choisis un nom pour ton profil de groupe.");
      return;
    }

    setSaving(true);
    try {
      let photoUrl = null;
      if (localPhotoUri && localPhotoUri.startsWith('file')) {
        photoUrl = await uploadAvatarPhoto(localPhotoUri);
      } else if (localPhotoUri) {
        photoUrl = localPhotoUri;
      }

      await createOrUpdateProfile({name: trimmed, photoUrl});

      // Première création : si des réglages wellness existaient déjà en
      // local (avant qu'un profil existe), on les rattache au profil
      // maintenant qu'il y en a un, pour qu'ils suivent la personne.
      const localWellness = await getWellness();
      if (localWellness && Object.keys(localWellness).length > 0) {
        for (const [field, value] of Object.entries(localWellness)) {
          await updateWellnessProfile(field, value);
        }
      }

      onDone?.();
      goBackOrReturn();
    } catch (e) {
      console.error('Save profile error:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer ton profil pour le moment.");
    } finally {
      setSaving(false);
    }
  }, [name, localPhotoUri, onDone, goBackOrReturn]);

  if (!loaded) return <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} />;

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
            {saving ? '...' : 'Save'}
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

        {isExistingProfile && (
          <View style={{width: '100%', marginTop: spacing.xl}}>
            <View style={{height: 0.5, backgroundColor: colors.borderSubtle, marginBottom: spacing.xl}} />
            <Text style={styles.sectionLabel(colors)}>SECURE YOUR PROFILE</Text>
            <Text style={{
              fontSize: 12, color: colors.textSecondary,
              marginBottom: spacing.lg, lineHeight: 18,
            }}>
              {secured
                ? "This profile can now log in from any device with this email."
                : 'Add an email and password so you can log back into this exact profile from a new phone or after reinstalling.'}
            </Text>

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
