import { Agent } from '@credo-ts/core'
import type {
  WorkflowTemplateRecord,
  WorkflowInstanceRecord,
  WorkflowInstanceStatus,
} from '@ajna-inc/workflow'
import { WorkflowInstanceRepository } from '@ajna-inc/workflow'

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

export interface WorkflowStatusOptions {
  includeUi?: boolean
  includeActions?: boolean
  uiProfile?: 'sender' | 'receiver'
}

/**
 * Mobile Workflow Service
 *
 * Provides high-level workflow operations by calling the agent's workflow module directly.
 * Unlike the backend which exposes these via REST API, the mobile app uses this service
 * to interact with workflows without any HTTP layer.
 */
export class MobileWorkflowService {
  private agent: Agent<any>

  constructor(agent: Agent<any>) {
    this.agent = agent
  }

  /**
   * Check if workflow module is available
   */
  get isAvailable(): boolean {
    return !!this.agent.modules.workflow
  }

  /**
   * Get the workflow module API from agent
   * The workflow module exposes its functionality via an 'api' property
   */
  private get workflowApi() {
    if (!this.agent.modules.workflow) {
      throw new Error('Workflow module is not available on this agent')
    }
    // The module.api gives us the WorkflowApi instance
    return this.agent.modules.workflow
  }

  /**
   * Get the workflow instance repository for direct queries
   */
  private get instanceRepository(): WorkflowInstanceRepository {
    return this.agent.context.dependencyManager.resolve(WorkflowInstanceRepository)
  }

  // ============================================
  // Template Operations
  // ============================================

  /**
   * List all locally stored workflow templates
   */
  async listTemplates(): Promise<WorkflowTemplateRecord[]> {
    return this.workflowApi.listTemplates()
  }

  /**
   * Get a specific template by ID and optionally version
   */
  async getTemplate(templateId: string, version?: string): Promise<WorkflowTemplateRecord | null> {
    return this.workflowApi.getTemplate(templateId, version)
  }

  /**
   * Discover templates from a connected peer via DIDComm
   * Note: This is async and doesn't return templates directly - they arrive via events
   */
  async discoverTemplates(
    connectionId: string,
    options?: { templateId?: string; templateVersion?: string }
  ): Promise<void> {
    await this.workflowApi.discoverTemplates(connectionId, {
      template_id: options?.templateId,
      version: options?.templateVersion,
    })
  }

  /**
   * Ensure a template is available locally, fetching from peer if needed
   * Uses the API's built-in ensureTemplate method which handles discovery and waiting
   */
  async ensureTemplate(
    connectionId: string,
    templateId: string,
    version?: string,
    waitMs: number = 5000
  ): Promise<WorkflowTemplateRecord | null> {
    // Try using the API's ensureTemplate method which handles discovery
    try {
      const template = await this.workflowApi.ensureTemplate({
        connection_id: connectionId,
        template_id: templateId,
        template_version: version,
        waitMs,
      })
      return template
    } catch {
      return null
    }
  }

  // ============================================
  // Instance Operations
  // ============================================

  /**
   * Start a new workflow instance
   */
  async start(params: WorkflowStartParams): Promise<WorkflowInstanceRecord> {
    const { templateId, templateVersion, connectionId, participants, context } = params

    return this.workflowApi.start({
      template_id: templateId,
      template_version: templateVersion,
      connection_id: connectionId,
      participants: participants as any,
      context,
    })
  }

  /**
   * Advance a workflow instance to the next state
   */
  async advance(params: WorkflowAdvanceParams): Promise<WorkflowInstanceRecord> {
    const { instanceId, event, input, idempotencyKey } = params

    return this.workflowApi.advance({
      instance_id: instanceId,
      event,
      input,
      idempotency_key: idempotencyKey,
    })
  }

  /**
   * Get the current status of a workflow instance
   */
  async getStatus(instanceId: string, options?: WorkflowStatusOptions): Promise<WorkflowInstanceStatus> {
    const result = await this.workflowApi.status({
      instance_id: instanceId,
      include_actions: options?.includeActions,
      include_ui: options?.includeUi,
      ui_profile: options?.uiProfile,
    })
    return result as unknown as WorkflowInstanceStatus
  }

  /**
   * List all workflow instances, optionally filtered by connection
   * Uses the repository directly since the API doesn't expose list methods
   */
  async listInstances(connectionId?: string): Promise<WorkflowInstanceRecord[]> {
    const repo = this.instanceRepository

    if (connectionId) {
      return repo.findByConnection(this.agent.context, connectionId)
    }

    return repo.getAll(this.agent.context)
  }

  /**
   * Get a single workflow instance by ID
   */
  async getInstance(instanceId: string): Promise<WorkflowInstanceRecord | null> {
    try {
      return await this.instanceRepository.getByInstanceId(this.agent.context, instanceId)
    } catch {
      return null
    }
  }

  /**
   * Pause a workflow instance
   */
  async pause(instanceId: string): Promise<void> {
    await this.workflowApi.pause({ instance_id: instanceId })
  }

  /**
   * Resume a paused workflow instance
   */
  async resume(instanceId: string): Promise<void> {
    await this.workflowApi.resume({ instance_id: instanceId })
  }

  /**
   * Cancel a workflow instance
   */
  async cancel(instanceId: string): Promise<void> {
    await this.workflowApi.cancel({ instance_id: instanceId })
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Determine the UI profile (sender/receiver) based on the agent's DID
   */
  async deriveUiProfile(instanceId: string): Promise<'sender' | 'receiver'> {
    const status = await this.getStatus(instanceId)

    // Get agent's DID
    const agentDid = this.agent.config.label // Fallback to label if no DID available

    // Check if we're the holder (receiver) or issuer (sender)
    const holderDid = (status as any).participants?.holder?.did
    const issuerDid = (status as any).participants?.issuer?.did

    // If we're the holder, we're the receiver
    if (holderDid && this.isOurDid(holderDid)) {
      return 'receiver'
    }

    // If we're the issuer, we're the sender
    if (issuerDid && this.isOurDid(issuerDid)) {
      return 'sender'
    }

    // Default to receiver for mobile (typically the holder)
    return 'receiver'
  }

  /**
   * Check if a DID belongs to this agent
   */
  private isOurDid(did: string): boolean {
    // This is a simplified check - in production you'd check against agent's DIDs
    try {
      const agentDids = this.agent.dids
      // For now, just return false and let the caller handle it
      return false
    } catch {
      return false
    }
  }

  /**
   * Get workflows that need user attention (pending actions)
   */
  async getPendingWorkflows(): Promise<WorkflowInstanceRecord[]> {
    const instances = await this.listInstances()

    // Filter for instances that need user input
    const pending: WorkflowInstanceRecord[] = []

    for (const instance of instances) {
      try {
        const uiProfile = await this.deriveUiProfile(instance.id)
        const status = await this.getStatus(instance.id, {
          includeActions: true,
          uiProfile,
        })

        // If there are actions available (action_menu), it needs attention
        const actionMenu = (status as any).action_menu ?? (status as any).actions
        if (actionMenu && actionMenu.length > 0) {
          pending.push(instance)
        }
      } catch {
        // Skip instances we can't get status for
      }
    }

    return pending
  }

  /**
   * Generate an idempotency key for an advance operation
   */
  generateIdempotencyKey(event: string, instanceId: string): string {
    return `mobile:${event}:${instanceId}:${Date.now()}`
  }
}
