import * as redux from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler, setLocalStorageImpl } from '@appbricks/utils';

import Session from '../../model/session';
import User, { UserStatus, VerificationInfo, VerificationType } from '../../model/user';

import { AuthActionProps } from '../action';
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

let store: any
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
        expect(state).toEqual(<AuthUserState>{
          session: {
            timestamp: -1,
            isLoggedIn: false,
            updatePending: true
          }
        });
        break;
      }
      case 2: { // Initial loadAuthState request response
        expect(state).toEqual(<AuthUserState>{
          session: {
            timestamp: -1,
            isLoggedIn: false,
            updatePending: false
          }
        });
        break;
      }
      case 3: { // New user sign-up request
        let user = state.user;
        expectTestUserToBeSet(user, false);
        expect(state.user!.status).toEqual(UserStatus.Unregistered);
        expect(state.session).toEqual(<Session>{
          timestamp: -1,
          isLoggedIn: false,
          updatePending: true
        });
        break;
      }
      case 4: { // New user sign-up response
        let user = state.user;
        expectTestUserToBeSet(user, false);
        expect(state.user!.status).toEqual(UserStatus.Unconfirmed);

        let sendTimestamp = state.session.awaitingConfirmation!.timestamp!;
        expectedStateAfterNewUserSignUp(false, sendTimestamp);
        timestamp = sendTimestamp;
        break;
      }
      case 5: { // Starting new session so expecting loadAuthState 
                // request to retrieve saved user and session
        let user = state.user;
        expectTestUserToBeSet(user, false);
        expect(state.user!.status).toEqual(UserStatus.Unconfirmed);
        expectedStateAfterNewUserSignUp(true, timestamp);
        break;
      }
      case 6: { // Starting new session so expecting loadAuthState 
                // resonse to contain saved user and session
        let user = state.user;
        expectTestUserToBeSet(user, false);
        expect(state.user!.status).toEqual(UserStatus.Unconfirmed);
        expectedStateAfterNewUserSignUp(false, timestamp);
        break;
      }
      case 7: { // Request sign-up code to be resent
        let user = state.user;
        expectTestUserToBeSet(user, false);
        expect(state.user!.status).toEqual(UserStatus.Unconfirmed);
        expectedStateAfterNewUserSignUp(true, timestamp);
        break;
      }
      case 8: { // Response of new sign-up code
        let user = state.user;
        expectTestUserToBeSet(user, false);
        expect(state.user!.status).toEqual(UserStatus.Unconfirmed);
        let sendTimestamp = state.session.awaitingConfirmation!.timestamp!;
        expect(sendTimestamp).toBeGreaterThan(timestamp);
        expectedStateAfterNewUserSignUp(false, sendTimestamp);
        timestamp = -1;
      }
    }
  }
);

function expectedStateAfterNewUserSignUp(updatePending: boolean, timestamp?: number): Session {
  return <Session>{
    timestamp: -1,
    isLoggedIn: false,
    updatePending: updatePending,
    awaitingConfirmation: <VerificationInfo>{
      timestamp: timestamp,
      type: VerificationType.Email,
      destination: 'johndoe@gmail.com',
      attrName: 'email',
      isConfirmed: false
    }
  };
}

beforeEach(async () => {

  // create auth service
  const mockProvider = new MockProvider();
  const authService = new AuthService(mockProvider);

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
        timestamp: -1,
        awaitingConfirmation: {
          timestamp: timestamp,
          type: VerificationType.Email,
          destination: 'johndoe@gmail.com',
          attrName: 'email',
          isConfirmed: false
        }
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
        enableBiometric: true,
        enableMFA: true,
        enableTOTP: true,
        rememberFor24h: false
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
  await stateTester.until(8);
});
