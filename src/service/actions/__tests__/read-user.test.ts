import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  READ_USER_REQ,
  AuthUserPayload
} from '../../action';

import { initServiceDispatch } from '../../__tests__/mock-provider';
import { getTestUser } from '../../__tests__/test-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}

const logger = new Logger('read-user.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher with confirmed user in mock provider
const { dispatch, mockProvider } = initServiceDispatch(actionTester, true);

it('dispatches an action to sign up a user', async () => {

  // expect error as user is not logged in
  actionTester.expectAction(READ_USER_REQ)
    .error('No user logged in. The user needs to be logged in before it can be read.');

  // expect error as user is not logged in
  dispatch.authService!.readUser();
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;

  // expect no errors
  const user = getTestUser();
  user.setConfirmed(true);
  user.profilePictureUrl = 'https://s.gravatar.com/avatar/d9ef80abd8bcc51c54f1daaad268ad58?default=404&size=42';

  actionTester.expectAction(READ_USER_REQ)
    .success(<AuthUserPayload>{ user });

  dispatch.authService!.readUser();
  await actionTester.done();

  // expect no errors and email has no gravar url
  mockProvider.user.emailAddress = 'foo@acme.com';
  user.emailAddress = 'foo@acme.com';

  user.setConfirmed(true);
  user.profilePictureUrl = undefined;

  actionTester.expectAction(READ_USER_REQ)
    .success(<AuthUserPayload>{ user });

  dispatch.authService!.readUser();
  await actionTester.done();

  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.readUserCounter).toEqual(2);
});
