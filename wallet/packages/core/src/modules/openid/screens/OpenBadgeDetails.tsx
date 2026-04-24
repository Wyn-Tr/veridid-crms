import React, { useEffect, useState } from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { RootStackParams, Screens } from '../../../types/navigators'
import { OpenBadgeDisplayData } from '../display'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { ModalUsage } from '../../../types/remove'
import {
  DeviceEventEmitter,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { testIdWithKey } from '../../../utils/testable'
import { useTheme } from '../../../contexts/theme'
import { BifoldError } from '../../../types/error'
import { EventTypes } from '../../../constants'
import { useAgent } from '@credo-ts/react-hooks'
import RecordRemove from '../../../components/record/RecordRemove'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { OpenIDCredentialType } from '../types'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import ScreenLayout from '../../../layout/ScreenLayout'

type OpenBadgeDetailsProps = StackScreenProps<RootStackParams, Screens.OpenBadgeDetails>

const OpenBadgeDetails: React.FC<OpenBadgeDetailsProps> = ({ navigation, route }) => {
  const { credentialId } = route.params

  const [credential, setCredential] = useState<OpenBadgeCredentialRecord | undefined>(undefined)
  const [badge, setBadge] = useState<OpenBadgeDisplayData>()
  const [metadata, setMetadata] = useState<{ issuedAt?: string; validUntil?: string }>({})
  const { t } = useTranslation()
  const { ColorPalette, TextTheme } = useTheme()
  const { agent } = useAgent()
  const { removeCredential, getOpenBadgeCredentialById } = useOpenIDCredentials()

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [credentialRemoved, setCredentialRemoved] = useState(false)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollContent: {
      paddingBottom: 80,
    },
    imageSection: {
      alignItems: 'center',
      paddingVertical: 32,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    badgeImage: {
      width: 180,
      height: 180,
      borderRadius: 16,
      backgroundColor: ColorPalette.grayscale.lightGrey,
    },
    placeholderImage: {
      width: 180,
      height: 180,
      borderRadius: 16,
      backgroundColor: ColorPalette.brand.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: 64,
      color: '#fff',
      fontWeight: '600',
    },
    headerSection: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      alignItems: 'center',
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    achievementName: {
      ...TextTheme.headingTwo,
      color: ColorPalette.brand.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    achievementType: {
      ...TextTheme.label,
      color: ColorPalette.grayscale.mediumGrey,
      textAlign: 'center',
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: ColorPalette.brand.primaryBackground,
      borderRadius: 16,
      overflow: 'hidden',
    },
    section: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      marginTop: 12,
    },
    sectionTitle: {
      ...TextTheme.labelSubtitle,
      color: ColorPalette.grayscale.mediumGrey,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionContent: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
      lineHeight: 24,
    },
    issuerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    issuerLogo: {
      width: 48,
      height: 48,
      borderRadius: 8,
      marginRight: 16,
      backgroundColor: ColorPalette.grayscale.lightGrey,
    },
    issuerName: {
      ...TextTheme.title,
      color: ColorPalette.brand.text,
      flex: 1,
    },
    metadataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    metadataLabel: {
      ...TextTheme.label,
      color: ColorPalette.grayscale.mediumGrey,
    },
    metadataValue: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
    },
    removeSection: {
      marginTop: 24,
      marginBottom: 40,
    },
  })

  useEffect(() => {
    if (!agent) return

    const fetchCredential = async () => {
      if (credentialRemoved) return
      try {
        const record = await getOpenBadgeCredentialById(credentialId)
        if (record) {
          setCredential(record)

          // Extract badge data from OpenBadgeCredentialRecord
          const cred = record.credential as any
          const subject = Array.isArray(cred?.credentialSubject)
            ? cred.credentialSubject[0]
            : cred?.credentialSubject
          const achievement = subject?.achievement
          const issuer = typeof cred?.issuer === 'string'
            ? { id: cred.issuer, name: cred.issuer }
            : cred?.issuer

          const badgeData: OpenBadgeDisplayData = {
            achievementName: achievement?.name || record.derived?.title || 'Badge',
            achievementDescription: achievement?.description,
            achievementImage: achievement?.image?.id || achievement?.image,
            achievementType: achievement?.achievementType || 'Badge',
            criteria: achievement?.criteria?.narrative,
            issuerName: issuer?.name || record.derived?.issuerName,
            issuerImage: issuer?.image?.id || issuer?.image,
          }
          setBadge(badgeData)

          // Extract metadata
          const issuanceDate = cred?.issuanceDate || cred?.validFrom
          const expirationDate = cred?.expirationDate || cred?.validUntil
          setMetadata({
            issuedAt: issuanceDate ? new Date(issuanceDate).toLocaleDateString() : undefined,
            validUntil: expirationDate ? new Date(expirationDate).toLocaleDateString() : undefined,
          })
        } else {
          DeviceEventEmitter.emit(
            EventTypes.ERROR_ADDED,
            new BifoldError(
              t('Error.Title1033'),
              t('Error.Message1033'),
              t('CredentialDetails.CredentialNotFound'),
              1035
            )
          )
        }
      } catch (error) {
        DeviceEventEmitter.emit(
          EventTypes.ERROR_ADDED,
          new BifoldError(
            t('Error.Title1033'),
            t('Error.Message1033'),
            t('CredentialDetails.CredentialNotFound'),
            1035
          )
        )
      }
    }
    fetchCredential()
  }, [credentialId, getOpenBadgeCredentialById, agent, t, credentialRemoved])

  const toggleDeclineModalVisible = () => {
    if (credentialRemoved) {
      return
    }
    setIsRemoveModalDisplayed(!isRemoveModalDisplayed)
  }

  const handleDeclineTouched = async () => {
    setCredentialRemoved(true)
    setIsRemoveModalDisplayed(false)
    await new Promise((resolve) => setTimeout(resolve, 500))
    handleRemove()
  }

  const handleRemove = async () => {
    if (!credential) return
    try {
      await removeCredential(credential, OpenIDCredentialType.OpenBadge)
      navigation.pop()
    } catch (err) {
      const error = new BifoldError(
        t('Error.Title1025'),
        t('Error.Message1025'),
        (err as Error)?.message ?? err,
        1025
      )
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const renderBadgeImage = () => {
    if (badge?.achievementImage) {
      return (
        <Image
          source={{ uri: badge.achievementImage }}
          style={styles.badgeImage}
          resizeMode="contain"
          testID={testIdWithKey('OpenBadgeDetailImage')}
        />
      )
    }

    const initial = badge?.achievementName?.charAt(0).toUpperCase() || 'B'
    return (
      <View style={styles.placeholderImage}>
        <Text style={styles.placeholderText}>{initial}</Text>
      </View>
    )
  }

  if (!credential || !badge) return null

  return (
    <ScreenLayout screen={Screens.OpenBadgeDetails}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        testID={testIdWithKey('OpenBadgeDetailsScreen')}
      >
        {/* Badge Image */}
        <View style={styles.imageSection}>{renderBadgeImage()}</View>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text
            style={styles.achievementName}
            testID={testIdWithKey('OpenBadgeAchievementName')}
          >
            {badge.achievementName}
          </Text>
          <Text
            style={styles.achievementType}
            testID={testIdWithKey('OpenBadgeAchievementType')}
          >
            {badge.achievementType}
          </Text>
        </View>

        {/* Description Section */}
        {badge.achievementDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('OpenBadge.Description')}</Text>
            <Text
              style={styles.sectionContent}
              testID={testIdWithKey('OpenBadgeDescription')}
            >
              {badge.achievementDescription}
            </Text>
          </View>
        )}

        {/* Criteria Section */}
        {badge.criteria && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('OpenBadge.Criteria')}</Text>
            <Text
              style={styles.sectionContent}
              testID={testIdWithKey('OpenBadgeCriteria')}
            >
              {badge.criteria}
            </Text>
          </View>
        )}

        {/* Issuer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('CredentialDetails.IssuedBy')}</Text>
          <View style={styles.issuerRow}>
            {badge.issuerImage && (
              <Image
                source={{ uri: badge.issuerImage }}
                style={styles.issuerLogo}
                resizeMode="contain"
                testID={testIdWithKey('OpenBadgeIssuerLogo')}
              />
            )}
            <Text
              style={styles.issuerName}
              testID={testIdWithKey('OpenBadgeIssuerName')}
            >
              {badge.issuerName || t('ContactDetails.AContact')}
            </Text>
          </View>
        </View>

        {/* Metadata Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('CredentialDetails.Details')}</Text>

          {metadata.issuedAt && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>{t('CredentialDetails.Issued')}</Text>
              <Text
                style={styles.metadataValue}
                testID={testIdWithKey('OpenBadgeIssuedDate')}
              >
                {metadata.issuedAt}
              </Text>
            </View>
          )}

          {metadata.validUntil && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>{t('CredentialDetails.Expires')}</Text>
              <Text
                style={styles.metadataValue}
                testID={testIdWithKey('OpenBadgeExpiryDate')}
              >
                {metadata.validUntil}
              </Text>
            </View>
          )}

          <View style={[styles.metadataRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.metadataLabel}>{t('CredentialDetails.CredentialType')}</Text>
            <Text
              style={styles.metadataValue}
              testID={testIdWithKey('OpenBadgeCredentialType')}
            >
              {t('OpenBadge.OpenBadge')}
            </Text>
          </View>
        </View>

        {/* Remove Button */}
        <View style={styles.removeSection}>
          <RecordRemove onRemove={toggleDeclineModalVisible} />
        </View>
      </ScrollView>

      <CommonRemoveModal
        usage={ModalUsage.CredentialRemove}
        visible={isRemoveModalDisplayed}
        onSubmit={handleDeclineTouched}
        onCancel={toggleDeclineModalVisible}
      />
    </ScreenLayout>
  )
}

export default OpenBadgeDetails
