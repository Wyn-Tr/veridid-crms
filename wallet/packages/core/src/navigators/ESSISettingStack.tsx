import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { SettingStackParams, Screens } from '../types/navigators'
import ESSISettings from '../screens/essi/ESSISettings'
import ESSIBiometry from '../screens/essi/ESSIBiometry'
import ESSITerms from '../screens/essi/ESSITerms'
import ESSIAbout from '../screens/essi/ESSIAbout'
import ESSIPrivacyPolicy from '../screens/essi/ESSIPrivacyPolicy'
import ESSIHelp from '../screens/essi/ESSIHelp'
import Language from '../screens/Language'
import PINChange from '../screens/PINChange'
import PINChangeSuccess from '../screens/PINChangeSuccess'
import DataRetention from '../screens/DataRetention'
import Tours from '../screens/Tours'
import Developer from '../screens/Developer'
import TogglePushNotifications from '../screens/TogglePushNotifications'
import AutoLock from '../screens/AutoLock'
import RenameWallet from '../screens/RenameWallet'
import ConfigureMediator from '../screens/ConfigureMediator'
import POETimeProof from '../screens/POETimeProof'
import POELocationProof from '../screens/POELocationProof'
import { palette } from '../theme/essi'

const ESSISettingStack: React.FC = () => {
  const Stack = createStackNavigator<SettingStackParams>()
  const { t } = useTranslation()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: palette.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: palette.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        cardStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen
        name={Screens.Settings}
        component={ESSISettings}
        options={{
          title: t('Screens.Settings'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.Language}
        component={Language}
        options={{
          title: t('Screens.Language'),
        }}
      />
      <Stack.Screen
        name={Screens.ChangePIN}
        component={PINChange}
        options={{
          title: t('Screens.ChangePIN'),
        }}
      />
      <Stack.Screen
        name={Screens.ChangePINSuccess}
        component={PINChangeSuccess}
        options={{
          title: t('Screens.ChangePIN'),
        }}
      />
      <Stack.Screen
        name={Screens.ToggleBiometry}
        component={ESSIBiometry}
        options={{
          title: t('Screens.Biometry'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.Terms}
        component={ESSITerms}
        options={{
          title: t('Screens.Terms'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.DataRetention}
        component={DataRetention}
        options={{
          title: t('Screens.DataRetention'),
        }}
      />
      <Stack.Screen
        name={Screens.Tours}
        component={Tours}
        options={{
          title: t('Screens.Tours'),
        }}
      />
      <Stack.Screen
        name={Screens.Developer}
        component={Developer}
        options={{
          title: t('Screens.Developer'),
        }}
      />
      <Stack.Screen
        name={Screens.TogglePushNotifications}
        component={TogglePushNotifications}
        options={{
          title: t('Screens.PushNotifications'),
        }}
      />
      <Stack.Screen
        name={Screens.AutoLock}
        component={AutoLock}
        options={{
          title: t('Settings.AutoLockTime'),
        }}
      />
      <Stack.Screen
        name={Screens.RenameWallet}
        component={RenameWallet}
        options={{
          title: t('Screens.RenameWallet'),
        }}
      />
      <Stack.Screen
        name={Screens.ConfigureMediator}
        component={ConfigureMediator}
        options={{
          title: t('Settings.ConfigureMediator'),
        }}
      />
      <Stack.Screen
        name={Screens.POETimeProof}
        component={POETimeProof}
        options={{
          title: t('Screens.POETimeProof'),
        }}
      />
      <Stack.Screen
        name={Screens.POELocationProof}
        component={POELocationProof}
        options={{
          title: t('Screens.POELocationProof'),
        }}
      />
      <Stack.Screen
        name={Screens.About}
        component={ESSIAbout}
        options={{
          title: t('Settings.AboutApp'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.PrivacyPolicy}
        component={ESSIPrivacyPolicy}
        options={{
          title: t('Settings.PrivacyPolicy'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.HelpSupport}
        component={ESSIHelp}
        options={{
          title: t('Settings.Help'),
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  )
}

export default ESSISettingStack
