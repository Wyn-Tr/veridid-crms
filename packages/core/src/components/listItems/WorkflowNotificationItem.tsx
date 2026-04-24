import React, { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'
import type { WorkflowInstanceRecord } from '@ajna-inc/workflow'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'

interface WorkflowNotificationItemProps {
  workflow: WorkflowInstanceRecord
  onPress: () => void
}

// Map workflow states to icons and colors
const stateConfig: Record<string, { icon: string; color: string }> = {
  pending: { icon: 'clock', color: palette.warning },
  in_progress: { icon: 'loader', color: palette.primary },
  awaiting_input: { icon: 'edit-3', color: palette.accent },
  completed: { icon: 'check-circle', color: palette.success },
  failed: { icon: 'x-circle', color: palette.danger },
  cancelled: { icon: 'slash', color: palette.muted },
  default: { icon: 'git-branch', color: palette.primary },
}

/**
 * Workflow notification card component for displaying in notification lists
 */
export const WorkflowNotificationItem: React.FC<WorkflowNotificationItemProps> = ({
  workflow,
  onPress,
}) => {
  const { t } = useTranslation()

  const { icon, color } = useMemo(() => {
    const status = (workflow as any).status?.toLowerCase() ?? 'default'
    return stateConfig[status] ?? stateConfig.default
  }, [workflow])

  const templateName = useMemo(() => {
    // Try to get a human-readable name from template
    const templateId = (workflow as any).templateId ?? workflow.id
    // Convert kebab-case or snake_case to title case
    return templateId
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [workflow])

  const stateLabel = useMemo(() => {
    const state = (workflow as any).state ?? 'Unknown'
    // Convert to title case
    return state
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }, [workflow])

  const sectionLabel = useMemo(() => {
    return (workflow as any).section ?? ''
  }, [workflow])

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
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
      testID={testIdWithKey(`WorkflowNotification-${workflow.id}`)}
      accessibilityLabel={`${templateName} workflow, state: ${stateLabel}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <FeatherIcon name={icon} size={24} color={color} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {templateName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {stateLabel}
          {sectionLabel ? ` • ${sectionLabel}` : ''}
        </Text>
        {createdAtLabel && <Text style={styles.meta}>{createdAtLabel}</Text>}
      </View>

      <View style={styles.actionContainer}>
        <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.statusText, { color }]}>
            {(workflow as any).status ?? 'Active'}
          </Text>
        </View>
        <FeatherIcon name="chevron-right" size={20} color={palette.muted} style={styles.chevron} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  pressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.body,
    color: palette.muted,
    fontSize: 14,
  },
  meta: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xxs,
  },
  actionContainer: {
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
  chevron: {
    marginTop: spacing.xxs,
  },
})

export default WorkflowNotificationItem
