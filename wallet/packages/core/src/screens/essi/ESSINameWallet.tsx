import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View, Text, TextInput, Alert } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen, ESSIButton } from '../../components/essi'
import { DispatchAction } from '../../contexts/reducers/store'
import { useStore } from '../../contexts/store'
import { testIdWithKey } from '../../utils/testable'
import { spacing, typography, radius } from '../../theme/essi'
import { useWalletVisualPalette } from '../../theme/essi'

function buildStyles(p: ReturnType<typeof useWalletVisualPalette>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: `${p.primary}33`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: {
      ...typography.headline,
      color: p.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    description: {
      ...typography.body,
      color: p.muted,
      textAlign: 'center',
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    inputContainer: {
      width: '100%',
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: p.surfaceSecondary,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: p.outline,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...typography.body,
      color: p.text,
      textAlign: 'center',
      fontSize: 18,
    },
    charCount: {
      ...typography.caption,
      color: p.muted,
      textAlign: 'right',
      marginTop: spacing.xs,
      paddingRight: spacing.xs,
    },
    buttonContainer: {
      paddingTop: spacing.md,
    },
  })
}

const ESSINameWallet: React.FC = () => {
  const { t } = useTranslation()
  const palette = useWalletVisualPalette()
  const styles = useMemo(() => buildStyles(palette), [palette])
  const [store, dispatch] = useStore()
  const [walletName, setWalletName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChangeText = (text: string) => {
    setWalletName(text)
  }

  const handleContinuePressed = () => {
    const trimmedName = walletName.trim()

    if (trimmedName.length < 1) {
      Alert.alert(
        t('NameWallet.EmptyNameTitle'),
        t('NameWallet.EmptyNameDescription')
      )
      return
    }

    if (trimmedName.length > 50) {
      Alert.alert(
        t('NameWallet.CharCountTitle'),
        t('NameWallet.CharCountDescription')
      )
      return
    }

    setLoading(true)
    dispatch({
      type: DispatchAction.UPDATE_WALLET_NAME,
      payload: [trimmedName],
    })
    dispatch({ type: DispatchAction.DID_NAME_WALLET })
  }

  return (
    <ESSIScreen
      testID={testIdWithKey('ESSINameWallet')}
      scrollable={false}
      safeAreaEdges={['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <FeatherIcon name="edit-3" size={48} color={palette.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('NameWallet.NameYourWallet')}</Text>

          {/* Description */}
          <Text style={styles.description}>{t('NameWallet.ThisIsTheName')}</Text>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={walletName}
              onChangeText={handleChangeText}
              placeholder="Enter wallet name"
              placeholderTextColor={palette.muted}
              maxLength={50}
              autoCapitalize="words"
              autoCorrect={false}
              testID={testIdWithKey('WalletNameInput')}
            />
            <Text style={styles.charCount}>{walletName.length}/50</Text>
          </View>
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <ESSIButton
            title={t('Global.Continue')}
            onPress={handleContinuePressed}
            variant="primary"
            loading={loading}
            disabled={loading}
            testID={testIdWithKey('Continue')}
          />
        </View>
      </View>
    </ESSIScreen>
  )
}

export default ESSINameWallet
