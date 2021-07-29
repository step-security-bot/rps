import { MqttProvider } from '../utils/MqttProvider'
import { RCSConfig } from '../models/Rcs'
import * as mqtt1 from 'mqtt'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
jest.mock('mqtt', () => ({ ...jest.requireActual('mqtt') as object }))

describe('MQTT Turned ON Tests', () => {
  const config: RCSConfig = {
    WSConfiguration: {
      WebSocketPort: 8080
    },
    amtusername: 'admin',
    VaultConfig: {
      usevault: false,
      SecretsPath: 'kv/data/rcs/',
      token: '',
      address: ''
    },
    webport: 8081,
    credentialspath: '../../../MPS_MicroService/private/data.json',
    corsHeaders: '*',
    corsMethods: '*',
    corsOrigin: '*',
    mpsServer: 'https://localhost:3000',
    connectionString: 'postgresql://postgresadmin:admin123@localhost:5432/rpsdb',
    delayTimer: 12,
    mqttAddress: 'mqtt://127.0.0.1:8883'
  }

  beforeEach(() => {
    MqttProvider.instance = new MqttProvider(config)
  })

  it('Creates MQTT Helper', async () => {
    expect(MqttProvider.instance.turnedOn).toBe(true)
    expect(MqttProvider.instance.mqttUrl).toBeDefined()
    expect(MqttProvider.instance.baseUrl).toBe('mqtt://127.0.0.1:8883')
    expect(MqttProvider.instance.port).toBe(8883)
    expect(MqttProvider.instance.options).toBeDefined()
    expect(MqttProvider.instance.options.port).toBe(8883)
    // TODO: update this to check string prefix
    expect(MqttProvider.instance.options.clientId).toBeDefined()
  })

  it('Checks Connection', () => {
    jest.spyOn(mqtt1, 'connect').mockImplementation(() => {
      return {
        connected: true
      } as any
    })

    expect(MqttProvider.instance.client).toBeUndefined()
    MqttProvider.instance.connectBroker()
    expect(MqttProvider.instance.client.connected).toBe(true)
  })

  it('Should send an event message when turned on', async () => {
    MqttProvider.instance.client = {
      publish: (topic, message, callback) => { return {} as any }
    } as any
    const spy = jest.spyOn(MqttProvider.instance.client, 'publish').mockImplementation((topic, message, callback) => {
      callback()
      return {} as any
    })
    MqttProvider.instance.turnedOn = true
    try {
      MqttProvider.publishEvent('success', ['testMethod'], 'Test Message')
      expect(spy).toHaveBeenCalled()
    } catch (err) {

    }
  })

  it('Should throw error when event message publish fails', async () => {
    MqttProvider.instance.client = {
      publish: (topic, message, callback) => { return {} as any }
    } as any
    const spy = jest.spyOn(MqttProvider.instance.client, 'publish').mockImplementation((topic, message, callback) => {
      callback(new Error())
      return {} as any
    })
    MqttProvider.instance.turnedOn = true
    try {
      MqttProvider.publishEvent('success', ['testMethod'], 'Test Message')
    } catch (err) {
      expect(spy).toHaveBeenCalled()
      expect(err).toBeDefined()
    }
  })

  it('Should close client when promted', async () => {
    MqttProvider.instance.client = {
      connected: true
    } as any
    MqttProvider.instance.client = {
      end: () => { return {} as any }
    } as any
    const spy = jest.spyOn(MqttProvider.instance.client, 'end').mockImplementation(() => {
      return {
        connected: false
      } as any
    })
    MqttProvider.instance.turnedOn = true

    MqttProvider.endBroker()
    expect(spy).toHaveBeenCalled()
    expect(MqttProvider.instance.client.connected).toBe(false)
  })
})

describe('MQTT Turned OFF Tests', () => {
  const config: RCSConfig = {
    WSConfiguration: {
      WebSocketPort: 8080
    },
    amtusername: 'admin',
    VaultConfig: {
      usevault: false,
      SecretsPath: 'kv/data/rcs/',
      token: '',
      address: ''
    },
    webport: 8081,
    credentialspath: '../../../MPS_MicroService/private/data.json',
    corsHeaders: '*',
    corsMethods: '*',
    corsOrigin: '*',
    mpsServer: 'https://localhost:3000',
    connectionString: 'postgresql://postgresadmin:admin123@localhost:5432/rpsdb',
    delayTimer: 12,
    mqttAddress: 'mqtt://127.0.0.1:8883'
  }

  beforeEach(() => {
    MqttProvider.instance = new MqttProvider(config)
  })

  it('Should NOT Send an event message when turned off', async () => {
    MqttProvider.instance.client = {
      publish: (topic, message, callback) => { return {} as any }
    } as any
    const spy = jest.spyOn(MqttProvider.instance.client, 'publish').mockImplementation((topic, message, callback) => {
      return {} as any
    })
    MqttProvider.instance.turnedOn = false
    MqttProvider.publishEvent('success', ['testMethod'], 'Test Message')
    expect(spy).not.toHaveBeenCalled()
  })
})