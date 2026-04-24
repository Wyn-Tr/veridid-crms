import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import type { WorkflowInstanceRecord } from '@ajna-inc/workflow'
import { MobileWorkflowService } from '../services/WorkflowService'

export interface WorkflowAction {
  key: string
  event: string
  label?: string
  input_schema?: Record<string, unknown>
}

export interface WorkflowUiHint {
  type: 'text' | 'submit-button' | 'input' | 'divider'
  text?: string
  label?: string
  event?: string
  input_schema?: Record<string, unknown>
  enabledWhen?: string
}

export interface EnrichedWorkflowStatus {
  instance_id: string
  template_id: string
  state: string
  section: string
  status: string
  context: Record<string, unknown>
  actions?: WorkflowAction[]
  ui?: WorkflowUiHint[]
  uiProfile?: 'sender' | 'receiver'
}

/**
 * Hook to manage a single workflow instance
 */
export function useWorkflowInstance(instanceId: string) {
  const { agent } = useAgent()
  const [instance, setInstance] = useState<WorkflowInstanceRecord | null>(null)
  const [status, setStatus] = useState<EnrichedWorkflowStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const service = useMemo(() => {
    if (!agent) return null
    return new MobileWorkflowService(agent)
  }, [agent])

  const refresh = useCallback(async () => {
    if (!service || !instanceId) return

    setLoading(true)
    setError(null)

    try {
      // Get instance record
      const instanceRecord = await service.getInstance(instanceId)
      setInstance(instanceRecord)

      if (instanceRecord) {
        // Derive UI profile
        const uiProfile = await service.deriveUiProfile(instanceId)

        // Get status with UI and actions
        const statusData = (await service.getStatus(instanceId, {
          includeUi: true,
          includeActions: true,
          uiProfile,
        })) as unknown as Record<string, unknown>

        // Get context from instance record (status API doesn't include it)
        // The context contains collected form data needed for review steps
        const instanceContext = (instanceRecord as any).context ?? {}

        setStatus({
          instance_id: (statusData.instance_id as string) ?? instanceId,
          template_id: (statusData.template_id as string) ?? '',
          state: (statusData.state as string) ?? '',
          section: (statusData.section as string) ?? '',
          status: (statusData.status as string) ?? '',
          context: instanceContext,
          actions: statusData.actions as WorkflowAction[] | undefined,
          ui: statusData.ui as WorkflowUiHint[] | undefined,
          uiProfile,
        })
      } else {
        setStatus(null)
      }
    } catch (e) {
      setError(e as Error)
      setInstance(null)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [service, instanceId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const advance = useCallback(
    async (event: string, input?: Record<string, unknown>) => {
      if (!service || !instanceId) {
        throw new Error('Workflow service or instance not available')
      }

      setAdvancing(true)
      setError(null)

      try {
        const idempotencyKey = service.generateIdempotencyKey(event, instanceId)

        await service.advance({
          instanceId,
          event,
          input,
          idempotencyKey,
        })

        // Refresh status after advance
        await refresh()
      } catch (e) {
        setError(e as Error)
        throw e
      } finally {
        setAdvancing(false)
      }
    },
    [service, instanceId, refresh]
  )

  const pause = useCallback(async () => {
    if (!service || !instanceId) {
      throw new Error('Workflow service or instance not available')
    }

    try {
      await service.pause(instanceId)
      await refresh()
    } catch (e) {
      setError(e as Error)
      throw e
    }
  }, [service, instanceId, refresh])

  const resume = useCallback(async () => {
    if (!service || !instanceId) {
      throw new Error('Workflow service or instance not available')
    }

    try {
      await service.resume(instanceId)
      await refresh()
    } catch (e) {
      setError(e as Error)
      throw e
    }
  }, [service, instanceId, refresh])

  const cancel = useCallback(async () => {
    if (!service || !instanceId) {
      throw new Error('Workflow service or instance not available')
    }

    try {
      await service.cancel(instanceId)
      await refresh()
    } catch (e) {
      setError(e as Error)
      throw e
    }
  }, [service, instanceId, refresh])

  // Extract available actions from status
  const actions = useMemo(() => {
    return (status as any)?.actions ?? []
  }, [status])

  // Extract UI hints from status
  const uiHints = useMemo(() => {
    return (status as any)?.ui ?? []
  }, [status])

  // Check if workflow is in a final state
  const isComplete = useMemo(() => {
    if (!status) return false
    const finalStates = ['done', 'completed', 'cancelled', 'failed', 'error']
    return finalStates.includes((status as any).state?.toLowerCase() ?? '')
  }, [status])

  // Check if there are pending actions
  const hasPendingActions = useMemo(() => {
    return actions.length > 0
  }, [actions])

  return {
    instance,
    status,
    loading,
    advancing,
    error,
    refresh,
    advance,
    pause,
    resume,
    cancel,
    actions,
    uiHints,
    isComplete,
    hasPendingActions,
    uiProfile: status?.uiProfile,
  }
}
