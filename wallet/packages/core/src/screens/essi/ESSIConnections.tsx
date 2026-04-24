import React from 'react'
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { useConnections } from '@credo-ts/react-hooks'
import { ConnectionType, DidExchangeState } from '@credo-ts/core'

import { ESSIScreen, ESSIInfoCard } from '../../components/essi'
import { palette, radius, spacing, typography } from '../../theme/essi'
import { ContactStackParams, Screens, Stacks } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'
import { formatTime } from '../../utils/helpers'

interface ConnectionItemProps {
  id: string
  name: string
  createdAt: string
  state: DidExchangeState
  onPress: () => void
  testID?: string
}

const getStateInfo = (state: DidExchangeState, t: (key: string) => string): { color: string; label: string; icon: string } => {
  switch (state) {
    case DidExchangeState.Completed:
      return { color: palette.success, label: t('Contacts.StateConnected'), icon: 'check-circle' }
    case DidExchangeState.ResponseSent:
    case DidExchangeState.ResponseReceived:
    case DidExchangeState.RequestSent:
    case DidExchangeState.RequestReceived:
      return { color: palette.warning || '#FFA500', label: t('Contacts.StatePending'), icon: 'clock' }
    case DidExchangeState.InvitationSent:
    case DidExchangeState.InvitationReceived:
      return { color: palette.primary, label: t('Contacts.StateInvited'), icon: 'send' }
    case DidExchangeState.Abandoned:
      return { color: palette.danger, label: t('Contacts.StateFailed'), icon: 'x-circle' }
    default:
      return { color: palette.muted, label: state, icon: 'help-circle' }
  }
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ name, createdAt, state, onPress, testID }) => {
  const { t } = useTranslation()
  const stateInfo = getStateInfo(state, t)

  return (
    <Pressable style={styles.connectionItem} onPress={onPress} testID={testID}>
      <View style={styles.connectionAvatar}>
        <FeatherIcon name="user" size={24} color={palette.text} />
        {/* State indicator dot */}
        <View style={[styles.stateIndicator, { backgroundColor: stateInfo.color }]} />
      </View>
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionName}>{name}</Text>
        <View style={styles.connectionMeta}>
          <View style={styles.stateContainer}>
            <FeatherIcon name={stateInfo.icon as any} size={12} color={stateInfo.color} />
            <Text style={[styles.stateText, { color: stateInfo.color }]}>{stateInfo.label}</Text>
          </View>
          <Text style={styles.connectionDate}>{createdAt}</Text>
        </View>
      </View>
      <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
    </Pressable>
  )
}

const ESSIConnections: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<ContactStackParams>>()
  const { records: allConnections } = useConnections()

  // Filter out mediator connections
  const connections = allConnections?.filter(
    (conn) => !conn.connectionTypes?.includes(ConnectionType.Mediator)
  ) || []

  const handleScanPress = () => {
    navigation.navigate(Stacks.ConnectStack as any, { screen: Screens.Scan })
  }

  const handleCreateInvitePress = () => {
    navigation.navigate(Screens.ESSICreateInvite)
  }

  const handleConnectionPress = (connectionId: string) => {
    navigation.navigate(Screens.Chat, { connectionId })
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ESSIInfoCard
        icon={<FeatherIcon name="users" size={48} color={palette.text} />}
        title={t('Contacts.EmptyList')}
        subtitle={t('Contacts.PeopleAndOrganizations')}
        testID={testIdWithKey('ConnectionsEmptyState')}
      />
      <Text style={styles.emptyHint}>{t('Contacts.ScanQRCode')}</Text>
    </View>
  )

  const formatConnectionDate = (createdAt: Date | string | undefined): string => {
    if (!createdAt) return ''
    try {
      const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
      return formatTime(date, { shortMonth: true })
    } catch {
      return ''
    }
  }

  const renderConnectionItem = ({ item }: { item: any }) => (
    <ConnectionItem
      id={item.id}
      name={item.theirLabel || t('Contacts.UnknownContact')}
      createdAt={formatConnectionDate(item.createdAt)}
      state={item.state as DidExchangeState}
      onPress={() => handleConnectionPress(item.id)}
      testID={testIdWithKey(`Connection-${item.id}`)}
    />
  )

  return (
    <ESSIScreen
      headerTitle={t('Screens.Contacts')}
      headerRight={
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleCreateInvitePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testIdWithKey('CreateInviteButton')}
          >
            <FeatherIcon name="user-plus" size={22} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleScanPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={testIdWithKey('ScanButton')}
          >
            <FeatherIcon name="camera" size={22} color={palette.text} />
          </Pressable>
        </View>
      }
      testID={testIdWithKey('Connections')}
      scrollable={false}
    >
      {connections && connections.length > 0 ? (
        <FlatList
          data={connections}
          renderItem={renderConnectionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
  },
  emptyHint: {
    ...typography.body,
    color: palette.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  listContainer: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stateIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.surfaceSecondary,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    ...typography.bodyBold,
    color: palette.text,
    marginBottom: spacing.xxs,
  },
  connectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateText: {
    ...typography.caption,
    fontWeight: '500',
  },
  connectionDate: {
    ...typography.caption,
    color: palette.muted,
  },
  separator: {
    height: spacing.sm,
  },
})

export default ESSIConnections
