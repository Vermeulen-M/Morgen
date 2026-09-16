import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';
import {useTheme} from '../../theme';

const ROUTINE_ITEMS = [
  {id: 'hydrate', emoji: '💧', label: 'Drink water (500ml)'},
  {id: 'stretch', emoji: '🧘', label: '5 min stretch'},
  {id: 'journal', emoji: '📝', label: 'Write 1 intention'},
  {id: 'cold', emoji: '🚿', label: 'Cold shower'},
  {id: 'read', emoji: '📚', label: 'Read 10 min'},
];

const NUTRITION_TIPS = [
  {meal: 'Breakfast', tip: 'Start with protein — eggs, Greek yogurt or nuts to stabilize blood sugar and kill morning hunger.', emoji: '🍳'},
  {meal: 'Lunch', tip: 'Go for complex carbs + lean protein. Avoid heavy meals that cause afternoon crash.', emoji: '🥗'},
  {meal: 'Dinner', tip: 'Light and early. Your body processes food better before 8pm. Less carbs, more veggies.', emoji: '🍽️'},
];

const ZONES = [
  {id: 'morning', emoji: '🌅', label: 'Morning routine'},
  {id: 'work', emoji: '💼', label: 'Work & focus'},
  {id: 'health', emoji: '💪', label: 'Health & sport'},
  {id: 'evening', emoji: '🌙', label: 'Evening wind-down'},
];

const PlannerScreen = () => {
  const {colors, typography, spacing, radius} = useTheme();
  const [checkedItems, setCheckedItems] = useState([]);
  const [expandedZone, setExpandedZone] = useState(null);

  const toggleItem = (id) => {
    setCheckedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar
        barStyle={colors.text === '#fff' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView contentContainerStyle={{paddingBottom: 100}} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 8}}>
          <Text style={[typography.label, {color: colors.accent}]}>DAILY PLANNER</Text>
          <Text style={[typography.h1, {color: colors.text, marginTop: 2}]}>Today</Text>
          <Text style={[typography.body, {color: colors.textSecondary}]}>{today}</Text>
        </View>

        {/* Intention card */}
        <View style={{
          marginHorizontal: spacing.xl, marginTop: spacing.xl,
          backgroundColor: colors.accent, borderRadius: radius.lg, padding: spacing.xl,
        }}>
          <Text style={[typography.label, {color: 'rgba(255,255,255,0.7)', marginBottom: 8}]}>
            ONE THING TODAY
          </Text>
          <Text style={[typography.h2, {color: '#fff'}]}>
            What matters most today?
          </Text>
          <TouchableOpacity style={{
            backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.md,
            marginTop: 16, padding: spacing.md,
          }}>
            <Text style={{color: '#fff', fontWeight: '600', fontSize: 14}}>
              Set my intention →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Morning routine */}
        <View style={{marginTop: spacing.xxl, paddingHorizontal: spacing.xl}}>
          <Text style={[typography.label, {color: colors.accent, marginBottom: spacing.md}]}>
            MORNING ROUTINE
          </Text>
          {ROUTINE_ITEMS.map(item => {
            const checked = checkedItems.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleItem(item.id)}
                style={{
                  backgroundColor: colors.surface, borderRadius: radius.md,
                  borderColor: checked ? colors.success : colors.borderSubtle,
                  borderWidth: checked ? 1 : 0.5, padding: spacing.lg,
                  marginBottom: spacing.sm, flexDirection: 'row',
                  alignItems: 'center', opacity: checked ? 0.7 : 1,
                }}
                activeOpacity={0.75}>
                <Text style={{fontSize: 22, marginRight: 12}}>{item.emoji}</Text>
                <Text style={[typography.body, {
                  color: checked ? colors.textSecondary : colors.text, flex: 1,
                  textDecorationLine: checked ? 'line-through' : 'none',
                }]}>
                  {item.label}
                </Text>
                <View style={{
                  width: 24, height: 24, borderRadius: 8, borderWidth: 1.5,
                  borderColor: checked ? colors.success : colors.border,
                  backgroundColor: checked ? colors.success : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nutrition */}
        <View style={{marginTop: spacing.xxl, paddingHorizontal: spacing.xl}}>
          <Text style={[typography.label, {color: colors.accent, marginBottom: spacing.md}]}>
            NUTRITION GUIDE
          </Text>
          {NUTRITION_TIPS.map(tip => (
            <View key={tip.meal} style={{
              backgroundColor: colors.surface, borderRadius: radius.md,
              borderColor: colors.borderSubtle, borderWidth: 0.5,
              padding: spacing.lg, marginBottom: spacing.sm,
            }}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{fontSize: 22, marginRight: 10}}>{tip.emoji}</Text>
                <Text style={[typography.h3, {color: colors.text}]}>{tip.meal}</Text>
              </View>
              <Text style={[typography.bodySmall, {color: colors.textSecondary, marginTop: 8, lineHeight: 20}]}>
                {tip.tip}
              </Text>
            </View>
          ))}
        </View>

        {/* Life zones */}
        <View style={{marginTop: spacing.xxl, paddingHorizontal: spacing.xl}}>
          <Text style={[typography.label, {color: colors.accent, marginBottom: spacing.md}]}>
            LIFE ZONES
          </Text>
          {ZONES.map(zone => (
            <TouchableOpacity
              key={zone.id}
              onPress={() => setExpandedZone(expandedZone === zone.id ? null : zone.id)}
              style={{
                backgroundColor: colors.surface, borderRadius: radius.lg,
                borderColor: colors.borderSubtle, borderWidth: 0.5,
                padding: spacing.lg, marginBottom: spacing.md,
              }}
              activeOpacity={0.8}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={{fontSize: 24, marginRight: 12}}>{zone.emoji}</Text>
                <Text style={[typography.h3, {color: colors.text, flex: 1}]}>{zone.label}</Text>
                <Text style={{color: colors.textTertiary, fontSize: 12}}>
                  {expandedZone === zone.id ? '▲' : '▼'}
                </Text>
              </View>
              {expandedZone === zone.id && (
                <Text style={[typography.body, {color: colors.textSecondary, marginTop: spacing.md}]}>
                  Configure your {zone.label.toLowerCase()} — coming soon.
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default PlannerScreen;