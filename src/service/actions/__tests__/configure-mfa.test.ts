import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';

import User from '../../../model/user';
import AuthService from '../../auth-service';

import { CONFIGURE_MFA_REQ } from '../../action';
import { configureMFAAction } from '../../actions/configure-mfa'

import { 
  requestTesterForUserOnlyRequests, 
  createMockProvider, 
  getTestUser, 
  expectTestUserToBeSet 
} from '../../__tests__/test-helpers';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('configure-mfa.test');

// test reducer validates action flows
const requestTester = requestTesterForUserOnlyRequests(logger, CONFIGURE_MFA_REQ);

var isLoggedIn = false;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
mockProvider.configureMFA = (user: User): Promise<void> => {
  if (user.username == 'error') {
    return Promise.reject(new Error('invalid username'));
  }
  expectTestUserToBeSet(user);
  return Promise.resolve();
}

let rootReducer = combineReducers({
  auth: requestTester.reducer()
})

let epicMiddleware = createEpicMiddleware();
let store: any = createStore(
  rootReducer, 
  applyMiddleware(reduxLogger, epicMiddleware)
);

let authService = new AuthService(mockProvider);
let rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

it('dispatches an action to configure MFA for a user', async () => {
  // expect error as user is not logged in
  configureMFAAction(store.dispatch, getTestUser());
  isLoggedIn = true;

  // Should throw an error
  let userWithError = getTestUser();
  userWithError.username = 'error';
  configureMFAAction(store.dispatch, userWithError);

  // expect no errors
  configureMFAAction(store.dispatch, getTestUser());
});

it('calls reducer as expected when configure MFA action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);
});

it('has saved the correct user changes to the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
