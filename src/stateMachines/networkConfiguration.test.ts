import { v4 as uuid } from 'uuid'
import { devices } from '../WebSocketListener'
import { EnvReader } from '../utils/EnvReader'
import { config } from '../test/helper/Config'
// import { SignatureHelper } from '../utils/SignatureHelper'
import { ClientAction } from '../models/RCS.Config'
// import { Configurator } from '../Configurator'
import { NetworkConfiguration } from './networkConfiguration'
import { interpret } from 'xstate'
import { HttpHandler } from '../HttpHandler'

const clientId = uuid()
EnvReader.GlobalEnvConfig = config
// const configurator = new Configurator()
describe('Network Configuration', () => {
  let config
  let currentStateIndex: number
  let networkConfig: NetworkConfiguration
  let context
  let invokeWsmanCallSpy
  let ethernetPortSettingsSpy
  let WiFiPortConfigurationServiceSpy
  let WiFiEndpointSettingsSpy
  let wrapItSpy: jest.SpyInstance
  let responseMessageSpy: jest.SpyInstance
  let sendSpy: jest.SpyInstance
  jest.setTimeout(15000)
  beforeEach(() => {
    devices[clientId] = {
      unauthCount: 0,
      ClientId: clientId,
      ClientSocket: { send: jest.fn() } as any,
      ClientData: {
        method: 'activation',
        apiKey: 'key',
        appVersion: '1.2.0',
        protocolVersion: '4.0.0',
        status: 'ok',
        message: "all's good!",
        payload: {
          ver: '11.8.50',
          build: '3425',
          fqdn: 'vprodemo.com',
          password: 'KQGnH+N5qJ8YLqjEFJMnGSgcnFLMv0Tk',
          hostname: 'DESKTOP-9CC12U7',
          currentMode: 0,
          certHashes: [
            'e7685634efacf69ace939a6b255b7b4fabef42935b50a265acb5cb6027e44e70',
            'eb04cf5eb1f39afa762f2bb120f296cba520c1b97db1589565b81cb9a17b7244'
          ],
          sku: '16392',
          uuid: '4bac9510-04a6-4321-bae2-d45ddf07b684',
          username: '$$OsAdmin',
          client: 'PPC',
          profile: 'profile1',
          action: ClientAction.ADMINCTLMODE
        }
      },
      ciraconfig: {},
      network: {},
      status: {},
      activationStatus: {},
      connectionParams: {
        guid: '4c4c4544-004b-4210-8033-b6c04f504633',
        port: 16992,
        digestChallenge: null,
        username: 'admin',
        password: 'P@ssw0rd'
      },
      uuid: '4c4c4544-004b-4210-8033-b6c04f504633',
      messageId: 1
    }
    networkConfig = new NetworkConfiguration()
    context = {
      amtProfile: null,
      generalSettings: {
        AMTNetworkEnabled: 1,
        RmcpPingResponseEnabled: true,
        SharedFQDN: false
      },
      wiredSettings: {
        DHCPEnabled: true,
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        IpSyncEnabled: false,
        MACAddress: 'a4-bb-6d-89-52-e4'
      },
      wifiProfiles: [],
      wifiProfileCount: 0,
      message: '',
      clientId,
      xmlMessage: '',
      response: '',
      status: 'wsman',
      errorMessage: '',
      httpHandler: new HttpHandler()
    }
    context.amtProfile = {
      profileName: 'acm',
      generateRandomPassword: false,
      activation: ClientAction.ADMINCTLMODE,
      ciraConfigName: 'config1',
      generateRandomMEBxPassword: false,
      tags: ['acm'],
      dhcpEnabled: true,
      wifiConfigs: [
        {
          priority: 1,
          profileName: 'home'
        }
      ]
    }
    WiFiPortConfigurationServiceSpy = jest.spyOn(networkConfig.amt, 'WiFiPortConfigurationService').mockReturnValue('done')
    invokeWsmanCallSpy = jest.spyOn(networkConfig, 'invokeWsmanCall').mockImplementation().mockResolvedValue('done')
    ethernetPortSettingsSpy = jest.spyOn(networkConfig.amt, 'EthernetPortSettings').mockImplementation().mockReturnValue('abcdef')
    WiFiEndpointSettingsSpy = jest.spyOn(networkConfig.cim, 'WiFiEndpointSettings').mockReturnValue('done')
    sendSpy = jest.spyOn(devices[clientId].ClientSocket, 'send').mockReturnValue()
    wrapItSpy = jest.spyOn(context.httpHandler, 'wrapIt').mockReturnValue('message')
    responseMessageSpy = jest.spyOn(networkConfig.responseMsg, 'get')
    currentStateIndex = 0
    config = {
      services: {
        'put-general-settings': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'enumerate-ethernet-port-settings': Promise.resolve({
          Envelope: {
            Header: {},
            Body: { EnumerateResponse: { EnumerationContext: '09000000-0000-0000-0000-000000000000' } }
          }
        }),
        'error-machine': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'pull-ethernet-port-settings': Promise.resolve({
          Envelope: {
            Header: {},
            Body: {
              PullResponse: {
                Items: {
                  AMT_EthernetPortSettings: [
                    { DHCPEnabled: true, ElementName: 'Intel(r) AMT Ethernet Port Settings', InstanceID: 'Intel(r) AMT Ethernet Port Settings 0', IpSyncEnabled: false },
                    { ElementName: 'Intel(r) AMT Ethernet Port Settings', InstanceID: 'Intel(r) AMT Ethernet Port Settings 1', MACAddress: '00-00-00-00-00-00' }
                  ]
                }
              }
            }
          }
        }),
        'put-ethernet-port-settings': Promise.resolve({
          Envelope: {
            Header: {},
            Body: {
              PullResponse: {
                Items: {
                  AMT_EthernetPortSettings: { DHCPEnabled: true, SharedStaticIp: false, ElementName: 'Intel(r) AMT Ethernet Port Settings', InstanceID: 'Intel(r) AMT Ethernet Port Settings 0', IpSyncEnabled: true }
                }
              }
            }
          }
        }),
        'enumerate-wifi-endpoint-settings': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'pull-wifi-endpoint-settings': Promise.resolve({ Envelope: { Body: { PullResponse: { Items: { CIM_WiFiEndpointSettings: null } } } } }),
        'delete-wifi-endpoint-settings': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'request-state-change-for-wifi-port': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'add-wifi-settings': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'get-wifi-port-configuration-service': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        'put-wifi-port-configuration-service': async (_, event) => await Promise.resolve({ clientId: event.clientId }),
        NETWORKCONFIGURED: () => { }
      },
      guards: {
        isWiFiProfilesExits: (context, event) => true,
        // isWirelessOnlyDevice: (context, event) => false,
        // isWiredSupportedOnDevice: (context, event) => true,
        // isWirelessSupportedOnDevice: (context, event) => false,
        isWirelessProfilesExistsOnDevice: (context, event) => true,
        isWifiProfileAdded: (context, event) => false,
        isWifiProfileDeleted: (context, event) => true,
        islocalProfileSynchronizationNotEnabled: (context, event) => true
      },
      actions: {
        'Reset Unauth Count': () => { },
        'update configuration status': () => { },
        'Read Ethernet Port Settings': () => { },
        'Read Ethernet Port Settings Put Response': () => { },
        'Read WiFi Endpoint Settings Pull Response': () => { }
      }
    }
  })

  describe('State machines', () => {
    it('should eventually reach "NETWORKCONFIGURED" state', (done) => {
      const mockNetworkConfigurationMachine = networkConfig.machine.withConfig(config).withContext(context)
      const flowStates = [
        'ACTIVATION',
        'PUT_GENERAL_SETTINGS',
        'ENUMERATE_ETHERNET_PORT_SETTINGS',
        'PULL_ETHERNET_PORT_SETTINGS',
        'PUT_ETHERNET_PORT_SETTINGS',
        'NETWORKCONFIGURED'
      ]
      const service = interpret(mockNetworkConfigurationMachine).onTransition((state) => {
        expect(state.matches(flowStates[currentStateIndex++])).toBe(true)
        if (state.matches('NETWORKCONFIGURED') && currentStateIndex === flowStates.length) {
          done()
        }
      })
      service.start()
      service.send({ type: 'NETWORKCONFIGURATION', clientId })
    })
    it('should eventually reach "NETWORKCONFIGURED" state for WIRED devices', (done) => {
      // config.services['delete-wifi-endpoint-settings'] = Promise.reject(new Error())
      context.wireLessSettings = {
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
        MACAddress: '00-00-00-00-00-00'
      }
      const mockNetworkConfigurationMachine = networkConfig.machine.withConfig(config).withContext(context)
      const flowStates = [
        'ACTIVATION',
        'PUT_GENERAL_SETTINGS',
        'ENUMERATE_ETHERNET_PORT_SETTINGS',
        'PULL_ETHERNET_PORT_SETTINGS',
        'PUT_ETHERNET_PORT_SETTINGS',
        'ENUMERATE_WIFI_ENDPOINT_SETTINGS',
        'PULL_WIFI_ENDPOINT_SETTINGS',
        'DELETE_WIFI_ENDPOINT_SETTINGS',
        'FAILED'
      ]
      const service = interpret(mockNetworkConfigurationMachine).onTransition((state) => {
        console.log(state.value)
        expect(state.matches(flowStates[currentStateIndex++])).toBe(true)
        if (state.matches('FAILED') && currentStateIndex === flowStates.length) {
          done()
        }
      })
      service.start()
      service.send({ type: 'NETWORKCONFIGURATION', clientId })
    })
    it('should update configuration status', () => {
      context.status = 'error'
      context.errorMessage = 'Failed to put WiFi Port Configuration Service'
      networkConfig.updateConfigurationStatus(context, null)
      expect(devices[context.clientId].status.Network).toBe('Failed to put WiFi Port Configuration Service')
    })
    it('should update configuration status', () => {
      context.status = 'error'
      context.errorMessage = ''
      networkConfig.updateConfigurationStatus(context, null)
      expect(devices[context.clientId].status.Network).toBe('Failed')
    })
  })

  describe('Get profiles', () => {
    test('should return WiFi Profile', async () => {
      const expectedProfile = {
        profileName: 'home',
        authenticationMethod: 4,
        encryptionMethod: 4,
        ssid: 'test',
        pskPassphrase: 'Intel@123',
        linkPolicy: [14, 16]
      }
      networkConfig.db = await networkConfig.dbFactory.getDb()
      const getgetByNameSpy = jest.spyOn(networkConfig.db.wirelessProfiles, 'getByName').mockReturnValue(expectedProfile)
      const getPSKPassphraseSpy = jest.spyOn(networkConfig.configurator.secretsManager, 'getSecretAtPath').mockImplementation(async () => {
        return { data: { PSK_PASSPHRASE: 'Intel@123' } }
      })

      const wifiProfile = await networkConfig.getWifiProfile(context.amtProfile.profileName)
      expect(wifiProfile).toBe(expectedProfile)
      expect(getPSKPassphraseSpy).toHaveBeenCalled()
      expect(getgetByNameSpy).toHaveBeenCalled()
    })
  })

  describe('Ethernet Port Settings', () => {
    test('should enumerate ethernet port settings', async () => {
      await networkConfig.enumerateEthernetPortSettings(context)
      expect(ethernetPortSettingsSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('should pull ethernet port settings', async () => {
      context.message = {
        Envelope: {
          Header: {},
          Body: {
            EnumerateResponse: {
              EnumerationContext: '09000000-0000-0000-0000-000000000000'
            }
          }
        }
      }
      await networkConfig.pullEthernetPortSettings(context)
      expect(ethernetPortSettingsSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('should read ethernet port settings pull response', async () => {
      context.message = {
        Envelope: {
          Header: {},
          Body: {
            PullResponse: {
              Items: {
                AMT_EthernetPortSettings: [
                  {
                    DHCPEnabled: true,
                    ElementName: 'Intel(r) AMT Ethernet Port Settings',
                    InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                    IpSyncEnabled: false
                  },
                  {
                    ElementName: 'Intel(r) AMT Ethernet Port Settings',
                    InstanceID: 'Intel(r) AMT Ethernet Port Settings 1',
                    MACAddress: '00-00-00-00-00-00'
                  }
                ]
              },
              EndOfSequence: ''
            }
          }
        }
      }
      await networkConfig.readEthernetPortSettings(context, null)
      expect(context.wiredSettings).toBeDefined()
      expect(context.wireLessSettings).toBeDefined()
    })
    test('should read ethernet port settings pull response', async () => {
      context.message = {
        Envelope: {
          Header: {},
          Body: {
            PullResponse: {
              Items: {
                AMT_EthernetPortSettings: [
                  {
                    ElementName: 'Intel(r) AMT Ethernet Port Settings',
                    InstanceID: 'Intel(r) AMT Ethernet Port Settings 1'
                  },
                  {
                    DHCPEnabled: true,
                    ElementName: 'Intel(r) AMT Ethernet Port Settings',
                    InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
                    IpSyncEnabled: false
                  }
                ]
              }
            }
          }
        }
      }
      await networkConfig.readEthernetPortSettings(context, null)
      expect(context.wiredSettings).toBeDefined()
      expect(context.wireLessSettings).toBeDefined()
    })
    test('should read ethernet port settings pull response for wireless only device', async () => {
      context.wiredSettings = null
      context.message = {
        Envelope: {
          Header: {},
          Body: {
            PullResponse: {
              Items: {
                AMT_EthernetPortSettings: {
                  ElementName: 'Intel(r) AMT Ethernet Port Settings',
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 1'
                }
              }
            }
          }
        }
      }
      await networkConfig.readEthernetPortSettings(context, null)
      expect(context.wiredSettings).toBeNull()
      expect(context.wireLessSettings).toBeDefined()
    })
    test('should read ethernet port settings pull response for wired only device', async () => {
      context.wireLessSettings = null
      context.message = {
        Envelope: {
          Header: {},
          Body: {
            PullResponse: {
              Items: {
                AMT_EthernetPortSettings: {
                  ElementName: 'Intel(r) AMT Ethernet Port Settings',
                  InstanceID: 'Intel(r) AMT Ethernet Port Settings 0'
                }
              }
            }
          }
        }
      }
      await networkConfig.readEthernetPortSettings(context, null)
      expect(context.wireLessSettings).toBeNull()
      expect(context.wiredSettings).toBeDefined()
    })
    test('should put ethernet port settings, DHCPEnabled is set to true', async () => {
      context.wiredSettings = {
        DHCPEnabled: true,
        DefaultGateway: '192.168.1.1',
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        IPAddress: '192.168.1.139',
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        IpSyncEnabled: false,
        LinkIsUp: true,
        LinkPolicy: [
          1,
          14
        ],
        MACAddress: 'a4-bb-6d-89-52-e4',
        PhysicalConnectionType: 0,
        PrimaryDNS: '192.168.1.1',
        SharedDynamicIP: true,
        SharedMAC: true,
        SharedStaticIp: false,
        SubnetMask: '255.255.255.0'
      }
      await networkConfig.putEthernetPortSettings(context)
      expect(ethernetPortSettingsSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('should put ethernet port settings, DHCPEnabled is set to true', async () => {
      context.amtProfile.dhcpEnabled = false
      context.wiredSettings = {
        DHCPEnabled: true,
        DefaultGateway: '192.168.1.1',
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        IPAddress: '192.168.1.139',
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        IpSyncEnabled: false,
        LinkIsUp: true,
        LinkPolicy: [
          1,
          14
        ],
        MACAddress: 'a4-bb-6d-89-52-e4',
        PhysicalConnectionType: 0,
        PrimaryDNS: '192.168.1.1',
        SharedDynamicIP: true,
        SharedMAC: true,
        SharedStaticIp: false,
        SubnetMask: '255.255.255.0'
      }
      await networkConfig.putEthernetPortSettings(context)
      expect(ethernetPortSettingsSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('should read put ethernet port settings and update status as configured', () => {
      context.wiredSettings = {
        DHCPEnabled: true,
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        IpSyncEnabled: true,
        MACAddress: 'a4-bb-6d-89-52-e4',
        SharedStaticIp: false
      }
      context.message = {
        Envelope: {
          Body: {
            AMT_EthernetPortSettings: {
              DHCPEnabled: true,
              IpSyncEnabled: true,
              SharedStaticIp: false
            }
          }
        }
      }
      networkConfig.readEthernetPortSettingsPutResponse(context, null)
      expect(context.statusMessage).toBe('Wired Network Configured')
    })
    test('should read put ethernet port settings and update status as not configured', () => {
      context.wiredSettings = {
        DHCPEnabled: true,
        ElementName: 'Intel(r) AMT Ethernet Port Settings',
        InstanceID: 'Intel(r) AMT Ethernet Port Settings 0',
        IpSyncEnabled: true,
        MACAddress: 'a4-bb-6d-89-52-e4',
        SharedStaticIp: false
      }
      context.message = {
        Envelope: {
          Body: {
            AMT_EthernetPortSettings: {
              DHCPEnabled: true,
              IpSyncEnabled: false,
              SharedStaticIp: false
            }
          }
        }
      }
      networkConfig.readEthernetPortSettingsPutResponse(context, null)
      expect(context.statusMessage).toBe('Wired Network Configuration Failed')
    })
  })

  describe('WiFi Port Configuration Service', () => {
    test('should get WiFi Port Configuration Service', async () => {
      await networkConfig.getWiFiPortConfigurationService(context, null)
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
      expect(WiFiPortConfigurationServiceSpy).toHaveBeenCalled()
    })
    test('should return WiFi Profiles', async () => {
      context.message = {
        Envelope: {
          Header: {},
          Body: { AMT_WiFiPortConfigurationService: { localProfileSynchronizationEnabled: 1 } }
        }
      }
      await networkConfig.putWiFiPortConfigurationService(context, null)
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
      expect(WiFiPortConfigurationServiceSpy).toHaveBeenCalled()
    })
    test('should add a WiFi Profile to AMT', async () => {
      const getWifiProfileSpy = jest.spyOn(networkConfig, 'getWifiProfile').mockResolvedValue({
        profileName: 'home',
        authenticationMethod: 4,
        encryptionMethod: 4,
        ssid: 'test',
        pskPassphrase: 'Intel@123',
        linkPolicy: ['14', '16'],
        pskValue: 1,
        tenantId: ''
      })
      await networkConfig.addWifiConfigs(context, null)
      expect(getWifiProfileSpy).toHaveBeenCalled()
      expect(WiFiPortConfigurationServiceSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
  })

  describe('WiFi Endpoint Settings', () => {
    test('should get enumeration number for WiFi end point settings', async () => {
      await networkConfig.enumerateWiFiEndpointSettings(context)
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
      expect(WiFiEndpointSettingsSpy).toHaveBeenCalled()
    })
    test('should pull WiFi end point settings', async () => {
      context.message = {
        Envelope: {
          Header: {
            Action: { _: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/EnumerateResponse' },
            ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_WiFiEndpointSettings'
          },
          Body: { EnumerateResponse: { EnumerationContext: '92340000-0000-0000-0000-000000000000' } }
        }
      }
      await networkConfig.pullWiFiEndpointSettings(context)
      expect(WiFiEndpointSettingsSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('Should read WiFi end point settings, if CIM_WiFiEndpointSettings is an array', async () => {
      context.message = {
        Envelope: {
          Header: {},
          Body: { PullResponse: { Items: { CIM_WiFiEndpointSettings: [{ InstanceID: 'home', Priority: 1 }, { InstanceID: 'office', Priority: 2 }] } } }
        }
      }
      await networkConfig.readWiFiEndpointSettingsPullResponse(context, null)
      expect(context.wifiEndPointSettings.length).toBe(2)
    })
    test('Should read WiFi end point settings', async () => {
      context.message = {
        Envelope: {
          Header: {},
          Body: { PullResponse: { Items: { CIM_WiFiEndpointSettings: { InstanceID: 'home', Priority: 1 } } } }
        }
      }
      await networkConfig.readWiFiEndpointSettingsPullResponse(context, null)
      expect(context.wifiEndPointSettings.length).toBe(1)
    })
    test('Should delete profile from WiFi end point settings', async () => {
      context.wifiEndPointSettings = [{ InstanceID: 'home', Priority: 1 }]
      await networkConfig.deleteWiFiProfileOnAMTDevice(context, null)
      expect(context.wifiEndPointSettings.length).toBe(0)
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
      expect(WiFiEndpointSettingsSpy).toHaveBeenCalled()
    })
  })

  describe('AMT General Settings', () => {
    let generalSettingsSpy
    let generalSettingsResponse
    beforeEach(() => {
      invokeWsmanCallSpy = jest.spyOn(networkConfig, 'invokeWsmanCall').mockResolvedValue('done')
      generalSettingsSpy = jest.spyOn(networkConfig.amt, 'GeneralSettings').mockReturnValue('done')
      generalSettingsResponse = {
        AMTNetworkEnabled: 1,
        InstanceID: 'Intel(r) AMT: General Settings',
        NetworkInterfaceEnabled: true,
        RmcpPingResponseEnabled: true,
        SharedFQDN: true
      }
    })
    test('should put amt general settings', async () => {
      context.generalSettings = {
        AMTNetworkEnabled: 1,
        InstanceID: 'Intel(r) AMT: General Settings',
        NetworkInterfaceEnabled: true,
        RmcpPingResponseEnabled: true,
        SharedFQDN: true
      }
      await networkConfig.putGeneralSettings(context)
      expect(generalSettingsSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('Should return false if AMT network is Enabled', async () => {
      context.generalSettings = generalSettingsResponse
      const result = await networkConfig.isNotAMTNetworkEnabled(context, null)
      expect(result).toBeFalsy()
    })
    test('Should return true if AMT network is Enabled', async () => {
      context.generalSettings = generalSettingsResponse
      context.generalSettings.SharedFQDN = false
      const result = await networkConfig.isNotAMTNetworkEnabled(context, null)
      expect(result).toBeTruthy()
    })
  })

  describe('CIM WiFi Port', () => {
    test('should update wifi port', async () => {
      const wifiPortSpy = jest.spyOn(networkConfig.cim, 'WiFiPort').mockReturnValue('done')
      await networkConfig.updateWifiPort(context, null)
      expect(wifiPortSpy).toHaveBeenCalled()
      expect(invokeWsmanCallSpy).toHaveBeenCalled()
    })
    test('should send a WSMan message', async () => {
      invokeWsmanCallSpy.mockRestore()
      void networkConfig.invokeWsmanCall(context)
      expect(wrapItSpy).toHaveBeenCalled()
      expect(responseMessageSpy).toHaveBeenCalled()
      expect(sendSpy).toHaveBeenCalled()
      expect(devices[clientId].pendingPromise).toBeDefined()
    })
  })
})