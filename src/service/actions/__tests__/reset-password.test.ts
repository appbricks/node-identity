import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { RESET_PASSWORD_REQ } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import createRequestTester from '../../__tests__/request-tester-username';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('reset-password.test');

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

const mockProvider = new MockProvider();
const authService = new AuthService(mockProvider)
const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to sign up a user', async () => {
  // expect no errors
  dispatch.resetPassword('johndoe');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.resetPasswordCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(0);
});
