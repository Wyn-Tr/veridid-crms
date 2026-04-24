import React, { useMemo } from 'react'
import { W3cCredentialDisplay } from '../types'
import { useTranslation } from 'react-i18next'
import { GenericFn } from '../../../types/fn'
import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { testIdWithKey } from '../../../utils/testable'
import { useTheme } from '../../../contexts/theme'
import { W3cCredentialRecord } from '@credo-ts/core'
import { getCredentialForDisplay, getOpenBadgeDisplayData, OpenBadgeDisplayData } from '../display'

interface OpenBadgeCardProps {
  credentialDisplay?: W3cCredentialDisplay
  credentialRecord?: W3cCredentialRecord
  onPress?: GenericFn
  style?: ViewStyle
}

const OpenBadgeCard: React.FC<OpenBadgeCardProps> = ({
  credentialDisplay,
  credentialRecord,
  style = {},
  onPress = undefined,
}) => {
  const { t } = useTranslation()
  const { ColorPalette, TextTheme } = useTheme()
  const { width } = useWindowDimensions()

  const badge = useMemo((): OpenBadgeDisplayData | undefined => {
    if (credentialDisplay?.credential) {
      return getOpenBadgeDisplayData(credentialDisplay.credential)
    }
    if (credentialRecord) {
      const display = getCredentialForDisplay(credentialRecord)
      if (display.credential) {
        return getOpenBadgeDisplayData(display.credential)
      }
    }
    return undefined
  }, [credentialDisplay, credentialRecord])

  const cardWidth = width - 32 // Account for margins
  const imageSize = cardWidth * 0.35

  const styles = StyleSheet.create({
    card: {
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageContainer: {
      marginRight: 16,
    },
    badgeImage: {
      width: imageSize,
      height: imageSize,
      borderRadius: 12,
      backgroundColor: ColorPalette.grayscale.lightGrey,
    },
    placeholderImage: {
      width: imageSize,
      height: imageSize,
      borderRadius: 12,
      backgroundColor: ColorPalette.brand.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 32,
      color: '#fff',
    },
    content: {
      flex: 1,
    },
    achievementName: {
      ...TextTheme.labelTitle,
      color: ColorPalette.brand.text,
      marginBottom: 4,
    },
    achievementType: {
      ...TextTheme.label,
      color: ColorPalette.grayscale.mediumGrey,
      marginBottom: 8,
    },
    issuerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    issuerLabel: {
      ...TextTheme.caption,
      color: ColorPalette.grayscale.mediumGrey,
    },
    issuerName: {
      ...TextTheme.caption,
      color: ColorPalette.brand.text,
      fontWeight: '500',
    },
  })

  const renderImage = () => {
    if (badge?.achievementImage) {
      return (
        <Image
          source={{ uri: badge.achievementImage }}
          style={styles.badgeImage}
          resizeMode="contain"
          testID={testIdWithKey('OpenBadgeImage')}
        />
      )
    }

    // Placeholder with first letter of achievement name
    const initial = badge?.achievementName?.charAt(0).toUpperCase() || 'B'
    return (
      <View style={styles.placeholderImage}>
        <Text style={styles.placeholderText}>{initial}</Text>
      </View>
    )
  }

  if (!badge) return null

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={`${badge.achievementName}, ${badge.achievementType}, ${t('Credentials.IssuedBy')} ${badge.issuerName || t('ContactDetails.AContact')}`}
      accessibilityRole="button"
      disabled={typeof onPress === 'undefined'}
      onPress={onPress}
      style={[styles.card, style]}
      testID={testIdWithKey('OpenBadgeCard')}
    >
      <View style={styles.imageContainer}>{renderImage()}</View>

      <View style={styles.content}>
        <Text
          style={styles.achievementName}
          numberOfLines={2}
          ellipsizeMode="tail"
          testID={testIdWithKey('OpenBadgeAchievementName')}
        >
          {badge.achievementName}
        </Text>

        <Text
          style={styles.achievementType}
          numberOfLines={1}
          testID={testIdWithKey('OpenBadgeAchievementType')}
        >
          {badge.achievementType}
        </Text>

        <View style={styles.issuerRow}>
          <Text style={styles.issuerLabel}>{t('Credentials.IssuedBy')} </Text>
          <Text
            style={styles.issuerName}
            numberOfLines={1}
            ellipsizeMode="tail"
            testID={testIdWithKey('OpenBadgeIssuer')}
          >
            {badge.issuerName || t('ContactDetails.AContact')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default OpenBadgeCard
