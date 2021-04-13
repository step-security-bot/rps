/*********************************************************************
 * Copyright (c) Intel Corporation 2019
 * SPDX-License-Identifier: Apache-2.0
 * Author: Madhavi Losetty
 * Description: Process client data and gets response for desired action
 **********************************************************************/
import * as WebSocket from 'ws'

import { ILogger } from './interfaces/ILogger'
import { IDataProcessor } from './interfaces/IDataProcessor'
import { IClientManager } from './interfaces/IClientManager'
import { ClientMsg, ClientAction, ClientMethods, ClientObject } from './RCS.Config'
import { ClientActions } from './ClientActions'
import { ICertManager } from './interfaces/ICertManager'
import { SignatureHelper } from './utils/SignatureHelper'
import Logger from './Logger'
import { IConfigurator } from './interfaces/IConfigurator'
import { RPSError } from './utils/RPSError'
import { WSManProcessor } from './WSManProcessor'
import { ClientResponseMsg } from './utils/ClientResponseMsg'
import { IValidator } from './interfaces/IValidator'
import { SecureConfig } from './SecureConfig'

var superMessage : ClientMsg

export class DataProcessor implements IDataProcessor {
  private readonly clientActions: ClientActions

  constructor (
    private readonly logger: ILogger,
    private readonly signatureHelper: SignatureHelper,
    private readonly configurator: IConfigurator,
    private readonly validator: IValidator,
    private readonly certManager: ICertManager,
    private readonly clientManager: IClientManager,
    private readonly responseMsg: ClientResponseMsg,
    private readonly amtwsman: WSManProcessor
  ) {
    this.clientActions = new ClientActions(new Logger('ClientActions'), configurator, certManager, signatureHelper, responseMsg, amtwsman, clientManager, validator)
  }

  /**
     * @description Process client data and gets response for desired action
     * @param {WebSocket.Data} message the message coming in over the websocket connection
     * @param {string} clientId Id to keep track of connections
     * @returns {RCSMessage} returns configuration message
     */
  async processData (message: WebSocket.Data, clientId: string): Promise<any> {
    try {
      let clientMsg: ClientMsg = null

      try {
        clientMsg = this.validator.parseClientMsg(message, clientId)
      } catch (parseErr) {
        throw new RPSError(parseErr)
      }

      if (clientMsg.method === ClientMethods.ACTIVATION) {
        this.logger.debug(`ProcessData: Parsed Message received from device ${clientMsg.payload.uuid}: ${JSON.stringify(clientMsg, null, '\t')}`)

        await this.validator.validateActivationMsg(clientMsg, clientId) // Validate the activation message payload

        // Check AMT version to see if this connection should be secured
        let secureConfig: SecureConfig = new SecureConfig()
        let amtVersion = clientMsg.payload.ver.split(".")
        if (parseInt(amtVersion[0]) >= 14) {
          this.logger.error("client supports host based configuration")
          let msg: ClientMsg = secureConfig.getSBHCRequestMsg()

          let clientObj = this.clientManager.getClientObject(clientId)
          clientObj.prevObj = clientObj
          superMessage = clientMsg
          return msg
        }
/*
        // Makes the first wsman call
        const clientObj = this.clientManager.getClientObject(clientId)
        if (clientObj.action !== ClientAction.CIRACONFIG && !clientMsg.payload.digestRealm) {
          await this.amtwsman.batchEnum(clientId, '*AMT_GeneralSettings')
        } else {
          return await this.clientActions.buildResponseMessage(clientMsg, clientId)
        }
*/
      } else if (clientMsg.method === ClientMethods.DEACTIVATION) {
        this.logger.debug(`ProcessData: Parsed DEACTIVATION Message received from device ${clientMsg.payload.uuid}: ${JSON.stringify(clientMsg, null, '\t')}`)

        await this.validator.validateDeactivationMsg(clientMsg, clientId) // Validate the deactivation message payload

        await this.amtwsman.getWSManResponse(clientId, 'AMT_SetupAndConfigurationService', 'admin')
      } else if (clientMsg.method === ClientMethods.RESPONSE) {
        const clientObj = this.clientManager.getClientObject(clientId)
        const payload = clientObj.ClientData.payload
        // this.logger.debug(`ProcessData: Parsed Message received from device ${payload.uuid}, clientId: ${clientId}: ${JSON.stringify(clientMsg, null, "\t")}`);
        const msg = clientMsg.payload.split('\r\n')
        const statusCode = msg[0].substr(9, 3).trim()

        if (statusCode === '401') {
          return this.amtwsman.parseWsManResponseXML(clientMsg.payload, clientId, statusCode)
        } else if (statusCode === '200') {
          clientMsg.payload = this.amtwsman.parseWsManResponseXML(clientMsg.payload, clientId, statusCode)
          this.logger.debug(`Device ${payload.uuid} wsman response ${statusCode}: ${JSON.stringify(clientMsg.payload, null, '\t')}`)
        } else {
          clientMsg.payload = this.amtwsman.parseWsManResponseXML(clientMsg.payload, clientId, statusCode)
          this.logger.debug(`Device ${payload.uuid} wsman response ${statusCode}: ${JSON.stringify(clientMsg.payload, null, '\t')}`)
          if (clientObj.action !== ClientAction.CIRACONFIG) {
            throw new RPSError(`Device ${payload.uuid} activation failed.Bad wsman response from AMT device`)
          }
        }
        return await this.clientActions.buildResponseMessage(clientMsg, clientId)
      } else if (clientMsg.method === "secure_config_response") {
        this.logger.error("got a secure_config_response from RPC")
        this.logger.error(JSON.stringify(clientMsg))

        // Makes the first wsman call
        let clientObj = this.clientManager.getClientObject(clientId)
        clientMsg = superMessage
        //this.clientManager.setClientObject(clientObj.prevObj)
        //clientObj = this.clientManager.getClientObject(clientId)
        if (clientObj.action !== ClientAction.CIRACONFIG && !clientMsg.payload.digestRealm) {
          await this.amtwsman.batchEnum(clientId, '*AMT_GeneralSettings')
        } else {
          return await this.clientActions.buildResponseMessage(clientMsg, clientId)
        }

      } else {
        const uuid = clientMsg.payload.uuid ? clientMsg.payload.uuid : this.clientManager.getClientObject(clientId).ClientData.payload.uuid
        throw new RPSError(`Device ${uuid} Not a supported method received from AMT device`)
      }
    } catch (error) {
      this.logger.error(`${clientId} : Failed to process data - ${error.message}`)
      if (error instanceof RPSError) {
        return this.responseMsg.get(clientId, null, 'error', 'failed', error.message)
      } else {
        this.responseMsg.get(clientId, null, 'error', 'failed', 'request failed')
      }
    }
  }
}
