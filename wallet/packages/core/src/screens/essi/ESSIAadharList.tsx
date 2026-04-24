import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native'
import { useAgent } from '@credo-ts/react-hooks'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { ESSIScreen } from '../../components/essi'
import { palette, spacing, typography } from '../../theme/essi'
import { AadharKYCStorageService, AadharKYCContent, AadharKYCTags } from '../../services/aadharKYC'
import { Screens } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'

const ESSIAadharList: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { agent } = useAgent()
  const [documents, setDocuments] = useState<Array<{ id: string; content: AadharKYCContent; tags: AadharKYCTags }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent])

  const loadDocuments = async () => {
    if (!agent) return

    try {
      const storageService = new AadharKYCStorageService(agent)
      const docs = await storageService.getAllKYCDocuments()
      setDocuments(docs)
    } catch (error) {
      // Failed to load documents - silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!agent) return

    Alert.alert(t('AadharKYC.DeleteDocument'), t('AadharKYC.DeleteDocumentConfirm'), [
      { text: t('Global.Cancel'), style: 'cancel' },
      {
        text: t('Global.Remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            const storageService = new AadharKYCStorageService(agent)
            await storageService.deleteKYCDocument(id)
            loadDocuments()
            Alert.alert(t('Global.Success'), t('AadharKYC.DocumentDeleted'))
          } catch (error) {
            Alert.alert(t('Global.Failure'), 'Failed to delete document')
          }
        },
      },
    ])
  }

  const renderDocument = ({ item }: { item: { id: string; content: AadharKYCContent; tags: AadharKYCTags } }) => (
    <View style={styles.documentItem}>
      <View style={styles.documentIcon}>
        <FeatherIcon name="file-text" size={24} color={palette.primary} />
      </View>

      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{item.content.fileName}</Text>
        <Text style={styles.documentMeta}>
          {t('AadharKYC.ImportedOn')}: {new Date(item.content.extractedAt).toLocaleDateString()}
        </Text>
        <Text style={styles.documentMeta}>
          {t('AadharKYC.Size')}: {(item.content.fileSize / 1024).toFixed(2)} KB
        </Text>
      </View>

      <Pressable
        onPress={() => handleDelete(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID={testIdWithKey(`DeleteDocument-${item.id}`)}
        style={styles.deleteButton}
      >
        <FeatherIcon name="trash-2" size={20} color={palette.danger} />
      </Pressable>
    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <FeatherIcon name="file-text" size={64} color={palette.muted} />
      </View>
      <Text style={styles.emptyTitle}>{t('AadharKYC.NoKYCDocuments')}</Text>
      <Text style={styles.emptySubtitle}>{t('AadharKYC.NoKYCDocumentsDescription')}</Text>
    </View>
  )

  const renderSeparator = () => <View style={styles.separator} />

  return (
    <ESSIScreen
      headerTitle="My Documents"
      headerRight={
        <Pressable
          onPress={() => (navigation as any).navigate(Screens.ESSIAadharImport)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={testIdWithKey('ImportKYC')}
        >
          <FeatherIcon name="plus" size={22} color={palette.text} />
        </Pressable>
      }
      scrollable={false}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('Global.Processing')}</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderDocument}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={renderSeparator}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    paddingVertical: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: palette.muted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    color: palette.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: palette.outline,
    marginLeft: spacing.gutter + 48 + spacing.md,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: palette.background,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  documentMeta: {
    ...typography.caption,
    color: palette.muted,
    fontSize: 12,
  },
  deleteButton: {
    padding: spacing.xs,
  },
})

export default ESSIAadharList
