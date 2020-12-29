import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  SIGN_OUT_REQ,
  AuthStatePayload 
} from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { initServiceDispatch }  from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-out.test');

// test reducer validates action flows
const mockProvider = new MockProvider();
const actionTester = new ActionTester(logger);
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to sign up a user', async () => {

  // set provider logged in state to true
  mockProvider.loggedIn = true;

  actionTester.expectAction<AuthStatePayload>(SIGN_OUT_REQ)
    .success<AuthStatePayload>({
      isLoggedIn: false
    });

  dispatch.authService!.signOut();
  await actionTester.done();

  expect(mockProvider.loggedIn).toBeFalsy();

  // signing out of a logged in provider should have no effect
  actionTester.expectAction<AuthStatePayload>(SIGN_OUT_REQ)
    .success<AuthStatePayload>({
      isLoggedIn: false
    });

  dispatch.authService!.signOut();
  await actionTester.done();

  expect(mockProvider.loggedIn).toBeFalsy();
  expect(mockProvider.isLoggedInCounter).toEqual(2);
  expect(mockProvider.signOutCounter).toEqual(1);
});
