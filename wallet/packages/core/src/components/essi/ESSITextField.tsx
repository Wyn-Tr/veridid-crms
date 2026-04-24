import React from 'react'
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native'
import { palette, radius, spacing, typography } from '../../theme/essi'

interface ESSITextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  containerStyle?: any
  inputStyle?: any
}

export const ESSITextField: React.FC<ESSITextFieldProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
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

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: spacing.md,
    color: palette.text,
    minHeight: 56,
  },
  inputError: {
    borderColor: palette.danger,
  },
  error: {
    ...typography.caption,
    color: palette.danger,
    marginTop: spacing.xs,
  },
})
