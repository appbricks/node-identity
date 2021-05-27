import * as redux from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { 
  Logger,
  LOG_LEVEL_TRACE, 
  setLogLevel, 
  reduxLogger, 
  combineEpicsWithGlobalErrorHandler, 
  setLocalStorageImpl, 
  ActionResult
} from '@appbricks/utils';
import { StateTester } from '@appbricks/test-utils';

import { 
  UserStatus, 
  VerificationInfo, 
  VerificationType 
} from '../../model/user';
import { ATTRIB_MOBILE_PHONE, AUTH_MFA_SMS } from '../constants';

import {
  AuthActionProps,
  LOAD_AUTH_STATE_REQ,
  SIGN_UP_REQ,
  RESEND_SIGN_UP_CODE_REQ,
  CONFIRM_SIGN_UP_CODE_REQ,
  SIGN_IN_REQ,
  VALIDATE_MFA_CODE_REQ,
  SIGN_OUT_REQ,
  CONFIGURE_MFA_REQ,
  READ_USER_REQ,
  VERIFY_ATTRIBUTE_REQ,
  CONFIRM_ATTRIBUTE_REQ,
  RESET_PASSWORD_REQ,
  UPDATE_PASSWORD_REQ,
  SAVE_USER_REQ
} from '../action';
import { AuthState } from '../state';
import AuthService from '../auth-service';

import MockProvider from './mock-provider';
import { getTestUser, expectTestUserToBeSet } from './test-user';

if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('auth-service-reducer.test');

// Local store implementation
const localStore: { [key: string]: Object } = {};

const stateTester = new StateTester<AuthState>(logger);
let mockProvider = new MockProvider();

let getState: () => AuthState;

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

beforeEach(async () => {

  const authService = new AuthService(mockProvider);
  await authService.init();

  // initialize redux store
  let rootReducer = redux.combineReducers({
    auth: authService.reducer()
  });

  let epicMiddleware = createEpicMiddleware();
  const store = redux.createStore(
    rootReducer,
    redux.applyMiddleware(reduxLogger, epicMiddleware)
  );

  let rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics());
  epicMiddleware.run(rootEpic);
  
  getState = () => store.getState().auth;
  store.subscribe(
    stateTester.test(getState)
  );

  dispatch = AuthService.dispatchProps(<redux.Dispatch<redux.Action>>store.dispatch);
})

function validateStateAfterNewUserSignUp(state: AuthState, timestamp: number) {

  let user = state.user;
  expectTestUserToBeSet(user, false);
  expect(state.user!.status).toEqual(UserStatus.Unconfirmed);

  expect(state.isLoggedIn).toBe(false);
  expect(state.awaitingUserConfirmation!).toEqual(<VerificationInfo>{
    timestamp: timestamp,
    type: VerificationType.Email,
    destination: 'test.appbricks@gmail.com',
    attrName: 'email',
    isConfirmed: false
  });
}

/**
 * NOTE: The following tests need to be run sequentially as
 * each test depends on the previous test to set up state.
 */

it('loads initial auth state and signs up a new user', async () => {

  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(status.timestamp).toBeGreaterThan(0);
      expect(state.session.timestamp).toEqual(-1);
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeUndefined();
    }
  );
  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.timestamp).toBeGreaterThan(0);
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeUndefined();
    }
  );
  dispatch.authService!.loadAuthState();
  await stateTester.done();

  stateTester.expectStateTest(
    SIGN_UP_REQ, ActionResult.pending,
    (counter, state, status) => {
      expectTestUserToBeSet(state.user, false);
      expect(state.user!.status).toEqual(UserStatus.Unregistered);
    }
  );
  stateTester.expectStateTest(
    SIGN_UP_REQ, ActionResult.success,
    (counter, state, status) => {
      let sendTimestamp = state.awaitingUserConfirmation!.timestamp!;
      validateStateAfterNewUserSignUp(state, sendTimestamp);
      timestamp = sendTimestamp;
    }
  );
  dispatch.authService!.signUp(getTestUser());
  await stateTester.done();

  expect(localStore).toEqual({
    auth: {
      session: {
        activityTimestamp: -1
      },
      user: {
        status: UserStatus.Unconfirmed,
        username: 'johndoe',
        firstName: 'John',
        middleName: 'Bee',
        familyName: 'Doe',
        preferredName: 'JD',
        emailAddress: 'test.appbricks@gmail.com',
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
        destination: "test.appbricks@gmail.com",
        attrName: "email",
        isConfirmed: false,
      }
    }
  });
});

