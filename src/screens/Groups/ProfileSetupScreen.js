import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Image, Alert,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '../../theme';
import {
  createOrUpdateProfile, uploadAvatarPhoto,
} from '../../services/GroupsService';
import {getProfile} from '../../services/StorageService';

const ProfileSetupScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const onDone = route?.params?.onDone;

  const [name, setName] = useState('');
  const [localPhotoUri, setLocalPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    getProfile().then(p => {
      if (p) {
        setName(p.name || '');
        setLocalPhotoUri(p.photoUrl || null);
      }
      setLoaded(true);
    });
  }, []);

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
      onDone?.();
      navigation.goBack();
    } catch (e) {
      console.error('Save profile error:', e);
      Alert.alert('Erreur', "Impossible d'enregistrer ton profil pour le moment.");
    } finally {
      setSaving(false);
    }
  }, [name, localPhotoUri, onDone, navigation]);

  if (!loaded) return <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} />;

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
