import React, { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'

import { spacing } from '../../theme/essi'
import { useWalletVisualPalette } from '../../theme/essi'

interface ESSIProgressDotsProps {
  total: number
  current: number
  testID?: string
}

function buildDotStyles(p: ReturnType<typeof useWalletVisualPalette>) {
  return StyleSheet.create({
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
      backgroundColor: p.outline,
    },
    dotActive: {
      backgroundColor: p.primary,
      width: 24,
    },
    dotCompleted: {
      backgroundColor: p.primary,
    },
  })
}

export const ESSIProgressDots: React.FC<ESSIProgressDotsProps> = ({ total, current, testID }) => {
  const palette = useWalletVisualPalette()
  const styles = useMemo(() => buildDotStyles(palette), [palette])

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
