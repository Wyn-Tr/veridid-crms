import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'

import { ESSIScreen, ESSICodeInput, ESSIProgressDots, ESSIKeypad } from '../../components/essi'
import { ESSICodeInputRef } from '../../components/essi/ESSICodeInput'
import { palette, spacing, typography } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { useAuth } from '../../contexts/auth'
import { useStore } from '../../contexts/store'
import { DispatchAction } from '../../contexts/reducers/store'

enum PINStep {
  CREATE = 0,
  CONFIRM = 1,
}

interface ESSIPINCreateProps {
  setAuthenticated: (status: boolean) => void
}

const ESSIPINCreate: React.FC<ESSIPINCreateProps> = ({ setAuthenticated }) => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const [, dispatch] = useStore()
  const { setPIN: setWalletPIN } = useAuth()

  const [step, setStep] = useState<PINStep>(PINStep.CREATE)
  const [initialPIN, setInitialPIN] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [confirmPIN, setConfirmPIN] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const codeInputRef = useRef<ESSICodeInputRef>(null)

  const handleInitialPINComplete = (pin: string) => {
    setInitialPIN(pin)
    // Small delay before moving to confirm step for better UX
    setTimeout(() => {
      setStep(PINStep.CONFIRM)
    }, 300)
  }

  const handleConfirmPINComplete = async (pin: string) => {
    setConfirmPIN(pin)

    if (pin !== initialPIN) {
      Alert.alert(t('PIN.Error'), t('PIN.PINsDoNotMatch'), [
        {
          text: t('Global.OK'),
          onPress: () => {
            setStep(PINStep.CREATE)
            setInitialPIN('')
            setConfirmPIN('')
          },
        },
      ])
      return
    }

    setIsProcessing(true)

    try {
      // Store PIN securely
      await setWalletPIN(pin)

      // Dispatch DID_CREATE_PIN to mark PIN creation as complete in onboarding
      // This MUST happen BEFORE setAuthenticated to ensure state is saved before navigation
      dispatch({
        type: DispatchAction.DID_CREATE_PIN,
      })

      // Small delay to ensure state is persisted
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Call setAuthenticated to mark as authenticated
      setAuthenticated(true)
    } catch (error) {
      Alert.alert(t('PIN.Error'), t('PIN.FailedToCreatePIN'))
      setAuthenticated(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBack = () => {
    if (step === PINStep.CONFIRM) {
      setStep(PINStep.CREATE)
      setConfirmPIN('')
    } else {
      navigation.goBack()
    }
  }

  const handleDigitPress = (digit: string) => {
    codeInputRef.current?.addDigit(digit)
  }

  const handleDeletePress = () => {
    codeInputRef.current?.deleteDigit()
  }

  return (
    <ESSIScreen
      headerTitle={t('PIN.CreatePIN')}
      headerLeft="back"
      onHeaderLeftPress={handleBack}
      scrollable={false}
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      testID={testIdWithKey('PINCreate')}
    >
      <View style={styles.container}>
        <ESSIProgressDots total={2} current={step} testID={testIdWithKey('PINProgress')} />

        <View style={styles.content}>
          <Text style={styles.title}>{step === PINStep.CREATE ? t('PIN.CreateYourPIN') : t('PIN.ConfirmYourPIN')}</Text>
          <Text style={styles.subtitle}>
            {step === PINStep.CREATE ? t('PIN.EnterSixDigitPIN') : t('PIN.ReenterPINToConfirm')}
          </Text>

          <ESSICodeInput
            ref={codeInputRef}
            key={step}
            length={6}
            onComplete={step === PINStep.CREATE ? handleInitialPINComplete : handleConfirmPINComplete}
            secureTextEntry={true}
            autoReset={true}
            useCustomKeypad={true}
            testID={testIdWithKey('PINInput')}
          />
        </View>

        <View style={styles.keypadContainer}>
          <ESSIKeypad
            onDigitPress={handleDigitPress}
            onDeletePress={handleDeletePress}
            disabled={isProcessing}
            testID={testIdWithKey('PINKeypad')}
          />
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
    paddingTop: spacing.lg,
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
  keypadContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
})

export default ESSIPINCreate
