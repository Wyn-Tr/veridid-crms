# Workflow Integration Plan for Mobile App

## Overview

This document outlines the plan to integrate the `@ajna-inc/workflow` module into the Bifold mobile wallet. Unlike the backend which exposes workflows via REST API, the mobile app will call the agent's workflow module directly.

## Current State Analysis

### Backend Implementation (Reference)
- **Package**: `@ajna-inc/workflow` v0.5.30
- **Module Injection**: WorkflowModule injected during agent initialization
- **Key Services**:
  - `WorkflowService` - Core operations (start, advance, pause, resume, cancel)
  - `WorkflowTemplateRepository` - Store/retrieve templates
  - `WorkflowInstanceRepository` - Store/retrieve instances
  - `WorkflowCommandRepository` - Queue commands for async processing
  - `PersistentCommandQueue` - Async command processing with retry logic
- **API Layer**: Express routes expose all operations via REST

### Mobile App Current State
- **Credo Version**: 0.5.17 (compatible with workflow module)
- **Agent Setup**: `getAgentModules()` in `src/utils/agent.ts`
- **DI Container**: Token-based via `container-api.ts`
- **No workflow module** currently integrated

---

## Architecture for Mobile

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App                                │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer                                                        │
│  ├── ESSIWorkflowList.tsx      (List active workflows)          │
│  ├── ESSIWorkflowDetails.tsx   (View/interact with instance)    │
│  ├── ESSIWorkflowPanel.tsx     (Reusable workflow UI component) │
│  └── WorkflowNotificationItem  (Workflow notification cards)    │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                   │
│  ├── WorkflowService.ts        (High-level workflow operations) │
│  ├── WorkflowEventHandler.ts   (Handle workflow events)         │
│  └── WorkflowNotifications.ts  (Generate notifications)         │
├─────────────────────────────────────────────────────────────────┤
│  Hooks Layer                                                     │
│  ├── useWorkflows.ts           (List workflows hook)            │
│  ├── useWorkflowInstance.ts    (Single instance hook)           │
│  ├── useWorkflowActions.ts     (Available actions hook)         │
│  └── useWorkflowEvents.ts      (Event subscription hook)        │
├─────────────────────────────────────────────────────────────────┤
│  Agent Layer                                                     │
│  └── WorkflowModule            (Direct agent module access)     │
│      ├── WorkflowService       (start, advance, etc.)           │
│      ├── Templates Repository  (local + discovered)             │
│      ├── Instances Repository  (active workflows)               │
│      └── DIDComm Handlers      (receive workflow messages)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Package Setup & Module Integration

#### Step 1.1: Add Workflow Package
```bash
# In packages/core
yarn add @ajna-inc/workflow@0.5.30
```

Update `package.json`:
```json
{
  "dependencies": {
    "@ajna-inc/workflow": "0.5.30"
  },
  "peerDependencies": {
    "@ajna-inc/workflow": "0.5.30"
  }
}
```

#### Step 1.2: Add Workflow Module to Agent

**File**: `src/utils/agent.ts`

```typescript
import { WorkflowModule } from '@ajna-inc/workflow/build'

export function getAgentModules({ indyNetworks, mediatorInvitationUrl, txnCache }: GetAgentModulesOptions) {
  // ... existing modules ...

  return {
    // ... existing modules ...

    // Add Workflow Module
    workflow: new WorkflowModule({
      enableProblemReport: true,
      enablePaymentsEventMapping: false,
      enableAutoDiscoverOnStart: true,
      discoveryTimeoutMs: 30000,
    }),
  }
}
```

#### Step 1.3: Register Workflow Token

**File**: `src/container-api.ts`

```typescript
export const TOKENS = {
  // ... existing tokens ...

  // Workflow
  WORKFLOW_SERVICE: 'workflow.service' as const,
  WORKFLOW_ENABLED: 'workflow.enabled' as const,
}
```

**File**: `src/container-impl.ts`

```typescript
this._container.registerInstance(TOKENS.WORKFLOW_ENABLED, true)
```

---

### Phase 2: Workflow Service Layer

#### Step 2.1: Create Workflow Service

**File**: `src/services/WorkflowService.ts`

