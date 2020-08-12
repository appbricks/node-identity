import * as redux from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler, setLocalStorageImpl, ActionResult } from '@appbricks/utils';

import Session from '../../model/session';
import User, { UserStatus, VerificationInfo, VerificationType } from '../../model/user';

import { 
  AuthActionProps, 
  SERVICE_RESPONSE_OK, 
  LOAD_AUTH_STATE_REQ, 
  SIGN_UP_REQ, 
  RESEND_SIGN_UP_CODE_REQ,
  CONFIRM_SIGN_UP_CODE_REQ, 
  SIGN_IN_REQ, 
  CONFIGURE_MFA_REQ,
  READ_USER_REQ 
} from '../action';
import { AuthUserState } from '../state';
import AuthService from '../auth-service';

import { MockProvider } from './mock-provider';
import { StateTester } from './state-tester';
import { getTestUser, expectTestUserToBeSet } from './request-tester-user';

if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}

// Local store implementation
const localStore: { [key: string]: Object } = {};

let mockProvider = new MockProvider();
let authService = new AuthService(mockProvider);
let store: any;
let dispatch: AuthActionProps;
let timestamp = -1;

setLocalStorageImpl({
  setItem: (key: string, value: string): Promise<void> => {
    localStore[key] = JSON.parse(value);
    return Promise.resolve();
  },
  getItem: (key: string): Promise<string | null | undefined> => {
    let data = localStore[key];
    if (data) {
      return Promise.resolve(JSON.stringify(data));      
    }
    return Promise.resolve(undefined);    
  }
});

