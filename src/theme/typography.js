import {Platform} from 'react-native';

export const fonts = {
  display: Platform.select({android: 'sans-serif-condensed', ios: 'Georgia'}),
  body: Platform.select({android: 'sans-serif', ios: 'System'}),
  mono: Platform.select({android: 'monospace', ios: 'Courier New'}),
};

export const typography = {
  hero: {fontSize: 72, fontWeight: '700', letterSpacing: -3, lineHeight: 80},
  display: {fontSize: 48, fontWeight: '700', letterSpacing: -2, lineHeight: 54},
  h1: {fontSize: 28, fontWeight: '700', letterSpacing: -0.5, lineHeight: 34},
  h2: {fontSize: 22, fontWeight: '600', letterSpacing: -0.3, lineHeight: 28},
  h3: {fontSize: 18, fontWeight: '600', letterSpacing: -0.2, lineHeight: 24},
  bodyLarge: {fontSize: 17, fontWeight: '400', lineHeight: 24},
  body: {fontSize: 15, fontWeight: '400', lineHeight: 22},
  bodySmall: {fontSize: 13, fontWeight: '400', lineHeight: 18},
  label: {fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase'},
  caption: {fontSize: 11, fontWeight: '500', letterSpacing: 0.4},
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48, giant: 64,
};

export const radius = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

export const shadows = {
  sm: {shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2},
  md: {shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4},
  lg: {shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.16, shadowRadius: 16, elevation: 8},
  accent: (color) => ({shadowColor: color, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6}),
};