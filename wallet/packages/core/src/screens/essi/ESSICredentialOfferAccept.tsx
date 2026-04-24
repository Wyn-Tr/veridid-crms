import { CredentialState } from '@credo-ts/core'
import { useCredentialById, useAgent } from '@credo-ts/react-hooks'
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
import { ensureCredentialMetadata } from '../../utils/credential'
import { palette, spacing, typography, radius } from '../../theme/essi'

enum DeliveryStatus {
  Pending,
  Completed,
  Declined,
}

export interface ESSICredentialOfferAcceptProps {
  visible: boolean
  credentialId: string
  confirmationOnly?: boolean
}

const ESSICredentialOfferAccept: React.FC<ESSICredentialOfferAcceptProps> = ({
  visible,
  credentialId,
  confirmationOnly,
}) => {
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [shouldShowDelayMessage, setShouldShowDelayMessage] = useState<boolean>(false)
  const [credentialDeliveryStatus, setCredentialDeliveryStatus] = useState<DeliveryStatus>(DeliveryStatus.Pending)
  const [timerDidFire, setTimerDidFire] = useState<boolean>(false)
  const [timer, setTimer] = useState<NodeJS.Timeout>()
  const credential = useCredentialById(credentialId)
  const navigation = useNavigation()
  const [{ connectionTimerDelay }, logger] = useServices([TOKENS.CONFIG, TOKENS.UTIL_LOGGER])
  const connTimerDelay = connectionTimerDelay ?? 10000 // in ms

  if (!credential && !confirmationOnly) {
    throw new Error('Unable to fetch credential from Credo')
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
        routes: [{ name: Stacks.TabStack, state: { routes: [{ name: TabStacks.CredentialStack }] } }],
      })
    )
  }, [getRootNavigator])

  useEffect(() => {
    if (!credential) {
      return
    }
    if (credential.state === CredentialState.CredentialReceived || credential.state === CredentialState.Done) {
      timer && clearTimeout(timer)
      setCredentialDeliveryStatus(DeliveryStatus.Completed)

      const restoreMetadata = async () => {
        if (agent) {
          try {
            await ensureCredentialMetadata(credential, agent, undefined, logger)
          } catch (error) {
            logger?.warn('Failed to restore credential metadata', { error: error as Error })
          }
        }
      }
      restoreMetadata()
    }
  }, [credential, timer, agent, logger])

  useEffect(() => {
    if (confirmationOnly) {
      timer && clearTimeout(timer)
      setCredentialDeliveryStatus(DeliveryStatus.Completed)
    }
  }, [confirmationOnly, timer])

  useEffect(() => {
    if (timerDidFire || credentialDeliveryStatus !== DeliveryStatus.Pending || !visible) {
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
  }, [timerDidFire, credentialDeliveryStatus, visible, connTimerDelay])

  useEffect(() => {
    if (shouldShowDelayMessage && credentialDeliveryStatus !== DeliveryStatus.Completed) {
      AccessibilityInfo.announceForAccessibility(t('Connection.TakingTooLong'))
    }
  }, [shouldShowDelayMessage, credentialDeliveryStatus, t])

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {credentialDeliveryStatus === DeliveryStatus.Completed ? (
              <FeatherIcon name="check-circle" size={80} color={palette.success} />
            ) : (
              <FeatherIcon name="loader" size={80} color={palette.primary} />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} testID={testIdWithKey('CredentialStatus')}>
            {credentialDeliveryStatus === DeliveryStatus.Pending
              ? t('CredentialOffer.CredentialOnTheWay')
              : t('CredentialOffer.CredentialAddedToYourWallet')}
          </Text>

          {/* Delay message */}
          {shouldShowDelayMessage && credentialDeliveryStatus === DeliveryStatus.Pending && (
            <Text style={styles.delayMessage} testID={testIdWithKey('TakingTooLong')}>
              {t('Connection.TakingTooLong')}
            </Text>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {credentialDeliveryStatus === DeliveryStatus.Pending && (
            <ESSIButton
              title={t('Loading.BackToHome')}
              onPress={onBackToHomeTouched}
              variant="secondary"
              testID={testIdWithKey('BackToHome')}
            />
          )}

          {credentialDeliveryStatus === DeliveryStatus.Completed && (
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

export default ESSICredentialOfferAccept
