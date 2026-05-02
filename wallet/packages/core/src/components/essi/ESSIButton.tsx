import React, { useMemo } from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native'

import { radius, spacing, typography } from '../../theme/essi'
import { useWalletVisualPalette } from '../../theme/essi'

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

function buildButtonStyles(p: ReturnType<typeof useWalletVisualPalette>) {
  return StyleSheet.create({
    button: {
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    primary: {
      backgroundColor: p.primary,
    },
    secondary: {
      backgroundColor: p.surfaceSecondary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: p.outline,
    },
    danger: {
      backgroundColor: p.danger,
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
      color: p.buttonText,
    },
    secondaryText: {
      color: p.text,
    },
    outlineText: {
      color: p.primary,
    },
    dangerText: {
      color: p.buttonText,
    },
    ghostText: {
      color: p.muted,
    },
  })
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
  const palette = useWalletVisualPalette()
  const styles = useMemo(() => buildButtonStyles(palette), [palette])
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
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? palette.primary : palette.buttonText} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{displayText}</Text>
      )}
    </Pressable>
  )
}
