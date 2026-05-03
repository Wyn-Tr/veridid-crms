import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'

import { radius, spacing, typography } from '../../theme/essi'
import { useWalletVisualPalette } from '../../theme/essi'

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
  const palette = useWalletVisualPalette()
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          borderColor: typeof palette.outline === 'string' ? palette.outline : palette.surfaceSecondary,
        },
        primary: {
          backgroundColor: `${palette.primary}33`,
          borderColor: palette.primary,
        },
        warning: {
          backgroundColor: `${palette.warning}33`,
          borderColor: palette.warning,
        },
        danger: {
          backgroundColor: `${palette.danger}33`,
          borderColor: palette.danger,
        },
        success: {
          backgroundColor: `${palette.success}33`,
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
      }),
    [palette]
  )

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
