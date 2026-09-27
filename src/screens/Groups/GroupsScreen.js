import React, {useCallback, useState} from 'react';
import {
  View, Text, SafeAreaView, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {listMyGroups} from '../../services/GroupsService';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listMyGroups();
      setGroups(data || []);
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
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={{fontSize: 56, marginBottom: 20}}>👥</Text>
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