const stateTester = new StateTester<AuthUserState>(
  (counter, state) => {
    switch (counter) {
      case 1: { // Initial loadAuthState request
        expect(state.actionStatus.action.type).toEqual(LOAD_AUTH_STATE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        expect(state.session.timestamp).toEqual(-1);
        expect(state.isLoggedIn).toBeFalsy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 2: { // Initial loadAuthState request response
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(LOAD_AUTH_STATE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        expect(state.session.timestamp).toEqual(-1);
        expect(state.isLoggedIn).toBeFalsy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 3: { // New user sign-up request
        expect(state.actionStatus.action.type).toEqual(SIGN_UP_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        expectTestUserToBeSet(state.user, false);
        expect(state.user!.status).toEqual(UserStatus.Unregistered);
        break;
      }
      case 4: { // New user sign-up response
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(SIGN_UP_REQ);        
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        let sendTimestamp = state.awaitingUserConfirmation!.timestamp!;
        validateStateAfterNewUserSignUp(state, sendTimestamp);
        timestamp = sendTimestamp;
        break;
      }
      case 5: { // Starting new session so expecting loadAuthState 
                // request to retrieve saved user and session
        expect(state.actionStatus.action.type).toEqual(LOAD_AUTH_STATE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        validateStateAfterNewUserSignUp(state, timestamp);
        break;
      }
      case 6: { // Starting new session so expecting loadAuthState 
                // response to contain saved user and session
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(LOAD_AUTH_STATE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        validateStateAfterNewUserSignUp(state, timestamp);
        break;
      }
      case 7: { // Request sign-up code to be resent
        expect(state.actionStatus.action.type).toEqual(RESEND_SIGN_UP_CODE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        validateStateAfterNewUserSignUp(state, timestamp);
        break;
      }
      case 8: { // Response of new sign-up code
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(RESEND_SIGN_UP_CODE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        let sendTimestamp = state.awaitingUserConfirmation!.timestamp!;
        expect(sendTimestamp).toBeGreaterThan(timestamp);
        validateStateAfterNewUserSignUp(state, sendTimestamp);
        timestamp = sendTimestamp;
        break;
      }
      case 9: { // Request to confirm sign-up code
        expect(state.actionStatus.action.type).toEqual(CONFIRM_SIGN_UP_CODE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        validateStateAfterNewUserSignUp(state, timestamp);
        timestamp = -1;
        break;
      }
      case 10: { // Response of sign-up code confirmation
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(CONFIRM_SIGN_UP_CODE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        let user = state.user;
        expectTestUserToBeSet(user, true);
        expect(state.awaitingUserConfirmation).toBeUndefined();
        break;
      }
      case 11: { // Starting new session and loadAuthState request should have an empty session
        expect(state.actionStatus.action.type).toEqual(LOAD_AUTH_STATE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        expect(state.session.timestamp).toEqual(-1);
        expect(state.isLoggedIn).toBeFalsy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 12: { // Starting new session and loadAuthState request should have an empty session
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(LOAD_AUTH_STATE_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        expect(state.session.timestamp).toEqual(-1);
        expect(state.isLoggedIn).toBeFalsy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 13: { // Sign in request
        expect(state.actionStatus.action.type).toEqual(SIGN_IN_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        expect(state.session.timestamp).toEqual(-1);
        expect(state.isLoggedIn).toBeFalsy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 14: { // Sign in response
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(SIGN_IN_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        timestamp = state.session.timestamp;
        expect(state.session.timestamp).toBeGreaterThan(0);
        expect(state.isLoggedIn).toBeTruthy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 15: { // Read user request after successful sign in
        expect(state.actionStatus.action.type).toEqual(READ_USER_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);

        expect(state.session.timestamp).toEqual(timestamp);
        expect(state.isLoggedIn).toBeTruthy();
        expect(state.user).toBeUndefined();
        break;
      }
      case 16: { // Read user response
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(READ_USER_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        expect(state.session.timestamp).toEqual(timestamp);
        expect(state.isLoggedIn).toBeTruthy();
        expectTestUserToBeSet(state.user!, true);
        break;
      }
      case 17: { // Configure MFA request after successful sign in
        expect(state.actionStatus.action.type).toEqual(CONFIGURE_MFA_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.pending);
        break;
      }
      case 18: { // Configure MFA response
        expect(state.actionStatus.action.type).toEqual(SERVICE_RESPONSE_OK);
        expect(state.actionStatus.action.meta.relatedAction!.type).toEqual(CONFIGURE_MFA_REQ);
        expect(state.actionStatus.result).toEqual(ActionResult.success);

        expectTestUserToBeSet(state.user!, true, true);
        break;
      }     
      default: {
        console.error('Unexpected state at count %d:', counter, state);
        fail('Unexpected state change.');
      }
    }
  }
);

function validateStateAfterNewUserSignUp(state: AuthUserState, timestamp: number) {
  
  let user = state.user;
  expectTestUserToBeSet(user, false);
  expect(state.user!.status).toEqual(UserStatus.Unconfirmed);

  expect(state.isLoggedIn).toBe(false);
  expect(state.awaitingUserConfirmation!).toEqual(<VerificationInfo>{
    timestamp: timestamp,
    type: VerificationType.Email,
    destination: 'johndoe@gmail.com',
    attrName: 'email',
    isConfirmed: false
  });
}

beforeEach(async () => {

  // create auth service
  mockProvider = new MockProvider();
  authService = new AuthService(mockProvider);

  // initialize redux store
  let rootReducer = redux.combineReducers({
    auth: authService.reducer()
  });

  let epicMiddleware = createEpicMiddleware();
  store = redux.createStore(
    rootReducer, 
    redux.applyMiddleware(reduxLogger, epicMiddleware)
  );

  let rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics());
  epicMiddleware.run(rootEpic);
  
  dispatch = AuthService.dispatchProps(
    <redux.Dispatch<redux.Action>>store.dispatch, 
    AuthService.stateProps(store.getState())
  );
  store.subscribe(stateTester.tester(store));

  await authService.init();
})

afterEach(() => {
  stateTester.isOk();
})

/** 
 * NOTE: The following tests need to be run sequentially as 
 * each test depends on the previous test to set up state.
 */ 

it('loads initial auth state and signs up a new user', async () => {
  dispatch.loadAuthState();
  // wait until state has been loaded
  await stateTester.until(2);

  dispatch.signUp(getTestUser());
  // wait until sign up response has been received
  await stateTester.until(4);

  expect(localStore).toEqual({
    auth: {
      session: {
        timestamp: -1
      },
      user: {
        status: UserStatus.Unconfirmed,
        username: 'johndoe',
        firstName: 'John',
        familyName: 'Doe',
        emailAddress: 'johndoe@gmail.com',
        emailAddressVerified: false,
        mobilePhone: '9999999999',
        mobilePhoneVerified: false,
        enableBiometric: false,
        enableMFA: false,
        enableTOTP: false,
        rememberFor24h: false
      },
      userConfirmation: {
        type: VerificationType.Email,
        timestamp: timestamp,
        destination: "johndoe@gmail.com",
        attrName: "email",
        isConfirmed: false,
      }
    }
  });
});

it('starts new session and initial auth state loads previous state and confirms new user', async () => {

  dispatch.loadAuthState();
  // wait until state has been loaded
  await stateTester.until(6);

  dispatch.resendSignUpCode();
  // wait for state after request for new sign-up code has been set
  await stateTester.until(8);

  dispatch.confirmSignUpCode('12345');
  // wait for state after request for sign-up confirmation has been set
  await stateTester.until(10);
  
  expect(localStore).toEqual({
    auth: {
      session: {
        timestamp: -1
      },
      user: {
        status: UserStatus.Confirmed,
        username: 'johndoe',
        firstName: 'John',
        familyName: 'Doe',
        emailAddress: 'johndoe@gmail.com',
        emailAddressVerified: true,
        mobilePhone: '9999999999',
        mobilePhoneVerified: false,
        enableBiometric: false,
        enableMFA: false,
        enableTOTP: false,
        rememberFor24h: false
      }
    }
  });

  // reset local store for following test
  delete localStore['auth'];
});

it('loads initial auth state and signs in as new user and performs some updates', async () => {

  dispatch.loadAuthState();
  // wait until state has been loaded
  await stateTester.until(11);

  dispatch.signIn('johndoe', '@ppBricks2020');
  // wait until logged in state
  await stateTester.until(16);

  let user = <User>store.getState().auth.user;
  user.enableMFA = true;
  dispatch.configureMFA(user);
  // wait until MFA has been configured
  await stateTester.until(18);
});
