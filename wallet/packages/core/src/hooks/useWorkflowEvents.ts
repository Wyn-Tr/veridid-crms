import { useEffect, useCallback, useRef } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import type { BaseEvent } from '@credo-ts/core'

// Event type constants (matching @ajna-inc/workflow WorkflowEventTypes enum)
// IMPORTANT: These must match EXACTLY - no "Event" suffix
export const WorkflowEventTypes = {
  WorkflowInstanceStateChanged: 'WorkflowInstanceStateChanged',
  WorkflowInstanceStatusChanged: 'WorkflowInstanceStatusChanged',
  WorkflowInstanceCompleted: 'WorkflowInstanceCompleted',
} as const

// Payload types matching the actual workflow module
export interface WorkflowInstanceStateChangedEvent extends BaseEvent {
  type: typeof WorkflowEventTypes.WorkflowInstanceStateChanged
  payload: {
    instanceRecord: {
      id: string
      instanceId: string
      templateId: string
      templateVersion: string
      connectionId: string
      state: string
      section?: string
      status: string
      context: Record<string, unknown>
      [key: string]: unknown
    }
    previousState: string | null
    newState: string
    event: string
    actionKey?: string
    msgId?: string
  }
}

export interface WorkflowInstanceStatusChangedEvent extends BaseEvent {
  type: typeof WorkflowEventTypes.WorkflowInstanceStatusChanged
  payload: {
    instanceRecord: {
      id: string
      instanceId: string
      templateId: string
      templateVersion: string
      connectionId: string
      state: string
      section?: string
      status: string
      context: Record<string, unknown>
      [key: string]: unknown
    }
    previousStatus: string | null
    newStatus: string
    reason?: string
  }
}

export interface WorkflowInstanceCompletedEvent extends BaseEvent {
  type: typeof WorkflowEventTypes.WorkflowInstanceCompleted
  payload: {
    instanceRecord: {
      id: string
      instanceId: string
      templateId: string
      templateVersion: string
      connectionId: string
      state: string
      section?: string
      status: string
      context: Record<string, unknown>
      [key: string]: unknown
    }
    state: string
    section?: string
  }
}

export type WorkflowEvent =
  | WorkflowInstanceStateChangedEvent
  | WorkflowInstanceStatusChangedEvent
  | WorkflowInstanceCompletedEvent

export interface UseWorkflowEventsOptions {
  onStateChanged?: (event: WorkflowInstanceStateChangedEvent) => void
  onStatusChanged?: (event: WorkflowInstanceStatusChangedEvent) => void
  onCompleted?: (event: WorkflowInstanceCompletedEvent) => void
  // Called when a new workflow instance is created (state changed from null)
  onCreated?: (event: WorkflowInstanceStateChangedEvent) => void
  instanceId?: string // Filter events for specific instance
}

/**
 * Hook to subscribe to workflow events
 *
 * @example
 * ```tsx
 * useWorkflowEvents({
 *   onStateChanged: (event) => {
 *     console.log('Workflow state changed:', event.payload.newState)
 *     refresh()
 *   },
 *   onCreated: (event) => {
 *     console.log('New workflow created:', event.payload.instanceRecord.instanceId)
 *   },
 *   instanceId: 'my-instance-id', // Only listen to events for this instance
 * })
 * ```
 */
export function useWorkflowEvents(options: UseWorkflowEventsOptions = {}) {
  const { agent } = useAgent()
  const optionsRef = useRef(options)

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Helper to check if event is for our instance
  const isRelevantEvent = useCallback((event: WorkflowEvent): boolean => {
    const instanceId = optionsRef.current.instanceId
    if (!instanceId) return true // No filter, all events are relevant

    const eventInstanceId = event.payload?.instanceRecord?.instanceId
    return eventInstanceId === instanceId
  }, [])

  useEffect(() => {
    if (!agent) return

    const unsubscribers: Array<() => void> = []

    // Subscribe to state changed events
    // This also handles "created" events (when previousState is null)
    if (optionsRef.current.onStateChanged || optionsRef.current.onCreated) {
      const handler = (event: WorkflowInstanceStateChangedEvent) => {
        if (isRelevantEvent(event)) {
          // Call onCreated if this is a new instance (previousState is null)
          if (event.payload.previousState === null && optionsRef.current.onCreated) {
            optionsRef.current.onCreated(event)
          }
          // Always call onStateChanged if provided
          optionsRef.current.onStateChanged?.(event)
        }
      }
      agent.events.on(WorkflowEventTypes.WorkflowInstanceStateChanged, handler)
      unsubscribers.push(() => agent.events.off(WorkflowEventTypes.WorkflowInstanceStateChanged, handler))
    }

    // Subscribe to status changed events
    if (optionsRef.current.onStatusChanged) {
      const handler = (event: WorkflowInstanceStatusChangedEvent) => {
        if (isRelevantEvent(event)) {
          optionsRef.current.onStatusChanged?.(event)
        }
      }
      agent.events.on(WorkflowEventTypes.WorkflowInstanceStatusChanged, handler)
      unsubscribers.push(() => agent.events.off(WorkflowEventTypes.WorkflowInstanceStatusChanged, handler))
    }

    // Subscribe to completed events
    if (optionsRef.current.onCompleted) {
      const handler = (event: WorkflowInstanceCompletedEvent) => {
        if (isRelevantEvent(event)) {
          optionsRef.current.onCompleted?.(event)
        }
      }
      agent.events.on(WorkflowEventTypes.WorkflowInstanceCompleted, handler)
      unsubscribers.push(() => agent.events.off(WorkflowEventTypes.WorkflowInstanceCompleted, handler))
    }

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [agent, isRelevantEvent])
}

/**
 * Hook to subscribe to all workflow events for a specific instance
 */
export function useWorkflowInstanceEvents(
  instanceId: string,
  onEvent: (event: WorkflowEvent) => void
) {
  useWorkflowEvents({
    instanceId,
    onStateChanged: onEvent as any,
    onStatusChanged: onEvent as any,
    onCompleted: onEvent as any,
  })
}

/**
 * Hook to subscribe to new workflow creations
 * Listens for state changes where previousState is null
 */
export function useNewWorkflowEvents(onNewWorkflow: (event: WorkflowInstanceStateChangedEvent) => void) {
  useWorkflowEvents({
    onCreated: onNewWorkflow,
  })
}
