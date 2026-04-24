import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { palette, radius, spacing, typography } from '../../theme/essi'

interface ESSIInfoCardProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success'
  style?: ViewStyle
  testID?: string
}

export const ESSIInfoCard: React.FC<ESSIInfoCardProps> = ({
  icon,
  title,
  subtitle,
  variant = 'default',
  style,
  testID,
}) => {
  return (
    <View testID={testID} style={[styles.card, styles[variant], style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  default: {
    backgroundColor: palette.surfaceSecondary,
    borderColor: palette.outline,
  },
  primary: {
    backgroundColor: palette.primary + '20',
    borderColor: palette.primary,
  },
  warning: {
    backgroundColor: palette.warning + '20',
    borderColor: palette.warning,
  },
  danger: {
    backgroundColor: palette.danger + '20',
    borderColor: palette.danger,
  },
  success: {
    backgroundColor: palette.success + '20',
    borderColor: palette.success,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    color: palette.text,
  },
  subtitle: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.xs,
  },
})
