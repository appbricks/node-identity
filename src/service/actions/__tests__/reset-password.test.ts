import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { RESET_PASSWORD_REQ } from '../../action';
import { resetPasswordAction } from '../../actions/reset-password'

import { createMockProvider } from '../../__tests__/mock-provider';
import createRequestTester from '../../__tests__/request-tester-username';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('reset-password.test');

const mockProvider = createMockProvider();
var resetPasswordCounter = 0;
mockProvider.resetPassword = (username: string): Promise<void> => {
  expect(username).toEqual('johndoe');
  resetPasswordCounter++;
  return Promise.resolve();
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = createRequestTester(logger, RESET_PASSWORD_REQ);

const rootReducer = combineReducers({
  auth: requestTester.reducer()
})

const epicMiddleware = createEpicMiddleware();
const store: any = createStore(
  rootReducer, 
  applyMiddleware(reduxLogger, epicMiddleware)
);

const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

it('dispatches an action to sign up a user', async () => {
  let dispatch = AuthService.dispatchProps(store.dispatch)

  // expect no errors
  dispatch.resetPassword('johndoe');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(resetPasswordCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(0);
});
