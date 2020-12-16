import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { AuthState } from '../../state';
import { AuthStatePayload, LOAD_AUTH_STATE_REQ } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('load-auth-state.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthStatePayload>(logger,
  LOAD_AUTH_STATE_REQ,
  (counter, state, action): AuthState => {
    expect(counter).toBeLessThanOrEqual(2);
    expect(action.payload).toBeUndefined();
    return state;
  },
  (counter, state, action): AuthState => {
    let payload = <AuthStatePayload>action.payload;
    expect(payload.isLoggedIn).toBeDefined();

    switch (counter) {
      case 1: {
        expect(payload.isLoggedIn!).toBeFalsy();
        break;
      }
      case 2: {
        expect(payload.isLoggedIn!).toBeTruthy();
        break;
      }
    }
        
    state.isLoggedIn = payload.isLoggedIn!;
    return {...state, 
      session: state.session
    };
  }
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
  // not logged in state
  dispatch.authService!.loadAuthState();

  // logged in state
  mockProvider.loggedIn = true;
  dispatch.authService!.loadAuthState();
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(0);
});

it('has saved the correct user in the state', () => {
  let state = <AuthState>store.getState().auth;
  expect(state.isLoggedIn).toBeTruthy();
});
