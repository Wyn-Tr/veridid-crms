import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, Pressable, FlatList, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { useCredentials, useConnectionById, useAgent } from '@credo-ts/react-hooks'
import { CredentialExchangeRecord, CredentialState, MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import Svg, { Defs, LinearGradient, Rect, Stop, SvgXml } from 'react-native-svg'

import { ESSIScreen, ESSIInfoCard } from '../../components/essi'
import { useOpenIDCredentials } from '../../modules/openid/context/OpenIDCredentialRecordProvider'
import { OpenIDCredentialType } from '../../modules/openid/types'
import { radius, spacing, typography } from '../../theme/essi'
import {
  isLightVisualCanvas,
  useWalletVisualPalette,
  type WalletVisualPalette,
} from '../../theme/essi'
import { Screens, Stacks } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'
import { getEffectiveCredentialName, ensureCredentialMetadata, getCredentialIdentifiers, toImageSource } from '../../utils/credential'
import { TOKENS, useServices } from '../../container-api'
import OpenIDCredentialCard from '../../modules/openid/components/OpenIDCredentialCard'
import { BrandingOverlay } from '@bifold/oca'
import { CredentialOverlay } from '@bifold/oca/build/legacy'
import { useSvgTemplate } from '../../hooks/useSvgTemplate'

interface CredentialAttribute {
  name: string
  value: string
}

// Issuer name mapping for demo credentials
const ISSUER_NAME_MAP: Record<string, { name: string; type: 'law' | 'education' | 'default' }> = {
  'demo-lawyer': { name: 'Law Bench', type: 'law' },
  'demo-student': { name: 'Digital University', type: 'education' },
  lawyer: { name: 'Law Bench', type: 'law' },
  student: { name: 'Digital University', type: 'education' },
}

// Clean credential name for consumer display (remove versions, technical suffixes)
const cleanCredentialName = (name: string): string => {
  if (!name) return ''

  let cleaned = name.trim()

  // If the name is just a version number like "v1", "v1.0", "V2", return empty
  if (/^[vV]\d+(\.\d+)*$/.test(cleaned)) {
    return ''
  }

  // Remove version patterns like "v1", "V1", "v2", "-v1", "_v1", " v1" at the end
  cleaned = cleaned.replace(/[\s_-]?[vV]\d+(\.\d+)*$/g, '')

  // Remove common technical suffixes
  cleaned = cleaned.replace(/[\s_-]?(Schema|Credential|Cred|Def)$/gi, '')

  // Clean up any trailing spaces, dashes, or underscores
  cleaned = cleaned.replace(/[\s_-]+$/g, '')

  return cleaned.trim()
}

// Friendly credential type names based on issuer
const getCredentialTypeLabel = (credentialType: 'law' | 'education' | 'default'): string => {
  switch (credentialType) {
    case 'law':
      return 'Legal Practice License'
    case 'education':
      return 'Student Credential'
    default:
      return 'Digital Credential'
  }
}

type CredentialCardTheme = {
  accent: string
  iconBg: string
  gradientStart: string
  gradientEnd: string
}

function credentialCardVisualThemes(p: WalletVisualPalette): Record<'law' | 'education' | 'default', CredentialCardTheme> {
  return {
    law: {
      accent: '#D4AF37',
      iconBg: '#2A2520',
      gradientStart: '#1E1B18',
      gradientEnd: '#2D2520',
    },
    education: {
      accent: '#4A90D9',
      iconBg: '#1A2530',
      gradientStart: '#181E28',
      gradientEnd: '#1E2835',
    },
    default: {
      accent: p.primary,
      iconBg: p.card,
      gradientStart: p.surfaceSecondary,
      gradientEnd: p.surfaceSecondary,
    },
  }
}

function buildCredentialListStyles(p: WalletVisualPalette) {
  return StyleSheet.create({
    listContainer: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    separator: {
      height: spacing.md,
    },
    openIdCardContainer: {
      borderRadius: radius.lg,
      backgroundColor: p.surfaceSecondary,
      borderWidth: 1,
      borderColor: p.outline,
      padding: spacing.xs,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    credentialCard: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    cardTopSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    cardTopRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    credentialIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeImage: {
      width: 56,
      height: 56,
      borderRadius: 12,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    typeBadgeText: {
      ...typography.caption,
      fontWeight: '600',
    },
    issuerTitle: {
      ...typography.headline,
      fontSize: 20,
      color: p.text,
      marginBottom: spacing.xs,
    },
    credentialType: {
      ...typography.body,
      fontWeight: '500',
      marginBottom: spacing.md,
    },
    divider: {
      height: 1,
      marginBottom: spacing.md,
    },
    attributesPreview: {
      gap: spacing.xs,
    },
    attributeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    attributeLabel: {
      ...typography.body,
      color: p.muted,
      flex: 1,
    },
    attributeValue: {
      ...typography.body,
      color: p.text,
      opacity: 0.8,
    },
    moreAttributes: {
      ...typography.caption,
      marginTop: spacing.xs,
    },
    accentLine: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
    },
  })
}

const getCredentialType = (issuer: string, credentialName: string): 'law' | 'education' | 'default' => {
  const lowerIssuer = issuer.toLowerCase()
  const lowerName = credentialName.toLowerCase()

  // Check issuer mapping
  for (const [key, value] of Object.entries(ISSUER_NAME_MAP)) {
    if (lowerIssuer.includes(key)) {
      return value.type
    }
  }

  // Check credential name for keywords
  if (lowerName.includes('lawyer') || lowerName.includes('law') || lowerName.includes('licence') || lowerName.includes('license') || lowerName.includes('bar') || lowerName.includes('legal')) {
    return 'law'
  }
  if (lowerName.includes('student') || lowerName.includes('university') || lowerName.includes('degree') || lowerName.includes('diploma') || lowerName.includes('education') || lowerName.includes('academic')) {
    return 'education'
  }

  return 'default'
}

const getDisplayIssuerName = (rawIssuer: string): string => {
  const lowerIssuer = rawIssuer.toLowerCase()

  for (const [key, value] of Object.entries(ISSUER_NAME_MAP)) {
    if (lowerIssuer.includes(key)) {
      return value.name
    }
  }

  return rawIssuer
}

// Get friendly display name for credential
const getDisplayCredentialName = (rawName: string, credentialType: 'law' | 'education' | 'default'): string => {
  const cleaned = cleanCredentialName(rawName)

  // If cleaned name is empty (was just a version), use type label
  if (!cleaned) {
    return getCredentialTypeLabel(credentialType)
  }

  // Check for specific keywords and return friendly names
  const lowerCleaned = cleaned.toLowerCase()
  if (lowerCleaned.includes('lawyer') || lowerCleaned.includes('licence') || lowerCleaned.includes('license')) {
    return 'Legal Practice License'
  }
  if (lowerCleaned.includes('student')) {
    return 'Student Credential'
  }

  return cleaned
}

interface CredentialCardProps {
  credential: CredentialExchangeRecord
  onPress: () => void
  testID?: string
  credentialName: string
  attributes?: CredentialAttribute[]
  agent: ReturnType<typeof useAgent>['agent']
}

const CredentialCard: React.FC<CredentialCardProps> = ({ credential, onPress, testID, credentialName, attributes = [], agent }) => {
  const { t, i18n } = useTranslation()
  const connection = useConnectionById(credential?.connectionId ?? '')
  const [bundleResolver] = useServices([TOKENS.UTIL_OCA_RESOLVER])
  const [overlay, setOverlay] = useState<CredentialOverlay<BrandingOverlay>>({})
  const gradientId = `essi-cred-list-gradient-${credential.id}`
  const palette = useWalletVisualPalette()
  const styles = useMemo(() => buildCredentialListStyles(palette), [palette])
  const cardThemes = useMemo(() => credentialCardVisualThemes(palette), [palette])

  // Get raw issuer from connection
  const rawIssuer = connection?.theirLabel || connection?.alias || t('Credentials.UnknownIssuer')

  // Get credential type first (needed for display name)
  const credentialType = getCredentialType(rawIssuer, credentialName)
  const theme = cardThemes[credentialType]

  // Get display names
  const displayIssuer = getDisplayIssuerName(rawIssuer)
  const displayName = getDisplayCredentialName(credentialName, credentialType)

  // Get first 3 attributes to display (masked)
  const displayAttributes = attributes.slice(0, 3)

  // Mask attribute value - show first 2 chars and mask the rest
  const maskValue = (value: string): string => {
    if (!value || value.length <= 2) return '•••'
    return value.substring(0, 2) + '•••'
  }

  // Get icon name based on credential type (using Feather icons)
  const getIconName = (): string => {
    switch (credentialType) {
      case 'law':
        return 'briefcase'
      case 'education':
        return 'book-open'
      default:
        return 'credit-card'
    }
  }

  // Get badge info based on credential type
  const getBadgeInfo = (): { text: string; icon: string } | null => {
    switch (credentialType) {
      case 'law':
        return { text: 'Legal', icon: 'shield' }
      case 'education':
        return { text: 'Academic', icon: 'award' }
      default:
        return null
    }
  }

  const badgeInfo = getBadgeInfo()

  useEffect(() => {
    const resolveOverlay = async () => {
      if (!agent) return

      let identifiers = getCredentialIdentifiers(credential)
      if (!identifiers?.credentialDefinitionId && !identifiers?.schemaId) {
        try {
          const { offer } = await agent.credentials.getFormatData(credential.id)
          const anonOffer = (offer as any)?.anoncreds ?? (offer as any)?.indy
          if (anonOffer?.schema_id || anonOffer?.cred_def_id) {
            identifiers = {
              schemaId: anonOffer?.schema_id,
              credentialDefinitionId: anonOffer?.cred_def_id,
            }
          }
        } catch {
          // ignore format data errors
        }
      }

      if (!identifiers?.credentialDefinitionId && !identifiers?.schemaId) return

      const params = {
        identifiers: {
          schemaId: identifiers?.schemaId ?? '',
          credentialDefinitionId: identifiers?.credentialDefinitionId ?? '',
        },
        meta: {
          alias: rawIssuer,
          credConnectionId: credential?.connectionId ?? undefined,
          credName: credentialName || t('Credentials.UnknownCredential'),
        },
        attributes,
        language: i18n.language,
      }

      try {
        const resolved = await bundleResolver.resolveAllBundles(params)
        setOverlay(resolved as CredentialOverlay<BrandingOverlay>)
      } catch {
        // Ignore overlay resolution errors
      }
    }

    resolveOverlay()
  }, [agent, attributes, bundleResolver, credential, credentialName, i18n.language, rawIssuer, t])

  const { svgXml } = useSvgTemplate(
    overlay.brandingOverlay as BrandingOverlay,
    attributes,
    { issuer: displayIssuer, name: displayName }
  )

  return (
    <Pressable
      style={[
        styles.credentialCard,
        { backgroundColor: theme.gradientStart, borderColor: theme.accent + '40' }
      ]}
      onPress={onPress}
      testID={testID}
    >
      <View style={StyleSheet.absoluteFill}>
        {svgXml ? (
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius.lg, overflow: 'hidden' }]}>
            <SvgXml xml={svgXml} width="100%" height="100%" />
          </View>
        ) : (
          <>
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  borderRadius: radius.lg,
                  backgroundColor: overlay.brandingOverlay?.primaryBackgroundColor || theme.gradientStart,
                },
              ]}
            />
            {overlay.brandingOverlay?.secondaryBackgroundColor && (
              <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={overlay.brandingOverlay?.primaryBackgroundColor || theme.gradientStart} />
                    <Stop
                      offset="100%"
                      stopColor={
                        overlay.brandingOverlay?.secondaryBackgroundColor ||
                        overlay.brandingOverlay?.primaryBackgroundColor ||
                        theme.gradientStart
                      }
                    />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={radius.lg} ry={radius.lg} fill={`url(#${gradientId})`} />
              </Svg>
            )}
            {overlay.brandingOverlay?.backgroundImage && (
              <Image
                source={toImageSource(overlay.brandingOverlay.backgroundImage)}
                style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg, opacity: 0.9 }]}
                resizeMode="cover"
                onError={(e) => {
                  console.info('[ESSICredentials] background image failed to load', {
                    uri: overlay.brandingOverlay?.backgroundImage,
                    error: e.nativeEvent?.error,
                  })
                }}
              />
            )}
          </>
        )}
      </View>
      {/* Top Section - Icon and Badge */}
      <View style={styles.cardTopSection}>
        <View style={[styles.credentialIcon, { backgroundColor: theme.iconBg }]}>
          <FeatherIcon name={getIconName()} size={28} color={theme.accent} />
        </View>
        <View style={styles.cardTopRight}>
          {badgeInfo && (
            <View style={[styles.typeBadge, { backgroundColor: theme.accent + '20' }]}>
              <FeatherIcon name={badgeInfo.icon} size={12} color={theme.accent} />
              <Text style={[styles.typeBadgeText, { color: theme.accent }]}>{badgeInfo.text}</Text>
            </View>
          )}
          <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
        </View>
      </View>

      {/* Issuer Name - Main Title */}
      <Text style={styles.issuerTitle} numberOfLines={1}>{displayIssuer}</Text>

      {/* Credential Type - Subtitle */}
      <Text style={[styles.credentialType, { color: theme.accent }]}>{displayName}</Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.accent + '30' }]} />

      {/* Attributes Preview */}
      {displayAttributes.length > 0 && (
        <View style={styles.attributesPreview}>
          {displayAttributes.map((attr, index) => (
            <View key={`${attr.name}-${index}`} style={styles.attributeRow}>
              <Text style={styles.attributeLabel} numberOfLines={1}>{attr.name}</Text>
              <Text style={styles.attributeValue}>{maskValue(attr.value)}</Text>
            </View>
          ))}
          {attributes.length > 3 && (
            <Text style={[styles.moreAttributes, { color: theme.accent }]}>
              {t('Credentials.MoreAttributes', { count: attributes.length - 3 })}
            </Text>
          )}
        </View>
      )}

      {/* Bottom accent line */}
      <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />
    </Pressable>
  )
}

