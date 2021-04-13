/*********************************************************************
 * Copyright (c) Intel Corporation 2021
 * SPDX-License-Identifier: Apache-2.0
 * Author: Mudit Vats
 **********************************************************************/
 import { ClientMsg } from './RCS.Config'
 import { AppVersion, ProtocolVersion } from './utils/constants'

 export class SecureConfig {
 
    constructor () {
      
    }

    private getCertInfo() : any {

        // TODO: get algo and hash from actual cert

        return { algorithm : "MD5", hash: "000102030405060708090a0b0c0d0e0f" }
    }

    public getSBHCRequestMsg() : any {

        let payload = this.getCertInfo()

        let msg : ClientMsg = { method: 'secure_config_request', apiKey: 'xxxxx', appVersion: AppVersion, protocolVersion: ProtocolVersion, status: 'cool', message: 'hello', payload: JSON.stringify(payload) }

        return msg

    }
    
  }
  