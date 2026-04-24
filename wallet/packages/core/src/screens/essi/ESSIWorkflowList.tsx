import React, { useCallback, useMemo } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'
import type { WorkflowInstanceRecord } from '@ajna-inc/workflow'

import { ESSIScreen } from '../../components/essi'
import { useWorkflows } from '../../hooks/useWorkflows'
import { useNewWorkflowEvents } from '../../hooks/useWorkflowEvents'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { Screens, Stacks } from '../../types/navigators'

// State configuration for icons and colors
const stateConfig: Record<string, { icon: string; color: string }> = {
  pending: { icon: 'clock', color: palette.warning },
  in_progress: { icon: 'loader', color: palette.primary },
  awaiting_input: { icon: 'edit-3', color: palette.accent },
  completed: { icon: 'check-circle', color: palette.success },
  failed: { icon: 'x-circle', color: palette.danger },
  cancelled: { icon: 'slash', color: palette.muted },
  default: { icon: 'git-branch', color: palette.primary },
}

interface WorkflowCardProps {
  workflow: WorkflowInstanceRecord
  onPress: () => void
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onPress }) => {
  const { icon, color } = useMemo(() => {
    const status = (workflow as any).status?.toLowerCase() ?? 'default'
    return stateConfig[status] ?? stateConfig.default
  }, [workflow])

  const templateName = useMemo(() => {
    const templateId = (workflow as any).templateId ?? workflow.id
    return templateId
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [workflow])

  const stateLabel = useMemo(() => {
    const state = (workflow as any).state ?? 'Unknown'
    return state
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [workflow])

  const sectionLabel = (workflow as any).section ?? ''

  const createdAtLabel = useMemo(() => {
    const createdAt = (workflow as any).createdAt
    if (!createdAt) return ''
    try {
      const date = new Date(createdAt)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }, [workflow])

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      testID={testIdWithKey(`WorkflowCard-${workflow.id}`)}
    >
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <FeatherIcon name={icon} size={28} color={color} />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {templateName}
        </Text>
        <Text style={styles.cardState} numberOfLines={1}>
          {stateLabel}
        </Text>
        {sectionLabel ? (
          <Text style={styles.cardSection}>{sectionLabel}</Text>
        ) : null}
        {createdAtLabel ? (
          <Text style={styles.cardMeta}>{createdAtLabel}</Text>
        ) : null}
      </View>

      <View style={styles.cardAction}>
        <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.statusText, { color }]}>
            {(workflow as any).status ?? 'Active'}
          </Text>
        </View>
        <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
      </View>
    </Pressable>
  )
}

const EmptyState: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()

  const handleScanPress = () => {
    navigation.navigate(Stacks.ConnectStack as any, { screen: Screens.Scan })
  }

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <FeatherIcon name="git-branch" size={48} color={palette.primary} />
      </View>
      <Text style={styles.emptyTitle}>{t('Workflow.EmptyTitle')}</Text>
      <Text style={styles.emptySubtitle}>{t('Workflow.EmptySubtitle')}</Text>
      <Text style={styles.emptyHint}>{t('Workflow.EmptyHint')}</Text>
      <Pressable
        style={styles.scanButton}
        onPress={handleScanPress}
        testID={testIdWithKey('ScanToConnectButton')}
      >
        <FeatherIcon name="camera" size={20} color={palette.text} />
        <Text style={styles.scanButtonText}>{t('Scan.ScanQRCode')}</Text>
      </Pressable>
    </View>
  )
}

const ESSIWorkflowList: React.FC = () => {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { instances, loading, error, refresh, isAvailable } = useWorkflows()

  // Subscribe to new workflow events to auto-refresh
  useNewWorkflowEvents(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const handleWorkflowPress = useCallback(
    (workflow: WorkflowInstanceRecord) => {
      navigation.navigate(Screens.WorkflowDetails, { instanceId: workflow.id })
    },
    [navigation]
  )

  const renderItem = useCallback(
    ({ item }: { item: WorkflowInstanceRecord }) => (
      <WorkflowCard workflow={item} onPress={() => handleWorkflowPress(item)} />
    ),
    [handleWorkflowPress]
  )

  const keyExtractor = useCallback((item: WorkflowInstanceRecord) => item.id, [])

  if (!isAvailable) {
    return (
      <ESSIScreen
        headerTitle={t('Workflow.Workflows')}
        headerLeft="back"
        onHeaderLeftPress={() => navigation.goBack()}
        testID={testIdWithKey('ESSIWorkflowList')}
      >
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={48} color={palette.danger} />
          <Text style={styles.errorText}>{t('Workflow.NotAvailable')}</Text>
        </View>
      </ESSIScreen>
    )
  }

  return (
    <ESSIScreen
      headerTitle={t('Workflow.Workflows')}
      headerLeft="back"
      onHeaderLeftPress={() => navigation.goBack()}
      scrollable={false}
      testID={testIdWithKey('ESSIWorkflowList')}
    >
      {loading && instances.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>{t('Workflow.Loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={instances}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={palette.primary}
              colors={[palette.primary]}
            />
          }
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={[
            styles.listContent,
            instances.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {error && (
        <View style={styles.errorBanner}>
          <FeatherIcon name="alert-triangle" size={16} color={palette.danger} />
          <Text style={styles.errorBannerText}>{t('Workflow.FailedToLoad')}</Text>
        </View>
      )}
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
    marginTop: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  cardState: {
    ...typography.body,
    color: palette.text,
    fontSize: 14,
  },
  cardSection: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xxs,
  },
  cardMeta: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xxs,
  },
  cardAction: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.headline,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  emptyHint: {
    ...typography.caption,
    color: palette.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  scanButtonText: {
    ...typography.bodyBold,
    color: palette.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.danger + '20',
    padding: spacing.sm,
    borderRadius: radius.sm,
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: palette.danger,
    marginLeft: spacing.xs,
  },
})

export default ESSIWorkflowList
