import { useRef } from 'react'
import { CredentialState } from '@credo-ts/core'
import { useCredentialById, useAgent } from '@credo-ts/react-hooks'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button, { ButtonType } from '../components/buttons/Button'
import SafeAreaModal from '../components/modals/SafeAreaModal'
import { useAnimatedComponents } from '../contexts/animated-components'
import { useTheme } from '../contexts/theme'
import { Screens, Stacks, TabStacks } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'
import { TOKENS, useServices } from '../container-api'
import { ThemedText } from '../components/texts/ThemedText'
import { ensureCredentialMetadata } from '../utils/credential'

enum DeliveryStatus {
  Pending,
  Completed,
  Declined,
}

export interface CredentialOfferAcceptProps {
  visible: boolean
  credentialId: string
  confirmationOnly?: boolean
}

const CredentialOfferAccept: React.FC<CredentialOfferAcceptProps> = ({ visible, credentialId, confirmationOnly }) => {
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [shouldShowDelayMessage, setShouldShowDelayMessage] = useState<boolean>(false)
  const [credentialDeliveryStatus, setCredentialDeliveryStatus] = useState<DeliveryStatus>(DeliveryStatus.Pending)
  const [timerDidFire, setTimerDidFire] = useState<boolean>(false)
  const [timer, setTimer] = useState<NodeJS.Timeout>()
  const credential = useCredentialById(credentialId)
  const navigation = useNavigation()
  const { ListItems } = useTheme()
  const { CredentialAdded, CredentialPending } = useAnimatedComponents()
  const [{ connectionTimerDelay }, logger] = useServices([TOKENS.CONFIG, TOKENS.UTIL_LOGGER])
  const connTimerDelay = connectionTimerDelay ?? 10000 // in ms
  const autoNavTimer = useRef<NodeJS.Timeout | null>(null)
  const styles = StyleSheet.create({
    container: {
      ...ListItems.credentialOfferBackground,
      height: '100%',
      padding: 20,
    },
    image: {
      marginTop: 20,
    },
    messageContainer: {
      alignItems: 'center',
    },
    messageText: {
      textAlign: 'center',
      marginTop: 30,
    },
    controlsContainer: {
      marginTop: 'auto',
      margin: 20,
    },
    delayMessageText: {
      textAlign: 'center',
      marginTop: 20,
    },
  })

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
        routes: [
          {
            name: Stacks.TabStack,
            state: { routes: [{ name: TabStacks.HomeStack }] },
          },
        ],
      })
    )
  }, [getRootNavigator])

  const goToCredentials = useCallback(() => {
    const rootNav = getRootNavigator()
    rootNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: Stacks.TabStack,
            state: { routes: [{ name: TabStacks.CredentialStack }] },
          },
        ],
      })
    )
  }, [getRootNavigator])

  const onDoneTouched = useCallback(() => {
    if (autoNavTimer.current) clearTimeout(autoNavTimer.current)
    goToCredentials()
  }, [goToCredentials])

  useEffect(() => {
    if (credentialDeliveryStatus !== DeliveryStatus.Completed) return

    autoNavTimer.current = setTimeout(() => {
      goToCredentials()
    }, 10000)

    return () => {
      if (autoNavTimer.current) clearTimeout(autoNavTimer.current)
    }
  }, [credentialDeliveryStatus, goToCredentials])

  useEffect(() => {
    if (!credential) {
      return
    }
    const run = async () => {
      if (credential.state === CredentialState.Done) {
        const all = await agent.credentials.getAll()

        if (all.length === 0) {
          throw new Error('❌ Agent has ZERO credentials after Done state')
        }

        if (!all.find((c) => c.id === credential.id)) {
          throw new Error('❌ Credential not found in agent storage')
        }

        if (timer) {
          clearTimeout(timer)
        }

        setCredentialDeliveryStatus(DeliveryStatus.Completed)

        if (agent) {
          try {
            await ensureCredentialMetadata(credential, agent, undefined, logger)
          } catch (error) {
            logger?.warn('Failed to restore credential metadata', {
              error: error as Error,
            })
          }
        }
      }
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

    const timer = setTimeout(() => {
      setShouldShowDelayMessage(true)
      setTimerDidFire(true)
    }, connTimerDelay)

    setTimer(timer)

    return () => {
      timer && clearTimeout(timer)
    }
  }, [timerDidFire, credentialDeliveryStatus, visible, connTimerDelay])

  useEffect(() => {
    if (shouldShowDelayMessage && credentialDeliveryStatus !== DeliveryStatus.Completed) {
      AccessibilityInfo.announceForAccessibility(t('Connection.TakingTooLong'))
    }
  }, [shouldShowDelayMessage, credentialDeliveryStatus, t])

  return (
    <SafeAreaModal visible={visible} transparent={true} animationType={'none'}>
      <SafeAreaView style={{ ...ListItems.credentialOfferBackground }}>
        <ScrollView style={styles.container}>
          <View style={styles.messageContainer}>
            {credentialDeliveryStatus === DeliveryStatus.Pending && (
              <ThemedText
                style={[ListItems.credentialOfferTitle, styles.messageText]}
                testID={testIdWithKey('CredentialOnTheWay')}
              >
                {t('CredentialOffer.CredentialOnTheWay')}
              </ThemedText>
            )}

            {credentialDeliveryStatus === DeliveryStatus.Completed && (
              <ThemedText
                style={[ListItems.credentialOfferTitle, styles.messageText]}
                testID={testIdWithKey('CredentialAddedToYourWallet')}
              >
                {t('CredentialOffer.CredentialAddedToYourWallet')}
              </ThemedText>
            )}
          </View>

          <View style={[styles.image, { minHeight: 250, alignItems: 'center', justifyContent: 'flex-end' }]}>
            {credentialDeliveryStatus === DeliveryStatus.Completed && <CredentialAdded />}
            {credentialDeliveryStatus === DeliveryStatus.Pending && <CredentialPending />}
          </View>

          {shouldShowDelayMessage && credentialDeliveryStatus === DeliveryStatus.Pending && (
            <ThemedText
              style={[ListItems.credentialOfferDetails, styles.delayMessageText]}
              testID={testIdWithKey('TakingTooLong')}
            >
              {t('Connection.TakingTooLong')}
            </ThemedText>
          )}
        </ScrollView>

        <View style={styles.controlsContainer}>
          {credentialDeliveryStatus === DeliveryStatus.Pending && (
            <View>
              <Button
                title={t('Loading.BackToHome')}
                accessibilityLabel={t('Loading.BackToHome')}
                testID={testIdWithKey('BackToHome')}
                onPress={onBackToHomeTouched}
                buttonType={ButtonType.ModalSecondary}
              />
            </View>
          )}

          {credentialDeliveryStatus === DeliveryStatus.Completed && (
            <View>
              <Button
                title={t('Global.Done')}
                accessibilityLabel={t('Global.Done')}
                testID={testIdWithKey('Done')}
                onPress={onDoneTouched}
                buttonType={ButtonType.ModalPrimary}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaModal>
  )
}

export default CredentialOfferAccept
