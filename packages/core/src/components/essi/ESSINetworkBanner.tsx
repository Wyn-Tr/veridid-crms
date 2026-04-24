import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { palette, spacing, typography, radius } from '../../theme/essi'
import { useNetwork } from '../../contexts/network'
import { testIdWithKey } from '../../utils/testable'

interface ESSINetworkBannerProps {
  onPress?: () => void
}

const ESSINetworkBanner: React.FC<ESSINetworkBannerProps> = ({ onPress }) => {
  const { t } = useTranslation()
  const { isInternetReachable, isConnected } = useNetInfo()
  const { displayNetInfoModal } = useNetwork()

  // Only show banner when we know there's no connection
  const showBanner = isInternetReachable === false || (isConnected === false && isInternetReachable !== null)

  if (!showBanner) {
    return null
  }

  const handlePress = () => {
    if (onPress) {
      onPress()
    } else {
      displayNetInfoModal()
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={handlePress}
      testID={testIdWithKey('ESSINetworkBanner')}
      accessibilityLabel={t('NetInfo.NoInternetConnectionTitle')}
      accessibilityRole="alert"
    >
      <View style={styles.iconContainer}>
        <FeatherIcon name="wifi-off" size={18} color={palette.danger} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('NetInfo.NoInternetConnectionTitle')}</Text>
        <Text style={styles.subtitle}>{t('NetInfo.NoInternetConnectionMessage')}</Text>
      </View>
      <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.danger + '15',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.danger + '30',
  },
  containerPressed: {
    opacity: 0.8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.bodyBold,
    color: palette.danger,
    fontSize: 14,
  },
  subtitle: {
    ...typography.caption,
    color: palette.text,
    opacity: 0.8,
  },
})

export default ESSINetworkBanner
