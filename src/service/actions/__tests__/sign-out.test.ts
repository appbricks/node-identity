import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { AuthState } from '../../state';
import { AuthStatePayload, SIGN_OUT_REQ } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-out.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthStatePayload>(logger,
  SIGN_OUT_REQ,
  (counter, state, action): AuthState => {
    expect(counter).toBe(1);
    expect(action.payload).toBeUndefined();
    return state;
  },
  (counter, state, action): AuthState => {
    expect(counter).toBe(1);
    expect((<AuthStatePayload>action.meta.relatedAction!.payload!).isLoggedIn).toBeFalsy();
    return state;
  },
  (counter, state, action): AuthState => {
    fail('no errors should occur');
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
  mockProvider.loggedIn = true;
  dispatch.authService.signOut();
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(1);
  expect(mockProvider.signOutCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expect(mockProvider.loggedIn).toBeFalsy();
});
