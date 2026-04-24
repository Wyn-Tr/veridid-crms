import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, ViewStyle } from 'react-native'

import { palette, spacing, radius } from '../../theme/essi'

interface ESSISkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

const ESSISkeleton: React.FC<ESSISkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [animatedValue])

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  )
}

interface ESSICredentialSkeletonProps {
  style?: ViewStyle
}

export const ESSICredentialSkeleton: React.FC<ESSICredentialSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.credentialCard, style]}>
      {/* Icon placeholder */}
      <View style={styles.credentialHeader}>
        <ESSISkeleton width={48} height={48} borderRadius={24} />
        <View style={styles.credentialHeaderText}>
          <ESSISkeleton width="70%" height={18} style={styles.mb} />
          <ESSISkeleton width="40%" height={14} />
        </View>
      </View>

      {/* Attributes placeholder */}
      <View style={styles.credentialBody}>
        <ESSISkeleton width="30%" height={12} style={styles.mb} />
        <ESSISkeleton width="60%" height={16} style={styles.mbLg} />
        <ESSISkeleton width="35%" height={12} style={styles.mb} />
        <ESSISkeleton width="80%" height={16} />
      </View>
    </View>
  )
}

interface ESSIConnectionSkeletonProps {
  style?: ViewStyle
}

export const ESSIConnectionSkeleton: React.FC<ESSIConnectionSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.connectionCard, style]}>
      <ESSISkeleton width={48} height={48} borderRadius={24} />
      <View style={styles.connectionContent}>
        <ESSISkeleton width="60%" height={16} style={styles.mb} />
        <ESSISkeleton width="30%" height={12} />
      </View>
      <ESSISkeleton width={24} height={24} borderRadius={12} />
    </View>
  )
}

interface ESSIWorkflowSkeletonProps {
  style?: ViewStyle
}

export const ESSIWorkflowSkeleton: React.FC<ESSIWorkflowSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.workflowCard, style]}>
      <ESSISkeleton width={56} height={56} borderRadius={28} />
      <View style={styles.workflowContent}>
        <ESSISkeleton width="65%" height={16} style={styles.mb} />
        <ESSISkeleton width="45%" height={14} style={styles.mb} />
        <ESSISkeleton width="30%" height={12} />
      </View>
      <View style={styles.workflowAction}>
        <ESSISkeleton width={60} height={24} borderRadius={radius.pill} style={styles.mb} />
        <ESSISkeleton width={20} height={20} />
      </View>
    </View>
  )
}

interface ESSIListSkeletonProps {
  count?: number
  type?: 'credential' | 'connection' | 'workflow'
  style?: ViewStyle
}

export const ESSIListSkeleton: React.FC<ESSIListSkeletonProps> = ({
  count = 3,
  type = 'credential',
  style,
}) => {
  const SkeletonComponent = {
    credential: ESSICredentialSkeleton,
    connection: ESSIConnectionSkeleton,
    workflow: ESSIWorkflowSkeleton,
  }[type]

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} style={index < count - 1 ? styles.mbMd : undefined} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: palette.surfaceSecondary,
  },
  credentialCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  credentialHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  credentialBody: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  connectionContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  workflowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  workflowContent: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  workflowAction: {
    alignItems: 'flex-end',
  },
  mb: {
    marginBottom: spacing.xs,
  },
  mbMd: {
    marginBottom: spacing.md,
  },
  mbLg: {
    marginBottom: spacing.md,
  },
})

export default ESSISkeleton
