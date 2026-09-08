export const colors = {
  background: '#0B1020',
  card: '#151B2E',
  border: '#232B42',
  text: '#F2F5FF',
  muted: '#8A93B0',
  primary: { bg: '#3D6BFF', text: '#FFFFFF', border: '#3D6BFF' },
  secondary: { bg: '#232B42', text: '#F2F5FF', border: '#33405F' },
  danger: { bg: '#4A1520', text: '#FF8A97', border: '#6E2030' },
  success: { bg: '#123B26', text: '#4ADE80', border: '#1E5C3C' },
  active: { bg: '#1E2A4A', text: '#7AA2FF', border: '#2E4170' },
  neutral: { bg: '#232B42', text: '#B9C2DE', border: '#33405F' },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 10, lg: 14 } as const;