import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import User from '../../../model/user';
import { AuthUserState } from '../../state';
import { AuthSignInPayload, AuthUserPayload, SIGN_IN_REQ, READ_USER_REQ } from '../../action';
import { signInAction } from '../../actions/sign-in';

import { AUTH_NO_MFA } from '../../constants';

import { createMockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';
import { getTestUser, expectTestUserToBeSet } from '../../__tests__/request-tester-user';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-in.test');

const mockProvider = createMockProvider();
var isLoggedIn = false;
var isLoggedInCounter = 0;
mockProvider.isLoggedIn = (): Promise<boolean> => {
  isLoggedInCounter++;
  return Promise.resolve(isLoggedIn);
}
var signInCounter = 0;
mockProvider.signIn = (username: string, password: string): Promise<number> => {
  signInCounter++;
  expect(username).toEqual('johndoe');
  if (password == '@ppBricks2020') {
    isLoggedIn = true;
    return Promise.resolve(AUTH_NO_MFA);
  }
  isLoggedIn = false;
  return Promise.reject(new Error('invalid password'));
}
mockProvider.readUser = (attribNames?: string[]): Promise<User> => {
  return Promise.resolve(getTestUser());
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthSignInPayload>(logger,
  SIGN_IN_REQ,
  (counter, state, action): AuthUserState => {
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
  (counter, state, action): AuthUserState => {
    switch (action.meta.relatedAction!.type) {
      case SIGN_IN_REQ: {
        expect(counter).toBe(1);
        let payload = (<AuthSignInPayload>action.meta.relatedAction!.payload);
        expect(payload.username).toEqual('johndoe');
        expect(payload.password).toEqual('@ppBricks2020');
        expect(payload.isLoggedIn).toBeTruthy();
        return {
          ...state,
          session: {
            ...state.session,
            isLoggedIn: true
          }
        };
      }
      case READ_USER_REQ: {
        expect(counter).toBe(2);
        let payload = (<AuthUserPayload>action.meta.relatedAction!.payload);
        let user = payload.user;
        expectTestUserToBeSet(user);
        return {...state, user};
      }
    }
    return state;
  },
  (counter, state, action): AuthUserState => {
    switch (counter) {
      case 1: {
        // login error
        expect(action.payload!.message).toEqual('Error: invalid password');
        break;
      }
      case 2: {
        // login error
        expect(action.payload!.message).toEqual('Error: The current session is already logged in.');
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

const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

it('dispatches an action to sign up a user', async () => {  
  let dispatch = AuthService.dispatchProps(store.dispatch)

  // invalid login
  dispatch.signIn('johndoe', '00000');
  // successful login
  dispatch.signIn('johndoe', '@ppBricks2020');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(isLoggedInCounter).toEqual(4);
  expect(signInCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  let state = store.getState();
  expectTestUserToBeSet(state.auth.user);
  expect(state.auth.session.isLoggedIn).toBeTruthy();
});

it('it attempts to sign to an existing session', () => {
  // relogin attempt should return error as already logged in
  signInAction(store.dispatch, 'johndoe', '@ppBricks2020');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(2);
});