it('starts new session and initial auth state loads previous state and confirms new user', async () => {

  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(status.timestamp).toBeGreaterThan(0);
      expect(state.session.timestamp).toEqual(-1);
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      validateStateAfterNewUserSignUp(state, timestamp);
    }
  );
  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.timestamp).toBeGreaterThan(0);
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      validateStateAfterNewUserSignUp(state, timestamp);
    }
  );
  dispatch.authService!.loadAuthState();
  await stateTester.done();

  stateTester.expectStateTest(
    RESEND_SIGN_UP_CODE_REQ, ActionResult.pending,
    (counter, state, status) => {
      let user = state.user;
      expectTestUserToBeSet(user, false);
      expect(state.user!.status).toEqual(UserStatus.Unconfirmed);
      expect(state.isLoggedIn).toBe(false);
    }
  );
  stateTester.expectStateTest(
    RESEND_SIGN_UP_CODE_REQ, ActionResult.success,
    (counter, state, status) => {
      let sendTimestamp = state.awaitingUserConfirmation!.timestamp!;
      expect(sendTimestamp).toBeGreaterThan(timestamp);
      validateStateAfterNewUserSignUp(state, sendTimestamp);
      timestamp = sendTimestamp;
    }
  );
  dispatch.authService!.resendSignUpCode('johndoe');
  await stateTester.done();

  stateTester.expectStateTest(
    CONFIRM_SIGN_UP_CODE_REQ, ActionResult.pending,
    (counter, state, status) => {
      validateStateAfterNewUserSignUp(state, timestamp);
      timestamp = -1;
    }
  );
  stateTester.expectStateTest(
    CONFIRM_SIGN_UP_CODE_REQ, ActionResult.success,
    (counter, state, status) => {
      let user = state.user;
      expectTestUserToBeSet(user, true);
      expect(state.awaitingUserConfirmation).toBeUndefined();
    }
  );
  dispatch.authService!.confirmSignUpCode('12345', 'johndoe');
  await stateTester.done();

  expect(localStore).toEqual({
    auth: {
      session: {
        activityTimestamp: -1
      },
      user: {
        status: UserStatus.Confirmed,
        username: 'johndoe',
        firstName: 'John',
        middleName: 'Bee',
        familyName: 'Doe',
        preferredName: 'JD',
        emailAddress: 'test.appbricks@gmail.com',
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

  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(status.timestamp).toBeGreaterThan(0);
      expect(state.session.timestamp).toEqual(-1);
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeUndefined();
    }
  );
  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.timestamp).toBeGreaterThan(0);
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeUndefined();
    }
  );
  dispatch.authService!.loadAuthState();
  await stateTester.done();

  stateTester.expectStateTest(
    SIGN_IN_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
    }
  );
  stateTester.expectStateTest(
    SIGN_IN_REQ, ActionResult.success,
    (counter, state, status) => {
      timestamp = state.session.activityTimestamp;
      expect(state.session.activityTimestamp).toBeGreaterThan(0);
      expect(state.isLoggedIn).toBeTruthy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
    }
  );
  stateTester.expectStateTest(
    READ_USER_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toBeGreaterThan(timestamp);
      expect(state.isLoggedIn).toBeTruthy();
    }
  );
  stateTester.expectStateTest(
    READ_USER_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toBeGreaterThan(timestamp);
      expect(state.isLoggedIn).toBeTruthy();
      expectTestUserToBeSet(state.user!, true);
    }
  );  
  dispatch.authService!.signIn('johndoe', '@ppBricks2020');
  await stateTester.done();

  stateTester.expectStateTest(
    CONFIGURE_MFA_REQ, ActionResult.pending
  );
  stateTester.expectStateTest(
    CONFIGURE_MFA_REQ, ActionResult.success,
    (counter, state, status) => {
      expectTestUserToBeSet(state.user!, true, true);
    }
  );
  let user = getState().user!;
  user.enableMFA = true;
  dispatch.authService!.configureMFA(user);
  await stateTester.done();

  stateTester.expectStateTest(
    VERIFY_ATTRIBUTE_REQ, ActionResult.pending
  );
  stateTester.expectStateTest(
    VERIFY_ATTRIBUTE_REQ, ActionResult.success
  );
  dispatch.authService!.verifyAttribute(ATTRIB_MOBILE_PHONE);
  await stateTester.done();
  stateTester.expectStateTest(
    CONFIRM_ATTRIBUTE_REQ, ActionResult.pending
  );
  stateTester.expectStateTest(
    CONFIRM_ATTRIBUTE_REQ, ActionResult.success,
    (counter, state, status) => {
      expectTestUserToBeSet(state.user!, true, true, true);
    }
  );
  dispatch.authService!.confirmAttribute(ATTRIB_MOBILE_PHONE, '12345');
  await stateTester.done();

  stateTester.expectStateTest(
    RESET_PASSWORD_REQ, ActionResult.pending
  );
  stateTester.expectStateTest(
    RESET_PASSWORD_REQ, ActionResult.success
  );
  dispatch.authService!.resetPassword('johndoe');
  await stateTester.done();
  stateTester.expectStateTest(
    UPDATE_PASSWORD_REQ, ActionResult.pending
  );
  stateTester.expectStateTest(
    UPDATE_PASSWORD_REQ, ActionResult.success
  );
  dispatch.authService!.updatePassword('password', '12345', 'johndoe');
  await stateTester.done();

  stateTester.expectStateTest(
    SAVE_USER_REQ, ActionResult.pending
  );
  stateTester.expectStateTest(
    SAVE_USER_REQ, ActionResult.success
  );
  user = getState().user!;
  user.rememberFor24h = true;
  dispatch.authService!.saveUser(user);
  await stateTester.done();

  let auth: any = localStore['auth'];
  expect(auth.session.activityTimestamp).toBeGreaterThan(0);
  expect(auth.user).toEqual({
    status: UserStatus.Confirmed,
    username: 'johndoe',
    firstName: 'John',
    middleName: 'Bee',
    familyName: 'Doe',
    preferredName: 'JD',    
    emailAddress: 'test.appbricks@gmail.com',
    emailAddressVerified: true,
    mobilePhone: '9999999999',
    mobilePhoneVerified: true,
    profilePictureUrl: "https://s.gravatar.com/avatar/d9ef80abd8bcc51c54f1daaad268ad58?default=404&size=42",
    enableBiometric: false,
    enableMFA: true,
    enableTOTP: false,
    rememberFor24h: true
  });
});

