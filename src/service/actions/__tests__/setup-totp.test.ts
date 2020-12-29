import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  SETUP_TOTP_REQ,
  AuthTOTPSecretPayload
} from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { initServiceDispatch }  from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('setup-totp.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
const mockProvider = new MockProvider();
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to setup TOTP for a user', async () => {

  // expect error as user is not logged in
  actionTester.expectAction(SETUP_TOTP_REQ)
    .error('No user logged in. You can setup TOTP for logged in users only.');

  dispatch.authService!.setupTOTP();
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;
  
  actionTester.expectAction(SETUP_TOTP_REQ)
    .success<AuthTOTPSecretPayload>({ secret: 'abcd' });

  dispatch.authService!.setupTOTP();
  await actionTester.done();

  expect(mockProvider.isLoggedInCounter).toEqual(2);
  expect(mockProvider.setupTOTPCounter).toEqual(1);
});
