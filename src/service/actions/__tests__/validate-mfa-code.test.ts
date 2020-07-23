import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../../state/state';
import { AuthMultiFactorAuthPayload, VALIDATE_MFA_CODE_REQ } from '../../action';
import { validateMFACodeAction } from '../../actions/validate-mfa-code'

import { createMockProvider, ServiceRequestTester} from '../../__tests__/test-helpers';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('validate-mfa-code.test');

var isLoggedIn = false;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
mockProvider.validateMFACode = (code: string): Promise<boolean> => {
  if (code == '12345') {
    return Promise.resolve(true);
  }
  return Promise.reject(new Error('invalid code'));
}

const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester(logger,
  VALIDATE_MFA_CODE_REQ,
  (counter, state, action): AuthUserState => {

    switch (counter) {
      case 1: {
        expect((<AuthMultiFactorAuthPayload>action.payload).mfaCode).toEqual('12345');
        break;
      }
      case 2: {
        expect((<AuthMultiFactorAuthPayload>action.payload).mfaCode).toEqual('00000');
        break;
      }
      case 3: {
        expect((<AuthMultiFactorAuthPayload>action.payload).mfaCode).toEqual('12345');
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
        expect(action.meta.errorPayload!.message).toEqual('Error: The current session is already logged in.');
        break;
      }
      case 2: {
        expect(action.meta.errorPayload!.message).toEqual('Error: invalid code');
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
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);  
});

it('has saved the correct user in the state', () => {
  expect((<AuthUserState>store.getState().auth).session.isLoggedIn).toBeTruthy();
});
