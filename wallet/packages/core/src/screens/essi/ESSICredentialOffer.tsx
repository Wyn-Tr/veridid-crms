import { CredentialPreviewAttribute } from '@credo-ts/core'
import { useCredentialById, useConnectionById } from '@credo-ts/react-hooks'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, StyleSheet, View, Text, ScrollView, Alert } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { EventTypes } from '../../constants'
import { TOKENS, useServices } from '../../container-api'
import { useNetwork } from '../../contexts/network'
import { HistoryCardType, HistoryRecord } from '../../modules/history/types'
import { BifoldError } from '../../types/error'
import { Screens, TabStacks, Stacks } from '../../types/navigators'
import { useAppAgent } from '../../utils/agent'
import {
  isValidAnonCredsCredential,
  ensureCredentialMetadata,
  getEffectiveCredentialName,
} from '../../utils/credential'
import { useCredentialConnectionLabel } from '../../utils/helpers'
import { testIdWithKey } from '../../utils/testable'
import { palette, spacing, typography, radius } from '../../theme/essi'

interface CredentialAttribute {
  name: string
  value: string
}

type ESSICredentialOfferProps = {
  navigation: any
  credentialId: string
}

const ESSICredentialOffer: React.FC<ESSICredentialOfferProps> = ({ navigation, credentialId }) => {
  const { agent } = useAppAgent()
  const { t } = useTranslation()
  const { assertNetworkConnected } = useNetwork()
  const [
    logger,
    historyManagerCurried,
    historyEnabled,
    historyEventsLogger,
    CredentialOfferAccept,
  ] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.FN_LOAD_HISTORY,
    TOKENS.HISTORY_ENABLED,
    TOKENS.HISTORY_EVENTS_LOGGER,
    TOKENS.COMPONENT_CREDENTIAL_OFFER_ACCEPT,
  ])

  const [loading, setLoading] = useState<boolean>(true)
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [credentialName, setCredentialName] = useState<string>('')
  const [attributes, setAttributes] = useState<CredentialAttribute[]>([])
  const credential = useCredentialById(credentialId)
  const credentialConnectionLabel = useCredentialConnectionLabel(credential)
  const connection = useConnectionById(credential?.connectionId ?? '')
  const issuerName = connection?.theirLabel || connection?.alias || credentialConnectionLabel || t('Credentials.UnknownIssuer')

  useEffect(() => {
    if (!agent || !credential) {
      DeviceEventEmitter.emit(
        EventTypes.ERROR_ADDED,
        new BifoldError(t('Error.Title1035'), t('Error.Message1035'), t('CredentialOffer.CredentialNotFound'), 1035)
      )
    }
  }, [agent, credential, t])

  useEffect(() => {
    if (!(credential && isValidAnonCredsCredential(credential) && agent)) {
      return
    }

    const loadCredentialDetails = async () => {
      try {
        setLoading(true)
        const formatData = await agent.credentials.getFormatData(credential.id)
        const { offer, offerAttributes } = formatData
        const offerData = offer?.anoncreds ?? offer?.indy

        // Ensure metadata is cached
        if (offerData) {
          await ensureCredentialMetadata(
            credential,
            agent,
            {
              schema_id: offerData.schema_id,
              cred_def_id: offerData.cred_def_id,
            },
            logger
          )
        }

        // Update credential attributes
        if (offerAttributes) {
          credential.credentialAttributes = [...offerAttributes.map((item) => new CredentialPreviewAttribute(item))]
        }

        // Get credential name
        const name = getEffectiveCredentialName(credential) || t('Credentials.UnknownCredential')
        setCredentialName(name)

        // Get attributes
        let attrs: CredentialAttribute[] = []
        if (offerAttributes && offerAttributes.length > 0) {
          attrs = offerAttributes
            .filter((attr: any) => attr.value && attr.value.trim() !== '')
            .map((attr: any) => ({ name: attr.name, value: attr.value }))
        }
        setAttributes(attrs)
        setLoading(false)
      } catch (error) {
        logger?.warn('Failed to load credential details', { error })
        setLoading(false)
      }
    }

    loadCredentialDetails()
  }, [credential, agent, logger, t])

  const logHistoryRecord = useCallback(
    async (type: HistoryCardType) => {
      try {
        if (!(agent && historyEnabled)) {
          return
        }
        const historyManager = historyManagerCurried(agent)

        if (!credential) {
          return
        }

        const recordData: HistoryRecord = {
          type: type,
          message: credentialName,
          createdAt: credential?.createdAt,
          correspondenceId: credentialId,
          correspondenceName: credentialConnectionLabel,
        }
        historyManager.saveHistory(recordData)
      } catch (err: unknown) {
        logger?.error(`Error saving history: ${err}`)
      }
    },
    [agent, historyEnabled, logger, historyManagerCurried, credential, credentialId, credentialConnectionLabel, credentialName]
  )

  const handleAcceptTouched = useCallback(async () => {
    try {
      if (!(agent && credential && assertNetworkConnected())) {
        return
      }

      setButtonsVisible(false)
      setAcceptModalVisible(true)

      await agent.credentials.acceptOffer({ credentialRecordId: credential.id })
      if (historyEventsLogger.logAttestationAccepted) {
        await logHistoryRecord(HistoryCardType.CardAccepted)
      }
    } catch (err: unknown) {
      setButtonsVisible(true)
      setAcceptModalVisible(false)
      const error = new BifoldError(t('Error.Title1024'), t('Error.Message1024'), (err as Error)?.message ?? err, 1024)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }, [agent, credential, assertNetworkConnected, logHistoryRecord, t, historyEventsLogger.logAttestationAccepted])

  const handleDeclineTouched = useCallback(async () => {
    Alert.alert(
      t('CredentialOffer.DeclineTitle'),
      t('CredentialOffer.DeclineConfirmation'),
      [
        {
          text: t('Global.Cancel'),
          style: 'cancel',
        },
        {
          text: t('Global.Decline'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (agent && credential) {
                const connectionId = credential.connectionId ?? ''
                const conn = await agent.connections.findById(connectionId)

                await agent.credentials.declineOffer(credential.id)

                if (conn) {
                  await agent.credentials.sendProblemReport({
                    credentialRecordId: credential.id,
                    description: t('CredentialOffer.Declined'),
                  })
                }
              }

              if (historyEventsLogger.logAttestationRefused) {
                await logHistoryRecord(HistoryCardType.CardDeclined)
              }

              navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home })
            } catch (err: unknown) {
              const error = new BifoldError(t('Error.Title1025'), t('Error.Message1025'), (err as Error)?.message ?? err, 1025)
              DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }, [agent, credential, t, navigation, logHistoryRecord, historyEventsLogger.logAttestationRefused])

  return (
    <>
      <ESSIScreen
        headerTitle={t('Screens.CredentialOffer')}
        headerLeft="back"
        onHeaderLeftPress={() => navigation.goBack()}
        safeAreaEdges={['top', 'left', 'right', 'bottom']}
        testID={testIdWithKey('CredentialOffer')}
        scrollable={false}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Issuer Info */}
          <View style={styles.issuerSection}>
            <View style={styles.issuerAvatar}>
              <FeatherIcon name="user" size={32} color={palette.text} />
            </View>
            <Text style={styles.issuerName}>{issuerName}</Text>
            <Text style={styles.offerText}>{t('CredentialOffer.IsOfferingYouACredential')}</Text>
          </View>

          {/* Credential Card */}
          <View style={styles.credentialCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <FeatherIcon name="credit-card" size={24} color={palette.text} />
              </View>
              <View style={styles.cardBadge}>
                <FeatherIcon name="gift" size={12} color={palette.primary} />
                <Text style={styles.cardBadgeText}>{t('CredentialOffer.NewCredential')}</Text>
              </View>
            </View>
            <Text style={styles.credentialName} numberOfLines={2}>
              {loading ? t('Global.Loading') : credentialName}
            </Text>
            <Text style={styles.credentialIssuer}>{issuerName}</Text>
          </View>

          {/* Attributes Section */}
          {!loading && attributes.length > 0 && (
            <View style={styles.attributesSection}>
              <Text style={styles.sectionTitle}>{t('CredentialOffer.CredentialData')}</Text>
              <View style={styles.attributesContainer}>
                {attributes.map((attr, index) => (
                  <View
                    key={`${attr.name}-${index}`}
                    style={[
                      styles.attributeRow,
                      index === attributes.length - 1 && styles.attributeRowLast,
                    ]}
                  >
                    <Text style={styles.attributeLabel} numberOfLines={1}>{attr.name}</Text>
                    <Text style={styles.attributeValue} numberOfLines={2}>{attr.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Loading indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <FeatherIcon name="loader" size={24} color={palette.muted} />
              <Text style={styles.loadingText}>{t('Global.Loading')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <ESSIButton
            title={t('Global.Accept')}
            onPress={handleAcceptTouched}
            variant="primary"
            disabled={!buttonsVisible || loading}
            testID={testIdWithKey('AcceptCredentialOffer')}
          />
          <View style={styles.buttonSpacer} />
          <ESSIButton
            title={t('Global.Decline')}
            onPress={handleDeclineTouched}
            variant="danger"
            disabled={!buttonsVisible || loading}
            testID={testIdWithKey('DeclineCredentialOffer')}
          />
        </View>
      </ESSIScreen>

      <CredentialOfferAccept visible={acceptModalVisible} credentialId={credentialId} />
    </>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  issuerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  issuerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  issuerName: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  offerText: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  credentialCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: palette.primary + '20',
    borderRadius: radius.pill,
  },
  cardBadgeText: {
    ...typography.caption,
    color: palette.primary,
    fontWeight: '600',
  },
  credentialName: {
    ...typography.headline,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  credentialIssuer: {
    ...typography.body,
    color: palette.muted,
  },
  attributesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.overline,
    color: palette.muted,
    marginBottom: spacing.md,
  },
  attributesContainer: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: 'hidden',
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  attributeRowLast: {
    borderBottomWidth: 0,
  },
  attributeLabel: {
    ...typography.bodyBold,
    color: palette.text,
    flex: 1,
  },
  attributeValue: {
    ...typography.body,
    color: palette.muted,
    flex: 1,
    textAlign: 'right',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
  },
  buttonContainer: {
    paddingTop: spacing.md,
  },
  buttonSpacer: {
    height: spacing.sm,
  },
})

export default ESSICredentialOffer
