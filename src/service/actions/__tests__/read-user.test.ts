import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthUserPayload, READ_USER_REQ } from '../../action';

import { createMockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('read-user.test');

const mockProvider = createMockProvider();
var isLoggedIn = false;
var isLoggedInCounter = 0;
mockProvider.isLoggedIn = (): Promise<boolean> => {
  isLoggedInCounter++;
  return Promise.resolve(isLoggedIn);
}
var readUserCounter = 0;
mockProvider.readUser = (attribNames?: string[]): Promise<User> => {
  readUserCounter++;
  return Promise.resolve(getTestUser());
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthUserPayload>(logger,
  READ_USER_REQ,
  (counter, state, action): AuthUserState => {
    expect(counter).toBeLessThanOrEqual(2);
    expect(action.payload).toBeUndefined();
    return state;
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    let user = (<AuthUserPayload>action.meta.relatedAction!.payload).user!;
    expectTestUserToBeSet(user);
    return {...state, user};
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    expect(action.payload!.message).toEqual('Error: No user logged in. The user needs to be logged in before it can be read.');
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

const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to sign up a user', async () => {
  // expect error as user is not logged in
  dispatch.readUser();
  // expect no errors
  isLoggedIn = true;
  dispatch.readUser();
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(isLoggedInCounter).toEqual(2);
  expect(readUserCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
