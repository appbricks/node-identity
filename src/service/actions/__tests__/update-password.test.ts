import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  UPDATE_PASSWORD_REQ,
  AuthUsernamePayload
} from '../../action';

import { initServiceDispatch } from '../../__tests__/mock-provider';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('update-password.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher
const { dispatch, mockProvider } = initServiceDispatch(actionTester);

it('dispatches an action to sign up a user', async () => {
  // expect invalid code error
  actionTester.expectAction<AuthUsernamePayload>(UPDATE_PASSWORD_REQ, { 
    username: 'johndoe', 
    password: 'password',
    code: '00000'
  })
    .error('invalid code');

  dispatch.authService!.updatePassword('password', '00000', 'johndoe');
  await actionTester.done();

  // expect no errors
  actionTester.expectAction<AuthUsernamePayload>(UPDATE_PASSWORD_REQ, { 
    username: 'johndoe', 
    password: 'password',
    code: '12345'
  })
    .success();

  dispatch.authService!.updatePassword('password', '12345', 'johndoe');
  await actionTester.done();

  expect(mockProvider.updatePasswordCounter).toEqual(2);
});
