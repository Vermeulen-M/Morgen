import React, {useCallback, useState} from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {
  listMyGroups, listMyPendingGroups, leaveGroup, syncGroupAlarms,
} from '../../services/GroupsService';

const GroupCard = ({group, onPress, colors, spacing, radius}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={{
      backgroundColor: colors.surface, borderRadius: radius.xl,
      padding: spacing.lg, marginBottom: spacing.md,
      flexDirection: 'row', alignItems: 'center',
      shadowColor: '#000', shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    }}>
    <View style={{
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: colors.accent + '18',
      alignItems: 'center', justifyContent: 'center', marginRight: 14,
    }}>
      <Text style={{fontSize: 22, color: colors.accent}}>⊙</Text>
    </View>
    <View style={{flex: 1}}>
      <Text style={{fontSize: 16, fontWeight: '700', color: colors.text}}>
        {group.groups?.name}
      </Text>
      <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>
        {group.role === 'admin' ? 'Admin' : 'Member'}
      </Text>
    </View>
    <Text style={{fontSize: 18, color: colors.textTertiary}}>›</Text>
  </TouchableOpacity>
);

const GroupsScreen = ({navigation}) => {
  const {colors, typography, spacing, radius} = useTheme();
  const [groups, setGroups] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, pendingData] = await Promise.all([
        listMyGroups(),
        listMyPendingGroups(),
      ]);
      setGroups(data || []);
      setPending(pendingData || []);
      syncGroupAlarms(); // une approbation récente apporte de nouvelles alarmes
    } catch (e) {
      console.error('List groups error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const cancelRequest = useCallback((item) => {
    Alert.alert(
      'Cancel request',
      `Withdraw your request to join "${item.groups?.name}"?`,
      [
        {text: 'Keep waiting', style: 'cancel'},
        {text: 'Withdraw', style: 'destructive', onPress: async () => {
          try {
            await leaveGroup(item.groups.id);
            load();
          } catch (e) {
            Alert.alert('Error', 'Could not withdraw the request.');
          }
        }},
      ],
    );
  }, [load]);

  const openGroup = useCallback(group => {
    navigation.navigate('GroupDetail', {
      groupId: group.groups.id,
      groupName: group.groups.name,
    });
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={{paddingHorizontal: spacing.xl, paddingTop: 16, paddingBottom: 20}}>
        <Text style={[typography.label, {color: colors.accent}]}>MORGEN</Text>
        <Text style={[typography.h1, {color: colors.text, marginTop: 2}]}>Groups</Text>
      </View>

      <View style={{flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, marginBottom: spacing.lg}}>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateGroup')}
          activeOpacity={0.85}
          style={{
            flex: 1, backgroundColor: colors.accent, borderRadius: radius.lg,
            paddingVertical: 14, alignItems: 'center',
          }}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>+ Create group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('JoinGroup')}
          activeOpacity={0.85}
          style={{
            flex: 1, backgroundColor: colors.surfaceHighlight, borderRadius: radius.lg,
            paddingVertical: 14, alignItems: 'center',
          }}>
          <Text style={{color: colors.accent, fontWeight: '700', fontSize: 14}}>Join with code</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={item => item.groups?.id}
        contentContainerStyle={{paddingHorizontal: spacing.xl, paddingBottom: 100, flexGrow: 1}}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={pending.length > 0 ? (
          <View style={{marginBottom: spacing.md}}>
            <Text style={{
              fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
              color: colors.textTertiary, marginBottom: 10,
            }}>
              WAITING FOR APPROVAL
            </Text>
            {pending.map(item => (
              <View key={item.groups?.id} style={{
                backgroundColor: colors.surface, borderRadius: radius.lg,
                padding: spacing.md, marginBottom: spacing.sm,
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1, borderColor: colors.borderSubtle, borderStyle: 'dashed',
              }}>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 15, fontWeight: '600', color: colors.text}}>
                    {item.groups?.name || 'Group'}
                  </Text>
                  <Text style={{fontSize: 12, color: colors.textSecondary, marginTop: 2}}>
                    An admin has to approve your request
                  </Text>
                </View>
                <TouchableOpacity onPress={() => cancelRequest(item)}>
                  <Text style={{fontSize: 12, fontWeight: '600', color: '#FF3B30'}}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        ListEmptyComponent={!loading && pending.length === 0 ? (
          <View style={styles.empty}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: colors.surfaceHighlight,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.xl,
            }}>
              <Text style={{fontSize: 34, color: colors.accent, fontWeight: '200'}}>⊙</Text>
            </View>
            <Text style={{fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
              No groups yet
            </Text>
            <Text style={{
              fontSize: 13, color: colors.textSecondary, textAlign: 'center',
              marginTop: 8, paddingHorizontal: 30, lineHeight: 19,
            }}>
              Create a group for your family, roommates or team, or join one
              with an invite code.
            </Text>
          </View>
        ) : null}
        renderItem={({item}) => (
          <GroupCard
            group={item}
            onPress={() => openGroup(item)}
            colors={colors} spacing={spacing} radius={radius}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  empty: {alignItems: 'center', justifyContent: 'center', paddingTop: 60},
});

export default GroupsScreen;
