import type { StackScreenProps } from '@react-navigation/stack'

import { CredentialExchangeRecord } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, StyleSheet, View, Text, ScrollView, Pressable, Alert, Image } from 'react-native'
import Toast from 'react-native-toast-message'
import FeatherIcon from 'react-native-vector-icons/Feather'
import Svg, { Defs, LinearGradient, Rect, Stop, SvgXml } from 'react-native-svg'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { EventTypes } from '../../constants'
import { TOKENS, useServices } from '../../container-api'
import { BifoldError } from '../../types/error'
import { CredentialMetadata } from '../../types/metadata'
import { RootStackParams, Screens, Stacks } from '../../types/navigators'
import {
  isValidAnonCredsCredential,
  getEffectiveCredentialName,
  ensureCredentialMetadata,
  getCredentialIdentifiers,
  toImageSource,
} from '../../utils/credential'
import { formatTime, useCredentialConnectionLabel } from '../../utils/helpers'
import { testIdWithKey } from '../../utils/testable'
import { ToastType } from '../../components/toast/BaseToast'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { useConnectionById } from '@credo-ts/react-hooks'
import { BrandingOverlay } from '@bifold/oca'
import { CredentialOverlay } from '@bifold/oca/build/legacy'
import { useSvgTemplate } from '../../hooks/useSvgTemplate'

interface CredentialAttribute {
  name: string
  value: string
}

type ESSICredentialDetailsProps = StackScreenProps<RootStackParams, Screens.CredentialDetails>

interface AttributeRowProps {
  label: string
  value: string
  testID?: string
}

const AttributeRow: React.FC<AttributeRowProps> = ({ label, value, testID }) => {
  return (
    <View style={styles.attributeRow} testID={testID}>
      <Text style={styles.attributeLabel}>{label}</Text>
      <Text style={styles.attributeValue}>{value || '-'}</Text>
    </View>
  )
}

