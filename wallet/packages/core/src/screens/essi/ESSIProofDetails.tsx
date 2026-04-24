import type { StackScreenProps } from '@react-navigation/stack'

import { ProofExchangeRecord, ProofState } from '@credo-ts/core'
import { useAgent, useConnectionById, useProofById } from '@credo-ts/react-hooks'
import { GroupedSharedProofDataItem, ProofCustomMetadata, ProofMetadata, markProofAsViewed } from '@bifold/verifier'
import { useFocusEffect } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BackHandler, StyleSheet, View, Text, ScrollView } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import SharedProofData from '../../components/misc/SharedProofData'
import { useStore } from '../../contexts/store'
import { TOKENS, useServices } from '../../container-api'
import { ProofRequestsStackParams, Screens } from '../../types/navigators'
import { getConnectionName } from '../../utils/helpers'
import { testIdWithKey } from '../../utils/testable'
import { useOutOfBandByConnectionId } from '../../hooks/connections'
import usePreventScreenCapture from '../../hooks/screen-capture'
import { palette, spacing, typography, radius } from '../../theme/essi'

type ESSIProofDetailsProps = StackScreenProps<ProofRequestsStackParams, Screens.ProofDetails>

type VerifiedProofProps = {
  record: ProofExchangeRecord
  isHistory?: boolean
  senderReview?: boolean
  connectionLabel: string
  onBackPressed: () => void
  onGenerateNewPressed: () => void
}

type UnverifiedProofProps = {
  record: ProofExchangeRecord
  onBackPressed: () => void
  onGenerateNewPressed: () => void
}

const VerifiedProof: React.FC<VerifiedProofProps> = ({
  record,
  isHistory,
  senderReview,
  connectionLabel,
  onBackPressed,
  onGenerateNewPressed,
}: VerifiedProofProps) => {
  const { t } = useTranslation()
  const [sharedProofDataItems, setSharedProofDataItems] = useState<GroupedSharedProofDataItem[]>([])

  const onSharedProofDataLoad = useCallback((data: GroupedSharedProofDataItem[]) => {
    setSharedProofDataItems(data)
  }, [])

  if (isHistory) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} testID={testIdWithKey('ProofDetailsHistoryView')}>
        {sharedProofDataItems.length > 0 && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              {senderReview ? (
                <>
                  {t('ProofRequest.ReviewSentInformation', { count: sharedProofDataItems.length })}{' '}
                  <Text style={styles.connectionLabel}>{connectionLabel}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.connectionLabel}>{connectionLabel}</Text>{' '}
                  {t('ProofRequest.ShareFollowingInformation', { count: sharedProofDataItems.length })}
                </>
              )}
            </Text>
          </View>
        )}
        <View style={styles.proofDataContainer}>
          <SharedProofData recordId={record.id} onSharedProofDataLoad={onSharedProofDataLoad} />
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentWithButtons} testID={testIdWithKey('ProofDetailsView')}>
      <View style={styles.headerCard}>
        <View style={styles.iconContainer}>
          <FeatherIcon name="check-circle" size={48} color={palette.success} />
        </View>
        <Text style={styles.headerTitle}>{t('Verifier.InformationReceived')}</Text>
        <Text style={styles.headerSubtitle}>{t('Verifier.InformationReceivedDetails')}</Text>
      </View>

      <View style={styles.proofDataContainer}>
        <SharedProofData recordId={record.id} />
      </View>

      <View style={styles.buttonContainer}>
        <ESSIButton
          title={t('Verifier.GenerateNewQR')}
          onPress={onGenerateNewPressed}
          variant="primary"
          testID={testIdWithKey('GenerateNewQR')}
        />
        <View style={styles.buttonSpacing} />
        <ESSIButton
          title={t('Verifier.BackToList')}
          onPress={onBackPressed}
          variant="outline"
          testID={testIdWithKey('BackToList')}
        />
      </View>
    </ScrollView>
  )
}

const UnverifiedProof: React.FC<UnverifiedProofProps> = ({ record, onBackPressed, onGenerateNewPressed }) => {
  const { t } = useTranslation()

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContentWithButtons} testID={testIdWithKey('UnverifiedProofView')}>
      <View style={styles.unverifiedContent}>
        <View style={styles.errorIconContainer}>
          <FeatherIcon name="x-circle" size={80} color={palette.danger} />
        </View>
        <Text style={styles.errorTitle}>
          {record.state === ProofState.Abandoned
            ? t('ProofRequest.ProofRequestDeclined')
            : t('Verifier.ProofVerificationFailed')}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <ESSIButton
          title={t('Verifier.GenerateNewQR')}
          onPress={onGenerateNewPressed}
          variant="primary"
          testID={testIdWithKey('GenerateNewQR')}
        />
        <View style={styles.buttonSpacing} />
        <ESSIButton
          title={t('Verifier.BackToList')}
          onPress={onBackPressed}
          variant="outline"
          testID={testIdWithKey('BackToList')}
        />
      </View>
    </ScrollView>
  )
}

