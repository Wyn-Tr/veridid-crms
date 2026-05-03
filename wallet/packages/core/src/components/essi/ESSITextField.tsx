import React, { useMemo } from 'react'
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native'

import { radius, spacing, typography } from '../../theme/essi'
import { useWalletVisualPalette } from '../../theme/essi'

interface ESSITextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  containerStyle?: any
  inputStyle?: any
}

function buildFieldStyles(p: ReturnType<typeof useWalletVisualPalette>) {
  return StyleSheet.create({
    container: {
      marginBottom: spacing.md,
    },
    label: {
      ...typography.bodyBold,
      color: p.text,
      marginBottom: spacing.xs,
    },
    input: {
      ...typography.body,
      backgroundColor: p.surfaceSecondary,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: p.outline,
      padding: spacing.md,
      color: p.text,
      minHeight: 56,
    },
    inputError: {
      borderColor: p.danger,
    },
    error: {
      ...typography.caption,
      color: p.danger,
      marginTop: spacing.xs,
    },
  })
}

export const ESSITextField: React.FC<ESSITextFieldProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
  const palette = useWalletVisualPalette()
  const styles = useMemo(() => buildFieldStyles(palette), [palette])

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, inputStyle]}
        placeholderTextColor={palette.muted}
        {...textInputProps}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}