const ESSICredentialDetails: React.FC<ESSICredentialDetailsProps> = ({ navigation, route }) => {
  if (!route?.params) {
    throw new Error('ESSICredentialDetails route params were not set properly')
  }

  const { credentialId } = route.params
  const [credential, setCredential] = useState<CredentialExchangeRecord | undefined>(undefined)
  const { agent } = useAgent()
  const { t, i18n } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [bundleResolver] = useServices([TOKENS.UTIL_OCA_RESOLVER])
  const [isRevoked, setIsRevoked] = useState<boolean>(false)
  const [revocationDate, setRevocationDate] = useState<string>('')
  const [credentialName, setCredentialName] = useState<string>('')
  const [attributes, setAttributes] = useState<CredentialAttribute[]>([])
  const credentialConnectionLabel = useCredentialConnectionLabel(credential)
  const connection = useConnectionById(credential?.connectionId ?? '')
  const issuerName = connection?.theirLabel || connection?.alias || credentialConnectionLabel || t('Credentials.UnknownIssuer')
  const [overlay, setOverlay] = useState<CredentialOverlay<BrandingOverlay>>({})
  const [identifiers, setIdentifiers] = useState<{ credentialDefinitionId?: string; schemaId?: string }>({})
  const gradientId = `essi-detail-gradient-${credentialId}`

  useEffect(() => {
    // fetch credential for ID
    const fetchCredential = async () => {
      try {
        const credentialExchangeRecord = await agent?.credentials.getById(credentialId)
        setCredential(credentialExchangeRecord)
      } catch (error) {
        DeviceEventEmitter.emit(
          EventTypes.ERROR_ADDED,
          new BifoldError(t('Error.Title1033'), t('Error.Message1033'), t('CredentialDetails.CredentialNotFound'), 1033)
        )
      }
    }
    fetchCredential()
  }, [credentialId, agent, t])

  useEffect(() => {
    if (!credential) return
    const current = getCredentialIdentifiers(credential)
    if (current?.credentialDefinitionId || current?.schemaId) {
      setIdentifiers(current)
      return
    }

    const resolveIds = async () => {
      if (!agent) return
      try {
        const { offer } = await agent.credentials.getFormatData(credential.id)
        const anonOffer = (offer as any)?.anoncreds ?? (offer as any)?.indy
        if (anonOffer?.schema_id || anonOffer?.cred_def_id) {
          setIdentifiers({
            schemaId: anonOffer?.schema_id,
            credentialDefinitionId: anonOffer?.cred_def_id,
          })
        }
      } catch {
        // Ignore resolution errors
      }
    }

    resolveIds()
  }, [agent, credential])

  useEffect(() => {
    if (!agent) {
      DeviceEventEmitter.emit(
        EventTypes.ERROR_ADDED,
        new BifoldError(t('Error.Title1033'), t('Error.Message1033'), t('CredentialDetails.CredentialNotFound'), 1033)
      )
    }
  }, [agent, t])

  // Ensure metadata, resolve credential name, and fetch attributes
  useEffect(() => {
    if (!credential || !agent) {
      return
    }

    const resolveCredentialDetails = async () => {
      try {
        // Ensure metadata is cached
        if (isValidAnonCredsCredential(credential)) {
          await ensureCredentialMetadata(credential, agent, undefined, logger)
        }

        const name = getEffectiveCredentialName(credential) || t('Credentials.UnknownCredential')
        setCredentialName(name)

        // Try to get attributes from credential record first
        let credAttrs: CredentialAttribute[] = []

        if (credential.credentialAttributes && credential.credentialAttributes.length > 0) {
          credAttrs = credential.credentialAttributes
            .filter(attr => attr.value && attr.value.trim() !== '')
            .map(attr => ({
              name: attr.name,
              value: attr.value,
            }))
        }

        // If no attributes on credential, try to get from format data
        if (credAttrs.length === 0) {
          try {
            const formatData = await agent.credentials.getFormatData(credential.id)
            const { offerAttributes, credential: credData } = formatData

            // Try offerAttributes first (available during offer phase)
            if (offerAttributes && offerAttributes.length > 0) {
              credAttrs = offerAttributes
                .filter((attr: any) => attr.value && attr.value.trim() !== '')
                .map((attr: any) => ({
                  name: attr.name,
                  value: attr.value,
                }))
            }

            // Try credential data (for issued credentials)
            if (credAttrs.length === 0 && credData) {
              const anonCredsData = (credData.anoncreds ?? credData.indy) as { values?: Record<string, { raw: string }> } | undefined
              if (anonCredsData?.values) {
                credAttrs = Object.entries(anonCredsData.values)
                  .filter(([_, val]: [string, any]) => val?.raw && val.raw.trim() !== '')
                  .map(([name, val]: [string, any]) => ({
                    name,
                    value: val.raw,
                  }))
              }
            }

            logger?.debug('Format data retrieved', {
              hasOfferAttributes: !!offerAttributes?.length,
              hasCredData: !!credData,
              attributesFound: credAttrs.length
            })
          } catch (formatError) {
            logger?.warn('Failed to get format data', { error: formatError })
          }
        }

        setAttributes(credAttrs)
      } catch (error) {
        setCredentialName(getEffectiveCredentialName(credential) || t('Credentials.UnknownCredential'))
        logger?.warn('Failed to restore credential metadata', { error: error as Error })
      }
    }
    resolveCredentialDetails()
  }, [credential, agent, logger, t])

  useEffect(() => {
    const resolveOverlay = async () => {
      if (!identifiers?.credentialDefinitionId && !identifiers?.schemaId) return

      const params = {
        identifiers: {
          schemaId: identifiers?.schemaId ?? '',
          credentialDefinitionId: identifiers?.credentialDefinitionId ?? '',
        },
        meta: {
          alias: issuerName,
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
  }, [attributes, bundleResolver, credential, credentialName, identifiers, issuerName, t])

  useEffect(() => {
    if (!(credential && isValidAnonCredsCredential(credential))) {
      return
    }

    credential.revocationNotification == undefined ? setIsRevoked(false) : setIsRevoked(true)
    if (credential?.revocationNotification?.revocationDate) {
      const date = new Date(credential.revocationNotification.revocationDate)
      setRevocationDate(formatTime(date, { shortMonth: true }))
    }
  }, [credential])

  useEffect(() => {
    if (credential?.revocationNotification) {
      const meta = credential.metadata.get(CredentialMetadata.customMetadata)
      credential.metadata.set(CredentialMetadata.customMetadata, { ...meta, revoked_seen: true })
      agent?.credentials.update(credential)
    }
  }, [credential, agent])

  const handleRemoveCredential = useCallback(async () => {
    Alert.alert(
      t('CredentialDetails.RemoveTitle'),
      t('CredentialDetails.RemoveCaption'),
      [
        {
          text: t('Global.Cancel'),
          style: 'cancel',
        },
        {
          text: t('Global.Remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (!(agent && credential)) {
                return
              }

              await agent.credentials.deleteById(credential.id)
              navigation.goBack()

              setTimeout(() => {
                Toast.show({
                  type: ToastType.Success,
                  text1: t('CredentialDetails.CredentialRemoved'),
                })
              }, 500)
            } catch (err: unknown) {
              const error = new BifoldError(t('Error.Title1032'), t('Error.Message1032'), (err as Error)?.message ?? err, 1032)
              DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
            }
          },
        },
      ],
      { cancelable: true }
    )
  }, [agent, credential, navigation, t])

  const formatIssuedDate = (date: Date | string | undefined): string => {
    if (!date) return ''
    try {
      const d = date instanceof Date ? date : new Date(date)
      return formatTime(d, { shortMonth: true })
    } catch {
      return ''
    }
  }

  const { svgXml } = useSvgTemplate(
    overlay.brandingOverlay as BrandingOverlay,
    attributes,
    { issuer: issuerName, name: credentialName }
  )

  return (
    <ESSIScreen
      headerTitle={t('Screens.CredentialDetails')}
      headerLeft="back"
      onHeaderLeftPress={() => navigation.goBack()}
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
      testID={testIdWithKey('CredentialDetails')}
      scrollable={false}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Credential Card Header */}
        <View style={styles.credentialCard}>
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
                      backgroundColor: overlay.brandingOverlay?.primaryBackgroundColor || palette.surfaceSecondary,
                    },
                  ]}
                />
                {overlay.brandingOverlay?.secondaryBackgroundColor && (
                  <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                    <Defs>
                      <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={overlay.brandingOverlay?.primaryBackgroundColor || palette.surfaceSecondary} />
                        <Stop
                          offset="100%"
                          stopColor={overlay.brandingOverlay?.secondaryBackgroundColor || overlay.brandingOverlay?.primaryBackgroundColor || palette.surfaceSecondary}
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
                      console.info('[ESSICredentialDetails] background image failed to load', {
                        uri: overlay.brandingOverlay?.backgroundImage,
                        error: e.nativeEvent?.error,
                      })
                    }}
                  />
                )}
              </>
            )}
          </View>
          <View style={styles.credentialIcon}>
            <FeatherIcon name="credit-card" size={32} color={palette.text} />
          </View>
          <Text style={styles.credentialName} numberOfLines={2}>
            {credentialName || t('Credentials.UnknownCredential')}
          </Text>
          <Text style={styles.issuerName}>{issuerName}</Text>

          {/* Status Badge */}
          <View style={[styles.statusBadge, isRevoked ? styles.statusRevoked : styles.statusActive]}>
            <FeatherIcon
              name={isRevoked ? 'x-circle' : 'check-circle'}
              size={14}
              color={isRevoked ? palette.danger : palette.success}
            />
            <Text style={[styles.statusText, { color: isRevoked ? palette.danger : palette.success }]}>
              {isRevoked ? t('CredentialDetails.Revoked') : t('CredentialDetails.Active')}
            </Text>
          </View>

          {isRevoked && revocationDate && (
            <Text style={styles.revocationDate}>
              {t('CredentialDetails.Revoked')}: {revocationDate}
            </Text>
          )}
        </View>

        {/* Issued Date */}
        {credential?.createdAt && (
          <View style={styles.metaRow}>
            <FeatherIcon name="calendar" size={16} color={palette.muted} />
            <Text style={styles.metaText}>
              {t('CredentialDetails.Issued')}: {formatIssuedDate(credential.createdAt)}
            </Text>
          </View>
        )}

        {/* Credential Attributes */}
        {attributes.length > 0 && (
          <View style={styles.attributesSection}>
            <Text style={styles.sectionTitle}>{t('CredentialDetails.Attributes')}</Text>
            <View style={styles.attributesContainer}>
              {attributes.map((attr, index) => (
                <AttributeRow
                  key={`${attr.name}-${index}`}
                  label={attr.name}
                  value={attr.value}
                  testID={testIdWithKey(`Attribute-${attr.name}`)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Issuer Section */}
        <View style={styles.issuerSection}>
          <Text style={styles.sectionTitle}>{t('CredentialDetails.IssuedBy')}</Text>
          <Pressable
            style={styles.issuerCard}
            onPress={() => {
              if (credential?.connectionId) {
                navigation.navigate(Stacks.ContactStack as any, {
                  screen: Screens.ContactDetails,
                  params: { connectionId: credential.connectionId },
                })
              }
            }}
          >
            <View style={styles.issuerAvatar}>
              <FeatherIcon name="user" size={20} color={palette.text} />
            </View>
            <Text style={styles.issuerCardText}>{issuerName}</Text>
            <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Remove Button */}
      <View style={styles.buttonContainer}>
        <ESSIButton
          title={t('CredentialDetails.RemoveFromWallet')}
          onPress={handleRemoveCredential}
          variant="danger"
          testID={testIdWithKey('RemoveCredential')}
        />
      </View>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  credentialCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  credentialIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  credentialName: {
    ...typography.headline,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  issuerName: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusActive: {
    backgroundColor: palette.success + '20',
  },
  statusRevoked: {
    backgroundColor: palette.danger + '20',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  revocationDate: {
    ...typography.caption,
    color: palette.danger,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  metaText: {
    ...typography.caption,
    color: palette.muted,
  },
  attributesSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.overline,
    color: palette.muted,
    marginBottom: spacing.md,
  },
  attributesContainer: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: 'hidden',
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  attributeLabel: {
    ...typography.bodyBold,
    color: palette.text,
    flex: 1,
  },
  attributeValue: {
    ...typography.body,
    color: palette.muted,
    flex: 1,
    textAlign: 'right',
  },
  issuerSection: {
    marginBottom: spacing.lg,
  },
  issuerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.outline,
    gap: spacing.md,
  },
  issuerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issuerCardText: {
    ...typography.body,
    color: palette.text,
    flex: 1,
  },
  buttonContainer: {
    paddingTop: spacing.md,
  },
})

export default ESSICredentialDetails
