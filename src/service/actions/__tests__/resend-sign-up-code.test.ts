import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { RESEND_SIGN_UP_CODE_REQ } from '../../action';

import { createMockProvider } from '../../__tests__/mock-provider';
import createRequestTester from '../../__tests__/request-tester-username';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('resend-sign-up-code.test');

const mockProvider = createMockProvider();
var resendSignUpCodeCounter = 0;
mockProvider.resendSignUpCode = (username: string): Promise<string> => {
  resendSignUpCodeCounter++;
  expect(username).toEqual('johndoe');
  return Promise.resolve('');
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = createRequestTester(logger, RESEND_SIGN_UP_CODE_REQ);

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

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to sign up a user', async () => {
  // expect no errors
  dispatch.resendSignUpCode('johndoe');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(resendSignUpCodeCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(0);
});
