import { ProofState } from '@credo-ts/core'
import { useProofById } from '@credo-ts/react-hooks'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, StyleSheet, View, Text, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIButton } from '../../components/essi'
import { Stacks, TabStacks } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'
import { TOKENS, useServices } from '../../container-api'
import { palette, spacing, typography } from '../../theme/essi'

enum DeliveryStatus {
  Pending,
  Completed,
  Failed,
}

export interface ESSIProofRequestAcceptProps {
  visible: boolean
  proofId: string
  confirmationOnly?: boolean
}

const ESSIProofRequestAccept: React.FC<ESSIProofRequestAcceptProps> = ({
  visible,
  proofId,
  confirmationOnly,
}) => {
  const { t } = useTranslation()
  const [shouldShowDelayMessage, setShouldShowDelayMessage] = useState<boolean>(false)
  const [proofDeliveryStatus, setProofDeliveryStatus] = useState<DeliveryStatus>(DeliveryStatus.Pending)
  const [timerDidFire, setTimerDidFire] = useState<boolean>(false)
  const [timer, setTimer] = useState<NodeJS.Timeout>()
  const proof = useProofById(proofId)
  const navigation = useNavigation()
  const [{ connectionTimerDelay }] = useServices([TOKENS.CONFIG])
  const connTimerDelay = connectionTimerDelay ?? 10000 // in ms

  if (!proof && !confirmationOnly) {
    throw new Error('Unable to fetch proof from Credo')
  }

  // Get root navigator by traversing up the parent chain
  const getRootNavigator = useCallback(() => {
    let nav = navigation
    while (nav.getParent()) {
      nav = nav.getParent()!
    }
    return nav
  }, [navigation])

  const onBackToHomeTouched = useCallback(() => {
    const rootNav = getRootNavigator()
    rootNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Stacks.TabStack, state: { routes: [{ name: TabStacks.HomeStack }] } }],
      })
    )
  }, [getRootNavigator])

  const onDoneTouched = useCallback(() => {
    const rootNav = getRootNavigator()
    rootNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: Stacks.TabStack, state: { routes: [{ name: TabStacks.HomeStack }] } }],
      })
    )
  }, [getRootNavigator])

  useEffect(() => {
    if (confirmationOnly) {
      timer && clearTimeout(timer)
      setProofDeliveryStatus(DeliveryStatus.Completed)
      return
    }

    if (!proof) {
      return
    }

    if (proof.state === ProofState.PresentationSent || proof.state === ProofState.Done) {
      timer && clearTimeout(timer)
      setProofDeliveryStatus(DeliveryStatus.Completed)
    } else if (proof.state === ProofState.Abandoned) {
      timer && clearTimeout(timer)
      setProofDeliveryStatus(DeliveryStatus.Failed)
    }
  }, [proof, confirmationOnly, timer])

  useEffect(() => {
    if (timerDidFire || proofDeliveryStatus !== DeliveryStatus.Pending || !visible) {
      return
    }

    const newTimer = setTimeout(() => {
      setShouldShowDelayMessage(true)
      setTimerDidFire(true)
    }, connTimerDelay)

    setTimer(newTimer)

    return () => {
      newTimer && clearTimeout(newTimer)
    }
  }, [timerDidFire, proofDeliveryStatus, visible, connTimerDelay])

  useEffect(() => {
    if (shouldShowDelayMessage && proofDeliveryStatus === DeliveryStatus.Pending) {
      AccessibilityInfo.announceForAccessibility(t('Connection.TakingTooLong'))
    }
  }, [shouldShowDelayMessage, proofDeliveryStatus, t])

  const getIcon = () => {
    switch (proofDeliveryStatus) {
      case DeliveryStatus.Completed:
        return <FeatherIcon name="check-circle" size={80} color={palette.success} />
      case DeliveryStatus.Failed:
        return <FeatherIcon name="x-circle" size={80} color={palette.danger} />
      default:
        return <FeatherIcon name="loader" size={80} color={palette.primary} />
    }
  }

  const getTitle = () => {
    switch (proofDeliveryStatus) {
      case DeliveryStatus.Completed:
        return t('ProofRequest.InformationSentSuccessfully')
      case DeliveryStatus.Failed:
        return t('ProofRequest.ProofRequestDeclined')
      default:
        return t('ProofRequest.SendingTheInformationSecurely')
    }
  }

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>

          {/* Title */}
          <Text style={styles.title} testID={testIdWithKey('ProofStatus')}>
            {getTitle()}
          </Text>

          {/* Delay message */}
          {shouldShowDelayMessage && proofDeliveryStatus === DeliveryStatus.Pending && (
            <Text style={styles.delayMessage} testID={testIdWithKey('TakingTooLong')}>
              {t('Connection.TakingTooLong')}
            </Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {proofDeliveryStatus === DeliveryStatus.Pending && (
            <ESSIButton
              title={t('Loading.BackToHome')}
              onPress={onBackToHomeTouched}
              variant="secondary"
              testID={testIdWithKey('BackToHome')}
            />
          )}

          {(proofDeliveryStatus === DeliveryStatus.Completed || proofDeliveryStatus === DeliveryStatus.Failed) && (
            <ESSIButton
              title={t('Global.Done')}
              onPress={onDoneTouched}
              variant="primary"
              testID={testIdWithKey('Done')}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.gutter,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  delayMessage: {
    ...typography.body,
    color: palette.warning,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  buttonContainer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xl,
  },
})

export default ESSIProofRequestAccept
