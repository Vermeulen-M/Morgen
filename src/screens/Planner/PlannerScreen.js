import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import {useTheme} from '../../theme';

// ---------- JOUR TAB ----------
const JourTab = ({colors, typography, spacing, radius}) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? {...t, done: !t.done} : t));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [...prev, {id: Date.now().toString(), label: newTask.trim(), done: false}]);
    setNewTask('');
  };

  const removeTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <View style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg}}>
      <Text style={[typography.label, {color: colors.accent, marginBottom: spacing.md}]}>
        AUJOURD'HUI
      </Text>

      {tasks.length === 0 && (
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderColor: colors.borderSubtle, borderWidth: 0.5,
          padding: spacing.lg, marginBottom: spacing.sm, alignItems: 'center',
        }}>
          <Text style={[typography.body, {color: colors.textSecondary, textAlign: 'center'}]}>
            Aucune tâche pour l'instant — ajoute la première ci-dessous
          </Text>
        </View>
      )}

      {tasks.map(task => (
        <View
          key={task.id}
          style={{
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderColor: task.done ? colors.success : colors.borderSubtle,
            borderWidth: task.done ? 1 : 0.5, padding: spacing.lg,
            marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center',
            opacity: task.done ? 0.7 : 1,
          }}>
          <TouchableOpacity
            onPress={() => toggleTask(task.id)}
            activeOpacity={0.75}
            style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <View style={{
              width: 22, height: 22, borderRadius: 7, borderWidth: 1.5,
              borderColor: task.done ? colors.success : colors.border,
              backgroundColor: task.done ? colors.success : 'transparent',
              alignItems: 'center', justifyContent: 'center', marginRight: 12,
            }}>
              {task.done && <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>✓</Text>}
            </View>
            <Text style={[typography.body, {
              color: task.done ? colors.textSecondary : colors.text, flex: 1,
              textDecorationLine: task.done ? 'line-through' : 'none',
            }]}>
              {task.label}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => removeTask(task.id)}
            style={{
              width: 28, height: 28, borderRadius: 14, marginLeft: 8,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.borderSubtle,
            }}>
            <Text style={{color: colors.textSecondary, fontSize: 14, fontWeight: '700'}}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
        <TextInput
          value={newTask}
          onChangeText={setNewTask}
          placeholder="Ajouter une tâche..."
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={addTask}
          style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
            borderColor: colors.borderSubtle, borderWidth: 0.5,
            paddingHorizontal: spacing.lg, paddingVertical: 12,
            color: colors.text, marginRight: spacing.sm,
          }}
        />
        <TouchableOpacity
          onPress={addTask}
          style={{
            backgroundColor: colors.accent, borderRadius: radius.md,
            paddingHorizontal: spacing.lg, justifyContent: 'center',
          }}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 18}}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------- COURT TERME TAB ----------
const CourtTermeTab = ({colors, typography, spacing, radius}) => {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setGoals(prev => [...prev, {id: Date.now().toString(), label: newGoal.trim(), progress: 0}]);
    setNewGoal('');
  };

  const removeGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const bumpProgress = (id) => {
    setGoals(prev => prev.map(g =>
      g.id === id ? {...g, progress: Math.min(100, g.progress + 10)} : g,
    ));
  };

  return (
    <View style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg}}>
      <Text style={[typography.label, {color: colors.accent, marginBottom: spacing.md}]}>
        COURT TERME (cette semaine / ce mois)
      </Text>

      {goals.length === 0 && (
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.md,
          borderColor: colors.borderSubtle, borderWidth: 0.5,
          padding: spacing.lg, marginBottom: spacing.sm, alignItems: 'center',
        }}>
          <Text style={[typography.body, {color: colors.textSecondary, textAlign: 'center'}]}>
            Aucun objectif pour l'instant — ajoute le premier ci-dessous
          </Text>
        </View>
      )}

      {goals.map(goal => (
        <View
          key={goal.id}
          style={{
            backgroundColor: colors.surface, borderRadius: radius.md,
            borderColor: colors.borderSubtle, borderWidth: 0.5,
            padding: spacing.lg, marginBottom: spacing.sm,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
            <TouchableOpacity
              onPress={() => bumpProgress(goal.id)}
              activeOpacity={0.75}
              style={{flex: 1}}>
              <Text style={[typography.body, {color: colors.text, marginBottom: 10}]}>
                {goal.label}
              </Text>
              <View style={{
                height: 8, borderRadius: 4, backgroundColor: colors.borderSubtle, overflow: 'hidden',
              }}>
                <View style={{
                  height: '100%', width: `${goal.progress}%`,
                  backgroundColor: goal.progress >= 100 ? colors.success : colors.accent,
                  borderRadius: 4,
                }} />
              </View>
              <Text style={[typography.bodySmall, {color: colors.textTertiary, marginTop: 6}]}>
                {goal.progress}% — appuyer pour avancer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeGoal(goal.id)}
              style={{
                width: 28, height: 28, borderRadius: 14, marginLeft: 8,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.borderSubtle,
              }}>
              <Text style={{color: colors.textSecondary, fontSize: 14, fontWeight: '700'}}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
        <TextInput
          value={newGoal}
          onChangeText={setNewGoal}
          placeholder="Ajouter un objectif..."
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={addGoal}
          style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
            borderColor: colors.borderSubtle, borderWidth: 0.5,
            paddingHorizontal: spacing.lg, paddingVertical: 12,
            color: colors.text, marginRight: spacing.sm,
          }}
        />
        <TouchableOpacity
          onPress={addGoal}
          style={{
            backgroundColor: colors.accent, borderRadius: radius.md,
            paddingHorizontal: spacing.lg, justifyContent: 'center',
          }}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 18}}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------- LONG TERME TAB ----------
