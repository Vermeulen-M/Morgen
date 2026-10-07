import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, StatusBar,
} from 'react-native';
import RNShake from 'react-native-shake';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {Worklets} from 'react-native-worklets-core';
import {useTheme} from '../../theme';
import {updateStreak, incrementChallengesCompleted} from '../../services/StorageService';
import {startAlarmSound, stopAlarmSound} from '../../services/SoundService';
import {markAlarmComplete, syncGroupAlarms} from '../../services/GroupsService';

const ShakeChallengeUI = ({target, onComplete, colors}) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const subscription = RNShake.addListener(() => {
      countRef.current += 1;
      setCount(countRef.current);

      Animated.timing(barAnim, {
        toValue: countRef.current / target,
        duration: 150,
        useNativeDriver: false,
      }).start();

      if (countRef.current >= target) {
        subscription.remove();
        onComplete();
      }
    });

    return () => subscription.remove();
  }, []);

  const progress = count / target;

  return (
    <View style={styles.challengeBox}>
      <View style={{
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: '#FF6B0018',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Text style={{fontSize: 44, color: '#FF6B00', fontWeight: '200'}}>≋</Text>
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
          height: '100%', backgroundColor: '#FF6B00', borderRadius: 4,
        }} />
      </View>
      <Text style={{fontSize: 12, color: colors.textTertiary, marginTop: 8}}>
        {Math.round(progress * 100)}% complete — shake your phone!
      </Text>
    </View>
  );
};

