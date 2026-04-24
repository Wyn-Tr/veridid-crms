import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable, Share, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'
import QRCode from 'react-native-qrcode-svg'

import { ESSIScreen } from '../../components/essi'
import { palette, radius, spacing, typography } from '../../theme/essi'
import { testIdWithKey } from '../../utils/testable'
import { useCreateInvitation } from '../../hooks/useCreateInvitation'
import { useStore } from '../../contexts/store'

const ESSICreateInvite: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const [store] = useStore()
  const { createInvitation, invitationUrl, loading, error, reset } = useCreateInvitation()
  const [copied, setCopied] = useState(false)

  // Create invitation when screen loads
  useEffect(() => {
    createInvitation(store.preferences.walletName || 'ESSI Wallet')
  }, [])

  const handleShare = async () => {
    if (!invitationUrl) return

    try {
      await Share.share({
        message: invitationUrl,
        title: t('CreateInvite.ShareTitle'),
      })
    } catch (err) {
      console.error('Failed to share invitation:', err)
    }
  }

  const handleCopyLink = async () => {
    if (!invitationUrl) return

    try {
      // Using the Clipboard API
      const Clipboard = require('@react-native-clipboard/clipboard').default
      Clipboard.setString(invitationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleRefresh = () => {
    reset()
    createInvitation(store.preferences.walletName || 'ESSI Wallet')
  }

  const handleGoBack = () => {
    navigation.goBack()
  }

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>{t('CreateInvite.Generating')}</Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={48} color={palette.danger} />
          <Text style={styles.errorTitle}>{t('CreateInvite.Error')}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleRefresh}>
            <FeatherIcon name="refresh-cw" size={20} color={palette.text} />
            <Text style={styles.retryButtonText}>{t('CreateInvite.Retry')}</Text>
          </Pressable>
        </View>
      )
    }

    if (!invitationUrl) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      )
    }

    return (
      <>
        {/* QR Code Container */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={invitationUrl}
              size={220}
              backgroundColor="white"
              color="black"
              ecl="M"
            />
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>{t('CreateInvite.Instructions')}</Text>

        {/* Wallet Name */}
        <View style={styles.walletInfo}>
          <FeatherIcon name="user" size={20} color={palette.muted} />
          <Text style={styles.walletName}>{store.preferences.walletName || 'ESSI Wallet'}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.actionButton}
            onPress={handleShare}
            testID={testIdWithKey('ShareInvitation')}
          >
            <View style={styles.actionIconContainer}>
              <FeatherIcon name="share-2" size={24} color={palette.text} />
            </View>
            <Text style={styles.actionText}>{t('CreateInvite.Share')}</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={handleCopyLink}
            testID={testIdWithKey('CopyInvitation')}
          >
            <View style={[styles.actionIconContainer, copied && styles.actionIconSuccess]}>
              <FeatherIcon name={copied ? 'check' : 'copy'} size={24} color={copied ? palette.success : palette.text} />
            </View>
            <Text style={styles.actionText}>{copied ? t('CreateInvite.Copied') : t('CreateInvite.CopyLink')}</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={handleRefresh}
            testID={testIdWithKey('RefreshInvitation')}
          >
            <View style={styles.actionIconContainer}>
              <FeatherIcon name="refresh-cw" size={24} color={palette.text} />
            </View>
            <Text style={styles.actionText}>{t('CreateInvite.NewCode')}</Text>
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <FeatherIcon name="info" size={20} color={palette.primary} />
          <Text style={styles.infoText}>{t('CreateInvite.InfoText')}</Text>
        </View>
      </>
    )
  }

  return (
    <ESSIScreen
      headerTitle={t('CreateInvite.Title')}
      headerLeft="back"
      onHeaderLeftPress={handleGoBack}
      testID={testIdWithKey('CreateInvite')}
      scrollable={true}
    >
      <View style={styles.container}>{renderContent()}</View>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    ...typography.headline,
    color: palette.danger,
    marginTop: spacing.md,
  },
  errorMessage: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.bodyBold,
    color: palette.text,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  qrWrapper: {
    backgroundColor: 'white',
    padding: spacing.lg,
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructions: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.surfaceSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  walletName: {
    ...typography.bodyBold,
    color: palette.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xl,
    width: '100%',
  },
  actionButton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconSuccess: {
    backgroundColor: palette.success + '20',
  },
  actionText: {
    ...typography.caption,
    color: palette.muted,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.primary + '15',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    width: '100%',
  },
  infoText: {
    ...typography.caption,
    color: palette.text,
    flex: 1,
    lineHeight: 20,
  },
})

export default ESSICreateInvite
