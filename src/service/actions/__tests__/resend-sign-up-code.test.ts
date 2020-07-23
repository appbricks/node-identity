import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { RESEND_SIGN_UP_CODE_REQ } from '../../action';
import { resendSignUpCodeAction } from '../../actions/resend-sign-up-code'

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
const logger = new Logger('resend-sign-up-code.test');

const mockProvider = createMockProvider();
mockProvider.resendSignUpCode = (user: User): Promise<string> => {
  expectTestUserToBeSet(user);
  return Promise.resolve('');
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = requestTesterForUserOnlyRequests(logger, RESEND_SIGN_UP_CODE_REQ);

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
  // expect no errors
  resendSignUpCodeAction(store.dispatch, getTestUser());
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(0);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
