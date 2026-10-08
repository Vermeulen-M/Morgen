import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';

// Écran d'ouverture : fond marine → orange (couleurs du logo), logo qui
// apparaît en douceur, puis fondu vers l'app.
const NAVY_DARK = '#111B44';
const NAVY = '#1B2B6B';
const ORANGE = '#FF6B00';

const SplashOverlay = ({onFinish, duration = 1900}) => {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {toValue: 1, duration: 500, useNativeDriver: true}),
      Animated.spring(logoScale, {toValue: 1, friction: 6, tension: 60, useNativeDriver: true}),
      Animated.timing(glow, {
        toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {toValue: 1, duration: 600, delay: 450, useNativeDriver: true}),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 350, useNativeDriver: true,
      }).start(() => onFinish?.());
    }, duration);
    return () => clearTimeout(t);
  }, [duration, glow, logoOpacity, logoScale, onFinish, overlayOpacity, textOpacity]);

  const glowScale = glow.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]});

  return (
    <Animated.View style={[styles.root, {opacity: overlayOpacity}]} pointerEvents="auto">
      {/* Lever de soleil : halos orange qui montent du bas */}
      <Animated.View style={[styles.halo, styles.haloOuter, {opacity: glow.interpolate({inputRange: [0, 1], outputRange: [0, 0.18]}), transform: [{scale: glowScale}]}]} />
      <Animated.View style={[styles.halo, styles.haloMid, {opacity: glow.interpolate({inputRange: [0, 1], outputRange: [0, 0.28]}), transform: [{scale: glowScale}]}]} />
      <Animated.View style={[styles.halo, styles.haloInner, {opacity: glow.interpolate({inputRange: [0, 1], outputRange: [0, 0.45]}), transform: [{scale: glowScale}]}]} />

      <Animated.View style={[styles.logoCard, {opacity: logoOpacity, transform: [{scale: logoScale}]}]}>
        <Animated.Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={{opacity: textOpacity, alignItems: 'center', marginTop: 28}}>
        <Text style={styles.title}>MORGEN</Text>
        <Text style={styles.subtitle}>Wake up. For real.</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NAVY_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  halo: {position: 'absolute', backgroundColor: ORANGE},
  haloOuter: {width: 760, height: 760, borderRadius: 380, bottom: -380},
  haloMid: {width: 520, height: 520, borderRadius: 260, bottom: -260},
  haloInner: {width: 300, height: 300, borderRadius: 150, bottom: -150},
  logoCard: {
    width: 168, height: 168, borderRadius: 40,
    backgroundColor: '#FAF9F5',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 14,
    borderWidth: 3, borderColor: NAVY,
  },
  logo: {width: 144, height: 144},
  title: {fontSize: 30, fontWeight: '800', letterSpacing: 8, color: '#FFFFFF'},
  subtitle: {fontSize: 13, color: ORANGE, marginTop: 8, letterSpacing: 1.5, fontWeight: '600'},
});

export default SplashOverlay;
