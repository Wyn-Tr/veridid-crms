import { ProofCustomMetadata, ProofMetadata } from '@bifold/verifier'
import { useAgent, useProofByState } from '@credo-ts/react-hooks'
import { ProofState } from '@credo-ts/core'
import { CardStyleInterpolators, StackCardStyleInterpolator, createStackNavigator } from '@react-navigation/stack'
import React, { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import IconButton, { ButtonLocation } from '../components/buttons/IconButton'
import { TOKENS, useServices } from '../container-api'
import { useTheme } from '../contexts/theme'
import HistoryStack from '../modules/history/navigation/HistoryStack'
import { RootStackParams, Screens, Stacks, TabStacks } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'
import { useStore } from '../contexts/store'
import { useTour } from '../contexts/tour/tour-context'
import { useDeepLinks } from '../hooks/deep-links'
import { useInAppNotifications } from '../hooks/useInAppNotifications'
import ESSICredentialDetails from '../screens/essi/ESSICredentialDetails'
import ESSIWorkflowList from '../screens/essi/ESSIWorkflowList'
import ESSIWorkflowDetails from '../screens/essi/ESSIWorkflowDetails'
import ESSIVideoCall from '../screens/essi/ESSIVideoCall'
import ESSIIncomingCall from '../screens/essi/ESSIIncomingCall'
import OpenIDCredentialDetails from '../modules/openid/screens/OpenIDCredentialDetails'
import OpenBadgeDetails from '../modules/openid/screens/OpenBadgeDetails'
import { palette } from '../theme/essi'
import { useIncomingCallHandler } from '../hooks/useIncomingCallHandler'

import ConnectStack from './ConnectStack'
import ESSIContactStack from './ESSIContactStack'
import DeliveryStack from './DeliveryStack'
import NotificationStack from './NotificationStack'
import ProofRequestStack from './ProofRequestStack'
import SettingStack from './SettingStack'
import { useDefaultStackOptions } from './defaultStackOptions'

const MainStack: React.FC = () => {
  const { t } = useTranslation()
  const theme = useTheme()
  const { currentStep } = useTour()
  const [store] = useStore()
  const { agent } = useAgent()
  const defaultStackOptions = useDefaultStackOptions(theme)
  const [CustomNavStack1, ScreenOptionsDictionary, TabStack, ChatScreen] = useServices([
    TOKENS.CUSTOM_NAV_STACK_1,
    TOKENS.OBJECT_SCREEN_CONFIG,
    TOKENS.NAV_TAB_STACK,
    TOKENS.SCREEN_CHAT,
  ])
  const declinedProofs = useProofByState([ProofState.Declined, ProofState.Abandoned])
  useDeepLinks()
  useInAppNotifications()
  useIncomingCallHandler({ enabled: true })

  // remove connection on mobile verifier proofs if proof is rejected
  useEffect(() => {
    declinedProofs.forEach((proof) => {
      const meta = proof?.metadata?.get(ProofMetadata.customMetadata) as ProofCustomMetadata
      if (meta?.delete_conn_after_seen) {
        agent?.connections.deleteById(proof?.connectionId ?? '').catch(() => null)
        proof?.metadata.set(ProofMetadata.customMetadata, { ...meta, delete_conn_after_seen: false })
      }
    })
  }, [declinedProofs, agent, store.preferences.useDataRetention])

  const Stack = createStackNavigator<RootStackParams>()

  // This function is to make the fade in behavior of both iOS and
  // Android consistent for the settings menu
  const forFade: StackCardStyleInterpolator = ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
    },
  })
  const hideElements = useMemo(() => (currentStep === undefined ? 'auto' : 'no-hide-descendants'), [currentStep])

  return (
    <View style={{ flex: 1 }} importantForAccessibility={hideElements}>
      <Stack.Navigator
        initialRouteName={Stacks.TabStack}
        screenOptions={{
          ...defaultStackOptions,
          headerShown: false,
        }}
      >
        <Stack.Screen name={Stacks.TabStack} component={TabStack} />
        <Stack.Screen
          name={Screens.CredentialDetails}
          component={ESSICredentialDetails}
          options={{
            headerShown: false,
            cardStyle: { backgroundColor: palette.background },
          }}
        />
        <Stack.Screen
          name={Screens.OpenIDCredentialDetails}
          component={OpenIDCredentialDetails}
          options={{
            title: t('Screens.CredentialDetails'),
            ...ScreenOptionsDictionary[Screens.OpenIDCredentialDetails],
          }}
        />
        <Stack.Screen
          name={Screens.OpenBadgeDetails}
          component={OpenBadgeDetails}
          options={{
            title: t('Screens.OpenBadgeDetails'),
            ...ScreenOptionsDictionary[Screens.OpenBadgeDetails],
          }}
        />
        <Stack.Screen
          name={Screens.Chat}
          component={ChatScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name={Stacks.ConnectStack} component={ConnectStack} />
        <Stack.Screen
          name={Stacks.SettingStack}
          component={SettingStack}
          options={{
            cardStyleInterpolator: forFade,
          }}
        />
        <Stack.Screen name={Stacks.ContactStack} component={ESSIContactStack} />
        <Stack.Screen name={Stacks.NotificationStack} component={NotificationStack} />
        <Stack.Screen
          name={Stacks.ConnectionStack}
          component={DeliveryStack}
          options={{
            gestureEnabled: false,
            cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name={Stacks.ProofRequestsStack} component={ProofRequestStack} />
        <Stack.Screen
          name={Stacks.HistoryStack}
          component={HistoryStack}
          options={{
            cardStyleInterpolator: forFade,
          }}
        />
        {CustomNavStack1 ? <Stack.Screen name={Stacks.CustomNavStack1} component={CustomNavStack1} /> : null}
        <Stack.Screen
          name={Screens.WorkflowList}
          component={ESSIWorkflowList}
          options={{
            headerShown: false,
            cardStyle: { backgroundColor: palette.background },
          }}
        />
        <Stack.Screen
          name={Screens.WorkflowDetails}
          component={ESSIWorkflowDetails}
          options={{
            headerShown: false,
            cardStyle: { backgroundColor: palette.background },
          }}
        />
        {/* Video Call Screens */}
        <Stack.Screen
          name={Screens.VideoCall}
          component={ESSIVideoCall}
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
            cardStyle: { backgroundColor: '#000' },
          }}
        />
        <Stack.Screen
          name={Screens.IncomingCall}
          component={ESSIIncomingCall}
          options={{
            headerShown: false,
            presentation: 'modal',
            gestureEnabled: false,
            cardStyle: { backgroundColor: palette.background },
          }}
        />
      </Stack.Navigator>
    </View>
  )
}

export default MainStack
