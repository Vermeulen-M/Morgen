import React, {useState, useEffect, useRef} from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, StatusBar,
} from 'react-native';
import {useTheme} from '../../theme';

const ShakeChallengeUI = ({target, onComplete, colors}) => {
  const [count, setCount] = useState(0);
  const progress = count / target;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress, duration: 200, useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.challengeBox}>
      <View style={{
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: '#FF4D6A18',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Text style={{fontSize: 44, color: '#FF4D6A', fontWeight: '200'}}>≋</Text>
      </View>
      <Text style={{fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
        Shake it!
      </Text>
      <Text style={{fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8}}>
        {count} / {target} shakes
      </Text>
      <View style={{
        backgroundColor: colors.surfaceHighlight, borderRadius: 4,
        height: 6, width: '100%', marginTop: 24, overflow: 'hidden',
      }}>
        <Animated.View style={{
          width: barAnim.interpolate({inputRange: [0,1], outputRange: ['0%','100%']}),
          height: '100%', backgroundColor: '#FF4D6A', borderRadius: 4,
        }} />
      </View>
      <Text style={{fontSize: 12, color: colors.textTertiary, marginTop: 8}}>
        {Math.round(progress * 100)}% complete
      </Text>
      <TouchableOpacity
        onPress={() => {
          const next = count + 1;
          setCount(next);
          if (next >= target) onComplete();
        }}
        style={{
          backgroundColor: '#FF4D6A', borderRadius: 14,
          marginTop: 28, paddingHorizontal: 32, paddingVertical: 16,
        }}>
        <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>
          Tap to simulate shake
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const QRChallengeUI = ({onComplete, colors}) => (
  <View style={styles.challengeBox}>
    <View style={{
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: '#7C5CFC18',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
    }}>
      <Text style={{fontSize: 44, color: '#7C5CFC', fontWeight: '200'}}>⊞</Text>
    </View>
    <Text style={{fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
      Scan the QR!
    </Text>
    <Text style={{fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20}}>
      Find the QR code placed in your home and scan it
    </Text>
    <TouchableOpacity
      onPress={onComplete}
      style={{
        backgroundColor: '#7C5CFC', borderRadius: 14,
        marginTop: 28, paddingHorizontal: 32, paddingVertical: 16,
      }}>
      <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>Open Camera</Text>
    </TouchableOpacity>
  </View>
);

const SequenceChallengeUI = ({onComplete, colors}) => {
  const COLORS = ['#FF4D6A', '#7C5CFC', '#00E896', '#FFB020'];
  const SYMBOLS = ['◈', '⊙', '≋', '↑'];
  const [sequence] = useState([0, 2, 1, 3, 0, 2]);
  const [userInput, setUserInput] = useState([]);
  const [wrong, setWrong] = useState(false);

  const handlePress = (i) => {
    const next = [...userInput, i];
    setUserInput(next);
    if (next.length === sequence.length) {
      if (JSON.stringify(next) === JSON.stringify(sequence)) {
        onComplete();
      } else {
        setWrong(true);
        setTimeout(() => {setUserInput([]); setWrong(false);}, 500);
      }
    }
  };

  return (
    <View style={styles.challengeBox}>
      <View style={{
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: '#00E89618',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Text style={{fontSize: 44, color: '#00E896', fontWeight: '200'}}>◈</Text>
      </View>
      <Text style={{fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
        Repeat the sequence
      </Text>
      <View style={{flexDirection: 'row', gap: 8, marginVertical: 20}}>
        {sequence.map((s, i) => (
          <View key={i} style={{
            width: 12, height: 12, borderRadius: 6,
            backgroundColor: i < userInput.length
              ? (wrong ? '#FF4D6A' : COLORS[s])
              : colors.surfaceHighlight,
          }} />
        ))}
      </View>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', width: 220}}>
        {COLORS.map((color, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => handlePress(i)}
            style={{
              width: 90, height: 90,
              backgroundColor: color + '22',
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: color,
              alignItems: 'center', justifyContent: 'center',
            }}
            activeOpacity={0.7}>
            <Text style={{fontSize: 36, color: color, fontWeight: '200'}}>
              {SYMBOLS[i]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const AlarmRingingScreen = ({navigation, route}) => {
  const {colors, spacing} = useTheme();
  const alarm = route?.params?.alarm || {
    time: '07:00', label: 'Wake up!', challenge: 'shake', shakeCount: 20,
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.03, duration: 900, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 900, useNativeDriver: true}),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleChallengeComplete = () => {
    setSolved(true);
    setTimeout(() => navigation.goBack(), 1800);
  };

  const [h, m] = alarm.time.split(':');
  const hour12 = parseInt(h, 10) % 12 || 12;
  const ampm = parseInt(h, 10) >= 12 ? 'PM' : 'AM';

  if (solved) {
    return (
      <View style={[styles.container, {backgroundColor: '#00C896'}]}>
        <StatusBar barStyle="dark-content" />
        <View style={{
          width: 90, height: 90, borderRadius: 45,
          backgroundColor: 'rgba(255,255,255,0.3)',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Text style={{fontSize: 44, color: '#fff', fontWeight: '300'}}>✓</Text>
        </View>
        <Text style={{fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center'}}>
          Challenge Complete!
        </Text>
        <Text style={{fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 12, textAlign: 'center'}}>
          Streak updated. Let's get this day!
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={{alignItems: 'center', paddingTop: 80, paddingHorizontal: 24}}>
        <Text style={{
          fontSize: 10, fontWeight: '700', letterSpacing: 2,
          color: colors.danger, marginBottom: 12, textTransform: 'uppercase',
        }}>
          Wake Up Now
        </Text>
        <Animated.View style={{transform: [{scale: pulseAnim}]}}>
          <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
            <Text style={{fontSize: 80, fontWeight: '700', letterSpacing: -3, color: colors.text}}>
              {String(hour12).padStart(2, '0')}:{m}
            </Text>
            <Text style={{fontSize: 20, fontWeight: '500', color: colors.textSecondary, marginBottom: 16, marginLeft: 8}}>
              {ampm}
            </Text>
          </View>
        </Animated.View>
        {alarm.label ? (
          <Text style={{fontSize: 16, color: colors.textSecondary, marginTop: 4}}>
            {alarm.label}
          </Text>
        ) : null}
      </View>
      <View style={{flex: 1, justifyContent: 'center', width: '100%', paddingHorizontal: 24}}>
        {alarm.challenge === 'shake' && (
          <ShakeChallengeUI target={alarm.shakeCount || 20} onComplete={handleChallengeComplete} colors={colors} />
        )}
        {alarm.challenge === 'qr' && (
          <QRChallengeUI onComplete={handleChallengeComplete} colors={colors} />
        )}
        {alarm.challenge === 'sequence' && (
          <SequenceChallengeUI onComplete={handleChallengeComplete} colors={colors} />
        )}
      </View>
      <View style={{paddingHorizontal: 24, paddingBottom: spacing.xxxl}}>
        <Text style={{fontSize: 11, color: colors.textTertiary, textAlign: 'center', letterSpacing: 0.5}}>
          Complete the challenge to dismiss
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'space-between'},
  challengeBox: {alignItems: 'center', width: '100%'},
});

export default AlarmRingingScreen;