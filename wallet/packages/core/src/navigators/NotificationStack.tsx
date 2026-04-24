import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { TOKENS, useServices } from '../container-api'
import { useTheme } from '../contexts/theme'
import ESSICredentialDetails from '../screens/essi/ESSICredentialDetails'
import { NotificationStackParams, Screens } from '../types/navigators'
import { palette } from '../theme/essi'

import { useDefaultStackOptions } from './defaultStackOptions'

const NotificationStack: React.FC = () => {
  const Stack = createStackNavigator<NotificationStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [{ customNotificationConfig: customNotification }, ScreenOptionsDictionary] = useServices([
    TOKENS.NOTIFICATIONS,
    TOKENS.OBJECT_SCREEN_CONFIG,
  ])

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions, headerShown: false, cardStyle: { backgroundColor: palette.background } }}>
      <Stack.Screen
        name={Screens.CredentialDetails}
        component={ESSICredentialDetails}
        options={{
          title: t('Screens.CredentialDetails'),
        }}
      />
      {customNotification && (
        <Stack.Screen
          name={Screens.CustomNotification}
          component={customNotification.component}
          options={{
            title: t(customNotification.pageTitle as any),
            ...ScreenOptionsDictionary[Screens.CustomNotification],
          }}
        />
      )}
      {customNotification &&
        customNotification.additionalStackItems?.length &&
        customNotification.additionalStackItems.map((item, i) => (
          <Stack.Screen
            key={i + 1}
            name={item.name as any}
            component={item.component}
            options={item.stackOptions}
          ></Stack.Screen>
        ))}
    </Stack.Navigator>
  )
}

export default NotificationStack
