import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';

import User from '../../../model/user';
import AuthService from '../../auth-service';

import { SIGN_UP_REQ } from '../../action';
import { signUpAction } from '../../actions/sign-up'

import { createMockProvider } from '../../__tests__/mock-provider';
import createRequestTester, { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-up.test');

// test reducer validates action flows
const requestTester = createRequestTester(logger, SIGN_UP_REQ, true);

const mockProvider = createMockProvider();
var signUpCounter = 0;
mockProvider.signUp = (user: User): Promise<boolean> => {
  signUpCounter++;
  if (user.username == 'error') {
    return Promise.reject(new Error('invalid username'));
  }
  expectTestUserToBeSet(user);
  return Promise.resolve(true);
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

it('dispatches an action to sign up a user', async () => {
  let dispatch = AuthService.dispatchProps(store.dispatch)

  let user = getTestUser();
  dispatch.signUp( user);

  // Should throw an error
  let userWithError = getTestUser();
  userWithError.username = 'error';
  dispatch.signUp(userWithError);

  // Should throw another error as user is invalid
  dispatch.signUp(new User());
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(signUpCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user, true);
});
