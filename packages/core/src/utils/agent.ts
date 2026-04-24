import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  DataIntegrityCredentialFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  AutoAcceptCredential,
  AutoAcceptProof,
  BasicMessagesModule,
  ConnectionsModule,
  CredentialsModule,
  DidsModule,
  DifPresentationExchangeProofFormatService,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  MediationRecipientModule,
  MediatorPickupStrategy,
  PeerDidResolver,
  ProofsModule,
  X509Module,
  V2CredentialProtocol,
  V2ProofProtocol,
  WebDidResolver,
} from '@credo-ts/core'
import Config from 'react-native-config'
import { IndyVdrAnonCredsRegistry, IndyVdrModule, IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'
import { OpenId4VcHolderModule } from '@credo-ts/openid4vc'
import { PushNotificationsApnsModule, PushNotificationsFcmModule } from '@credo-ts/push-notifications'
import { WebvhDidResolver } from '@credo-ts/webvh'
import { useAgent } from '@credo-ts/react-hooks'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'
import { EthereumLedgerService, KanonAnonCredsRegistry, KanonDIDRegistrar, KanonDIDResolver, KanonModule, KanonModuleConfig } from 'kanon-react-native'
import { WorkflowModule } from '@ajna-inc/workflow'
import { WebRTCModule } from '@ajna-inc/webrtc'
import { OpenBadgesModule } from '@ajna-inc/openbadges'

interface GetAgentModulesOptions {
  indyNetworks?: IndyVdrPoolConfig[]
  mediatorInvitationUrl?: string
  txnCache?: { capacity: number; expiryOffsetMs: number; path?: string }
  trustedX509Certificates?: string[]
}

export type BifoldAgent = Agent<ReturnType<typeof getAgentModules>>

/**
 * Constructs the modules to be used in the agent setup
 * @param indyNetworks
 * @param mediatorInvitationUrl determine which mediator to use
 * @param txnCache optional local cache config for indyvdr
 * @returns modules to be used in agent setup
 */
export function getAgentModules({ indyNetworks, mediatorInvitationUrl, txnCache: _txnCache, trustedX509Certificates }: GetAgentModulesOptions) {
  const indyCredentialFormat = new LegacyIndyCredentialFormatService()
  const indyProofFormat = new LegacyIndyProofFormatService()
  const kanonRpcUrl = Config.KANON_RPC_URL

  const ethConfig = new KanonModuleConfig({
    networks: [
      {
        network: 'testnet',
        rpcUrl: kanonRpcUrl || 'https://ethereum-sepolia.rpc.subquery.network/public',
        // dummy private key since not a registrar
        privateKey: '0x00000000002a655b0cca24b8029acb27738fe32d131ceaa9a43fd9929c4e6116',
      },
    ],
  })
  const ledgerService = new EthereumLedgerService(ethConfig);
  return {
    askar: new AskarModule({
      ariesAskar,
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks as [IndyVdrPoolConfig, ...IndyVdrPoolConfig[]],
    }),
    anoncreds: new AnonCredsModule({
      anoncreds,
      registries: [new IndyVdrAnonCredsRegistry(), new KanonAnonCredsRegistry()],
    }),
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),
    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V1CredentialProtocol({ indyCredentialFormat }),
        new V2CredentialProtocol({
          credentialFormats: [
            indyCredentialFormat,
            new AnonCredsCredentialFormatService(),
            new DataIntegrityCredentialFormatService(),
          ],
        }),
      ],
    }),
    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V1ProofProtocol({ indyProofFormat }),
        new V2ProofProtocol({
          proofFormats: [
            indyProofFormat,
            new AnonCredsProofFormatService(),
            new DifPresentationExchangeProofFormatService(),
          ],
        }),
      ],
    }),
    kanon: new KanonModule(ethConfig),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl: mediatorInvitationUrl,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    }),
    pushNotificationsFcm: new PushNotificationsFcmModule(),
    pushNotificationsApns: new PushNotificationsApnsModule(),
    openId4VcHolder: new OpenId4VcHolderModule(),
    dids: new DidsModule({
      resolvers: [
        new WebvhDidResolver(),
        new WebDidResolver(),
        new JwkDidResolver(),
        new KeyDidResolver(),
        new PeerDidResolver(),
        new KanonDIDResolver(ledgerService)
      ],
      registrars: [new JwkDidRegistrar(), new KeyDidRegistrar(), new KanonDIDRegistrar(ledgerService)],
    }),
    basicMessages: new BasicMessagesModule(),
    workflow: new WorkflowModule({
      enableProblemReport: true,
      enablePaymentsEventMapping: false,
      enableAutoDiscoverOnStart: true,
      discoveryTimeoutMs: 30000,
    }),
    webrtc: new WebRTCModule({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      defaultPolicy: 'all',
      defaultTrickle: true,
    }),
    openbadges: new OpenBadgesModule({}),
    x509: new X509Module({
      trustedCertificates: trustedX509Certificates && trustedX509Certificates.length > 0
        ? trustedX509Certificates as [string, ...string[]]
        : undefined,
    }),
  }
}

interface MyAgentContextInterface {
  loading: boolean
  agent: BifoldAgent
}

export const useAppAgent = useAgent as () => MyAgentContextInterface

export const createLinkSecretIfRequired = async (agent: Agent) => {
  // If we don't have any link secrets yet, we will create a
  // default link secret that will be used for all anoncreds
  // credential requests.
  const linkSecretIds = await agent.modules.anoncreds.getLinkSecretIds()
  if (linkSecretIds.length === 0) {
    await agent.modules.anoncreds.createLinkSecret({
      setAsDefault: true,
    })
  }
}
