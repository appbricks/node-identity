import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthMultiFactorAuthPayload, VALIDATE_MFA_CODE_REQ, AuthLoggedInPayload } from '../../action';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('validate-mfa-code.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthMultiFactorAuthPayload, AuthLoggedInPayload>(logger,
  VALIDATE_MFA_CODE_REQ,
  (counter, state, action): AuthUserState => {

    switch (counter) {
      case 1: {
        expect(action.payload!.mfaCode).toEqual('12345');
        break;
      }
      case 2: {
        expect(action.payload!.mfaCode).toEqual('00000');
        break;
      }
      case 3: {
        expect(action.payload!.mfaCode).toEqual('12345');
        break;
      }
    }
    return state;
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    expect(action.payload!.isLoggedIn).toBeTruthy();

    let payload = <AuthMultiFactorAuthPayload>action.meta.relatedAction!.payload;
    expect(payload.mfaCode).toEqual('12345');

    state.isLoggedIn = action.payload!.isLoggedIn;
    return {...state, 
      session: state.session
    };
  },
  (counter, state, action): AuthUserState => {

    switch (counter) {
      case 1: {
        expect(action.payload!.message).toEqual('Error: The current session is already logged in.');
        break;
      }
      case 2: {
        expect(action.payload!.message).toEqual('Error: invalid code');
        break;
      }
    }
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
  // error as session alread logged in
  mockProvider.loggedIn = true;
  dispatch.validateMFACode('12345');
  mockProvider.loggedIn = false;

  // error invalide code
  dispatch.validateMFACode('00000');
  // succesful login
  dispatch.validateMFACode('12345');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.validateMFACodeCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);  
});

it('has saved the correct user in the state', () => {
  expect((<AuthUserState>store.getState().auth).isLoggedIn).toBeTruthy();
});
