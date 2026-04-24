import { Agent, MediationRecord } from '@credo-ts/core'

export const isMediatorInvitation = async (agent: Agent, url: string): Promise<boolean> => {
  try {
    const invitation = await agent.oob.parseInvitation(url)
    if (!invitation) {
      return false
    }

    if (invitation.goalCode === 'aries.vc.mediate') {
      agent.config.logger.info(`Invitation is a mediator invitation with goal code: ${invitation.goalCode}`)
      return true
    }

    return false
  } catch (error) {
    agent.config.logger.error(`Invitation is not a mediator invitation.`, error as Error)
    return false
  }
}

const provisionMediationRecordFromMediatorUrl = async (
  agent: Agent,
  url: string
): Promise<MediationRecord | undefined> => {
  try {
    agent.config.logger.info(`Provisioning mediator from URL: ${url}`)
    const invitation = await agent.oob.parseInvitation(url)
    if (!invitation) {
      agent.config.logger.error(`No invitation found in URL: ${url}`)
      return undefined
    }
    agent.config.logger.info(`Mediator invitation parsed: id=${invitation.id}, goal=${invitation.goalCode ?? 'unknown'}`)

    const outOfBandRecord = await agent.oob.findByReceivedInvitationId(invitation.id)
    agent.config.logger.info(`Mediator out-of-band record: ${outOfBandRecord?.id ?? 'not-found'}`)
    let [connection] = outOfBandRecord ? await agent.connections.findAllByOutOfBandId(outOfBandRecord.id) : []

    if (!connection) {
      agent.config.logger.warn(`No connection found for out-of-band record: ${outOfBandRecord?.id}`)
      const invite = await agent.oob.parseInvitation(url)
      const { connectionRecord: newConnection } = await agent.oob.receiveInvitation(invite, {
        autoAcceptConnection: true,
        autoAcceptInvitation: true,
      })

      if (!newConnection) {
        agent.config.logger.error(`Failed to create connection from invitation: ${JSON.stringify(invite, null, 2)}`)
        return
      }
      connection = newConnection
    }

    agent.config.logger.info(
      `Mediator connection resolved: id=${connection.id}, state=${connection.state}, isReady=${connection.isReady}`
    )
    const result = connection.isReady ? connection : await agent.connections.returnWhenIsConnected(connection.id)
    const mediationRecord = await agent.mediationRecipient.provision(result)
    agent.config.logger.info(
      `Mediator provisioned: id=${mediationRecord.id}, connectionId=${mediationRecord.connectionId}, state=${mediationRecord.state}`
    )
    return mediationRecord
  } catch (error) {
    agent.config.logger.error(`Failed to get connection ID from mediator URL: ${error}`)
    return
  }
}

export const setMediationToDefault = async (agent: Agent, mediatorUrl: string) => {
  const mediationRecord = await provisionMediationRecordFromMediatorUrl(agent, mediatorUrl)
  if (!mediationRecord) {
    agent.config.logger.error(`No connection record found for mediator URL: ${mediatorUrl}`)
    return
  }

  const currentDefault = await agent.mediationRecipient.findDefaultMediator()
  if (currentDefault?.connectionId === mediationRecord.id) {
    agent.config.logger.info(`Default mediator already set for connection ID: ${mediationRecord.id}`)
    return
  }

  await agent.mediationRecipient.setDefaultMediator(mediationRecord)
  agent.config.logger.info(`setting default mediator with record: ${JSON.stringify(mediationRecord)}`)
}
