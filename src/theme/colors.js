export const palette = {
  black: '#0D1117',
  white: '#FFFFFF',

  // Dark — style GitHub dark / noir bleuté froid
  dark0: '#0D1117',
  dark1: '#161B22',
  dark2: '#21262D',
  dark3: '#30363D',
  dark4: '#484F58',

  // Light — blanc grisâtre doux
  light0: '#FFFFFF',
  light1: '#F2F2F7',
  light2: '#E5E5EA',
  light3: '#D1D1D6',
  light4: '#C7C7CC',

  // Accent principal — Orange du logo
  accent: '#FF6B00',
  accentLight: '#FF8C33',
  accentDark: '#CC5500',
  accentGlow: 'rgba(255, 107, 0, 0.25)',

  // Accent secondaire — Marine du logo
  navy: '#1B2B6B',
  navyLight: '#2D4499',
  navyDark: '#111B44',
  navyGlow: 'rgba(27, 43, 107, 0.25)',

  // Succès
  success: '#00C896',
  successLight: '#33D4A8',
  successDark: '#009E75',
  successGlow: 'rgba(0, 200, 150, 0.20)',

  // Warning
  warning: '#FFB020',
  warningLight: '#FFC94D',
  warningDark: '#E09000',

  // Danger
  danger: '#FF3B30',
  dangerLight: '#FF6B63',
  dangerDark: '#CC2E25',
  dangerGlow: 'rgba(255, 59, 48, 0.20)',

  // Gris
  gray100: '#F2F2F7',
  gray200: '#E5E5EA',
  gray300: '#D1D1D6',
  gray400: '#AEAEB2',
  gray500: '#8E8E93',
  gray600: '#636366',
  gray700: '#48484A',
  gray800: '#3A3A3C',
};

export const dark = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceElevated: '#21262D',
  surfaceHighlight: '#30363D',
  border: '#30363D',
  borderSubtle: 'rgba(255,255,255,0.06)',

  text: '#E6EDF3',
  textSecondary: 'rgba(230,237,243,0.60)',
  textTertiary: 'rgba(230,237,243,0.35)',
  textDisabled: 'rgba(230,237,243,0.20)',

  accent: palette.accent,
  accentLight: palette.accentLight,
  accentDark: palette.accentDark,
  accentGlow: palette.accentGlow,

  navy: palette.navy,
  navyLight: palette.navyLight,
  navyGlow: palette.navyGlow,

  success: palette.success,
  successGlow: palette.successGlow,
  warning: palette.warning,
  danger: palette.danger,
  dangerGlow: palette.dangerGlow,

  tabBar: '#161B22',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  card: '#161B22',
};

export const light = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: '#E5E5EA',
  border: '#D1D1D6',
  borderSubtle: 'rgba(0,0,0,0.06)',

  text: '#1C1C1E',
  textSecondary: 'rgba(28,28,30,0.55)',
  textTertiary: 'rgba(28,28,30,0.35)',
  textDisabled: 'rgba(28,28,30,0.20)',

  accent: palette.accentDark,
  accentLight: palette.accent,
  accentDark: palette.accentDark,
  accentGlow: 'rgba(204, 85, 0, 0.15)',

  navy: palette.navyDark,
  navyLight: palette.navy,
  navyGlow: 'rgba(17, 27, 68, 0.15)',

  success: palette.successDark,
  successGlow: 'rgba(0, 158, 117, 0.15)',
  warning: palette.warningDark,
  danger: palette.dangerDark,
  dangerGlow: 'rgba(204, 46, 37, 0.12)',

  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(0,0,0,0.08)',
  card: '#FFFFFF',
};