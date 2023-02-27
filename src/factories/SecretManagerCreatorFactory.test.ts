/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import Logger from '../Logger'
import { Environment } from '../utils/Environment'
import { SecretManagerCreatorFactory } from './SecretManagerCreatorFactory'
import { config } from '../test/helper/Config'

describe('Secret Manager Factory', () => {
  it('should pass with default test configuration', async () => {
    const logger = new Logger('SecretManagerFactoryTest')
    Environment.Config = config
    const factory = new SecretManagerCreatorFactory()
    const mgr1 = await factory.getSecretManager(logger)
    expect(mgr1).not.toBeNull()
    const mgr2 = await factory.getSecretManager(logger)
    expect(mgr2).not.toBeNull()
  })
})
