import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert, Image,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '../../theme';
import {createGroup, hasProfile, uploadGroupPhoto} from '../../services/GroupsService';

const CreateGroupScreen = ({navigation}) => {
  const {colors, spacing, radius} = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoB64, setPhotoB64] = useState(null);

  const pickPhoto = useCallback(async () => {
    const r = await launchImageLibrary({mediaType: 'photo', quality: 0.7, maxWidth: 512, maxHeight: 512, includeBase64: true});
    const a = r.assets?.[0];
    if (a?.uri) { setPhotoUri(a.uri); setPhotoB64(a.base64 || null); }
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nom requis', 'Donne un nom à ton groupe.');
      return;
    }

    if (!(await hasProfile())) {
      navigation.navigate('ProfileGate', {
        onDone: () => navigation.replace('CreateGroup'),
      });
      return;
    }

    setSaving(true);
    try {
      const group = await createGroup({name: trimmed});
      let photoUrl = null;
      if (photoB64) {
        try { photoUrl = await uploadGroupPhoto(group.id, photoB64); }
        catch (pe) { Alert.alert('Photo', 'Group created, but the photo failed: ' + pe.message); }
      }
      navigation.replace('GroupDetail', {groupId: group.id, groupName: group.name, photoUrl});
    } catch (e) {
      console.error('Create group error:', e);
      Alert.alert('Erreur', "Impossible de créer le groupe pour le moment.");
    } finally {
      setSaving(false);
    }
  }, [name, navigation, photoB64]);

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
          New Group
        </Text>
        <TouchableOpacity onPress={handleCreate} disabled={saving}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>
            {saving ? '...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{padding: spacing.xl}}>
        <TouchableOpacity onPress={pickPhoto} style={{alignSelf: 'center', marginBottom: spacing.xl, alignItems: 'center'}}>
          {photoUri ? (
            <Image source={{uri: photoUri}} style={{width: 96, height: 96, borderRadius: 28}} />
          ) : (
            <View style={{width: 96, height: 96, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: colors.borderSubtle}}>
              <Text style={{fontSize: 30, color: colors.textTertiary}}>＋</Text>
            </View>
          )}
          <Text style={{fontSize: 12, color: colors.accent, marginTop: 8, fontWeight: '600'}}>
            {photoUri ? 'Change photo' : 'Add a photo (optional)'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.sectionLabel(colors)}>GROUP NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Family, Roommates, Team..."
          placeholderTextColor={colors.textTertiary}
          style={{
            fontSize: 15, color: colors.text,
            backgroundColor: colors.surface,
            borderRadius: radius.md, padding: spacing.lg,
            borderWidth: 0.5, borderColor: colors.borderSubtle,
          }}
        />
        <Text style={{
          fontSize: 12, color: colors.textSecondary,
          marginTop: spacing.lg, lineHeight: 18,
        }}>
          You'll be the admin. Once created, you can invite people with a
          one-time code and approve them before they join.
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

export default CreateGroupScreen;