```typescript
import { Agent } from '@credo-ts/core'
import {
  WorkflowService as CredoWorkflowService,
  WorkflowTemplateRecord,
  WorkflowInstanceRecord,
  WorkflowStatus,
} from '@ajna-inc/workflow/build'

export interface WorkflowStartParams {
  templateId: string
  templateVersion?: string
  connectionId: string
  participants?: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface WorkflowAdvanceParams {
  instanceId: string
  event: string
  input?: Record<string, unknown>
  idempotencyKey?: string
}

export class MobileWorkflowService {
  private agent: Agent

  constructor(agent: Agent) {
    this.agent = agent
  }

  private get workflowService(): CredoWorkflowService {
    return this.agent.modules.workflow.workflowService
  }

  // Template Operations
  async listTemplates(): Promise<WorkflowTemplateRecord[]> {
    return this.agent.modules.workflow.listTemplates()
  }

  async getTemplate(templateId: string, version?: string): Promise<WorkflowTemplateRecord | null> {
    return this.agent.modules.workflow.getTemplate(templateId, version)
  }

  async discoverTemplates(connectionId: string, templateId?: string): Promise<WorkflowTemplateRecord[]> {
    return this.agent.modules.workflow.discoverTemplates(connectionId, { templateId })
  }

  async ensureTemplate(connectionId: string, templateId: string, version?: string): Promise<WorkflowTemplateRecord | null> {
    // Try local first
    let template = await this.getTemplate(templateId, version)
    if (template) return template

    // Discover from peer
    await this.discoverTemplates(connectionId, templateId)

    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 2000))
    return this.getTemplate(templateId, version)
  }

  // Instance Operations
  async start(params: WorkflowStartParams): Promise<WorkflowInstanceRecord> {
    const { templateId, templateVersion, connectionId, participants, context } = params

    return this.workflowService.start({
      templateId,
      templateVersion,
      connectionId,
      participants,
      context,
    })
  }

  async advance(params: WorkflowAdvanceParams): Promise<WorkflowInstanceRecord> {
    const { instanceId, event, input, idempotencyKey } = params

    return this.workflowService.advance(instanceId, event, {
      input,
      idempotencyKey,
    })
  }

  async getStatus(instanceId: string, options?: { includeUi?: boolean; includeActions?: boolean; uiProfile?: 'sender' | 'receiver' }): Promise<WorkflowStatus> {
    return this.workflowService.getStatus(instanceId, options)
  }

  async listInstances(connectionId?: string): Promise<WorkflowInstanceRecord[]> {
    if (connectionId) {
      return this.agent.modules.workflow.listInstancesByConnection(connectionId)
    }
    return this.agent.modules.workflow.listInstances()
  }

  async pause(instanceId: string): Promise<void> {
    return this.workflowService.pause(instanceId)
  }

  async resume(instanceId: string): Promise<void> {
    return this.workflowService.resume(instanceId)
  }

  async cancel(instanceId: string): Promise<void> {
    return this.workflowService.cancel(instanceId)
  }

  // Determine UI profile based on holder DID
  async deriveUiProfile(instanceId: string): Promise<'sender' | 'receiver'> {
    const status = await this.getStatus(instanceId)
    const myDid = this.agent.context.agentContext.contextCorrelationId

    if (status.participants?.holder?.did === myDid) {
      return 'receiver'
    }
    return 'sender'
  }
}
```

---

### Phase 3: React Hooks

#### Step 3.1: Core Workflow Hooks

**File**: `src/hooks/useWorkflows.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import { WorkflowInstanceRecord, WorkflowTemplateRecord } from '@ajna-inc/workflow/build'
import { MobileWorkflowService } from '../services/WorkflowService'

export function useWorkflows(connectionId?: string) {
  const { agent } = useAgent()
  const [instances, setInstances] = useState<WorkflowInstanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!agent) return

    setLoading(true)
    try {
      const service = new MobileWorkflowService(agent)
      const list = await service.listInstances(connectionId)
      setInstances(list)
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [agent, connectionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { instances, loading, error, refresh }
}

export function useWorkflowTemplates() {
  const { agent } = useAgent()
  const [templates, setTemplates] = useState<WorkflowTemplateRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!agent) return

    setLoading(true)
    try {
      const service = new MobileWorkflowService(agent)
      const list = await service.listTemplates()
      setTemplates(list)
    } finally {
      setLoading(false)
    }
  }, [agent])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { templates, loading, refresh }
}
```

