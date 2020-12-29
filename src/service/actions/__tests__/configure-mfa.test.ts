import { 
  Logger, 
  LOG_LEVEL_TRACE, 
  setLogLevel, 
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import User from '../../../model/user';

import { 
  CONFIGURE_MFA_REQ,
  AuthUserPayload
} from '../../action';

import { 
  getTestUser, 
  MockProvider 
} from '../../__tests__/mock-provider';
import { initServiceDispatch } from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('configure-mfa.test');

// test reducer validates action flows
const mockProvider = new MockProvider();
const actionTester = new ActionTester(logger);
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to configure MFA for a user', async () => {

  // expect error as user is not logged in
  actionTester.expectAction<AuthUserPayload>(CONFIGURE_MFA_REQ, { 
    user: getTestUser() 
  })
    .error('No user logged in. The user needs to be logged in before MFA can be configured.');

  dispatch.authService!.configureMFA(getTestUser());
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;

  // confirmed valid user
  let user = getTestUser();  
  user.setConfirmed(true);
  user.enableMFA = true;

  // expect no errors
  actionTester.expectAction<AuthUserPayload>(CONFIGURE_MFA_REQ, { 
    user 
  })
    .success();

  dispatch.authService!.configureMFA(user);
  await actionTester.done();

  // create user that will cause mock
  // provider to throw and error
  let userWithError = Object.assign(new User(), user);
  userWithError.username = 'error';

  actionTester.expectAction<AuthUserPayload>(CONFIGURE_MFA_REQ, { 
    user: userWithError 
  })
    .error('invalid username');

  dispatch.authService!.configureMFA(userWithError);
  await actionTester.done();

  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.configureMFACounter).toEqual(2);
});
