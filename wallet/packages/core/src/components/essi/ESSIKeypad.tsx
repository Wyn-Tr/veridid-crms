import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { palette, spacing, typography, radius } from '../../theme/essi'

interface ESSIKeypadProps {
  onDigitPress: (digit: string) => void
  onDeletePress: () => void
  onBiometricPress?: () => void
  showBiometric?: boolean
  disabled?: boolean
  testID?: string
}

const ESSIKeypad: React.FC<ESSIKeypadProps> = ({
  onDigitPress,
  onDeletePress,
  onBiometricPress,
  showBiometric = false,
  disabled = false,
  testID,
}) => {
  const renderButton = (value: string | 'delete' | 'biometric', index: number) => {
    const isDelete = value === 'delete'
    const isBiometric = value === 'biometric'
    const isEmpty = value === ''

    if (isEmpty) {
      return <View key={index} style={styles.buttonEmpty} />
    }

    const handlePress = () => {
      if (disabled) return
      if (isDelete) {
        onDeletePress()
      } else if (isBiometric && onBiometricPress) {
        onBiometricPress()
      } else if (!isDelete && !isBiometric) {
        onDigitPress(value)
      }
    }

    return (
      <Pressable
        key={index}
        style={({ pressed }) => [
          styles.button,
          pressed && !disabled && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        testID={`${testID}-${value}`}
        disabled={disabled}
      >
        {isDelete ? (
          <FeatherIcon name="delete" size={24} color={disabled ? palette.muted : palette.text} />
        ) : isBiometric && showBiometric ? (
          <FeatherIcon name="smartphone" size={24} color={disabled ? palette.muted : palette.primary} />
        ) : isBiometric && !showBiometric ? null : (
          <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{value}</Text>
        )}
      </Pressable>
    )
  }

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showBiometric ? 'biometric' : '', '0', 'delete'],
  ]

  return (
    <View style={styles.container} testID={testID}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((value, colIndex) => renderButton(value, rowIndex * 3 + colIndex))}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonEmpty: {
    width: 72,
    height: 72,
  },
  buttonPressed: {
    backgroundColor: palette.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.title,
    fontSize: 28,
    color: palette.text,
  },
  buttonTextDisabled: {
    color: palette.muted,
  },
})

export default ESSIKeypad
