import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
  NOOP
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  VALIDATE_MFA_CODE_REQ, 
  READ_USER_REQ, 
  AuthMultiFactorAuthPayload, 
  AuthLoggedInPayload, 
  AuthUserPayload 
} from '../../action';
import { AUTH_MFA_SMS } from '../../constants';

import { initServiceDispatch } from '../../__tests__/mock-provider';
import { getTestUser } from '../../__tests__/test-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('validate-mfa-code.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher with confirmed user in mock provider
const { dispatch, mockProvider } = initServiceDispatch(actionTester, true);

it('dispatches an action to sign up a user', async () => {

  // error invalide code
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VALIDATE_MFA_CODE_REQ, <AuthMultiFactorAuthPayload>{ 
    mfaCode: '00000', 
    mfaType: AUTH_MFA_SMS
  })
    .error('invalid code');
  actionTester.expectAction(NOOP);

  dispatch.authService!.validateMFACode('00000', AUTH_MFA_SMS);
  await actionTester.done();

  // no errors (valid code)
  mockProvider.loginMethod = AUTH_MFA_SMS;

  const user = getTestUser();
  user.setConfirmed(true);
  user.profilePictureUrl = 'https://s.gravatar.com/avatar/d9ef80abd8bcc51c54f1daaad268ad58?default=404&size=42';

  // successful but requires MFA
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VALIDATE_MFA_CODE_REQ, { 
    mfaCode: '12345', 
    mfaType: AUTH_MFA_SMS
  })
    .success<AuthLoggedInPayload>({
      isLoggedIn: true,
      mfaType: AUTH_MFA_SMS
    })
      .followUpAction(READ_USER_REQ)
        .success<AuthUserPayload>({ user });

  dispatch.authService!.validateMFACode('12345', AUTH_MFA_SMS);
  await actionTester.done();
      
  // error as session already logged in
  actionTester.expectAction<AuthMultiFactorAuthPayload>(VALIDATE_MFA_CODE_REQ, { 
    mfaCode: '12345', 
    mfaType: AUTH_MFA_SMS
  })
    .error('The current session is already logged in.');
  actionTester.expectAction(NOOP);

  dispatch.authService!.validateMFACode('12345', AUTH_MFA_SMS);
  await actionTester.done();
  
  expect(mockProvider.isLoggedInCounter).toEqual(4);
  expect(mockProvider.validateMFACodeCounter).toEqual(2);
  expect(mockProvider.readUserCounter).toEqual(1);
});
