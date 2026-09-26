import { Platform, type TextStyle, type ViewStyle } from 'react-native'

export const colors = {
  background: '#0F0D0A',
  surface: '#1A1510',
  surfaceMuted: '#241D16',
  primary: '#D6A84F',
  primaryDark: '#A97824',
  text: '#FFF8EA',
  textMuted: '#B8AA96',
  border: '#3A2E21',
  success: '#4FB286',
  danger: '#D96C62',
  white: '#FFFFFF',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radii = { sm: 8, md: 14, lg: 22, pill: 999 } as const

export const typography: Record<string, TextStyle> = {
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700', color: colors.text },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, lineHeight: 24, color: colors.text },
  caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
  button: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.background },
}

export const shadows: Record<string, ViewStyle> = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    android: { elevation: 4 },
    default: {},
  }) ?? {},
}

export const theme = { colors, spacing, radii, typography, shadows } as const
export type Theme = typeof theme

export default theme
