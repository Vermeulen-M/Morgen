import React, {useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, SafeAreaView} from 'react-native';
import {useTheme} from '../../theme';

// Point d'entrée obligatoire avant de créer/rejoindre un groupe si la
// personne n'a pas encore de profil sur cet appareil : soit elle en crée un
// nouveau, soit elle se reconnecte à un profil déjà sécurisé ailleurs.
const ProfileGateScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const onDone = route?.params?.onDone;
  const returnTo = route?.params?.returnTo;

  const forward = useCallback((screen) => {
    navigation.navigate(screen, {onDone, returnTo});
  }, [navigation, onDone, returnTo]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {
        paddingHorizontal: spacing.xl,
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 0.5,
      }]}>
        <TouchableOpacity onPress={() => (returnTo ? navigation.navigate(returnTo) : navigation.goBack())}>
          <Text style={{fontSize: 15, color: colors.accent}}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 17, fontWeight: '600', color: colors.text}}>
          Profile needed
        </Text>
        <View style={{width: 50}} />
      </View>

      <View style={{padding: spacing.xl}}>
        <Text style={{
          fontSize: 13, color: colors.textSecondary, textAlign: 'center',
          marginBottom: spacing.xl, lineHeight: 19,
        }}>
          You need a profile to create or join a group — so other members
          can recognize you.
        </Text>

        <TouchableOpacity
          onPress={() => forward('ProfileSetup')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.accent, borderRadius: radius.lg,
            paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md,
          }}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>
            Create a new profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => forward('Login')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.surfaceHighlight, borderRadius: radius.lg,
            paddingVertical: 16, alignItems: 'center',
          }}>
          <Text style={{color: colors.accent, fontWeight: '700', fontSize: 15}}>
            Log in to an existing profile
          </Text>
        </TouchableOpacity>

        <Text style={{
          fontSize: 12, color: colors.textTertiary, textAlign: 'center',
          marginTop: spacing.lg, lineHeight: 17,
        }}>
          Already have a Morgen profile? Log in with your ID (or backup
          email) and password.
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
});

export default ProfileGateScreen;
