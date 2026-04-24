import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { palette, radius, spacing, typography } from '../../theme/essi'

interface ESSIButtonProps {
  title?: string
  children?: React.ReactNode
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  testID?: string
  style?: any
}

export const ESSIButton: React.FC<ESSIButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID,
  style,
}) => {
  const displayText = children || title

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? palette.primary : palette.text} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{displayText}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primary: {
    backgroundColor: palette.primary,
  },
  secondary: {
    backgroundColor: palette.surfaceSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.outline,
  },
  danger: {
    backgroundColor: palette.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  text: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  primaryText: {
    color: palette.text,
  },
  secondaryText: {
    color: palette.text,
  },
  outlineText: {
    color: palette.primary,
  },
  dangerText: {
    color: palette.text,
  },
  ghostText: {
    color: palette.muted,
  },
})
