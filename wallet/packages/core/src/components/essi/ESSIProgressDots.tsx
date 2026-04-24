import React from 'react'
import { View, StyleSheet } from 'react-native'
import { palette, spacing } from '../../theme/essi'

interface ESSIProgressDotsProps {
  total: number
  current: number
  testID?: string
}

export const ESSIProgressDots: React.FC<ESSIProgressDotsProps> = ({ total, current, testID }) => {
  return (
    <View style={styles.container} testID={testID}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          testID={`${testID}-dot-${i}`}
          style={[styles.dot, i === current && styles.dotActive, i < current && styles.dotCompleted]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.outline,
  },
  dotActive: {
    backgroundColor: palette.primary,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: palette.primary,
  },
})
