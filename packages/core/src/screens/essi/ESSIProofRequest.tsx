import {
  AnonCredsCredentialsForProofRequest,
  AnonCredsRequestedAttributeMatch,
  AnonCredsRequestedPredicateMatch,
} from '@credo-ts/anoncreds'
import {
  CredentialExchangeRecord,
  CredentialRecordBinding,
  DifPexInputDescriptorToCredentials,
  ProofState,
} from '@credo-ts/core'
import { useConnectionById, useProofById } from '@credo-ts/react-hooks'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, StyleSheet, View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { EventTypes } from '../../constants'
import { TOKENS, useServices } from '../../container-api'
import { useNetwork } from '../../contexts/network'
import { useStore } from '../../contexts/store'
import { useOutOfBandByConnectionId } from '../../hooks/connections'
import { useAllCredentialsForProof } from '../../hooks/proofs'
import { HistoryCardType, HistoryRecord } from '../../modules/history/types'
import { BifoldError } from '../../types/error'
import { Screens, Stacks, TabStacks } from '../../types/navigators'
import { ProofCredentialItems } from '../../types/proof-items'
import { useAppAgent } from '../../utils/agent'
import { DescriptorMetadata } from '../../utils/anonCredsProofRequestMapper'
import { getConnectionName, getCredentialDefinitionIdForRecord, getCredentialSchemaIdForRecord } from '../../utils/helpers'
import { testIdWithKey } from '../../utils/testable'
import { palette, spacing, typography, radius } from '../../theme/essi'
import ESSIProofRequestAccept from './ESSIProofRequestAccept'

type ESSIProofRequestProps = {
  navigation: any
  proofId: string
}

