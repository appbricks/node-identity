import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthMultiFactorAuthPayload, VALIDATE_MFA_CODE_REQ } from '../../action';
import { validateMFACodeAction } from '../../actions/validate-mfa-code'

import { createMockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('validate-mfa-code.test');

const mockProvider = createMockProvider();
var isLoggedIn = false;
var isLoggedInCounter = 0;
mockProvider.isLoggedIn = (): Promise<boolean> => {
  isLoggedInCounter++;
  return Promise.resolve(isLoggedIn);
}
var validateMFACodeCounter = 0;
mockProvider.validateMFACode = (code: string): Promise<boolean> => {
  validateMFACodeCounter++;
  if (code == '12345') {
    return Promise.resolve(true);
  }
  return Promise.reject(new Error('invalid code'));
}

const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthMultiFactorAuthPayload>(logger,
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
    let payload = <AuthMultiFactorAuthPayload>action.meta.relatedAction!.payload;
    expect(payload.mfaCode).toEqual('12345');
    expect(payload.isLoggedIn).toBeTruthy();
    return {...state, 
      session: {...state.session, 
        isLoggedIn: payload.isLoggedIn! 
      }
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

const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

it('dispatches an action to sign up a user', async () => {
  // error as session alread logged in
  isLoggedIn = true;
  validateMFACodeAction(store.dispatch, '12345');
  isLoggedIn = false;
  // error invalide code
  validateMFACodeAction(store.dispatch, '00000');
  // succesful login
  validateMFACodeAction(store.dispatch, '12345');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(isLoggedInCounter).toEqual(3);
  expect(validateMFACodeCounter).toEqual(2);
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);  
});

it('has saved the correct user in the state', () => {
  expect((<AuthUserState>store.getState().auth).session.isLoggedIn).toBeTruthy();
});
