import React, {useCallback, useState} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, Alert, ScrollView, RefreshControl, Linking,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Share from 'react-native-share';
import {launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '../../theme';
import {getSupabaseUserId} from '../../services/supabaseClient';
import {INVITE_LINK_BASE} from '../../config';
import {deviceTimeForGroupAlarm, dateOccurrence} from '../../services/NotificationService';
import {
  listGroupMembers, listPendingMembers, approveMember, removeMember,
  promoteToAdmin, leaveGroup, createInvite,
  listGroupAlarms, listTodayCompletions, deleteGroupAlarm, syncGroupAlarms,
  uploadGroupPhoto, getGroupPhoto,
} from '../../services/GroupsService';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [photoUrl, setPhotoUrl] = useState(route.params.photoUrl || null);

  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [myId, setMyId] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [invite, setInvite] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [userId, approved, pendingList] = await Promise.all([
        getSupabaseUserId(),
        listGroupMembers(groupId),
        listPendingMembers(groupId),
      ]);
      setMyId(userId);
      getGroupPhoto(groupId).then(u => u && setPhotoUrl(u)).catch(() => {});
      setMembers(approved);
      setPending(pendingList);

      const groupAlarms = await listGroupAlarms(groupId);
      const withDone = await Promise.all(groupAlarms.map(async a => {
        try {
          const done = await listTodayCompletions(a.id);
          return {...a, done};
        } catch {
          return {...a, done: []};
        }
      }));
      setAlarms(withDone);
      syncGroupAlarms();
    } catch (e) {
      console.error('Load group detail error:', e);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const changePhoto = useCallback(async () => {
    const r = await launchImageLibrary({mediaType: 'photo', quality: 0.7, maxWidth: 512, maxHeight: 512, includeBase64: true});
    const a = r.assets?.[0];
    if (!a?.base64) return;
    try {
      setPhotoUrl(await uploadGroupPhoto(groupId, a.base64));
    } catch (e) {
      Alert.alert('Photo', e.message || 'Upload failed.');
    }
  }, [groupId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const me = members.find(m => m.profile_id === myId);
  const amAdmin = me?.role === 'admin';

  const shareInvite = useCallback(async (invite) => {
    try {
      // Le lien n'ouvre l'écran de join que si Morgen est déjà installé
      // (custom scheme, pas de vrai domaine encore) — le code reste donné
      // en repli pour ceux qui ne l'ont pas.
      const link = INVITE_LINK_BASE
        ? `${INVITE_LINK_BASE}?code=${invite.code}`
        : `morgen://join/${invite.code}`;
      await Share.open({
        message: `Join "${groupName}" on Morgen: ${link}\n(or enter code ${invite.code} manually — valid 48h, one use)`,
        failOnCancel: false,
      });
    } catch (e) {
      console.log('Share cancelled/failed:', e?.message);
    }
  }, [groupName]);

  // Crée une invitation et l'affiche à l'écran (code visible + bouton partage).
  const handleInvite = useCallback(async () => {
    try {
      const created = await createInvite(groupId, {expiresInHours: 48});
      setInvite(created);
    } catch (e) {
      console.error('Create invite error:', e);
      Alert.alert('Error', 'Could not create an invitation.');
    }
  }, [groupId]);

  const handleDeleteAlarm = useCallback((alarmId) => {
    Alert.alert('Delete alarm', 'Remove this alarm for everyone in the group?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteGroupAlarm(alarmId);
          load();
        } catch (e) {
          Alert.alert('Erreur', "Impossible de supprimer l'alarme.");
        }
      }},
    ]);
  }, [load]);

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

        <View style={{alignItems: 'center', marginBottom: spacing.xl}}>
          {photoUrl ? (
            <Image source={{uri: photoUrl}} style={{width: 88, height: 88, borderRadius: 26}} />
          ) : (
            <View style={{width: 88, height: 88, borderRadius: 26, backgroundColor: colors.accent + '18', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{fontSize: 36, color: colors.accent}}>⊙</Text>
            </View>
          )}
          {amAdmin && (
            <TouchableOpacity onPress={changePhoto} style={{marginTop: 8}}>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.accent}}>
                {photoUrl ? 'Change photo' : 'Add photo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {invite && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.xl,
            padding: spacing.xl, marginBottom: spacing.xl, alignItems: 'center',
            borderWidth: 1.5, borderColor: colors.accent,
          }}>
            <Text style={{fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textTertiary}}>
              INVITE CODE
            </Text>
            <Text selectable style={{
              fontSize: 40, fontWeight: '800', letterSpacing: 8,
              color: colors.text, marginVertical: spacing.md,
            }}>
              {invite.code}
            </Text>
            <Text style={{fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18}}>
              Valid 48 hours, works once. The person enters it in
              Groups → Join with code, then you approve them.
            </Text>
            <View style={{flexDirection: 'row', gap: 10, marginTop: spacing.lg}}>
              <TouchableOpacity
                onPress={() => shareInvite(invite)}
                style={{
                  backgroundColor: colors.accent, borderRadius: radius.lg,
                  paddingVertical: 12, paddingHorizontal: 24,
                }}>
                <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setInvite(null)}
                style={{
                  backgroundColor: colors.surfaceHighlight, borderRadius: radius.lg,
                  paddingVertical: 12, paddingHorizontal: 24,
                }}>
                <Text style={{color: colors.textSecondary, fontWeight: '700', fontSize: 14}}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
        {alarms.length === 0 && (
          <View style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            padding: spacing.lg, marginBottom: spacing.sm,
          }}>
            <Text style={{fontSize: 13, color: colors.textSecondary, lineHeight: 18}}>
              {amAdmin
                ? 'No alarm yet. Create one — every member will get it.'
                : 'No alarm yet. An admin can create one for the group.'}
            </Text>
          </View>
        )}
        {alarms.filter(a => !a.date || dateOccurrence(a)).map(a => (
          <View key={a.id} style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            padding: spacing.lg, marginBottom: spacing.sm,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <View>
                <Text style={{fontSize: 28, fontWeight: '700', color: colors.text}}>
                  {deviceTimeForGroupAlarm(a)}
                </Text>
                {a.timezone_mode === 'same_instant' && a.timezone ? (
                  <Text style={{fontSize: 11, color: colors.textTertiary}}>
                    {a.time} {a.timezone.split('/').pop().replace('_', ' ')} time
                  </Text>
                ) : (
                  <Text style={{fontSize: 11, color: colors.textTertiary}}>Local time</Text>
                )}
              </View>
              {amAdmin && (
                <TouchableOpacity onPress={() => handleDeleteAlarm(a.id)}>
                  <Text style={{fontSize: 12, fontWeight: '600', color: '#FF3B30'}}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>
              {a.date
                ? new Date(a.date + 'T12:00:00').toDateString()
                : (a.days || []).length === 7
                  ? 'Every day'
                  : (a.days || []).map(d => DAY_NAMES[d]).join(' · ')}
              {'  •  '}{a.challenge ? a.challenge : 'no challenge'}
            </Text>
            {a.note ? (
              <Text style={{fontSize: 13, color: colors.text, marginTop: 6}}>{a.note}</Text>
            ) : null}
            {a.link && /^https:\/\//i.test(a.link) ? (
              <TouchableOpacity onPress={() => Linking.openURL(a.link)} style={{marginTop: 6}}>
                <Text numberOfLines={1} style={{fontSize: 12, color: colors.accent, textDecorationLine: 'underline'}}>
                  🔗 {a.link}
                </Text>
              </TouchableOpacity>
            ) : null}
            <Text style={{fontSize: 12, fontWeight: '600', color: colors.accent, marginTop: 8}}>
              Up today: {a.done.length}/{members.length}
              {a.done.length > 0
                ? ' — ' + a.done.map(c => c.profiles?.name || '?').join(', ')
                : ''}
            </Text>
          </View>
        ))}
        {amAdmin && (
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateGroupAlarm', {groupId})}
            style={{
              borderRadius: radius.lg, padding: spacing.md, alignItems: 'center',
              borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed',
            }}>
            <Text style={{fontSize: 14, fontWeight: '700', color: colors.accent}}>+ Add group alarm</Text>
          </TouchableOpacity>
        )}

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
