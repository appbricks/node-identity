import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';

import User from '../../../model/user';
import AuthService from '../../auth-service';

import { CONFIGURE_MFA_REQ } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import createRequestTester, { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('configure-mfa.test');

// test reducer validates action flows
const requestTester = createRequestTester(logger, CONFIGURE_MFA_REQ);
let rootReducer = combineReducers({
  auth: requestTester.reducer()
})

let epicMiddleware = createEpicMiddleware();
let store: any = createStore(
  rootReducer, 
  applyMiddleware(reduxLogger, epicMiddleware)
);

const mockProvider = new MockProvider();
let authService = new AuthService(mockProvider);
let rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to configure MFA for a user', async () => {

  // expect error as user is not logged in
  dispatch.configureMFA(getTestUser());
  mockProvider.loggedIn = true;

  // Should throw an error
  let userWithError = getTestUser();
  userWithError.username = 'error';
  dispatch.configureMFA(userWithError);

  // expect no errors
  dispatch.configureMFA(getTestUser());
});

it('calls reducer as expected when configure MFA action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.configureMFACounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);
});

it('has saved the correct user changes to the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
