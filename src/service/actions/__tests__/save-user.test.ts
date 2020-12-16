import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { AuthState } from '../../state';
import { AuthUserPayload, SAVE_USER_REQ } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('save-user.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthUserPayload>(logger,
  SAVE_USER_REQ,
  (counter, state, action): AuthState => {
    let payload = action.payload!;
    expect(payload.user).toBeDefined();
    expectTestUserToBeSet(payload.user!)
    return state;
  },
  (counter, state, action): AuthState => {
    expect(counter).toBe(1);
    let user = (<AuthUserPayload>action.meta.relatedAction!.payload).user!;
    expectTestUserToBeSet(user);
    return {...state, user};
  },
  (counter, state, action): AuthState => {
    expect(counter).toBe(1);
    expect(action.payload!.message).toEqual('No user logged in. The user needs to be logged in before it can be saved.');
    return state;
  },
);

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
  let user = getTestUser();

  // expect error as user is not logged in
  dispatch.authService!.saveUser(user);
  // expect no errors
  mockProvider.loggedIn = true;
  dispatch.authService!.saveUser(user);
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(2);
  expect(mockProvider.saveUserCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
