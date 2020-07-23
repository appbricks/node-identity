import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../../state/state';
import { AuthStatePayload, SIGN_OUT_REQ } from '../../action';
import { signOutAction } from '../../actions/sign-out'

import { createMockProvider, ServiceRequestTester} from '../../__tests__/test-helpers';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-out.test');

var isLoggedIn = true;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
mockProvider.signOut = (): Promise<void> => {
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
  signOutAction(store.dispatch);
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(1);
  expect(requestTester.okCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expect(isLoggedIn).toBeFalsy();
});
