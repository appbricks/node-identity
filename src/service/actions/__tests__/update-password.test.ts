import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { UPDATE_PASSWORD_REQ } from '../../action';
import { updatePasswordAction } from '../../actions/update-password'

import { MockProvider } from '../../__tests__/mock-provider';
import createRequestTester from '../../__tests__/request-tester-username';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';


// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('update-password.test');

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

const mockProvider = new MockProvider();
const authService = new AuthService(mockProvider)
const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to sign up a user', async () => {
  // expect no errors
  dispatch.updatePassword('johndoe', 'password', '12345');
  // expect invalid code error
  dispatch.updatePassword('johndoe', 'password', '00000');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.updatePasswordCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});
