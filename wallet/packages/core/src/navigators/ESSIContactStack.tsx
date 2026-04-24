import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { ContactStackParams, Screens } from '../types/navigators'
import ESSIConnections from '../screens/essi/ESSIConnections'
import ESSICreateInvite from '../screens/essi/ESSICreateInvite'
import ESSIChat from '../screens/essi/ESSIChat'
import ESSIContactDetails from '../screens/essi/ESSIContactDetails'
import ESSICredentialDetails from '../screens/essi/ESSICredentialDetails'
import ESSIProofDetails from '../screens/essi/ESSIProofDetails'
import { palette } from '../theme/essi'
import { useTheme } from '../contexts/theme'
import { useDefaultStackOptions } from './defaultStackOptions'

const ESSIContactStack: React.FC = () => {
  const Stack = createStackNavigator<ContactStackParams>()
  const { t } = useTranslation()
  const theme = useTheme()
  const defaultStackOptions = useDefaultStackOptions(theme)

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen
        name={Screens.Contacts}
        component={ESSIConnections}
        options={{
          title: t('Screens.Contacts'),
        }}
      />
      <Stack.Screen
        name={Screens.ESSICreateInvite}
        component={ESSICreateInvite}
        options={{
          title: t('CreateInvite.Title'),
        }}
      />
      <Stack.Screen
        name={Screens.Chat}
        component={ESSIChat}
        options={{
          title: t('Screens.Chat'),
        }}
      />
      <Stack.Screen
        name={Screens.ContactDetails}
        component={ESSIContactDetails}
        options={{
          title: t('Screens.ContactDetails'),
        }}
      />
      <Stack.Screen
        name={Screens.CredentialDetails}
        component={ESSICredentialDetails}
        options={{
          title: t('Screens.CredentialDetails'),
        }}
      />
      <Stack.Screen
        name={Screens.ProofDetails}
        component={ESSIProofDetails}
        options={{
          headerShown: false,
          title: t('Screens.ProofDetails'),
        }}
      />
    </Stack.Navigator>
  )
}

export default ESSIContactStack
