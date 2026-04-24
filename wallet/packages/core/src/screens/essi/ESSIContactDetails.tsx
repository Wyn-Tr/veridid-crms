import { CredentialState } from '@credo-ts/core'
import { useAgent, useConnectionById, useCredentialByState } from '@credo-ts/react-hooks'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, Pressable, ScrollView, DeviceEventEmitter } from 'react-native'
import Toast from 'react-native-toast-message'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen } from '../../components/essi'
import CommonRemoveModal from '../../components/modals/CommonRemoveModal'
import { ToastType } from '../../components/toast/BaseToast'
import { EventTypes } from '../../constants'
import { useStore } from '../../contexts/store'
import { TOKENS, useServices } from '../../container-api'
import { BifoldError } from '../../types/error'
import { ContactStackParams, Screens, TabStacks } from '../../types/navigators'
import { ModalUsage } from '../../types/remove'
import { formatTime, getConnectionName } from '../../utils/helpers'
import { testIdWithKey } from '../../utils/testable'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { HistoryCardType, HistoryRecord } from '../../modules/history/types'

type ESSIContactDetailsProps = StackScreenProps<ContactStackParams, Screens.ContactDetails>

const ESSIContactDetails: React.FC<ESSIContactDetailsProps> = ({ route }) => {
  if (!route?.params) {
    throw new Error('ContactDetails route params were not set properly')
  }

  const { connectionId } = route.params
  const { agent } = useAgent()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<ContactStackParams>>()
  const [store] = useStore()
  const connection = useConnectionById(connectionId)

  const connectionCredentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ].filter((credential) => credential.connectionId === connection?.id)

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState<boolean>(false)
  const [isCredentialsRemoveModalDisplayed, setIsCredentialsRemoveModalDisplayed] = useState<boolean>(false)

  const [logger, historyManagerCurried, historyEnabled, historyEventsLogger] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.FN_LOAD_HISTORY,
    TOKENS.HISTORY_ENABLED,
    TOKENS.HISTORY_EVENTS_LOGGER,
  ])

  const contactLabel = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  const logHistoryRecord = useCallback(() => {
    try {
      if (!(agent && historyEnabled)) {
        return
      }
      const historyManager = historyManagerCurried(agent)

      if (!connection) {
        return
      }

      const type = HistoryCardType.ConnectionRemoved
      const recordData: HistoryRecord = {
        type: type,
        message: type,
        createdAt: new Date(),
        correspondenceId: connection.id,
        correspondenceName: connection.theirLabel,
      }
      historyManager.saveHistory(recordData)
    } catch (err: unknown) {
      logger.error(`[ESSIContactDetails]:[logHistoryRecord] Error saving history: ${err}`)
    }
  }, [agent, historyEnabled, logger, historyManagerCurried, connection])

  const handleRemoveContact = useCallback(() => {
    if (connectionCredentials?.length) {
      setIsCredentialsRemoveModalDisplayed(true)
    } else {
      setIsRemoveModalDisplayed(true)
    }
  }, [connectionCredentials])

  const handleConfirmRemove = useCallback(async () => {
    try {
      if (!(agent && connection)) {
        return
      }

      if (historyEventsLogger.logConnectionRemoved) {
        logHistoryRecord()
      }

      const basicMessages = await agent.basicMessages.findAllByQuery({ connectionId: connection.id })
      const proofs = await agent.proofs.findAllByQuery({ connectionId: connection.id })
      const offers = await agent.credentials.findAllByQuery({
        connectionId: connection.id,
        state: CredentialState.OfferReceived,
      })

      await Promise.allSettled([
        ...proofs.map((proof) => agent.proofs.deleteById(proof.id)),
        ...offers.map((offer) => agent.credentials.deleteById(offer.id)),
        ...basicMessages.map((msg) => agent.basicMessages.deleteById(msg.id)),
        agent.connections.deleteById(connection.id),
      ])

      navigation.popToTop()

      await new Promise((resolve) => setTimeout(resolve, 500))

      Toast.show({
        type: ToastType.Success,
        text1: t('ContactDetails.ContactRemoved'),
      })
    } catch (err: unknown) {
      const error = new BifoldError(
        t('Error.Title1037'),
        t('Error.Message1037'),
        (err as Error)?.message ?? err,
        1037
      )
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }, [agent, connection, navigation, t, historyEventsLogger.logConnectionRemoved, logHistoryRecord])

  const handleCancelRemove = useCallback(() => {
    setIsRemoveModalDisplayed(false)
  }, [])

  const handleGoToCredentials = useCallback(() => {
    setIsCredentialsRemoveModalDisplayed(false)
    navigation.getParent()?.navigate(TabStacks.CredentialStack, { screen: Screens.Credentials })
  }, [navigation])

  const handleCancelCredentialsRemove = useCallback(() => {
    setIsCredentialsRemoveModalDisplayed(false)
  }, [])

  const handleGoToChat = useCallback(() => {
    navigation.navigate(Screens.Chat, { connectionId })
  }, [navigation, connectionId])

  return (
    <ESSIScreen
      headerTitle={t('Screens.ContactDetails')}
      headerLeft={
        <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <FeatherIcon name="arrow-left" size={24} color={palette.text} />
        </Pressable>
      }
      testID={testIdWithKey('ContactDetails')}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Contact Avatar and Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{contactLabel.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.contactName}>{contactLabel}</Text>
          {connection?.createdAt && (
            <Text style={styles.connectedDate}>
              {t('ContactDetails.DateOfConnection', {
                date: formatTime(connection.createdAt, { includeHour: true }),
              })}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Pressable style={styles.actionItem} onPress={handleGoToChat} testID={testIdWithKey('GoToChat')}>
            <View style={styles.actionIconContainer}>
              <FeatherIcon name="message-circle" size={20} color={palette.primary} />
            </View>
            <Text style={styles.actionText}>{t('Screens.Chat')}</Text>
            <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
          </Pressable>

          {connectionCredentials.length > 0 && (
            <View style={styles.credentialsInfo}>
              <FeatherIcon name="credit-card" size={16} color={palette.muted} />
              <Text style={styles.credentialsText}>
                {t('ContactDetails.Credentials')}: {connectionCredentials.length}
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.actionItem, styles.dangerAction]}
            onPress={handleRemoveContact}
            testID={testIdWithKey('RemoveContact')}
          >
            <View style={[styles.actionIconContainer, styles.dangerIconContainer]}>
              <FeatherIcon name="trash-2" size={20} color={palette.danger} />
            </View>
            <Text style={[styles.actionText, styles.dangerText]}>{t('ContactDetails.RemoveContact')}</Text>
            <FeatherIcon name="chevron-right" size={20} color={palette.danger} />
          </Pressable>
        </View>

        {/* Connection Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Connection Info</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {connectionId}
            </Text>
          </View>
          {connection?.state && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('ContactDetails.ConnectionState') || 'State'}</Text>
              <Text style={styles.infoValue}>{connection.state}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <CommonRemoveModal
        usage={ModalUsage.ContactRemove}
        visible={isRemoveModalDisplayed}
        onSubmit={handleConfirmRemove}
        onCancel={handleCancelRemove}
      />
      <CommonRemoveModal
        usage={ModalUsage.ContactRemoveWithCredentials}
        visible={isCredentialsRemoveModalDisplayed}
        onSubmit={handleGoToCredentials}
        onCancel={handleCancelCredentialsRemove}
      />
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: palette.text,
    fontSize: 32,
  },
  contactName: {
    ...typography.h2,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  connectedDate: {
    ...typography.caption,
    color: palette.muted,
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
  dangerAction: {
    marginTop: spacing.md,
  },
  dangerIconContainer: {
    backgroundColor: `${palette.danger}20`,
  },
  dangerText: {
    color: palette.danger,
  },
  credentialsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  credentialsText: {
    ...typography.caption,
    color: palette.muted,
  },
  infoSection: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  infoLabel: {
    ...typography.caption,
    color: palette.muted,
  },
  infoValue: {
    ...typography.body,
    color: palette.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
})

export default ESSIContactDetails
