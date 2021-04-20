import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  RESET_PASSWORD_REQ,
  AuthUsernamePayload 
} from '../../action';

import { initServiceDispatch } from '../../__tests__/mock-provider';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('verify-totp.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher
const { dispatch, mockProvider } = initServiceDispatch(actionTester);

it('dispatches an action to sign up a user', async () => {
  // expect no errors
  actionTester.expectAction<AuthUsernamePayload>(RESET_PASSWORD_REQ, { 
    username: 'johndoe'
  })
    .success();
  
  dispatch.authService!.resetPassword('johndoe');
  await actionTester.done();

  expect(mockProvider.resetPasswordCounter).toEqual(1);
});
