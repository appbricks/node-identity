import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { AuthState } from '../../state';
import { AuthSignInPayload, AuthUserPayload, SIGN_IN_REQ, READ_USER_REQ, AuthLoggedInPayload } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';
import { expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-in.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthSignInPayload, AuthLoggedInPayload>(logger,
  SIGN_IN_REQ,
  (counter, state, action): AuthState => {
    expect(action.payload!.username).toEqual('johndoe');

    switch (counter) {
      case 1: {
        // login error
        expect(action.payload!.password).toEqual('00000');
        break;
      }
      case 2:
      case 3: {
        // successful login
        expect(action.payload!.password).toEqual('@ppBricks2020');
        break;
      }
    }
    return state;
  },
  (counter, state, action): AuthState => {
    switch (action.meta.relatedAction!.type) {
      case SIGN_IN_REQ: {
        expect(counter).toBe(1);
        expect((<AuthLoggedInPayload>action.payload).isLoggedIn).toBeTruthy();

        let payload = (<AuthSignInPayload>action.meta.relatedAction!.payload);
        expect(payload.username).toEqual('johndoe');
        expect(payload.password).toEqual('@ppBricks2020');

        state.isLoggedIn = true;
        return {
          ...state,
          session: state.session
        };
      }
      case READ_USER_REQ: {
        expect(counter).toBe(2);
        let payload = <unknown>action.payload!;
        let user = (<AuthUserPayload>payload).user;
        expectTestUserToBeSet(user, true);
        return {...state, user};
      }
    }
    return state;
  },
  (counter, state, action): AuthState => {
    switch (counter) {
      case 1: {
        // login error
        expect(action.payload!.message).toEqual('invalid password');
        break;
      }
      case 2: {
        // login error
        expect(action.payload!.message).toEqual('The current session is already logged in.');
        break;
      }
    }
    return state;
  },
  false
);

const rootReducer = combineReducers({
  auth: requestTester.reducer()
})

const epicMiddleware = createEpicMiddleware();
const store: any = createStore(
  rootReducer, 
  applyMiddleware(reduxLogger, epicMiddleware)
);

const mockProvider = new MockProvider(true);
const authService = new AuthService(mockProvider)
const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to sign up a user', async () => {  
  // invalid login
  dispatch.authService.signIn('johndoe', '00000');
  // successful login
  dispatch.authService.signIn('johndoe', '@ppBricks2020');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(4);
  expect(mockProvider.signInCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  let state = store.getState();
  expectTestUserToBeSet(state.auth.user, true);
  expect(state.auth.isLoggedIn).toBeTruthy();
});

it('it attempts to sign to an existing session', () => {
  // relogin attempt should return error as already logged in
  dispatch.authService.signIn('johndoe', '@ppBricks2020');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(2);
});