const ESSIProofDetails: React.FC<ESSIProofDetailsProps> = ({ route, navigation }) => {
  if (!route?.params) {
    throw new Error('ProofRequesting route params were not set properly')
  }

  const { recordId, isHistory, senderReview } = route.params
  const record = useProofById(recordId)
  const connection = useConnectionById(record?.connectionId ?? '')
  const goalCode = useOutOfBandByConnectionId(connection?.id ?? '')?.outOfBandInvitation.goalCode
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [store] = useStore()
  const [logger, { preventScreenCapture }] = useServices([TOKENS.UTIL_LOGGER, TOKENS.CONFIG])
  usePreventScreenCapture(preventScreenCapture)

  const connectionLabel = useMemo(
    () =>
      connection
        ? getConnectionName(connection, store.preferences.alternateContactNames)
        : t('Verifier.ConnectionLessLabel'),
    [connection, store.preferences.alternateContactNames, t]
  )

  const cleanup = useCallback((): Promise<PromiseSettledResult<void>[]> | undefined => {
    if (!agent) {
      return
    }

    const promises = Array<Promise<void>>()
    if (!store.preferences.useDataRetention) {
      promises.push(agent.proofs.deleteById(recordId))
    }

    if (
      record &&
      record.connectionId &&
      ((record.metadata.get(ProofMetadata.customMetadata) as ProofCustomMetadata).delete_conn_after_seen ||
        goalCode?.endsWith('verify.once'))
    ) {
      promises.push(agent.connections.deleteById(record.connectionId))
    }

    return Promise.allSettled(promises)
  }, [store.preferences.useDataRetention, agent, recordId, record, goalCode])

  const onBackPressed = useCallback(() => {
    cleanup()?.catch((err) => logger.error(`Error cleaning up proof, ${err}`))

    if (route.params.isHistory) {
      navigation.goBack()
      return null
    }

    navigation.navigate(Screens.ProofRequests, {})

    return null
  }, [navigation, cleanup, route.params.isHistory, logger])

  const onGenerateNewPressed = useCallback(() => {
    if (!record) {
      return
    }

    cleanup()?.catch((err) => logger.error(`Error cleaning up proof, ${err}`))

    const metadata = record.metadata.get(ProofMetadata.customMetadata) as ProofCustomMetadata
    if (metadata?.proof_request_template_id) {
      navigation.navigate(Screens.ProofRequesting, { templateId: metadata.proof_request_template_id })
    } else {
      navigation.navigate(Screens.ProofRequests, {})
    }
  }, [record, navigation, cleanup, logger])

  useEffect(() => {
    if (agent && record && !record.metadata?.data?.customMetadata?.details_seen) {
      markProofAsViewed(agent, record)
    }
  }, [agent, record])

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPressed)

      return () => subscription.remove()
    }, [onBackPressed])
  )

  if (!record) return null

  const headerTitle = isHistory
    ? connectionLabel
    : record.isVerified || senderReview
      ? t('Screens.ProofDetails')
      : t('Screens.ProofDetails')

  return (
    <ESSIScreen
      headerTitle={headerTitle}
      headerLeft="back"
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      onHeaderLeftPress={() => {
        if (isHistory) {
          navigation.goBack()
        } else {
          onBackPressed()
        }
      }}
      testID={testIdWithKey('ESSIProofDetails')}
      scrollable={false}
    >
      {(record.isVerified || senderReview) && (
        <VerifiedProof
          record={record}
          isHistory={isHistory}
          senderReview={senderReview}
          connectionLabel={connectionLabel}
          onBackPressed={onBackPressed}
          onGenerateNewPressed={onGenerateNewPressed}
        />
      )}
      {!(record.isVerified || senderReview) && (
        <UnverifiedProof record={record} onBackPressed={onBackPressed} onGenerateNewPressed={onGenerateNewPressed} />
      )}
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  scrollContentWithButtons: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  headerCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  descriptionContainer: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  descriptionText: {
    ...typography.body,
    color: palette.text,
  },
  connectionLabel: {
    ...typography.bodyBold,
    color: palette.primary,
  },
  proofDataContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  unverifiedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  errorIconContainer: {
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: spacing.md,
  },
  buttonSpacing: {
    height: spacing.md,
  },
})

export default ESSIProofDetails
