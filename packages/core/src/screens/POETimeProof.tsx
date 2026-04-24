import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StackScreenProps } from '@react-navigation/stack'
import Icon from 'react-native-vector-icons/MaterialIcons'

import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { testIdWithKey } from '../utils/testable'
import Button, { ButtonType } from '../components/buttons/Button'
import { Screens, SettingStackParams } from '../types/navigators'
import { palette, spacing, radius } from '../theme/essi'

type POETimeProofProps = StackScreenProps<SettingStackParams, Screens.POETimeProof>

interface TimeProofResult {
  deviceTimestamp: number
  blockchainTimestamp: number
  blockNumber: number
  blockHash: string
  drift: number
  isValid: boolean
}

const POETimeProof: React.FC<POETimeProofProps> = () => {
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [proofResult, setProofResult] = useState<TimeProofResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    infoCard: {
      backgroundColor: palette.surfaceSecondary,
      padding: spacing.lg,
      borderRadius: radius.lg,
      marginBottom: spacing.lg,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      marginBottom: spacing.sm,
    },
    infoText: {
      fontSize: 14,
      color: palette.muted,
      lineHeight: 22,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      marginBottom: spacing.md,
      marginTop: spacing.md,
    },
    processCard: {
      backgroundColor: palette.card,
      padding: spacing.lg,
      borderRadius: radius.lg,
      marginBottom: spacing.lg,
    },
    processStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: palette.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    stepNumberText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: '600',
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: palette.muted,
      lineHeight: 22,
    },
    buttonContainer: {
      marginVertical: spacing.lg,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: 14,
      color: palette.muted,
    },
    resultCard: {
      backgroundColor: palette.card,
      padding: spacing.lg,
      borderRadius: radius.lg,
      marginTop: spacing.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    successCard: {
      borderColor: palette.success,
      backgroundColor: 'rgba(76, 217, 100, 0.1)',
    },
    errorCard: {
      borderColor: palette.danger,
      backgroundColor: 'rgba(255, 77, 79, 0.1)',
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      marginLeft: spacing.sm,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: palette.outline,
    },
    resultLabel: {
      fontSize: 14,
      color: palette.muted,
    },
    resultValue: {
      fontSize: 14,
      fontWeight: '500',
      color: palette.text,
      maxWidth: '60%',
      textAlign: 'right',
    },
    statusValid: {
      color: palette.success,
      fontWeight: '600',
    },
    statusInvalid: {
      color: palette.danger,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 14,
      color: palette.danger,
      marginTop: spacing.sm,
    },
    lastProofCard: {
      backgroundColor: palette.card,
      padding: spacing.lg,
      borderRadius: radius.lg,
      marginTop: spacing.lg,
    },
  })

  const generateProof = async () => {
    setIsGenerating(true)
    setError(null)
    setProofResult(null)

    try {
      const poeProofs = await import('@ajna-inc/poe-proofs')

      const result = await poeProofs.generateTimeProofPOE({
        nonce: Date.now(),
        contextHash: Math.floor(Math.random() * 1000000),
        sessionId: Math.floor(Math.random() * 1000000),
        deviceTimestamp: Math.floor(Date.now() / 1000),
        tolerance: 300,
      })

      const proofData: TimeProofResult = {
        deviceTimestamp: result.deviceTimestamp,
        blockchainTimestamp: result.blockchainTimestamp,
        blockNumber: result.blockNumber,
        blockHash: result.blockHash,
        drift: result.drift,
        isValid: result.isValid,
      }

      setProofResult(proofData)

      dispatch({
        type: DispatchAction.POE_UPDATE_LAST_TIME_PROOF,
        payload: [{
          timestamp: proofData.deviceTimestamp,
          blockNumber: proofData.blockNumber,
          drift: proofData.drift,
          isValid: proofData.isValid,
          blockHash: proofData.blockHash,
        }],
      })

      if (proofData.isValid) {
        Alert.alert('Success', `Time proof generated. Drift: ${proofData.drift}s`)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      Alert.alert('Error', errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const truncateHash = (hash: string): string => {
    if (hash.length <= 20) return hash
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What is a Time Proof?</Text>
          <Text style={styles.infoText}>
            A Time Proof cryptographically proves that your device's clock is synchronized with the Ethereum blockchain, without revealing your exact timestamp.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>How it works</Text>

        <View style={styles.processCard}>
          <View style={styles.processStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Your device time is captured</Text>
          </View>

          <View style={styles.processStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>The latest Ethereum block is fetched</Text>
          </View>

          <View style={styles.processStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>A zero-knowledge proof is generated</Text>
          </View>

          <View style={[styles.processStep, { marginBottom: 0 }]}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>The proof can be verified by anyone</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isGenerating ? 'Generating...' : 'Generate Time Proof'}
            accessibilityLabel="Generate Time Proof"
            testID={testIdWithKey('GenerateTimeProof')}
            onPress={generateProof}
            buttonType={ButtonType.Primary}
            disabled={isGenerating}
          />
        </View>

        {isGenerating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>Generating zero-knowledge proof...</Text>
          </View>
        )}

        {proofResult && (
          <View style={[styles.resultCard, proofResult.isValid ? styles.successCard : styles.errorCard]}>
            <View style={styles.resultHeader}>
              <Icon
                name={proofResult.isValid ? 'check-circle' : 'error'}
                size={24}
                color={proofResult.isValid ? palette.success : palette.danger}
              />
              <Text style={styles.resultTitle}>Proof Result</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Status</Text>
              <Text style={[styles.resultValue, proofResult.isValid ? styles.statusValid : styles.statusInvalid]}>
                {proofResult.isValid ? 'Valid' : 'Invalid'}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Device Time</Text>
              <Text style={styles.resultValue}>{formatTimestamp(proofResult.deviceTimestamp)}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Blockchain Time</Text>
              <Text style={styles.resultValue}>{formatTimestamp(proofResult.blockchainTimestamp)}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Block Number</Text>
              <Text style={styles.resultValue}>#{proofResult.blockNumber.toLocaleString()}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Block Hash</Text>
              <Text style={styles.resultValue}>{truncateHash(proofResult.blockHash)}</Text>
            </View>

            <View style={[styles.resultRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.resultLabel}>Time Drift</Text>
              <Text style={styles.resultValue}>{proofResult.drift}s</Text>
            </View>
          </View>
        )}

        {error && !proofResult && (
          <View style={[styles.resultCard, styles.errorCard]}>
            <View style={styles.resultHeader}>
              <Icon name="error" size={24} color={palette.danger} />
              <Text style={styles.resultTitle}>Error</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {store.preferences.poeLastTimeProof && !proofResult && !isGenerating && (
          <View style={styles.lastProofCard}>
            <View style={styles.resultHeader}>
              <Icon name="history" size={24} color={palette.primary} />
              <Text style={styles.resultTitle}>Last Time Proof</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Generated</Text>
              <Text style={styles.resultValue}>
                {formatTimestamp(store.preferences.poeLastTimeProof.timestamp)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Block Number</Text>
              <Text style={styles.resultValue}>#{store.preferences.poeLastTimeProof.blockNumber.toLocaleString()}</Text>
            </View>

            <View style={[styles.resultRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.resultLabel}>Drift</Text>
              <Text style={styles.resultValue}>{store.preferences.poeLastTimeProof.drift}s</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default POETimeProof