const QRChallengeUI = ({onComplete, colors, navigation, expectedCode}) => (
  <View style={styles.challengeBox}>
    <View style={{
      width: 90, height: 90, borderRadius: 45,
      backgroundColor: '#1B2B6B18',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
    }}>
      <Text style={{fontSize: 44, color: '#1B2B6B', fontWeight: '200'}}>⊞</Text>
    </View>
    <Text style={{fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
      Scan the QR!
    </Text>
    <Text style={{fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 20}}>
      Find the QR code placed in your home and scan it
    </Text>
    <TouchableOpacity
      onPress={() => navigation.navigate('QRScan', {expectedCode, onSuccess: onComplete})}
      style={{
        backgroundColor: '#1B2B6B', borderRadius: 14,
        marginTop: 28, paddingHorizontal: 32, paddingVertical: 16,
      }}>
      <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}>Open Camera</Text>
    </TouchableOpacity>
  </View>
);

const SequenceChallengeUI = ({onComplete, colors}) => {
  const COLORS = ['#FF6B00', '#1B2B6B', '#00C896', '#FFB020'];
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
        backgroundColor: '#00C89618',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Text style={{fontSize: 44, color: '#00C896', fontWeight: '200'}}>◈</Text>
      </View>
      <Text style={{fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
        Repeat the sequence
      </Text>
      <View style={{flexDirection: 'row', gap: 8, marginVertical: 20}}>
        {sequence.map((s, i) => (
          <View key={i} style={{
            width: 12, height: 12, borderRadius: 6,
            backgroundColor: i < userInput.length
              ? (wrong ? '#FF3B30' : COLORS[s])
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

const WORKOUT_TARGET_MS = 20000;      // 20 secondes de mouvement cumulé
const MOTION_THRESHOLD = 4;           // sensibilité du diff de luminance
const GRID_SIZE = 10;                 // grille 10x10 de points échantillonnés

const WorkoutChallengeUI = ({onComplete, colors}) => {
  const {hasPermission, requestPermission} = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState('front');
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const canSwitchCamera = !!frontDevice && !!backDevice;
  const device = cameraPosition === 'front'
    ? (frontDevice ?? backDevice)
    : (backDevice ?? frontDevice);
  const format = useCameraFormat(device, [
    {fps: 15},
    {videoResolution: {width: 192, height: 144}},
  ]);

  const toggleCameraPosition = useCallback(() => {
    setCameraPosition((current) => (current === 'front' ? 'back' : 'front'));
  }, []);

  const [progressMs, setProgressMs] = useState(0);
  const progressMsRef = useRef(0);
  const lastSampleTimeRef = useRef(0);
  const doneRef = useRef(false);
  const motionIndicatorAnim = useRef(new Animated.Value(0)).current;
  const motionResetTimeoutRef = useRef(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  useEffect(() => {
    return () => {
      if (motionResetTimeoutRef.current) {
        clearTimeout(motionResetTimeoutRef.current);
      }
    };
  }, []);

  const handleFrameSample = Worklets.createRunOnJS((avgDiff) => {
    const now = Date.now();
    const last = lastSampleTimeRef.current || now;
    const dt = now - last;
    lastSampleTimeRef.current = now;

    const isMoving = avgDiff > MOTION_THRESHOLD;

    if (isMoving) {
      // "L'oeil" passe au vert dès qu'un mouvement est détecté...
      Animated.timing(motionIndicatorAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }).start();

      // ...et redevient transparent si plus aucun mouvement pendant 350ms.
      if (motionResetTimeoutRef.current) {
        clearTimeout(motionResetTimeoutRef.current);
      }
      motionResetTimeoutRef.current = setTimeout(() => {
        Animated.timing(motionIndicatorAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }, 350);

      progressMsRef.current = Math.min(WORKOUT_TARGET_MS, progressMsRef.current + dt);
      setProgressMs(progressMsRef.current);

      if (progressMsRef.current >= WORKOUT_TARGET_MS && !doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const buffer = frame.toArrayBuffer();
    const data = new Uint8Array(buffer);
    const width = frame.width;
    const height = frame.height;

    let totalDiff = 0;
    let samples = 0;

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const x = Math.floor((gx / GRID_SIZE) * width);
        const y = Math.floor((gy / GRID_SIZE) * height);
        const idx = y * width + x; // plan Y (luminance) en YUV420
        if (idx < data.length) {
          samples += 1;
          totalDiff += data[idx];
        }
      }
    }

    const avg = samples > 0 ? totalDiff / samples : 0;

    if (global.__lastWorkoutAvg !== undefined) {
      const diff = Math.abs(avg - global.__lastWorkoutAvg);
      handleFrameSample(diff);
    }
    global.__lastWorkoutAvg = avg;
  }, [handleFrameSample]);

  const progress = progressMs / WORKOUT_TARGET_MS;

  if (!hasPermission) {
    return (
      <View style={styles.challengeBox}>
        <Text style={{fontSize: 15, color: colors.textSecondary, textAlign: 'center'}}>
          Camera permission needed to detect movement
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.challengeBox}>
        <Text style={{fontSize: 15, color: colors.textSecondary, textAlign: 'center'}}>
          No camera available on this device
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.challengeBox}>
      <View style={{
        width: 260, height: 340, borderRadius: 24, overflow: 'hidden',
        marginBottom: 20, backgroundColor: '#000',
      }}>
        <Camera
          style={{flex: 1}}
          device={device}
          format={format}
          isActive={true}
          pixelFormat="yuv"
          frameProcessor={frameProcessor}
        />
        <Animated.View
          style={{
            position: 'absolute', top: 10, left: 10,
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: '#22C55E',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.6)',
            opacity: motionIndicatorAnim,
          }}
        />
        {canSwitchCamera && (
          <TouchableOpacity
            onPress={toggleCameraPosition}
            activeOpacity={0.7}
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 32, height: 32, borderRadius: 16,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(20,20,20,0.55)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
            }}>
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '400', letterSpacing: 0.5}}>
              ⇄
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={{fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center'}}>
        Move in front of the camera!
      </Text>
      <View style={{
        backgroundColor: colors.surfaceHighlight, borderRadius: 4,
        height: 6, width: '100%', marginTop: 20, overflow: 'hidden',
      }}>
        <View style={{
          width: `${Math.min(100, progress * 100)}%`,
          height: '100%', backgroundColor: '#FFB020', borderRadius: 4,
        }} />
      </View>
      <Text style={{fontSize: 12, color: colors.textTertiary, marginTop: 8}}>
        {Math.round(progress * 100)}% — keep moving
      </Text>
    </View>
  );
};

// Filet de sécurité : si un défi plante (crash JS, ex: erreur caméra),
// on attrape l'erreur ici plutôt que de laisser l'utilisateur bloqué
// avec une alarme qui sonne et un écran cassé sans aucun moyen de l'arrêter.
class ChallengeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error, info) {
    console.error('Challenge crashed, falling back safely:', error, info);
    this.props.onCrash?.();
  }

  render() {
    if (this.state.hasError) {
      // Rendu minimal pendant que le parent bascule vers l'écran de secours.
      return <View style={styles.challengeBox} />;
    }
    return this.props.children;
  }
}

const AlarmRingingScreen = ({navigation, route}) => {
  const {colors, spacing} = useTheme();
  const alarm = route?.params?.alarm || {
    time: '07:00', label: 'Wake up!', challenge: 'shake', shakeCount: 20,
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [solved, setSolved] = useState(false);
  const [safetyDismissed, setSafetyDismissed] = useState(false);
  const [showSafetyExit, setShowSafetyExit] = useState(false);

  // Son de l'alarme
  useEffect(() => {
    startAlarmSound();
    return () => stopAlarmSound();
  }, []);

  // Filet de sécurité : si le défi semble bloqué (bug, permission refusée,
  // QR introuvable...), on révèle après un délai une sortie de secours —
  // volontairement discrète et à appui long pour éviter que ça devienne
  // un simple "snooze" facile.
  useEffect(() => {
    const timer = setTimeout(() => setShowSafetyExit(true), 45000);
    return () => clearTimeout(timer);
  }, []);

  const handleSafetyDismiss = useCallback(() => {
    stopAlarmSound();
    setSafetyDismissed(true);
  }, []);

  // Animation pulse
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

  const handleChallengeComplete = async () => {
    stopAlarmSound();
    await updateStreak();
    await incrementChallengesCompleted();
    if (alarm.groupAlarmId) {
      // Visibilité passive pour le groupe, puis reprogrammation du lendemain.
      try { await markAlarmComplete(alarm.groupAlarmId); } catch (e) {
        console.log('markAlarmComplete failed:', e?.message);
      }
      syncGroupAlarms();
    }
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

  if (safetyDismissed) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={{
          width: 90, height: 90, borderRadius: 45,
          backgroundColor: colors.surfaceHighlight,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Text style={{fontSize: 40, color: colors.textSecondary}}>!</Text>
        </View>
        <Text style={{fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center', paddingHorizontal: 32}}>
          Alarm turned off
        </Text>
        <Text style={{fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 40}}>
          The challenge couldn't be completed this time, so we turned off the alarm safely.
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
            <Text style={{fontSize: 80, fontWeight: '800', letterSpacing: -3, color: colors.text}}>
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
        <ChallengeErrorBoundary onCrash={handleSafetyDismiss}>
          {alarm.challenge === 'shake' && (
            <ShakeChallengeUI target={alarm.shakeCount || 20} onComplete={handleChallengeComplete} colors={colors} />
          )}
          {alarm.challenge === 'qr' && (
            <QRChallengeUI
              onComplete={handleChallengeComplete}
              colors={colors}
              navigation={navigation}
              expectedCode={alarm.qrValue}
            />
          )}
          {alarm.challenge === 'sequence' && (
            <SequenceChallengeUI onComplete={handleChallengeComplete} colors={colors} />
          )}
          {alarm.challenge === 'workout' && (
            <WorkoutChallengeUI onComplete={handleChallengeComplete} colors={colors} />
          )}
          {alarm.challenge === 'none' && (
            <TouchableOpacity
              onPress={handleChallengeComplete}
              style={{
                backgroundColor: colors.accent, borderRadius: 16,
                paddingVertical: 20, alignItems: 'center',
              }}>
              <Text style={{fontSize: 18, fontWeight: '700', color: '#fff'}}>I'm awake</Text>
            </TouchableOpacity>
          )}
        </ChallengeErrorBoundary>
      </View>

      <View style={{paddingHorizontal: 24, paddingBottom: spacing.xxxl}}>
        <Text style={{fontSize: 11, color: colors.textTertiary, textAlign: 'center', letterSpacing: 0.5}}>
          {alarm.challenge === 'none' ? 'Tap to confirm you are up' : 'Complete the challenge to dismiss'}
        </Text>
        {showSafetyExit && (
          <TouchableOpacity
            onLongPress={handleSafetyDismiss}
            delayLongPress={2000}
            activeOpacity={0.5}
            style={{marginTop: 14, alignSelf: 'center', padding: 8}}>
            <Text style={{
              fontSize: 11, color: colors.textTertiary, textAlign: 'center',
              textDecorationLine: 'underline',
            }}>
              Challenge not working? Hold to turn off
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'space-between'},
  challengeBox: {alignItems: 'center', width: '100%'},
});

export default AlarmRingingScreen;