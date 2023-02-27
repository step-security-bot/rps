/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type ILogger } from '../interfaces/ILogger'
import { type ISecretManagerService } from '../interfaces/ISecretManagerService'
import { Environment } from '../utils/Environment'

export class SecretManagerCreatorFactory {
  async getSecretManager (logger: ILogger): Promise<ISecretManagerService> {
    const { default: Provider }: { default: new (logger: ILogger) => ISecretManagerService } =
      await import(`../secrets/${Environment.Config.secretsProvider}`)
    return new Provider(logger)
  }
}
