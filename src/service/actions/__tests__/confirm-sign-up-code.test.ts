import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';

import AuthService from '../../auth-service';

import { CONFIRM_SIGN_UP_CODE_REQ } from '../../action';

import { createMockProvider } from '../../__tests__/mock-provider';
import createRequestTester from '../../__tests__/request-tester-username';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('confirm-sign-up-code.test');

const mockProvider = createMockProvider();
var confirmSignUpCodeCounter = 0;
mockProvider.confirmSignUpCode = (username: string, code: string): Promise<boolean> => {
  confirmSignUpCodeCounter++;
  expect(username).toEqual('johndoe');
  if (code == '12345') {
    return Promise.resolve(true);
  } else {
    return Promise.reject(new Error('invalid code'));
  }
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = createRequestTester(logger, CONFIRM_SIGN_UP_CODE_REQ, true, '12345');
requestTester.setInitialUserInState(getTestUser());

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
  dispatch.confirmSignUpCode('johndoe', '12345');
  // expect invalid code error
  dispatch.confirmSignUpCode('johndoe', '00000');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(confirmSignUpCodeCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user, true);
});
