import React from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { palette, spacing, typography } from '../../theme/essi'

const { width, height } = Dimensions.get('window')
const SCAN_AREA_SIZE = width * 0.7

interface ESSIScanOverlayProps {
  onClose?: () => void
  message?: string
  showHelp?: boolean
  onHelpPress?: () => void
  testID?: string
}

export const ESSIScanOverlay: React.FC<ESSIScanOverlayProps> = ({
  onClose,
  message = 'Scan QR Code',
  showHelp = true,
  onHelpPress,
  testID,
}) => {
  return (
    <View style={styles.container} testID={testID}>
      {/* Top overlay */}
      <View style={styles.topOverlay}>
        <View style={styles.header}>
          {onClose && (
            <Pressable onPress={onClose} style={styles.closeButton} testID={`${testID}-close`}>
              <FeatherIcon name="x" size={24} color={palette.text} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Middle section with scan area */}
      <View style={styles.middleRow}>
        <View style={styles.sideOverlay} />
        <View style={styles.scanArea}>
          {/* Corner indicators */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <View style={styles.sideOverlay} />
      </View>

      {/* Bottom overlay */}
      <View style={styles.bottomOverlay}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
          {showHelp && onHelpPress && (
            <Pressable onPress={onHelpPress} style={styles.helpButton} testID={`${testID}-help`}>
              <FeatherIcon name="help-circle" size={20} color={palette.primary} />
              <Text style={styles.helpText}>Help</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xl,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topOverlay: {
    height: (height - SCAN_AREA_SIZE) / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: palette.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  messageText: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  helpText: {
    ...typography.body,
    color: palette.primary,
  },
})