it('starts new session and signs-in using MFA and signs-out', async () => {

  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.timestamp).toEqual(-1);
      expect(state.session.activityTimestamp).toBeGreaterThan(0);
      expect(state.isLoggedIn).toBeFalsy();
      expectTestUserToBeSet(state.user, true, true, true);
      expect(state.user!.rememberFor24h).toBeTruthy();
    }
  );
  stateTester.expectStateTest(
    LOAD_AUTH_STATE_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.timestamp).toBeGreaterThan(0);
      expect(state.session.activityTimestamp).toBeGreaterThan(0);
      expect(state.isLoggedIn).toBeTruthy();
    }
  );
  dispatch.authService!.loadAuthState();
  await stateTester.done();

  const userLoadedFromStore = getState().user;

  stateTester.expectStateTest(
    SIGN_OUT_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toBeGreaterThan(timestamp);
      expect(state.isLoggedIn).toBeTruthy();
    }
  );
  stateTester.expectStateTest(
    SIGN_OUT_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeUndefined();
    }
  );
  stateTester.expectState(33); // RESET_STATE
  dispatch.authService!.signOut()
  await stateTester.done();
  
  stateTester.expectStateTest(
    SIGN_IN_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
    }
  );
  stateTester.expectStateTest(
    SIGN_IN_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
      expect(state.awaitingMFAConfirmation).toEqual(AUTH_MFA_SMS);
    }
  );
  stateTester.expectState(36); // skip NOOP
  dispatch.authService!.signIn('johndoe', 'password');
  await stateTester.done();
  
  stateTester.expectStateTest(
    VALIDATE_MFA_CODE_REQ, ActionResult.pending,
    (counter, state, status) => {
      timestamp = state.session.activityTimestamp;
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
    }
  );
  stateTester.expectStateTest(
    VALIDATE_MFA_CODE_REQ, ActionResult.success,
    (counter, state, status) => {
      timestamp = state.session.activityTimestamp;
      expect(state.session.activityTimestamp).toBeGreaterThan(0);
      expect(state.isLoggedIn).toBeTruthy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
    }
  );
  stateTester.expectStateTest(
    READ_USER_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toBeGreaterThan(timestamp);
      expect(state.isLoggedIn).toBeTruthy();
      expect(state.user).toBeDefined();
      expect(state.user!.username).toEqual('johndoe');
    }
  );
  stateTester.expectStateTest(
    READ_USER_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toBeGreaterThan(timestamp);
      expect(state.isLoggedIn).toBeTruthy();
      expectTestUserToBeSet(state.user!, true, true, true);
    }
  );
  dispatch.authService!.validateMFACode('12345', AUTH_MFA_SMS);
  await stateTester.done();

  const userLoadedFromProvider = getState().user;
  expect(userLoadedFromStore !== userLoadedFromStore).toBeFalsy();

  stateTester.expectStateTest(
    SIGN_OUT_REQ, ActionResult.pending,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toBeGreaterThan(timestamp);
      expect(state.isLoggedIn).toBeTruthy();
    }
  );
  stateTester.expectStateTest(
    SIGN_OUT_REQ, ActionResult.success,
    (counter, state, status) => {
      expect(state.session.activityTimestamp).toEqual(-1);
      expect(state.isLoggedIn).toBeFalsy();
      expect(state.user).toBeUndefined();
    }
  );
  stateTester.expectState(43); // RESET_STATE
  dispatch.authService!.signOut()
  await stateTester.done();
});
