import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import {
  VERIFY_TOTP_REQ,
  AuthMultiFactorAuthPayload
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

it('dispatches an action to setup TOTP for a user', async () => {

  // expect error as user is not logged in
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VERIFY_TOTP_REQ, { 
    mfaCode: '', 
    mfaType: 2
  })
    .error('No user logged in. You can verify TOTP for logged in users only.');

  dispatch.authService!.verifyTOTP('');
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;

  // expect error as no code was provided
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VERIFY_TOTP_REQ, { 
    mfaCode: '', 
    mfaType: 2 
  })
    .error('verifyTOTP request action does not have an MFA code to verify.');

  dispatch.authService!.verifyTOTP('');
  await actionTester.done();

  // expect error as code is incorrect
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VERIFY_TOTP_REQ, { 
    mfaCode: '4567', 
    mfaType: 2 
  })
    .error('invalid totp verification code');

  dispatch.authService!.verifyTOTP('4567');
  await actionTester.done();

  // expect no errors
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VERIFY_TOTP_REQ, { 
    mfaCode: '6789', 
    mfaType: 2 
  })
    .success();

  dispatch.authService!.verifyTOTP('6789');
  await actionTester.done();

  expect(mockProvider.isLoggedInCounter).toEqual(4);
  expect(mockProvider.verifyTOTPCounter).toEqual(2);
});
