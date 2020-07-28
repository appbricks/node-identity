import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { UPDATE_PASSWORD_REQ } from '../../action';
import { updatePasswordAction } from '../../actions/update-password'

import { createMockProvider } from '../../__tests__/mock-provider';
import createRequestTester from '../../__tests__/request-tester-username';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';


// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('update-password.test');

const mockProvider = createMockProvider();
var updatePasswordCounter = 0;
mockProvider.updatePassword= (username: string, password: string, code: string): Promise<void> => {
  updatePasswordCounter++;
  expect(username).toEqual('johndoe');
  expect(password).toEqual('password');
  if (code == '12345') {
    return Promise.resolve();
  } else {
    return Promise.reject(new Error('invalid code'));
  }
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = createRequestTester(logger, UPDATE_PASSWORD_REQ, false, '12345');

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
  dispatch.updatePassword('johndoe', 'password', '12345');
  // expect invalid code error
  dispatch.updatePassword('johndoe', 'password', '00000');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(updatePasswordCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});
