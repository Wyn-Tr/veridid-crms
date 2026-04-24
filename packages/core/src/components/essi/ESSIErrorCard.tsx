import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { palette, spacing, typography, radius } from '../../theme/essi'
import { ESSIButton } from './ESSIButton'
import { testIdWithKey } from '../../utils/testable'

type ErrorVariant = 'error' | 'warning' | 'info'

interface ESSIErrorCardProps {
  title?: string
  message?: string
  error?: Error | string
  variant?: ErrorVariant
  icon?: string
  onRetry?: () => void
  retryLabel?: string
  onDismiss?: () => void
  dismissLabel?: string
  style?: ViewStyle
  testID?: string
}

const variantConfig: Record<ErrorVariant, { color: string; icon: string; bgOpacity: string }> = {
  error: { color: palette.danger, icon: 'alert-circle', bgOpacity: '15' },
  warning: { color: palette.warning, icon: 'alert-triangle', bgOpacity: '15' },
  info: { color: palette.primary, icon: 'info', bgOpacity: '15' },
}

const ESSIErrorCard: React.FC<ESSIErrorCardProps> = ({
  title,
  message,
  error,
  variant = 'error',
  icon,
  onRetry,
  retryLabel,
  onDismiss,
  dismissLabel,
  style,
  testID,
}) => {
  const { t } = useTranslation()
  const config = variantConfig[variant]
  const displayIcon = icon ?? config.icon

  // Determine the error message to display
  const errorMessage = message ?? (error instanceof Error ? error.message : error) ?? t('Global.SomethingWentWrong')

  // Determine the title
  const displayTitle = title ?? (variant === 'error' ? String(t('Global.Failure')) : variant === 'warning' ? 'Warning' : 'Info')

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.color + config.bgOpacity, borderColor: config.color + '30' },
        style,
      ]}
      testID={testID ?? testIdWithKey('ESSIErrorCard')}
      accessibilityRole="alert"
    >
      <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
        <FeatherIcon name={displayIcon} size={28} color={config.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: config.color }]}>{displayTitle}</Text>
        <Text style={styles.message}>{errorMessage}</Text>

        {(onRetry || onDismiss) && (
          <View style={styles.actions}>
            {onRetry && (
              <ESSIButton
                title={retryLabel ?? 'Retry'}
                onPress={onRetry}
                variant="primary"
                testID={testIdWithKey('ErrorCardRetry')}
              />
            )}
            {onDismiss && (
              <ESSIButton
                title={dismissLabel ?? 'Dismiss'}
                onPress={onDismiss}
                variant="outline"
                testID={testIdWithKey('ErrorCardDismiss')}
              />
            )}
          </View>
        )}
      </View>
    </View>
  )
}

interface ESSIEmptyStateProps {
  icon?: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onPress: () => void
  }
  style?: ViewStyle
  testID?: string
}

export const ESSIEmptyState: React.FC<ESSIEmptyStateProps> = ({
  icon = 'inbox',
  title,
  subtitle,
  action,
  style,
  testID,
}) => {
  return (
    <View style={[styles.emptyContainer, style]} testID={testID ?? testIdWithKey('ESSIEmptyState')}>
      <View style={styles.emptyIcon}>
        <FeatherIcon name={icon} size={48} color={palette.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && (
        <View style={styles.emptyAction}>
          <ESSIButton
            title={action.label}
            onPress={action.onPress}
            variant="primary"
            testID={testIdWithKey('EmptyStateAction')}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
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
  },
  title: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: palette.text,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
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
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
})

export default ESSIErrorCard