const ESSIProofRequest: React.FC<ESSIProofRequestProps> = ({ navigation, proofId }) => {
  const { agent } = useAppAgent()
  const { t } = useTranslation()
  const { assertNetworkConnected } = useNetwork()
  const proof = useProofById(proofId)
  const connection = useConnectionById(proof?.connectionId ?? '')
  const [store] = useStore()
  const [pendingModalVisible, setPendingModalVisible] = useState(false)
  const [retrievedCredentials, setRetrievedCredentials] = useState<AnonCredsCredentialsForProofRequest>()
  const [activeCreds, setActiveCreds] = useState<ProofCredentialItems[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [descriptorMetadata, setDescriptorMetadata] = useState<DescriptorMetadata | undefined>()
  const [hasAvailableCredentials, setHasAvailableCredentials] = useState(false)

  const goalCode = useOutOfBandByConnectionId(proof?.connectionId ?? '')?.outOfBandInvitation.goalCode
  const credProofPromise = useAllCredentialsForProof(proofId)

  const [
    logger,
    historyManagerCurried,
    historyEnabled,
    historyEventsLogger,
  ] = useServices([
    TOKENS.UTIL_LOGGER,
    TOKENS.FN_LOAD_HISTORY,
    TOKENS.HISTORY_ENABLED,
    TOKENS.HISTORY_EVENTS_LOGGER,
  ])

  const proofConnectionLabel = useMemo(
    () => getConnectionName(connection, store.preferences.alternateContactNames),
    [connection, store.preferences.alternateContactNames]
  )

  const requesterName = proofConnectionLabel || t('ContactDetails.AContact')

  // Load credentials for proof
  useEffect(() => {
    const loadCredentials = async () => {
      if (!credProofPromise) {
        setLoading(false)
        return
      }

      try {
        const result = await credProofPromise as any
        const { groupedProof, retrievedCredentials, fullCredentials, descriptorMetadata } = result || {}

        setRetrievedCredentials(retrievedCredentials)
        setDescriptorMetadata(descriptorMetadata)

        // Get active credentials
        let credList: string[] = []
        groupedProof.forEach((item: any) => {
          const credId = item.altCredentials?.[0]
          if (credId && !credList.includes(credId)) {
            credList.push(credId)
          }
        })

        const activeCredentials = groupedProof.filter((item: any) => credList.includes(item.credId))
        setActiveCreds(activeCredentials)

        // Check if all required credentials are available
        const schemaIds = new Set(
          fullCredentials
            .map((c: CredentialExchangeRecord) => getCredentialSchemaIdForRecord(c))
            .filter((id: any) => id !== null)
        )
        const credDefIds = new Set(
          fullCredentials
            .map((c: CredentialExchangeRecord) => getCredentialDefinitionIdForRecord(c))
            .filter((id: any) => id !== null)
        )

        const allAvailable = activeCredentials.every((cred: any) =>
          schemaIds.has(cred.schemaId ?? '') || credDefIds.has(cred.credDefId ?? '') || cred.credExchangeRecord
        )

        setHasAvailableCredentials(allAvailable && activeCredentials.length > 0)
        setLoading(false)
      } catch (error) {
        logger?.error('Failed to load credentials for proof', { error })
        setLoading(false)
      }
    }

    loadCredentials()
  }, [credProofPromise, logger])

  const logHistoryRecord = useCallback(
    async (type: HistoryCardType) => {
      try {
        if (!(agent && historyEnabled && proof)) {
          return
        }
        const historyManager = historyManagerCurried(agent)

        const recordData: HistoryRecord = {
          type: type,
          message: '',
          createdAt: proof.createdAt,
          correspondenceId: proofId,
          correspondenceName: proofConnectionLabel,
        }
        historyManager.saveHistory(recordData)
      } catch (err: unknown) {
        logger?.error(`Error saving history: ${err}`)
      }
    },
    [agent, historyEnabled, logger, historyManagerCurried, proof, proofId, proofConnectionLabel]
  )

  const handleAcceptPress = useCallback(async () => {
    try {
      if (!(agent && proof && assertNetworkConnected())) {
        return
      }
      setPendingModalVisible(true)

      if (!retrievedCredentials) {
        throw new Error(t('ProofRequest.RequestedCredentialsCouldNotBeFound'))
      }

      const format = await agent.proofs.getFormatData(proof.id)

      if (format.request?.presentationExchange) {
        if (!descriptorMetadata) throw new Error(t('ProofRequest.PresentationMetadataNotFound'))

        const selectedCredentials: DifPexInputDescriptorToCredentials = Object.fromEntries(
          Object.entries(descriptorMetadata).map(([descriptorId, meta]) => {
            const activeCredentialIds = activeCreds.map((cred) => cred.credId)
            const selectedRecord = meta.find((item) => activeCredentialIds.includes(item.record.id))
            if (!selectedRecord) throw new Error(t('ProofRequest.CredentialMetadataNotFound'))
            return [descriptorId, [selectedRecord.record]]
          })
        )

        await agent.proofs.acceptRequest({
          proofRecordId: proof.id,
          proofFormats: { presentationExchange: { credentials: selectedCredentials } },
        })
      } else {
        const formatToUse = format.request?.anoncreds ? 'anoncreds' : 'indy'

        const formatCredentials = (
          retrievedItems: Record<string, (AnonCredsRequestedAttributeMatch | AnonCredsRequestedPredicateMatch)[]>,
          credList: string[]
        ) => {
          return Object.keys(retrievedItems)
            .map((key) => ({
              [key]: retrievedItems[key].find((cred) => credList.includes(cred.credentialId)),
            }))
            .reduce((prev, current) => ({ ...prev, ...current }), {})
        }

        const credObject = {
          ...retrievedCredentials,
          attributes: formatCredentials(
            retrievedCredentials.attributes,
            activeCreds.map((item) => item.credId)
          ),
          predicates: formatCredentials(
            retrievedCredentials.predicates,
            activeCreds.map((item) => item.credId)
          ),
          selfAttestedAttributes: {},
        }

        await agent.proofs.acceptRequest({
          proofRecordId: proof.id,
          proofFormats: { [formatToUse]: { ...credObject } },
        })
      }

      if (proof.connectionId && goalCode?.endsWith('verify.once')) {
        agent.connections.deleteById(proof.connectionId)
      }

      if (historyEventsLogger.logInformationSent) {
        logHistoryRecord(HistoryCardType.InformationSent)
      }
    } catch (err: unknown) {
      setPendingModalVisible(false)
      const error = new BifoldError(t('Error.Title1027'), t('Error.Message1027'), (err as Error)?.message ?? err, 1027)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }, [
    agent,
    proof,
    assertNetworkConnected,
    retrievedCredentials,
    activeCreds,
    descriptorMetadata,
    goalCode,
    t,
    historyEventsLogger.logInformationSent,
    logHistoryRecord,
  ])

  const handleDeclineTouched = useCallback(async () => {
    Alert.alert(
      t('ProofRequest.DeclineTitle') || 'Decline Request',
      t('ProofRequest.DeclineConfirmation') || 'Are you sure you want to decline this proof request?',
      [
        { text: t('Global.Cancel'), style: 'cancel' },
        {
          text: t('Global.Decline'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (agent && proof) {
                const connectionId = proof.connectionId ?? ''
                const conn = await agent.connections.findById(connectionId)

                if (conn) {
                  await agent.proofs.sendProblemReport({
                    proofRecordId: proof.id,
                    description: t('ProofRequest.Declined'),
                  })
                }

                await agent.proofs.declineRequest({ proofRecordId: proof.id })

                if (connectionId && goalCode?.endsWith('verify.once')) {
                  agent.connections.deleteById(connectionId)
                }
              }

              if (historyEventsLogger.logInformationNotSent) {
                logHistoryRecord(HistoryCardType.InformationNotSent)
              }

              navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home })
            } catch (err: unknown) {
              const error = new BifoldError(t('Error.Title1028'), t('Error.Message1028'), (err as Error)?.message ?? err, 1028)
              DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }, [agent, proof, goalCode, t, navigation, logHistoryRecord, historyEventsLogger.logInformationNotSent])

  const isShareDisabled = !hasAvailableCredentials || proof?.state !== ProofState.RequestReceived

  return (
    <>
      <ESSIScreen
        headerTitle={t('Screens.ProofRequest')}
        headerLeft="back"
        onHeaderLeftPress={() => navigation.goBack()}
        safeAreaEdges={['top', 'left', 'right', 'bottom']}
        testID={testIdWithKey('ESSIProofRequest')}
        scrollable={false}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Requester Info */}
          <View style={styles.requesterSection}>
            <View style={styles.requesterAvatar}>
              <FeatherIcon name="user-check" size={32} color={palette.text} />
            </View>
            <Text style={styles.requesterName}>{requesterName}</Text>
            <Text style={styles.requestText}>{t('ProofRequest.IsRequestingYouToShare')}</Text>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles.loadingText}>{t('Global.Loading')}</Text>
            </View>
          )}

          {/* Credentials Section */}
          {!loading && activeCreds.length > 0 && (
            <View style={styles.credentialsSection}>
              <Text style={styles.sectionTitle}>
                {t('ProofRequest.RequestedCredentials')} ({activeCreds.length})
              </Text>

              {activeCreds.map((cred, index) => (
                <View key={`${cred.credId}-${index}`} style={styles.credentialCard}>
                  <View style={styles.credentialHeader}>
                    <View style={styles.credentialIcon}>
                      <FeatherIcon name="credit-card" size={20} color={palette.text} />
                    </View>
                    <View style={styles.credentialInfo}>
                      <Text style={styles.credentialName} numberOfLines={1}>
                        {cred.credName || t('Credentials.UnknownCredential')}
                      </Text>
                      {cred.credExchangeRecord ? (
                        <View style={styles.statusBadge}>
                          <FeatherIcon name="check" size={12} color={palette.success} />
                          <Text style={styles.statusText}>{t('ProofRequest.Available')}</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, styles.statusBadgeMissing]}>
                          <FeatherIcon name="alert-circle" size={12} color={palette.danger} />
                          <Text style={[styles.statusText, styles.statusTextMissing]}>{t('ProofRequest.Missing')}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Attributes being shared */}
                  {cred.attributes && cred.attributes.length > 0 && (
                    <View style={styles.attributesList}>
                      {cred.attributes.slice(0, 3).map((attr: any, attrIndex: number) => (
                        <View key={`attr-${attrIndex}`} style={styles.attributeRow}>
                          <Text style={styles.attributeLabel} numberOfLines={1}>
                            {attr.label || attr.name}
                          </Text>
                          <Text style={styles.attributeValue} numberOfLines={1}>
                            {attr.value || '***'}
                          </Text>
                        </View>
                      ))}
                      {cred.attributes.length > 3 && (
                        <Text style={styles.moreAttributes}>
                          {t('Credentials.MoreAttributes', { count: cred.attributes.length - 3 })}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* No credentials available warning */}
          {!loading && !hasAvailableCredentials && activeCreds.length > 0 && (
            <View style={styles.warningCard}>
              <FeatherIcon name="alert-triangle" size={24} color={palette.warning} />
              <Text style={styles.warningText}>{t('ProofRequest.YouCantRespond')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <ESSIButton
            title={t('Global.Share')}
            onPress={handleAcceptPress}
            variant="primary"
            disabled={isShareDisabled || loading}
            testID={testIdWithKey('ShareProof')}
          />
          <View style={styles.buttonSpacer} />
          <ESSIButton
            title={t('Global.Decline')}
            onPress={handleDeclineTouched}
            variant="danger"
            disabled={loading}
            testID={testIdWithKey('DeclineProof')}
          />
        </View>
      </ESSIScreen>

      <ESSIProofRequestAccept visible={pendingModalVisible} proofId={proofId} />
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
  requesterSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  requesterAvatar: {
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
  requesterName: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  requestText: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
  },
  credentialsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.overline,
    color: palette.muted,
    marginBottom: spacing.md,
  },
  credentialCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  credentialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialName: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  statusBadgeMissing: {},
  statusText: {
    ...typography.caption,
    color: palette.success,
  },
  statusTextMissing: {
    color: palette.danger,
  },
  attributesList: {
    borderTopWidth: 1,
    borderTopColor: palette.outline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  attributeLabel: {
    ...typography.caption,
    color: palette.muted,
    flex: 1,
  },
  attributeValue: {
    ...typography.caption,
    color: palette.text,
    flex: 1,
    textAlign: 'right',
  },
  moreAttributes: {
    ...typography.caption,
    color: palette.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.warning + '20',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.warning + '40',
  },
  warningText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
  buttonContainer: {
    paddingTop: spacing.md,
  },
  buttonSpacer: {
    height: spacing.sm,
  },
})

export default ESSIProofRequest
