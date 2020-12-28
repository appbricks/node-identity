import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  CONFIRM_SIGN_UP_CODE_REQ,
  AuthUsernamePayload,
  AuthVerificationPayload
} from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { initServiceDispatch } from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('confirm-sign-up-code.test');

// test reducer validates action flows
const mockProvider = new MockProvider();
const actionTester = new ActionTester(logger);
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to sign up a user', async () => {

  // expect error as code is invalid
  actionTester.expectAction<AuthUsernamePayload>(CONFIRM_SIGN_UP_CODE_REQ, { 
    code: '00000',
    username: 'johndoe'
  })
    .error('invalid code');

  dispatch.authService!.confirmSignUpCode('00000', 'johndoe');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  // expect no errors
  actionTester.expectAction<AuthUsernamePayload>(CONFIRM_SIGN_UP_CODE_REQ, { 
    code: '12345',
    username: 'johndoe'
  })
    .success<AuthVerificationPayload>({
      info: {
        isConfirmed: true
      }
    });

  dispatch.authService!.confirmSignUpCode('12345', 'johndoe');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  expect(mockProvider.confirmSignUpCodeCounter).toEqual(2);
});
