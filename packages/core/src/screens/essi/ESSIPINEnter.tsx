import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import { ESSIScreen, ESSICodeInput, ESSIKeypad } from '../../components/essi'
import { ESSICodeInputRef } from '../../components/essi/ESSICodeInput'
import { palette, spacing, typography } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { useAuth } from '../../contexts/auth'

interface ESSIPINEnterProps {
  setAuthenticated: (status: boolean) => void
}

const ESSIPINEnter: React.FC<ESSIPINEnterProps> = ({ setAuthenticated }) => {
  const { t } = useTranslation()
  const { checkWalletPIN } = useAuth()

  const [attempts, setAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const codeInputRef = useRef<ESSICodeInputRef>(null)

  const handlePINComplete = async (pin: string) => {
    try {
      // Verify PIN with auth system
      const isValid = await checkWalletPIN(pin)

      if (isValid) {
        // Mark as authenticated
        setAuthenticated(true)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= 3) {
          setIsLocked(true)
          Alert.alert(t('PIN.TooManyAttempts'), t('PIN.AccountLocked'), [
            {
              text: t('Global.OK'),
            },
          ])
        } else {
          Alert.alert(t('PIN.IncorrectPIN'), t('PIN.AttemptsRemaining', { count: 3 - newAttempts }))
        }
        setAuthenticated(false)
      }
    } catch (error) {
      Alert.alert(t('PIN.Error'), t('PIN.FailedToVerifyPIN'))
      setAuthenticated(false)
    }
  }

  const handleBiometricPress = async () => {
    // Trigger biometric authentication
    // const result = await authenticateWithBiometrics()
    // if (result.success) {
    //   navigation.navigate('Home')
    // }
  }

  const handleForgotPIN = () => {
    Alert.alert(t('PIN.ForgotPIN'), t('PIN.ForgotPINMessage'), [
      {
        text: t('Global.Cancel'),
        style: 'cancel',
      },
      {
        text: t('PIN.ResetWallet'),
        style: 'destructive',
        onPress: () => {
          // Handle wallet reset
        },
      },
    ])
  }

  const handleDigitPress = (digit: string) => {
    codeInputRef.current?.addDigit(digit)
  }

  const handleDeletePress = () => {
    codeInputRef.current?.deleteDigit()
  }

  return (
    <ESSIScreen headerTitle={t('PIN.EnterPIN')} scrollable={false} safeAreaEdges={['top', 'left', 'right', 'bottom']} testID={testIdWithKey('PINEnter')}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('PIN.WelcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('PIN.EnterPINToContinue')}</Text>

          <ESSICodeInput
            ref={codeInputRef}
            length={6}
            onComplete={handlePINComplete}
            secureTextEntry={true}
            autoReset={true}
            useCustomKeypad={true}
            testID={testIdWithKey('PINInput')}
          />

          {attempts > 0 && !isLocked && (
            <Text style={styles.errorText}>
              {t('PIN.IncorrectPIN')} ({3 - attempts} {t('PIN.AttemptsLeft')})
            </Text>
          )}

          {isLocked && <Text style={styles.lockedText}>{t('PIN.AccountLocked')}</Text>}
        </View>

        <View style={styles.keypadContainer}>
          <ESSIKeypad
            onDigitPress={handleDigitPress}
            onDeletePress={handleDeletePress}
            onBiometricPress={handleBiometricPress}
            showBiometric={true}
            disabled={isLocked}
            testID={testIdWithKey('PINKeypad')}
          />
        </View>

        <View style={styles.footer}>
          <Pressable onPress={handleForgotPIN} style={styles.forgotButton} testID={testIdWithKey('ForgotPINButton')}>
            <Text style={styles.forgotText}>{t('PIN.ForgotPIN')}</Text>
          </Pressable>
        </View>
      </View>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  lockedText: {
    ...typography.bodyBold,
    color: palette.danger,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  forgotButton: {
    padding: spacing.sm,
  },
  forgotText: {
    ...typography.body,
    color: palette.muted,
    textDecorationLine: 'underline',
  },
})

export default ESSIPINEnter
