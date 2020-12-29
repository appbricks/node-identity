import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
  NOOP
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  LOAD_AUTH_STATE_REQ,
  AuthStatePayload
} from '../../action';

import { 
  AuthState, 
  initialAuthState 
} from '../../state';

import { 
  initServiceDispatch, 
  store 
} from './initialize-test';
import { MockProvider } from '../../__tests__/mock-provider';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('load-auth-state.test');

// test reducer validates action flows
const mockProvider = new MockProvider(true);
const actionTester = new ActionTester(logger, initialAuthState());
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to sign up a user', async () => {

  // expect store session to be invalid so should
  // receive logged in details from provider
  actionTester.expectAction(LOAD_AUTH_STATE_REQ)
    .success<AuthStatePayload>({
      isLoggedIn: false,
      username: 'johndoe'
    });

  dispatch.authService!.loadAuthState();
  await actionTester.done();

  // set provider logged in state to true
  mockProvider.loggedIn = true;

  // expect store session to be invalid so should
  // receive logged in details from provider
  actionTester.expectAction(LOAD_AUTH_STATE_REQ)
    .success<AuthStatePayload>({
      isLoggedIn: true,
      username: 'johndoe'
    });

  dispatch.authService!.loadAuthState();
  await actionTester.done();

  // session is valid and logged in and
  // provider is also logged in so NOOP
  const auth = (<AuthState>store.getState().auth);
  auth.session.reset();  
  auth.isLoggedIn = true;
  actionTester.expectAction(LOAD_AUTH_STATE_REQ);
  actionTester.expectAction(NOOP);

  dispatch.authService!.loadAuthState();
  await actionTester.done();
  expect(mockProvider.loggedIn).toBeTruthy();

  // store session is valid and logged out
  // but provider is logged in so should 
  // expect provider to be signed out.
  auth.isLoggedIn = false;
  actionTester.expectAction(LOAD_AUTH_STATE_REQ);
  actionTester.expectAction(NOOP);

  dispatch.authService!.loadAuthState();
  await actionTester.done();
  expect(mockProvider.loggedIn).toBeFalsy();

  expect(mockProvider.isLoggedInCounter).toEqual(4);
  expect(mockProvider.signOutCounter).toEqual(1);
});
