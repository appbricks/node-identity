import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import User from '../../../model/user';
import { AuthUserState } from '../../state';
import { AuthSignInPayload, AuthUserPayload, SIGN_IN_REQ, READ_USER_REQ } from '../../action';
import { signInAction } from '../../actions/sign-in';

import { AUTH_NO_MFA } from '../../constants';

import { 
  ServiceRequestTester,
  createMockProvider,
  getTestUser, 
  expectTestUserToBeSet 
} from '../../__tests__/test-helpers';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-in.test');

var isLoggedIn = false;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
mockProvider.signIn = (username: string, password: string): Promise<number> => {
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
        break;
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
  // invalid login
  signInAction(store.dispatch, 'johndoe', '00000');
  // successful login
  signInAction(store.dispatch, 'johndoe', '@ppBricks2020');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
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
