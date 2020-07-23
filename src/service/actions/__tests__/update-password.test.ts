import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { UPDATE_PASSWORD_REQ } from '../../action';
import { updatePasswordAction } from '../../actions/update-password'

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
const logger = new Logger('update-password.test');

const mockProvider = createMockProvider();
mockProvider.updatePassword= (user: User, code: string): Promise<void> => {
  expectTestUserToBeSet(user);
  if (code == '12345') {
    return Promise.resolve();
  } else {
    return Promise.reject(new Error('invalid code'));
  }
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = requestTesterForUserOnlyRequests(logger, UPDATE_PASSWORD_REQ, false, '12345');

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
  updatePasswordAction(store.dispatch, getTestUser(), '12345');
  // expect invalid code error
  updatePasswordAction(store.dispatch, getTestUser(), '00000');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
