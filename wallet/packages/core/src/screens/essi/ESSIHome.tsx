import React, { useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { useConnections } from '@credo-ts/react-hooks'
import { ConnectionType, DidExchangeState } from '@credo-ts/core'

import { ESSIScreen } from '../../components/essi'
import { radius, spacing, typography } from '../../theme/essi'
import { isLightVisualCanvas, useWalletVisualPalette } from '../../theme/essi'
import { Screens, Stacks, TabStacks } from '../../types/navigators'
import { testIdWithKey } from '../../utils/testable'
import { TOKENS, useServices } from '../../container-api'
import { NotificationType } from '../../components/listItems/NotificationListItem'
import { WorkflowNotificationItem } from '../../components/listItems/WorkflowNotificationItem'

const ESSIHome: React.FC = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<any>>()
  const palette = useWalletVisualPalette()
  const lightCanvas = useMemo(() => isLightVisualCanvas(palette.background), [palette.background])
  const styles = useMemo(
    () =>
      StyleSheet.create({
        cameraButton: {
          position: 'absolute',
          top: -spacing.gutter - spacing.md,
          right: 0,
          zIndex: 10,
          padding: spacing.xs,
        },
        notificationsSection: {
          marginBottom: spacing.lg,
        },
        notificationsHeader: {
          marginBottom: spacing.md,
        },
        notificationsTitleContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        notificationBadge: {
          backgroundColor: palette.danger,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xs,
        },
        notificationBadgeText: {
          ...typography.caption,
          color: palette.surface,
          fontWeight: '600',
          fontSize: 12,
        },
        notificationItem: {
          marginBottom: spacing.sm,
        },
        notificationSeparator: {
          height: spacing.sm,
        },
        sectionTitle: {
          ...typography.bodyBold,
          color: palette.text,
          marginBottom: spacing.sm,
        },
        card: {
          marginTop: spacing.sm,
          borderRadius: radius.lg,
          backgroundColor: palette.surfaceSecondary,
          borderWidth: 1,
          borderColor: palette.outline,
          padding: spacing.lg,
          flexDirection: 'row',
          gap: spacing.md,
          alignItems: 'center',
        },
        cardTitle: {
          ...typography.bodyBold,
          color: palette.text,
          marginBottom: spacing.xs,
        },
        cardSubtitle: {
          ...typography.body,
          color: palette.muted,
        },
        scanButton: {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: lightCanvas ? '#D9D9D9' : palette.primary,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          marginTop: spacing.xl,
        },
        scanLabel: {
          ...typography.bodyBold,
          color: palette.text,
          textAlign: 'center',
          marginTop: spacing.md,
        },
        scanDescription: {
          ...typography.body,
          color: palette.muted,
          textAlign: 'center',
          marginTop: spacing.xs,
        },
        credentialTab: {
          marginTop: spacing.xl,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: palette.outline,
          backgroundColor: palette.surfaceSecondary,
          padding: spacing.lg,
          flexDirection: 'row',
          gap: spacing.md,
          alignItems: 'center',
        },
        credentialTitle: {
          ...typography.bodyBold,
          color: palette.text,
        },
        credentialSubtitle: {
          ...typography.body,
          color: palette.muted,
          marginTop: spacing.xs,
        },
      }),
    [palette, lightCanvas]
  )

  const [{ useNotifications, customNotificationConfig: customNotification }, NotificationListItem] = useServices([
    TOKENS.NOTIFICATIONS,
    TOKENS.NOTIFICATIONS_LIST_ITEM,
  ])
  const notifications = useNotifications({})
  const { records: connections } = useConnections()

  const activeConnections =
    connections?.filter(
      (conn) => conn.state === DidExchangeState.Completed && !conn.connectionTypes?.includes(ConnectionType.Mediator)
    ) || []
  const hasConnections = activeConnections.length > 0

  const handleScanPress = () => {
    navigation.navigate(Stacks.ConnectStack as any, { screen: Screens.Scan })
  }

  const handleGetCredentialsPress = () => {
    navigation.navigate(Screens.ESSIGovernmentIDTypes as any)
  }

  const getNotificationType = (item: any): NotificationType => {
    if (item.type === 'BasicMessageRecord') {
      return NotificationType.BasicMessage
    } else if (item.type === 'CredentialRecord') {
      if (item.revocationNotification) {
        return NotificationType.Revocation
      }
      return NotificationType.CredentialOffer
    } else if (item.type === 'CustomNotification') {
      return NotificationType.Custom
    } else if (item.type === 'WorkflowInstanceRecord') {
      return NotificationType.Workflow
    }
    return NotificationType.ProofRequest
  }

  const handleWorkflowPress = (workflowId: string) => {
    navigation.navigate(Screens.WorkflowDetails as any, { instanceId: workflowId })
  }

  const renderNotificationItem = ({ item }: { item: any }) => {
    const notificationType = getNotificationType(item)

    if (notificationType === NotificationType.Workflow) {
      return (
        <View style={styles.notificationItem}>
          <WorkflowNotificationItem workflow={item} onPress={() => handleWorkflowPress(item.id)} />
        </View>
      )
    }

    return (
      <View style={styles.notificationItem}>
        <NotificationListItem
          notificationType={notificationType}
          notification={item}
          customNotification={notificationType === NotificationType.Custom ? customNotification : undefined}
        />
      </View>
    )
  }

  return (
    <ESSIScreen scrollable={true} testID={testIdWithKey('Home')}>
      <Pressable
        style={styles.cameraButton}
        onPress={handleScanPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        testID={testIdWithKey('ScanButton')}
      >
        <FeatherIcon name="camera" size={24} color={palette.text} />
      </Pressable>

      {notifications && notifications.length > 0 && (
        <View style={styles.notificationsSection}>
          <View style={styles.notificationsHeader}>
            <View style={styles.notificationsTitleContainer}>
              <FeatherIcon name="bell" size={20} color={palette.text} />
              <Text style={styles.sectionTitle}>{t('Home.Notifications')}</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
              </View>
            </View>
          </View>
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item, index) => (item as any).id || `notification-${index}`}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.notificationSeparator} />}
          />
        </View>
      )}

      {(!notifications || notifications.length === 0) && (
        <>
          <Text style={styles.sectionTitle}>{t('Screens.Contacts')}</Text>

          {hasConnections ? (
            <Pressable style={styles.card} onPress={() => navigation.navigate(TabStacks.ContactStack as any)}>
              <FeatherIcon name="users" size={36} color={palette.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {activeConnections.length} {t('Contacts.Contacts')}
                </Text>
                <Text style={styles.cardSubtitle}>{t('Contacts.PeopleAndOrganizations')}</Text>
              </View>
              <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
            </Pressable>
          ) : (
            <View style={styles.card}>
              <FeatherIcon name="users" size={36} color={palette.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('Contacts.EmptyList')}</Text>
                <Text style={styles.cardSubtitle}>{t('Contacts.PeopleAndOrganizations')}</Text>
              </View>
            </View>
          )}
        </>
      )}

      <Pressable style={styles.scanButton} onPress={handleScanPress} testID={testIdWithKey('CircularScanButton')}>
        <FeatherIcon name="camera" size={36} color={lightCanvas ? palette.primary : palette.buttonText} />
      </Pressable>

      <Text style={styles.scanLabel}>{t('Scan.ScanQRCode')}</Text>
      <Text style={styles.scanDescription}>{t('Scan.ScanDescription')}</Text>

      <Pressable
        style={styles.credentialTab}
        onPress={handleGetCredentialsPress}
        testID={testIdWithKey('GetCredentialsCard')}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.credentialTitle}>{t('Credentials.GetVerifiableCredentials')}</Text>
          <Text style={styles.credentialSubtitle}>{t('Credentials.LinkGovernmentIDs')}</Text>
        </View>
        <FeatherIcon name="chevron-right" size={20} color={palette.text} />
      </Pressable>
    </ESSIScreen>
  )
}

export default ESSIHome
