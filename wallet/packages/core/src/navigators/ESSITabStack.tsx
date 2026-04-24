import { useAgent } from '@credo-ts/react-hooks'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, StyleSheet, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FeatherIcon from 'react-native-vector-icons/Feather'

import { EventTypes } from '../constants'
import { TOKENS, useServices } from '../container-api'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { BifoldError } from '../types/error'
import { TabStackParams, TabStacks } from '../types/navigators'
import { connectFromScanOrDeepLink } from '../utils/helpers'
import { testIdWithKey } from '../utils/testable'
import { palette } from '../theme/essi'

import ESSICredentialStack from './ESSICredentialStack'
import ESSIHomeStack from './ESSIHomeStack'
import ESSIContactStack from './ESSIContactStack'
import ESSISettingStack from './ESSISettingStack'

const Tab = createBottomTabNavigator<TabStackParams>()

const ESSITabStack: React.FC = () => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore()
  const { agent } = useAgent()
  const navigation = useNavigation<StackNavigationProp<TabStackParams>>()
  const [{ useNotifications }, { enableImplicitInvitations, enableReuseConnections }, logger] = useServices([
    TOKENS.NOTIFICATIONS,
    TOKENS.CONFIG,
    TOKENS.UTIL_LOGGER,
  ])
  const notifications = useNotifications({})

  const handleDeepLink = useCallback(
    async (deepLink: string) => {
      logger.info(`Handling deeplink: ${deepLink}`)

      if (deepLink.search(/oob=|c_i=|d_m=|url=/) < 0) {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
        return
      }

      try {
        await connectFromScanOrDeepLink(
          deepLink,
          agent,
          logger,
          navigation,
          true,
          enableImplicitInvitations,
          enableReuseConnections
        )
      } catch (err: unknown) {
        const error = new BifoldError(
          t('Error.Title1039'),
          t('Error.Message1039'),
          (err as Error)?.message ?? err,
          1039
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      } finally {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
      }
    },
    [agent, enableImplicitInvitations, enableReuseConnections, logger, navigation, t, dispatch]
  )

  useEffect(() => {
    if (store.deepLink && agent && store.authentication.didAuthenticate) {
      handleDeepLink(store.deepLink)
    }
  }, [store.deepLink, agent, store.authentication.didAuthenticate, handleDeepLink])

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      <Tab.Navigator
        initialRouteName={TabStacks.HomeStack}
        screenOptions={{
          unmountOnBlur: true,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.text,
          header: () => null,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tab.Screen
          name={TabStacks.HomeStack}
          component={ESSIHomeStack}
          options={{
            tabBarIcon: ({ color }) => <FeatherIcon name="home" size={24} color={color} />,
            tabBarLabel: ({ color }) => <Text style={[styles.tabBarLabel, { color }]}>{t('TabStack.Home')}</Text>,
            tabBarAccessibilityLabel: `${t('TabStack.Home')} (${notifications.length ?? 0})`,
            tabBarTestID: testIdWithKey(t('TabStack.Home')),
            tabBarBadge: notifications.length || undefined,
            tabBarBadgeStyle: styles.tabBarBadge,
          }}
        />

        <Tab.Screen
          name={TabStacks.ContactStack}
          component={ESSIContactStack}
          options={{
            tabBarIcon: ({ color }) => <FeatherIcon name="users" size={24} color={color} />,
            tabBarLabel: ({ color }) => <Text style={[styles.tabBarLabel, { color }]}>{t('Screens.Contacts')}</Text>,
            tabBarAccessibilityLabel: t('Screens.Contacts'),
            tabBarTestID: testIdWithKey(t('Screens.Contacts')),
          }}
        />

        <Tab.Screen
          name={TabStacks.CredentialStack}
          component={ESSICredentialStack}
          options={{
            tabBarIcon: ({ color }) => <FeatherIcon name="credit-card" size={24} color={color} />,
            tabBarLabel: ({ color }) => (
              <Text style={[styles.tabBarLabel, { color }]}>{t('TabStack.Credentials')}</Text>
            ),
            tabBarAccessibilityLabel: t('TabStack.Credentials'),
            tabBarTestID: testIdWithKey(t('TabStack.Credentials')),
          }}
        />

        <Tab.Screen
          name={TabStacks.SettingStack}
          component={ESSISettingStack}
          options={{
            tabBarIcon: ({ color }) => <FeatherIcon name="settings" size={24} color={color} />,
            tabBarLabel: ({ color }) => <Text style={[styles.tabBarLabel, { color }]}>{t('TabStack.Settings')}</Text>,
            tabBarAccessibilityLabel: t('TabStack.Settings'),
            tabBarTestID: testIdWithKey(t('TabStack.Settings')),
          }}
        />
      </Tab.Navigator>
      <SafeAreaView style={styles.bottomSafeArea} edges={['bottom']} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  tabBar: {
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.outline,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
  },
  tabBarBadge: {
    backgroundColor: palette.danger,
    color: palette.text,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 20,
    height: 20,
  },
  bottomSafeArea: {
    backgroundColor: palette.surface,
  },
})

export default ESSITabStack