interface CredentialData {
  name: string
  attributes: CredentialAttribute[]
}

// OpenBadge Card Component
interface OpenBadgeCardProps {
  record: OpenBadgeCredentialRecord
  onPress: () => void
  testID?: string
}

const OpenBadgeCard: React.FC<OpenBadgeCardProps> = ({ record, onPress, testID }) => {
  const palette = useWalletVisualPalette()
  const light = isLightVisualCanvas(palette.background)
  const styles = useMemo(() => buildCredentialListStyles(palette), [palette])
  const credential = record.credential as any
  // Handle credentialSubject being an array (OpenBadges 3.0 spec)
  const subject = Array.isArray(credential?.credentialSubject)
    ? credential.credentialSubject[0]
    : credential?.credentialSubject
  const achievement = subject?.achievement
  const issuer = typeof credential?.issuer === 'string'
    ? { id: credential.issuer, name: credential.issuer }
    : credential?.issuer

  const badgeImage = achievement?.image?.id || achievement?.image
  const badgeName = achievement?.name || record.derived?.title || 'Badge'
  const issuerName = issuer?.name || record.derived?.issuerName || 'Issuer'
  const badgeType = achievement?.achievementType || 'Badge'

  const accent = palette.primary
  const cardBg = light ? palette.surfaceSecondary : '#1A1F2E'
  const cardBorder = light ? palette.outline : `${accent}40`
  const iconBg = light ? palette.card : '#2A2F3E'

  return (
    <Pressable style={[styles.credentialCard, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={onPress} testID={testID}>
      <View style={styles.cardTopSection}>
        {badgeImage ? (
          <Image source={{ uri: badgeImage }} style={styles.badgeImage} resizeMode="contain" />
        ) : (
          <View style={[styles.credentialIcon, { backgroundColor: iconBg }]}>
            <FeatherIcon name="award" size={28} color={accent} />
          </View>
        )}
        <View style={styles.cardTopRight}>
          <View style={[styles.typeBadge, { backgroundColor: `${accent}33` }]}>
            <FeatherIcon name="award" size={12} color={accent} />
            <Text style={[styles.typeBadgeText, { color: accent }]}>{badgeType}</Text>
          </View>
          <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
        </View>
      </View>

      <Text style={styles.issuerTitle} numberOfLines={1}>
        {issuerName}
      </Text>
      <Text style={[styles.credentialType, { color: accent }]}>{badgeName}</Text>

      <View style={[styles.divider, { backgroundColor: `${accent}4D` }]} />

      {achievement?.description && (
        <Text style={[styles.attributeLabel, { marginBottom: spacing.sm }]} numberOfLines={2}>
          {achievement.description}
        </Text>
      )}

      <View style={[styles.accentLine, { backgroundColor: accent }]} />
    </Pressable>
  )
}

const ESSICredentials: React.FC = () => {
  const palette = useWalletVisualPalette()
  const sheet = useMemo(() => buildCredentialListStyles(palette), [palette])
  const emptySheet = useMemo(() => {
    const light = isLightVisualCanvas(palette.background)
    return StyleSheet.create({
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
      },
      emptyButtonsContainer: {
        marginTop: spacing.xl,
        gap: spacing.md,
        width: '100%',
      },
      addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: palette.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
      },
      addButtonSecondary: light
        ? {
            /** Dark gray CTA — not pure black (VeriDID reference) */
            backgroundColor: '#4A4A4A',
            borderWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
          }
        : {
            backgroundColor: palette.surfaceSecondary,
            borderWidth: 1,
            borderColor: palette.outline,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            borderRadius: radius.lg,
          },
      addButtonTextPrimary: {
        ...typography.bodyBold,
        /** Primary pink CTA: white label (VeriDID) */
        color: light ? palette.surface : palette.buttonText,
      },
      addButtonTextSecondary: {
        ...typography.bodyBold,
        color: light ? palette.surface : palette.text,
      },
    })
  }, [palette])

  const emptyPrimaryCtaIconColor = isLightVisualCanvas(palette.background) ? palette.surface : palette.buttonText

  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { records: credentials } = useCredentials()
  const { agent } = useAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [credentialData, setCredentialData] = useState<Record<string, CredentialData>>({})
  const {
    openIdState: { w3cCredentialRecords, sdJwtVcRecords, mdocVcRecords },
  } = useOpenIDCredentials()

  const acceptedCredentials = useMemo(
    () =>
      credentials.filter(
        (credential) =>
          credential.state === CredentialState.CredentialReceived || credential.state === CredentialState.Done
      ),
    [credentials]
  )

  const allCredentials = useMemo(() => {
    const openIdCredentials = [...w3cCredentialRecords, ...sdJwtVcRecords, ...mdocVcRecords]
    return [...acceptedCredentials, ...openIdCredentials].sort(
      (a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf()
    )
  }, [acceptedCredentials, w3cCredentialRecords, sdJwtVcRecords, mdocVcRecords])

  // Ensure metadata is loaded for all credentials and resolve names + attributes
  useEffect(() => {
    const resolveCredentialData = async () => {
      if (!acceptedCredentials || !agent) return

      const data: Record<string, CredentialData> = {}
      for (const credential of acceptedCredentials) {
        try {
          // Ensure metadata is cached
          await ensureCredentialMetadata(credential, agent, undefined, logger)
          // Get the effective name
          const name = getEffectiveCredentialName(credential) || t('Credentials.UnknownCredential')

          // Get attributes
          let attrs: CredentialAttribute[] = []
          if (credential.credentialAttributes && credential.credentialAttributes.length > 0) {
            attrs = credential.credentialAttributes
              .filter(attr => attr.value && attr.value.trim() !== '')
              .map(attr => ({ name: attr.name, value: attr.value }))
          }

          // If no attributes on credential, try format data
          if (attrs.length === 0) {
            try {
              const formatData = await agent.credentials.getFormatData(credential.id)
              const { offerAttributes, credential: credData } = formatData

              if (offerAttributes && offerAttributes.length > 0) {
                attrs = offerAttributes
                  .filter((attr: any) => attr.value && attr.value.trim() !== '')
                  .map((attr: any) => ({ name: attr.name, value: attr.value }))
              } else if (credData) {
                const anonCredsData = (credData.anoncreds ?? credData.indy) as
                  | { values?: Record<string, { raw: string }> }
                  | undefined
                if (anonCredsData?.values) {
                  attrs = Object.entries(anonCredsData.values)
                    .filter(([_, val]: [string, any]) => val?.raw && val.raw.trim() !== '')
                    .map(([attrName, val]: [string, any]) => ({ name: attrName, value: val.raw }))
                }
              }
            } catch (e) {
              // Ignore format data errors
            }
          }

          data[credential.id] = { name, attributes: attrs }
        } catch (error) {
          data[credential.id] = {
            name: getEffectiveCredentialName(credential) || t('Credentials.UnknownCredential'),
            attributes: []
          }
        }
      }
      setCredentialData(data)
    }

    resolveCredentialData()
  }, [acceptedCredentials, agent, logger, t])

  const handleCredentialPress = (credentialId: string) => {
    navigation.navigate(Screens.ESSICredentialDetails as any, { credentialId })
  }

  const handleAddCredential = () => {
    // Navigate to scan screen to scan a credential offer
    navigation.navigate(Stacks.ConnectStack as any, { screen: Screens.Scan })
  }

  const handleAddGovernmentID = () => {
    // Navigate to government ID types list
    navigation.navigate(Screens.ESSIGovernmentIDTypes as any)
  }

  const renderEmptyState = () => (
    <View style={emptySheet.emptyContainer}>
      <ESSIInfoCard
        icon={<FeatherIcon name="credit-card" size={48} color={palette.text} />}
        title={t('Credentials.EmptyList')}
        subtitle={t('Credentials.GetVerifiableCredentials')}
        testID={testIdWithKey('CredentialsEmptyState')}
      />
      <View style={emptySheet.emptyButtonsContainer}>
        <Pressable style={emptySheet.addButton} onPress={handleAddCredential} testID={testIdWithKey('AddCredentialButton')}>
          <FeatherIcon name="plus" size={20} color={emptyPrimaryCtaIconColor} />
          <Text style={emptySheet.addButtonTextPrimary}>{t('Credentials.AddCredential')}</Text>
        </Pressable>
        <Pressable style={emptySheet.addButtonSecondary} onPress={handleAddGovernmentID} testID={testIdWithKey('AddGovernmentIDButton')}>
          <FeatherIcon name="shield" size={20} color={emptySheet.addButtonTextSecondary.color} />
          <Text style={emptySheet.addButtonTextSecondary}>{t('Credentials.AddGovernmentID')}</Text>
        </Pressable>
      </View>
    </View>
  )

  const renderCredentialItem = ({
    item,
  }: {
    item: CredentialExchangeRecord | W3cCredentialRecord | SdJwtVcRecord | MdocRecord
  }) => {
    if (item instanceof W3cCredentialRecord) {
      return (
        <View style={sheet.openIdCardContainer}>
          <OpenIDCredentialCard
            credentialRecord={item}
            onPress={() =>
              navigation.navigate(Screens.OpenIDCredentialDetails as any, {
                credentialId: item.id,
                type: OpenIDCredentialType.W3cCredential,
              })
            }
          />
        </View>
      )
    }

    if (item instanceof SdJwtVcRecord) {
      return (
        <View style={sheet.openIdCardContainer}>
          <OpenIDCredentialCard
            credentialRecord={item}
            onPress={() =>
              navigation.navigate(Screens.OpenIDCredentialDetails as any, {
                credentialId: item.id,
                type: OpenIDCredentialType.SdJwtVc,
              })
            }
          />
        </View>
      )
    }

    if (item instanceof MdocRecord) {
      return (
        <View style={sheet.openIdCardContainer}>
          <OpenIDCredentialCard
            credentialRecord={item}
            onPress={() =>
              navigation.navigate(Screens.OpenIDCredentialDetails as any, {
                credentialId: item.id,
                type: OpenIDCredentialType.Mdoc,
              })
            }
          />
        </View>
      )
    }

    const data = credentialData[item.id] || { name: t('Credentials.UnknownCredential'), attributes: [] }
    return (
      <CredentialCard
        credential={item as CredentialExchangeRecord}
        credentialName={data.name}
        attributes={data.attributes}
        agent={agent}
        onPress={() => handleCredentialPress(item.id)}
        testID={testIdWithKey(`Credential-${item.id}`)}
      />
    )
  }

  return (
    <ESSIScreen
      headerTitle={t('Screens.Credentials')}
      headerRight={
        allCredentials.length > 0 ? (
          <Pressable
            onPress={handleAddCredential}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testIdWithKey('AddCredentialHeaderButton')}
          >
            <FeatherIcon name="plus" size={22} color={palette.buttonText} />
          </Pressable>
        ) : null
      }
      testID={testIdWithKey('Credentials')}
      scrollable={false}
    >
      {allCredentials.length > 0 ? (
        <FlatList
          data={allCredentials}
          renderItem={renderCredentialItem}
          keyExtractor={(item) => {
            if (item instanceof W3cCredentialRecord) return `w3c-${item.id}`
            if (item instanceof SdJwtVcRecord) return `sdjwt-${item.id}`
            if (item instanceof MdocRecord) return `mdoc-${item.id}`
            return `anon-${item.id}`
          }}
          contentContainerStyle={sheet.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={sheet.separator} />}
        />
      ) : (
        renderEmptyState()
      )}
    </ESSIScreen>
  )
}

export default ESSICredentials