**File**: `src/hooks/useWorkflowInstance.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import { WorkflowStatus } from '@ajna-inc/workflow/build'
import { MobileWorkflowService } from '../services/WorkflowService'

export function useWorkflowInstance(instanceId: string) {
  const { agent } = useAgent()
  const [status, setStatus] = useState<WorkflowStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (!agent || !instanceId) return

    setLoading(true)
    try {
      const service = new MobileWorkflowService(agent)
      const uiProfile = await service.deriveUiProfile(instanceId)
      const statusData = await service.getStatus(instanceId, {
        includeUi: true,
        includeActions: true,
        uiProfile,
      })
      setStatus(statusData)
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [agent, instanceId])

  const advance = useCallback(async (event: string, input?: Record<string, unknown>) => {
    if (!agent || !instanceId) return

    const service = new MobileWorkflowService(agent)
    await service.advance({
      instanceId,
      event,
      input,
      idempotencyKey: `mobile:${event}:${instanceId}:${Date.now()}`,
    })
    await refresh()
  }, [agent, instanceId, refresh])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { status, loading, error, refresh, advance }
}
```

**File**: `src/hooks/useWorkflowEvents.ts`

```typescript
import { useEffect } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import {
  WorkflowEventTypes,
  WorkflowInstanceStateChangedEvent,
  WorkflowInstanceStatusChangedEvent,
} from '@ajna-inc/workflow/build'

export function useWorkflowEvents(
  onStateChanged?: (event: WorkflowInstanceStateChangedEvent) => void,
  onStatusChanged?: (event: WorkflowInstanceStatusChangedEvent) => void
) {
  const { agent } = useAgent()

  useEffect(() => {
    if (!agent) return

    const stateSubscription = onStateChanged
      ? agent.events.on(WorkflowEventTypes.WorkflowInstanceStateChanged, onStateChanged)
      : null

    const statusSubscription = onStatusChanged
      ? agent.events.on(WorkflowEventTypes.WorkflowInstanceStatusChanged, onStatusChanged)
      : null

    return () => {
      stateSubscription?.off()
      statusSubscription?.off()
    }
  }, [agent, onStateChanged, onStatusChanged])
}
```

---

### Phase 4: Workflow Notifications Integration

#### Step 4.1: Add Workflow to Notification Types

**File**: `src/hooks/notifications.ts` (modify existing)

```typescript
import { WorkflowInstanceRecord, WorkflowEventTypes } from '@ajna-inc/workflow/build'

// Add workflow instances to notification types
export type NotificationItemType =
  | CredentialExchangeRecord
  | ProofExchangeRecord
  | CustomNotificationRecord
  | BasicMessageRecord
  | WorkflowInstanceRecord  // Add this

// In useNotifications hook, add workflow instances that need attention
const workflowInstances = agent.modules.workflow
  ? await agent.modules.workflow.listInstances()
  : []

// Filter for workflows needing user action
const pendingWorkflows = workflowInstances.filter(instance => {
  // Check if instance has pending actions for this user
  return instance.status === 'awaiting_input'
})
```

#### Step 4.2: Workflow Notification Component

**File**: `src/components/listItems/WorkflowNotificationItem.tsx`

```typescript
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { WorkflowInstanceRecord } from '@ajna-inc/workflow/build'
import { palette, spacing, typography, radius } from '../../theme/essi'

interface Props {
  workflow: WorkflowInstanceRecord
  onPress: () => void
}

export const WorkflowNotificationItem: React.FC<Props> = ({ workflow, onPress }) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <FeatherIcon name="git-branch" size={24} color={palette.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{workflow.templateId}</Text>
        <Text style={styles.subtitle}>
          State: {workflow.state} • {workflow.section}
        </Text>
      </View>
      <FeatherIcon name="chevron-right" size={20} color={palette.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    color: palette.text,
  },
  subtitle: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xxs,
  },
})
```

---

### Phase 5: UI Screens

#### Step 5.1: Workflow List Screen

**File**: `src/screens/essi/ESSIWorkflowList.tsx`

