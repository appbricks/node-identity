import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
  NOOP
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  SIGN_IN_REQ,
  READ_USER_REQ,
  AuthSignInPayload, 
  AuthUserPayload, 
  AuthLoggedInPayload 
} from '../../action';
import { 
  AUTH_NO_MFA,
  AUTH_MFA_SMS 
} from '../../constants';

import { 
  MockProvider,
  getTestUser
} from '../../__tests__/mock-provider';
import { initServiceDispatch }  from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-in.test');

// test reducer validates action flows
const mockProvider = new MockProvider(true);
const actionTester = new ActionTester(logger);
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to sign up a user', async () => {  
  
  // invalid login
  actionTester.expectAction<AuthSignInPayload>(SIGN_IN_REQ, { 
    username: 'johndoe', 
    password: '00000'
  })
    .error('invalid password');
  actionTester.expectAction(NOOP);

  dispatch.authService!.signIn('johndoe', '00000');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  // return SMS MFA on successful credential validation
  mockProvider.loginMethod = AUTH_MFA_SMS;

  // successful but requires MFA
  actionTester.expectAction<AuthSignInPayload>(SIGN_IN_REQ, { 
    username: 'johndoe', 
    password: '@ppBricks2020'
  })
    .success<AuthLoggedInPayload>({
      isLoggedIn: false,
      mfaType: AUTH_MFA_SMS
    });
  actionTester.expectAction(NOOP);

  dispatch.authService!.signIn('johndoe', '@ppBricks2020');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  // return NO MFA on successful credential validation
  mockProvider.loginMethod = AUTH_NO_MFA;

  const user = getTestUser();
  user.setConfirmed(true);
  user.profilePictureUrl = 'https://s.gravatar.com/avatar/d9ef80abd8bcc51c54f1daaad268ad58?default=404&size=42';

  // successful but requires MFA
  actionTester.expectAction<AuthSignInPayload>(SIGN_IN_REQ, { 
    username: 'johndoe', 
    password: '@ppBricks2020'
  })
    .success<AuthLoggedInPayload>({
      isLoggedIn: true,
      mfaType: AUTH_NO_MFA
    })
      .followUpAction(READ_USER_REQ)
        .success<AuthUserPayload>({ user });

  dispatch.authService!.signIn('johndoe', '@ppBricks2020');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();
  expect(mockProvider.isLoggedIn).toBeTruthy();

  // error 
  actionTester.expectAction<AuthSignInPayload>(SIGN_IN_REQ, { 
    username: 'johndoe', 
    password: '@ppBricks2020'
  })
    .error('The current session is already logged in.');

  dispatch.authService!.signIn('johndoe', '@ppBricks2020');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  expect(mockProvider.signOutCounter).toEqual(0);

  // session valid but for different user so 
  // that user should be logged out and new
  // user logged in
  mockProvider.loggedIn = false;
  mockProvider.sessionValid = true;

  actionTester.expectAction<AuthSignInPayload>(SIGN_IN_REQ, { 
    username: 'johndoe', 
    password: '@ppBricks2020'
  })
    .success<AuthLoggedInPayload>({
      isLoggedIn: true,
      mfaType: AUTH_NO_MFA
    })
      .followUpAction(READ_USER_REQ)
        .success<AuthUserPayload>({ user });

  dispatch.authService!.signIn('johndoe', '@ppBricks2020');
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();
  expect(mockProvider.isLoggedIn).toBeTruthy();
  
  expect(mockProvider.isLoggedInCounter).toEqual(10);
  expect(mockProvider.validateSessionCounter).toEqual(4);
  expect(mockProvider.signOutCounter).toEqual(1);
  expect(mockProvider.signInCounter).toEqual(4);
  expect(mockProvider.readUserCounter).toEqual(2);
});
