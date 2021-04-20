import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import {
  SAVE_USER_REQ, 
  AuthUserPayload 
} from '../../action';

import { 
  initServiceDispatch,
  getTestUser
} from '../../__tests__/mock-provider';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('save-user.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher
const { dispatch, mockProvider } = initServiceDispatch(actionTester);

it('dispatches an action to sign up a user', async () => {

  let user = getTestUser();

  // expect error as user is not logged in
  actionTester.expectAction<AuthUserPayload>(SAVE_USER_REQ, { user })
    .error('No user logged in. The user needs to be logged in before it can be saved.');

  // expect error as user is not logged in
  dispatch.authService!.saveUser(user);
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;

  // expect no errors
  actionTester.expectAction<AuthUserPayload>(SAVE_USER_REQ, { user })
    .success();

  dispatch.authService!.saveUser(user);
  await actionTester.done();
  
  expect(mockProvider.isLoggedInCounter).toEqual(2);
  expect(mockProvider.saveUserCounter).toEqual(1);
});
