import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, SafeAreaView, Alert,
} from 'react-native';
import {useTheme} from '../../theme';
import {createGroup, hasProfile} from '../../services/GroupsService';

const CreateGroupScreen = ({navigation}) => {
  const {colors, spacing, radius} = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Nom requis', 'Donne un nom à ton groupe.');
      return;
    }

    if (!(await hasProfile())) {
      navigation.navigate('ProfileSetup', {
        onDone: () => navigation.replace('CreateGroup'),
      });
      return;
    }

    setSaving(true);
    try {
      const group = await createGroup({name: trimmed});
      navigation.replace('GroupDetail', {groupId: group.id, groupName: group.name});
    } catch (e) {
      console.error('Create group error:', e);
      Alert.alert('Erreur', "Impossible de créer le groupe pour le moment.");
    } finally {
      setSaving(false);
    }
  }, [name, navigation]);

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
        <Text style={styles.sectionLabel(colors)}>GROUP NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Family, Roommates, Team..."
          placeholderTextColor={colors.textTertiary}
          autoFocus
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
