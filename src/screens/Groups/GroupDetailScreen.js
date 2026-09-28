import React, {useCallback, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, Alert, ScrollView, RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Share from 'react-native-share';
import {useTheme} from '../../theme';
import {getSupabaseUserId} from '../../services/supabaseClient';
import {
  listGroupMembers, listPendingMembers, approveMember, removeMember,
  promoteToAdmin, leaveGroup, createInvite,
} from '../../services/GroupsService';

const MemberRow = ({member, isSelf, isAdmin, canManage, colors, spacing, radius, onPromote, onRemove}) => {
  const profile = member.profiles || {};
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: radius.lg,
      padding: spacing.md, marginBottom: spacing.sm,
    }}>
      {profile.photo_url ? (
        <Image source={{uri: profile.photo_url}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 12}} />
      ) : (
        <View style={{
          width: 40, height: 40, borderRadius: 20, marginRight: 12,
          backgroundColor: colors.surfaceHighlight,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.textTertiary}}>
            {(profile.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{flex: 1}}>
        <Text style={{fontSize: 14, fontWeight: '600', color: colors.text}}>
          {profile.name || 'Unknown'}{isSelf ? ' (you)' : ''}
        </Text>
        {member.role === 'admin' && (
          <Text style={{fontSize: 11, color: colors.accent, fontWeight: '600', marginTop: 1}}>
            Admin
          </Text>
        )}
      </View>
      {canManage && !isSelf && (
        <View style={{flexDirection: 'row', gap: 14}}>
          {member.role !== 'admin' && (
            <TouchableOpacity onPress={() => onPromote(member.profile_id)}>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.accent}}>Make admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onRemove(member.profile_id)}>
            <Text style={{fontSize: 12, fontWeight: '600', color: '#FF3B30'}}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const GroupDetailScreen = ({navigation, route}) => {
  const {colors, spacing, radius} = useTheme();
  const {groupId, groupName} = route.params;

  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [myId, setMyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userId, approved, pendingList] = await Promise.all([
        getSupabaseUserId(),
        listGroupMembers(groupId),
        listPendingMembers(groupId),
      ]);
      setMyId(userId);
      setMembers(approved);
      setPending(pendingList);
    } catch (e) {
      console.error('Load group detail error:', e);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const me = members.find(m => m.profile_id === myId);
  const amAdmin = me?.role === 'admin';

  const handleInvite = useCallback(async () => {
    try {
      const invite = await createInvite(groupId, {expiresInHours: 48});
      // Le lien n'ouvre l'écran de join que si Morgen est déjà installé
      // (custom scheme, pas de vrai domaine encore) — le code reste donné
      // en repli pour ceux qui ne l'ont pas.
      const link = `morgen://join/${invite.code}`;
      await Share.open({
        message: `Join "${groupName}" on Morgen: ${link}\n(or enter code ${invite.code} manually — valid 48h, one use)`,
        failOnCancel: false,
      });
    } catch (e) {
      console.error('Create invite error:', e);
      Alert.alert('Erreur', "Impossible de créer une invitation.");
    }
  }, [groupId, groupName]);

  const handleApprove = useCallback(async (profileId) => {
    try {
      await approveMember(groupId, profileId);
      load();
    } catch (e) {
      console.error('Approve member error:', e);
      Alert.alert('Erreur', "Impossible d'approuver ce membre.");
    }
  }, [groupId, load]);

  const handleDenyPending = useCallback(async (profileId) => {
    try {
      await removeMember(groupId, profileId);
      load();
    } catch (e) {
      console.error('Deny member error:', e);
    }
  }, [groupId, load]);

  const handlePromote = useCallback(async (profileId) => {
    try {
      await promoteToAdmin(groupId, profileId);
      load();
    } catch (e) {
      console.error('Promote error:', e);
      Alert.alert('Erreur', "Impossible de promouvoir ce membre.");
    }
  }, [groupId, load]);

  const handleRemove = useCallback((profileId) => {
    Alert.alert('Remove member?', 'They will lose access to this group.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await removeMember(groupId, profileId);
            load();
          } catch (e) {
            console.error('Remove member error:', e);
          }
        },
      },
    ]);
  }, [groupId, load]);

  const handleLeave = useCallback(() => {
    Alert.alert('Leave group?', `You'll be removed from "${groupName}".`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          try {
            await leaveGroup(groupId);
            navigation.navigate('GroupsList');
          } catch (e) {
            console.error('Leave group error:', e);
          }
        },
      },
    ]);
  }, [groupId, groupName, navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.header, {
        paddingHorizontal: spacing.xl,
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 0.5,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{fontSize: 15, color: colors.accent}}>Back</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 17, fontWeight: '600', color: colors.text}}>
          {groupName}
        </Text>
        <TouchableOpacity onPress={handleInvite}>
          <Text style={{fontSize: 15, fontWeight: '700', color: colors.accent}}>Invite</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{padding: spacing.xl, paddingBottom: 100}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}>

        {amAdmin && pending.length > 0 && (
          <>
            <Text style={styles.sectionLabel(colors)}>PENDING APPROVAL · {pending.length}</Text>
            {pending.map(p => (
              <View key={p.profile_id} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: colors.surfaceHighlight, borderRadius: radius.lg,
                padding: spacing.md, marginBottom: spacing.sm,
              }}>
                {p.profiles?.photo_url ? (
                  <Image source={{uri: p.profiles.photo_url}} style={{width: 40, height: 40, borderRadius: 20, marginRight: 12}} />
                ) : (
                  <View style={{
                    width: 40, height: 40, borderRadius: 20, marginRight: 12,
                    backgroundColor: colors.surface,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{fontSize: 15, fontWeight: '700', color: colors.textTertiary}}>
                      {(p.profiles?.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={{flex: 1, fontSize: 14, fontWeight: '600', color: colors.text}}>
                  {p.profiles?.name || 'Unknown'}
                </Text>
                <View style={{flexDirection: 'row', gap: 14}}>
                  <TouchableOpacity onPress={() => handleApprove(p.profile_id)}>
                    <Text style={{fontSize: 12, fontWeight: '700', color: '#00C896'}}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDenyPending(p.profile_id)}>
                    <Text style={{fontSize: 12, fontWeight: '600', color: '#FF3B30'}}>Deny</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={[styles.sectionLabel(colors), {marginTop: pending.length && amAdmin ? spacing.lg : 0}]}>
          MEMBERS · {members.length}
        </Text>
        {members.map(m => (
          <MemberRow
            key={m.profile_id}
            member={m}
            isSelf={m.profile_id === myId}
            isAdmin={amAdmin}
            canManage={amAdmin}
            colors={colors} spacing={spacing} radius={radius}
            onPromote={handlePromote}
            onRemove={handleRemove}
          />
        ))}

        <Text style={[styles.sectionLabel(colors), {marginTop: spacing.xl}]}>
          GROUP ALARMS
        </Text>
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          padding: spacing.lg, marginBottom: spacing.sm,
        }}>
          <Text style={{fontSize: 13, color: colors.textSecondary, lineHeight: 18}}>
            Coming next: creating shared alarms for this group.
          </Text>
        </View>

        <TouchableOpacity onPress={handleLeave} style={{marginTop: spacing.xl, alignSelf: 'center'}}>
          <Text style={{fontSize: 13, fontWeight: '600', color: '#FF3B30'}}>
            Leave group
          </Text>
        </TouchableOpacity>
      </ScrollView>
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

export default GroupDetailScreen;
