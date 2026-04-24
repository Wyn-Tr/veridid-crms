import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native'
import DocumentPicker from 'react-native-document-picker'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { useAgent } from '@credo-ts/react-hooks'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { AadharZipExtractor, AadharKYCStorageService, AadharSignatureVerifier } from '../../services/aadharKYC'
import { testIdWithKey } from '../../utils/testable'

const ESSIAadharImport: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { agent } = useAgent()
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.zip],
      })

      if (result && result[0]) {
        setSelectedFile({
          uri: result[0].uri,
          name: result[0].name || 'Unknown',
        })
        setError(null)
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        setError(t('Global.Failure'))
      }
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !password || !agent) return

    setLoading(true)
    setError(null)

    try {
      // Extract XML from zip
      const extractedData = await AadharZipExtractor.extractXMLFromZip(selectedFile.uri, password)

      // Verify signature (basic check for now)
      const isSignatureValid = AadharSignatureVerifier.verifyXMLSignature(extractedData.xmlContent)

      if (!isSignatureValid) {
        throw new Error(t('AadharKYC.SignatureVerificationFailed'))
      }

      // Store in Askar
      const storageService = new AadharKYCStorageService(agent)
      await storageService.storeKYCDocument({
        xmlDataBase64: extractedData.xmlBase64,
        fileName: extractedData.fileName,
        sha256Hash: extractedData.sha256Hash,
        fileSize: extractedData.fileSize,
        zipHash: extractedData.zipHash,
      })

      // Success
      Alert.alert(t('Global.Success'), t('AadharKYC.ImportSuccess'), [
        {
          text: t('Global.OK'),
          onPress: () => navigation.goBack(),
        },
      ])

      // Clear form
      setSelectedFile(null)
      setPassword('')
    } catch (err) {
      const errorMessage = (err as Error).message || t('AadharKYC.ImportFailed')
      setError(errorMessage)
      Alert.alert(t('AadharKYC.ImportFailed'), errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ESSIScreen headerTitle="Import Aadhar" scrollable>
      <View style={styles.container}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <FeatherIcon name="shield" size={20} color={palette.primary} />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>{t('AadharKYC.SecureImport')}</Text>
            <Text style={styles.infoBannerText}>{t('AadharKYC.SecureImportDescription')}</Text>
          </View>
        </View>

        {/* File Picker */}
        <Pressable style={styles.filePickerButton} onPress={handleFilePick} testID={testIdWithKey('SelectZipFile')}>
          <View style={styles.fileIconContainer}>
            <FeatherIcon name="file" size={24} color={palette.primary} />
          </View>
          <View style={styles.fileTextContainer}>
            <Text style={styles.filePickerLabel}>
              {selectedFile ? selectedFile.name : t('AadharKYC.SelectZipFile')}
            </Text>
            <Text style={styles.filePickerHint}>{t('AadharKYC.ChooseKYCZip')}</Text>
          </View>
          <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
        </Pressable>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('AadharKYC.ZipPassword')}</Text>
          <TextInput
            style={styles.passwordInput}
            placeholder={t('AadharKYC.EnterPassword')}
            placeholderTextColor={palette.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID={testIdWithKey('PasswordInput')}
          />
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <FeatherIcon name="alert-circle" size={16} color={palette.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Import Button */}
        <ESSIButton
          variant="primary"
          onPress={handleImport}
          disabled={!selectedFile || !password || loading}
          loading={loading}
          fullWidth
          testID={testIdWithKey('ImportButton')}
        >
          {t('AadharKYC.ImportDocument')}
        </ESSIButton>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <View style={styles.securityItem}>
            <FeatherIcon name="lock" size={16} color={palette.success} />
            <Text style={styles.securityText}>{t('AadharKYC.EndToEndEncrypted')}</Text>
          </View>
          <View style={styles.securityItem}>
            <FeatherIcon name="check-circle" size={16} color={palette.success} />
            <Text style={styles.securityText}>{t('AadharKYC.SignaturePreserved')}</Text>
          </View>
          <View style={styles.securityItem}>
            <FeatherIcon name="shield" size={16} color={palette.success} />
            <Text style={styles.securityText}>{t('AadharKYC.IntegrityVerified')}</Text>
          </View>
        </View>
      </View>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: palette.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.primary + '30',
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  infoBannerText: {
    ...typography.caption,
    color: palette.muted,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceSecondary,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTextContainer: {
    flex: 1,
  },
  filePickerLabel: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  filePickerHint: {
    ...typography.caption,
    color: palette.muted,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.bodyBold,
    color: palette.text,
  },
  passwordInput: {
    ...typography.body,
    color: palette.text,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.danger + '20',
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
    flex: 1,
  },
  securityInfo: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityText: {
    ...typography.caption,
    color: palette.muted,
  },
})

export default ESSIAadharImport
