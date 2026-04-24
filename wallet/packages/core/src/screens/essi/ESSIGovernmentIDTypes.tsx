import React from 'react'
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen } from '../../components/essi'
import { palette, radius, spacing, typography } from '../../theme/essi'
import { Screens } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'

interface GovernmentIDType {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  comingSoon?: boolean
  screen?: string
}

const GOVERNMENT_ID_TYPES: GovernmentIDType[] = [
  {
    id: 'aadhar',
    name: 'Aadhar Card',
    description: 'Import your offline Aadhar KYC document',
    icon: 'credit-card',
    enabled: true,
    screen: Screens.ESSIAadharImport,
  },
  {
    id: 'aadhar-digilocker',
    name: 'Aadhar via DigiLocker',
    description: 'Fetch Aadhaar details directly from DigiLocker',
    icon: 'shield',
    enabled: false,
    comingSoon: true,
    screen: Screens.ESSIDigilockerImport,
  },
  {
    id: 'pan',
    name: 'PAN Card',
    description: 'Link your PAN card details',
    icon: 'file-text',
    enabled: true,
    screen: Screens.ESSIDigilockerImport,
  },
  {
    id: 'passport',
    name: 'Passport',
    description: 'Add your passport information',
    icon: 'book',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'driving-license',
    name: 'Driving License',
    description: 'Import your driving license',
    icon: 'book-open',
    enabled: true,
    screen: Screens.ESSIDigilockerImport,
  },
  {
    id: 'voter-id',
    name: 'Voter ID',
    description: 'Add your voter identification card',
    icon: 'users',
    enabled: false,
    comingSoon: true,
  },
]

const ESSIGovernmentIDTypes: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>()

  const handleSelectIDType = (idType: GovernmentIDType) => {
    if (!idType.enabled || !idType.screen) {
      console.warn('[GovernmentID] Selection blocked', {
        id: idType.id,
        enabled: idType.enabled,
        screen: idType.screen,
      })
      return
    }

    // Pass document-specific params to the DigiLocker screen when applicable
    if (idType.id === 'pan') {
      const params = {
        title: 'Import PAN via DigiLocker',
        description: 'Fetch PAN details directly from DigiLocker.',
        reqDoctype: 'PANCR',
        scopes: 'openid',
        acr: 'pan',
      }
      console.log('[GovernmentID] Navigate', { id: idType.id, screen: idType.screen, params })
      navigation.navigate(idType.screen as any, {
        title: 'Import PAN via DigiLocker',
        description: 'Fetch PAN details directly from DigiLocker.',
        reqDoctype: 'PANCR',
        scopes: 'openid',
        acr: 'pan',
      })
      return
    }

    if (idType.id === 'aadhar-digilocker') {
      const params = {
        title: 'Import Aadhaar via DigiLocker',
        description: 'Fetch Aadhaar details directly from DigiLocker.',
        reqDoctype: 'ADHAR',
        scopes: 'openid',
        acr: 'aadhaar',
      }
      console.log('[GovernmentID] Navigate', { id: idType.id, screen: idType.screen, params })
      navigation.navigate(idType.screen as any, {
        title: 'Import Aadhaar via DigiLocker',
        description: 'Fetch Aadhaar details directly from DigiLocker.',
        reqDoctype: 'ADHAR',
        scopes: 'openid',
        acr: 'aadhaar',
      })
      return
    }

    if (idType.id === 'driving-license') {
      const params = {
        title: 'Import Driving License via DigiLocker',
        description: 'Fetch Driving License details directly from DigiLocker.',
        reqDoctype: 'DRVLC',
        scopes: 'openid',
        acr: 'driving_licence',
      }
      console.log('[GovernmentID] Navigate', { id: idType.id, screen: idType.screen, params })
      navigation.navigate(idType.screen as any, {
        title: 'Import Driving License via DigiLocker',
        description: 'Fetch Driving License details directly from DigiLocker.',
        reqDoctype: 'DRVLC',
        scopes: 'openid',
        acr: 'driving_licence',
      })
      return
    }

    // Default navigation
    console.log('[GovernmentID] Navigate', { id: idType.id, screen: idType.screen })
    navigation.navigate(idType.screen as any)
  }

  const renderIDType = ({ item }: { item: GovernmentIDType }) => (
    <Pressable
      style={[styles.idTypeItem, !item.enabled && styles.idTypeItemDisabled]}
      onPress={() => handleSelectIDType(item)}
      disabled={!item.enabled}
      testID={testIdWithKey(`IDType-${item.id}`)}
    >
      <View style={[styles.idTypeIcon, !item.enabled && styles.idTypeIconDisabled]}>
        <FeatherIcon name={item.icon as any} size={24} color={item.enabled ? palette.primary : palette.muted} />
      </View>

      <View style={styles.idTypeContent}>
        <View style={styles.idTypeHeader}>
          <Text style={[styles.idTypeName, !item.enabled && styles.idTypeNameDisabled]}>{item.name}</Text>
          {item.comingSoon && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          )}
        </View>
        <Text style={styles.idTypeDescription} numberOfLines={1}>
          {item.description}
        </Text>
      </View>

      <FeatherIcon name="chevron-right" size={20} color={item.enabled ? palette.muted : palette.outline} />
    </Pressable>
  )

  return (
    <ESSIScreen headerTitle="Add ID" scrollable={false} testID={testIdWithKey('GovernmentIDTypes')}>
      <View style={styles.container}>
        {/* Compact Info Banner */}
        <View style={styles.infoBanner}>
          <FeatherIcon name="shield" size={16} color={palette.primary} />
          <Text style={styles.infoBannerText}>Your IDs are encrypted and stored securely</Text>
        </View>

        {/* ID Types List */}
        <FlatList
          data={GOVERNMENT_ID_TYPES}
          renderItem={renderIDType}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primary + '15',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.primary + '30',
  },
  infoBannerText: {
    ...typography.caption,
    color: palette.text,
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: spacing.xs,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: palette.outline,
    marginLeft: spacing.gutter + 48 + spacing.md, // Align with text
  },
  idTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: palette.background,
  },
  idTypeItemDisabled: {
    opacity: 0.5,
  },
  idTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idTypeIconDisabled: {
    backgroundColor: palette.muted + '15',
  },
  idTypeContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  idTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  idTypeName: {
    ...typography.bodyBold,
    color: palette.text,
    fontSize: 16,
  },
  idTypeNameDisabled: {
    color: palette.muted,
  },
  idTypeDescription: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 13,
  },
  comingSoonBadge: {
    backgroundColor: palette.warning + '25',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.warning + '50',
  },
  comingSoonText: {
    ...typography.caption,
    color: palette.warning,
    fontWeight: '600',
    fontSize: 10,
  },
})

export default ESSIGovernmentIDTypes
