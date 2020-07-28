import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthStatePayload, SIGN_OUT_REQ } from '../../action';
import { signOutAction } from '../../actions/sign-out'

import { createMockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-out.test');

const mockProvider = createMockProvider();
var isLoggedIn = true;
var isLoggedInCounter = 0;
mockProvider.isLoggedIn = (): Promise<boolean> => {
  isLoggedInCounter++;
  return Promise.resolve(isLoggedIn);
}
var signOutCounter = 0;
mockProvider.signOut = (): Promise<void> => {
  signOutCounter++;
  isLoggedIn = false;
  return Promise.resolve();
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthStatePayload>(logger,
  SIGN_OUT_REQ,
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    expect(action.payload).toBeUndefined();
    return state;
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    expect((<AuthStatePayload>action.meta.relatedAction).isLoggedIn).toBeFalsy();
    return state;
  },
  (counter, state, action): AuthUserState => {
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

const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

it('dispatches an action to sign up a user', async () => {
  let dispatch = AuthService.dispatchProps(store.dispatch)
  dispatch.signOut();
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(isLoggedInCounter).toEqual(1);
  expect(signOutCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expect(isLoggedIn).toBeFalsy();
});
