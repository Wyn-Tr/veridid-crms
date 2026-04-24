import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { View, TextInput, StyleSheet, Text, Pressable } from 'react-native'
import { palette, radius, spacing } from '../../theme/essi'

interface ESSICodeInputProps {
  length?: number
  onComplete: (code: string) => void
  secureTextEntry?: boolean
  testID?: string
  autoReset?: boolean
  useCustomKeypad?: boolean
}

export interface ESSICodeInputRef {
  reset: () => void
  focus: () => void
  addDigit: (digit: string) => void
  deleteDigit: () => void
  getCode: () => string
}

const ESSICodeInputComponent = (
  { length = 6, onComplete, secureTextEntry = true, testID, autoReset = false, useCustomKeypad = false }: ESSICodeInputProps,
  ref: React.ForwardedRef<ESSICodeInputRef>
) => {
  const [code, setCode] = useState('')
  const [shouldReset, setShouldReset] = useState(false)
  const inputRef = useRef<TextInput>(null)

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    if (newCode.length === length) {
      onComplete(newCode)
      if (autoReset) {
        setTimeout(() => {
          setCode('')
          setShouldReset(true)
        }, 300)
      }
    }
  }

  useImperativeHandle(ref, () => ({
    reset: () => {
      setCode('')
      if (!useCustomKeypad) {
        inputRef.current?.focus()
      }
    },
    focus: () => {
      inputRef.current?.focus()
    },
    addDigit: (digit: string) => {
      if (code.length < length) {
        const newCode = code + digit
        handleCodeChange(newCode)
      }
    },
    deleteDigit: () => {
      if (code.length > 0) {
        const newCode = code.slice(0, -1)
        setCode(newCode)
      }
    },
    getCode: () => code,
  }))

  useEffect(() => {
    if (shouldReset && code.length === 0) {
      setShouldReset(false)
    }
  }, [code, shouldReset])

  const handleChangeText = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '').slice(0, length)
    handleCodeChange(numericText)
  }

  const boxes = Array.from({ length }, (_, i) => {
    const filled = i < code.length
    const active = i === code.length

    return (
      <View key={i} style={[styles.box, filled && styles.boxFilled, active && styles.boxActive]}>
        {filled && !secureTextEntry && <Text style={styles.digit}>{code[i]}</Text>}
        {filled && secureTextEntry && <View style={styles.dot} />}
      </View>
    )
  })

  return (
    <View style={styles.container} testID={testID}>
      {!useCustomKeypad && (
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={length}
          style={styles.hiddenInput}
          autoFocus
          testID={`${testID}-input`}
        />
      )}
      <Pressable
        style={styles.boxes}
        onPress={() => !useCustomKeypad && inputRef.current?.focus()}
        testID={`${testID}-boxes`}
      >
        {boxes}
      </Pressable>
    </View>
  )
}

ESSICodeInputComponent.displayName = 'ESSICodeInput'

export const ESSICodeInput = forwardRef<ESSICodeInputRef, ESSICodeInputProps>(ESSICodeInputComponent)

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    // Match keypad horizontal padding so PIN boxes align with keypad width
    paddingHorizontal: spacing.lg,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  boxes: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
    width: '100%',
  },
  box: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },
  boxActive: {
    borderColor: palette.primary,
  },
  digit: {
    fontSize: 24,
    fontWeight: '600',
    color: palette.text,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.text,
  },
})