const LongTermeTab = ({colors, typography, spacing, radius}) => {
  const [visions, setVisions] = useState([]);
  const [newVision, setNewVision] = useState('');

  const addVision = () => {
    if (!newVision.trim()) return;
    setVisions(prev => [...prev, {id: Date.now().toString(), label: newVision.trim(), note: ''}]);
    setNewVision('');
  };

  const removeVision = (id) => {
    setVisions(prev => prev.filter(v => v.id !== id));
  };

  return (
    <View style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg}}>
      <Text style={[typography.label, {color: colors.accent, marginBottom: spacing.md}]}>
        LONG TERME (vision)
      </Text>

      {visions.length === 0 && (
        <View style={{
          backgroundColor: colors.surface, borderRadius: radius.lg,
          borderColor: colors.borderSubtle, borderWidth: 0.5,
          padding: spacing.lg, marginBottom: spacing.md, alignItems: 'center',
        }}>
          <Text style={[typography.body, {color: colors.textSecondary, textAlign: 'center'}]}>
            Aucune vision long terme pour l'instant — ajoute la première ci-dessous
          </Text>
        </View>
      )}

      {visions.map(vision => (
        <View
          key={vision.id}
          style={{
            backgroundColor: colors.surface, borderRadius: radius.lg,
            borderColor: colors.borderSubtle, borderWidth: 0.5,
            padding: spacing.lg, marginBottom: spacing.md,
            flexDirection: 'row', alignItems: 'flex-start',
          }}>
          <View style={{flex: 1}}>
            <Text style={[typography.h3, {color: colors.text}]}>{vision.label}</Text>
            {!!vision.note && (
              <Text style={[typography.bodySmall, {color: colors.textSecondary, marginTop: 6}]}>
                {vision.note}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => removeVision(vision.id)}
            style={{
              width: 28, height: 28, borderRadius: 14, marginLeft: 8,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.borderSubtle,
            }}>
            <Text style={{color: colors.textSecondary, fontSize: 14, fontWeight: '700'}}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
        <TextInput
          value={newVision}
          onChangeText={setNewVision}
          placeholder="Ajouter une vision long terme..."
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={addVision}
          style={{
            flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
            borderColor: colors.borderSubtle, borderWidth: 0.5,
            paddingHorizontal: spacing.lg, paddingVertical: 12,
            color: colors.text, marginRight: spacing.sm,
          }}
        />
        <TouchableOpacity
          onPress={addVision}
          style={{
            backgroundColor: colors.accent, borderRadius: radius.md,
            paddingHorizontal: spacing.lg, justifyContent: 'center',
          }}>
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 18}}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------- MAIN SCREEN ----------
const TABS = [
  {key: 'jour', label: 'Jour'},
  {key: 'court', label: 'Court terme'},
  {key: 'long', label: 'Long terme'},
];

const PlannerScreen = () => {
  const {colors, typography, spacing, radius} = useTheme();
  const [activeTab, setActiveTab] = useState('jour');

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={colors.text === '#fff' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 8}}>
        <Text style={[typography.label, {color: colors.accent}]}>PLANNER</Text>
        <Text style={[typography.h1, {color: colors.text, marginTop: 2}]}>Organisation</Text>
      </View>

      {/* Tab switcher */}
      <View style={{
        flexDirection: 'row', marginHorizontal: spacing.xl, marginTop: spacing.md,
        backgroundColor: colors.surface, borderRadius: radius.md, padding: 4,
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: radius.sm,
                backgroundColor: active ? colors.accent : 'transparent',
                alignItems: 'center',
              }}>
              <Text style={{
                color: active ? '#fff' : colors.textSecondary,
                fontWeight: active ? '700' : '500', fontSize: 13,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>
        {activeTab === 'jour' && (
          <JourTab colors={colors} typography={typography} spacing={spacing} radius={radius} />
        )}
        {activeTab === 'court' && (
          <CourtTermeTab colors={colors} typography={typography} spacing={spacing} radius={radius} />
        )}
        {activeTab === 'long' && (
          <LongTermeTab colors={colors} typography={typography} spacing={spacing} radius={radius} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default PlannerScreen;