```typescript
import React, { useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { ESSIScreen } from '../../components/essi'
import { useWorkflows } from '../../hooks/useWorkflows'
import { palette, spacing, typography, radius } from '../../theme/essi'
import { Screens } from '../../types/navigators'

const ESSIWorkflowList: React.FC = () => {
  const navigation = useNavigation()
  const { instances, loading, refresh } = useWorkflows()

  const renderItem = useCallback(({ item }) => (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate(Screens.WorkflowDetails, { instanceId: item.id })}
    >
      <View style={styles.cardIcon}>
        <FeatherIcon name="git-branch" size={24} color={palette.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.templateId}</Text>
        <Text style={styles.cardSubtitle}>State: {item.state}</Text>
        <Text style={styles.cardMeta}>{item.section}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </Pressable>
  ), [navigation])

  return (
    <ESSIScreen
      headerTitle="Workflows"
      headerLeft="back"
      onHeaderLeftPress={() => navigation.goBack()}
      scrollable={false}
    >
      <FlatList
        data={instances}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={palette.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FeatherIcon name="inbox" size={48} color={palette.muted} />
            <Text style={styles.emptyText}>No active workflows</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: palette.text,
  },
  cardSubtitle: {
    ...typography.body,
    color: palette.muted,
  },
  cardMeta: {
    ...typography.caption,
    color: palette.muted,
    marginTop: spacing.xxs,
  },
  statusBadge: {
    backgroundColor: palette.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  statusText: {
    ...typography.caption,
    color: palette.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    color: palette.muted,
    marginTop: spacing.md,
  },
})

export default ESSIWorkflowList
```

#### Step 5.2: Workflow Details Screen

**File**: `src/screens/essi/ESSIWorkflowDetails.tsx`

```typescript
import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { StackScreenProps } from '@react-navigation/stack'
import FeatherIcon from 'react-native-vector-icons/Feather'
import { ESSIScreen, ESSIButton } from '../../components/essi'
import { useWorkflowInstance } from '../../hooks/useWorkflowInstance'
import { useWorkflowEvents } from '../../hooks/useWorkflowEvents'
import { palette, spacing, typography, radius } from '../../theme/essi'

type Props = StackScreenProps<any, 'WorkflowDetails'>

const ESSIWorkflowDetails: React.FC<Props> = ({ route, navigation }) => {
  const { instanceId } = route.params
  const { status, loading, error, refresh, advance } = useWorkflowInstance(instanceId)

  // Subscribe to real-time updates
  useWorkflowEvents(
    (event) => {
      if (event.payload.instanceId === instanceId) {
        refresh()
      }
    }
  )

  if (loading && !status) {
    return (
      <ESSIScreen headerTitle="Workflow" headerLeft="back" onHeaderLeftPress={() => navigation.goBack()}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </ESSIScreen>
    )
  }

  if (error || !status) {
    return (
      <ESSIScreen headerTitle="Workflow" headerLeft="back" onHeaderLeftPress={() => navigation.goBack()}>
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={48} color={palette.danger} />
          <Text style={styles.errorText}>Failed to load workflow</Text>
        </View>
      </ESSIScreen>
    )
  }

  return (
    <ESSIScreen
      headerTitle={status.template_id}
      headerLeft="back"
      onHeaderLeftPress={() => navigation.goBack()}
      scrollable={false}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* State Card */}
        <View style={styles.stateCard}>
          <View style={styles.stateIcon}>
            <FeatherIcon name="git-branch" size={32} color={palette.primary} />
          </View>
          <Text style={styles.stateName}>{status.state}</Text>
          <Text style={styles.sectionName}>{status.section}</Text>
        </View>

        {/* UI Hints */}
        {status.ui && status.ui.length > 0 && (
          <View style={styles.uiSection}>
            {status.ui.map((hint, index) => {
              if (hint.type === 'text') {
                return (
                  <Text key={index} style={styles.uiText}>
                    {hint.text}
                  </Text>
                )
              }
              return null
            })}
          </View>
        )}

        {/* Context Data */}
        {status.context && Object.keys(status.context).length > 0 && (
          <View style={styles.contextSection}>
            <Text style={styles.sectionTitle}>Context</Text>
            <View style={styles.contextCard}>
              {Object.entries(status.context).map(([key, value]) => (
                <View key={key} style={styles.contextRow}>
                  <Text style={styles.contextKey}>{key}</Text>
                  <Text style={styles.contextValue}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {status.actions && status.actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {status.actions.map((action, index) => (
            <View key={action.key} style={index > 0 ? styles.actionSpacing : undefined}>
              <ESSIButton
                title={action.event}
                onPress={() => advance(action.event)}
                variant={index === 0 ? 'primary' : 'outline'}
              />
            </View>
          ))}
        </View>
      )}
    </ESSIScreen>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: palette.danger,
    marginTop: spacing.md,
  },
  stateCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.outline,
    marginBottom: spacing.lg,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  stateName: {
    ...typography.headline,
    color: palette.text,
    marginBottom: spacing.xs,
  },
  sectionName: {
    ...typography.body,
    color: palette.muted,
  },
  uiSection: {
    marginBottom: spacing.lg,
  },
  uiText: {
    ...typography.body,
    color: palette.text,
    marginBottom: spacing.sm,
  },
  contextSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.overline,
    color: palette.muted,
    marginBottom: spacing.sm,
  },
  contextCard: {
    backgroundColor: palette.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.outline,
    overflow: 'hidden',
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.outline,
  },
  contextKey: {
    ...typography.bodyBold,
    color: palette.text,
  },
  contextValue: {
    ...typography.body,
    color: palette.muted,
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    paddingTop: spacing.md,
  },
  actionSpacing: {
    marginTop: spacing.sm,
  },
})

export default ESSIWorkflowDetails
```

