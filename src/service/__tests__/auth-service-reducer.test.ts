import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler, setLocalStorageImpl } from '@appbricks/utils';

import Session from '../../model/session';
import User, { UserStatus } from '../../model/user';

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

// create auth service
const mockProvider = new MockProvider();
const authService = new AuthService(mockProvider);

// initialize redux store
let rootReducer = combineReducers({
  auth: authService.reducer()
});

let epicMiddleware = createEpicMiddleware();
let store: any = createStore(
  rootReducer, 
  applyMiddleware(reduxLogger, epicMiddleware)
);

let rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics());
epicMiddleware.run(rootEpic);

// AuthService dispath properties
const dispatch = AuthService.dispatchProps(store.dispatch);

it('initializes auth service', async () => {
  await authService.init();
});

let stateTester = new StateTester<AuthUserState>(
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
        expect(state.session).toEqual(<Session>{
          timestamp: -1,
          isLoggedIn: false,
          updatePending: false
        });
        break;
      }
    }
  }
);
store.subscribe(stateTester.tester(store));

afterEach(() => {
  stateTester.isOk();
})

it('loads initial auth state', () => {
  dispatch.loadAuthState();
});

it('signs up a user', () => {
  dispatch.signUp(getTestUser());
})
