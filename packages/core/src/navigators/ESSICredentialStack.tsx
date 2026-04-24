import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { CredentialStackParams, Screens } from '../types/navigators'
import ESSICredentials from '../screens/essi/ESSICredentials'
import ESSICredentialDetails from '../screens/essi/ESSICredentialDetails'
import ESSIGovernmentIDTypes from '../screens/essi/ESSIGovernmentIDTypes'
import ESSIAadharImport from '../screens/essi/ESSIAadharImport'
import ESSIAadharList from '../screens/essi/ESSIAadharList'
import ESSIDigilockerImport from '../screens/essi/ESSIDigilockerImport'
import { palette } from '../theme/essi'

const ESSICredentialStack: React.FC = () => {
  const Stack = createStackNavigator<CredentialStackParams>()
  const { t } = useTranslation()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: palette.background },
      }}
    >
      <Stack.Screen
        name={Screens.Credentials}
        component={ESSICredentials}
        options={{
          title: t('Screens.Credentials'),
        }}
      />
      <Stack.Screen
        name={Screens.ESSICredentialDetails}
        component={ESSICredentialDetails as React.ComponentType<any>}
        options={{
          title: t('Screens.CredentialDetails'),
        }}
      />
      <Stack.Screen
        name={Screens.ESSIGovernmentIDTypes}
        component={ESSIGovernmentIDTypes}
        options={{
          title: 'Add ID',
        }}
      />
      <Stack.Screen
        name={Screens.ESSIAadharImport}
        component={ESSIAadharImport}
        options={{
          title: 'Import Aadhar',
        }}
      />
      <Stack.Screen
        name={Screens.ESSIAadharList}
        component={ESSIAadharList}
        options={{
          title: 'My Documents',
        }}
      />
      <Stack.Screen
        name={Screens.ESSIDigilockerImport}
        component={ESSIDigilockerImport}
        options={{
          title: 'Import via DigiLocker',
        }}
      />
    </Stack.Navigator>
  )
}

export default ESSICredentialStack