---

### Phase 6: Navigation Integration

#### Step 6.1: Add Workflow Screens to Navigator Types

**File**: `src/types/navigators.ts` (add to existing)

```typescript
export enum Screens {
  // ... existing screens ...
  WorkflowList = 'WorkflowList',
  WorkflowDetails = 'WorkflowDetails',
}

export type RootStackParams = {
  // ... existing params ...
  [Screens.WorkflowList]: undefined
  [Screens.WorkflowDetails]: { instanceId: string }
}
```

#### Step 6.2: Add to Main Stack

**File**: `src/navigators/MainStack.tsx` (add screens)

```typescript
import ESSIWorkflowList from '../screens/essi/ESSIWorkflowList'
import ESSIWorkflowDetails from '../screens/essi/ESSIWorkflowDetails'

// In Stack.Navigator:
<Stack.Screen
  name={Screens.WorkflowList}
  component={ESSIWorkflowList}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name={Screens.WorkflowDetails}
  component={ESSIWorkflowDetails}
  options={{ headerShown: false }}
/>
```

---

### Phase 7: Backend-to-Mobile Workflow Push

When the backend sends a workflow to the mobile app:

1. **Backend starts workflow with mobile's connection**:
   - Backend calls `workflowService.start({ connectionId: mobileConnectionId, ... })`
   - WorkflowModule sends DIDComm message to mobile

2. **Mobile receives workflow message**:
   - WorkflowModule's DIDComm handler receives message
   - Creates local WorkflowInstanceRecord
   - Emits `WorkflowInstanceStateChangedEvent`

3. **Mobile shows notification**:
   - Event triggers notification via `useNotifications` hook
   - User sees workflow card in notifications

4. **User interacts with workflow**:
   - Opens workflow details screen
   - Sees available actions based on UI hints
   - Advances workflow via `advance()` method

5. **State syncs back to backend**:
   - Mobile's advance sends DIDComm message
   - Backend receives and updates its instance
   - Both sides stay in sync

---

## File Structure Summary

```
packages/core/src/
├── services/
│   └── WorkflowService.ts           # Core workflow service
│
├── hooks/
│   ├── useWorkflows.ts              # List workflows hook
│   ├── useWorkflowInstance.ts       # Single instance hook
│   └── useWorkflowEvents.ts         # Event subscription
│
├── screens/essi/
│   ├── ESSIWorkflowList.tsx         # List screen
│   └── ESSIWorkflowDetails.tsx      # Details screen
│
├── components/listItems/
│   └── WorkflowNotificationItem.tsx # Notification card
│
├── utils/
│   └── agent.ts                     # Add workflow module
│
├── types/
│   └── navigators.ts                # Add screen types
│
└── container-api.ts                 # Add workflow token
```

---

## Testing Plan

1. **Unit Tests**:
   - WorkflowService methods
   - Hook state management
   - Event handling

2. **Integration Tests**:
   - Start workflow from backend, receive on mobile
   - Advance workflow on mobile, sync to backend
   - Template discovery

3. **E2E Tests**:
   - Full KYC workflow flow
   - Credential issuance workflow
   - Error handling (network, timeouts)

---

## Considerations

1. **Offline Support**: Workflows may need offline queueing similar to backend's PersistentCommandQueue
2. **Template Caching**: Cache discovered templates locally for faster access
3. **State Persistence**: Ensure workflow state survives app restart
4. **Error Handling**: Graceful degradation when workflow module unavailable
5. **Localization**: Translate workflow UI hints and actions
