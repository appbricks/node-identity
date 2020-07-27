import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthStatePayload, LOAD_AUTH_STATE_REQ } from '../../action';
import { loadAuthStateAction } from '../../actions/load-auth-state'

import { createMockProvider, ServiceRequestTester} from '../../__tests__/test-helpers';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('load-auth-state.test');

var isLoggedIn = false;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthStatePayload>(logger,
  LOAD_AUTH_STATE_REQ,
  (counter, state, action): AuthUserState => {
    expect(counter).toBeLessThanOrEqual(2);
    expect(action.payload).toBeUndefined();
    return state;
  },
  (counter, state, action): AuthUserState => {
    let payload = <AuthStatePayload>action.meta.relatedAction!.payload;
    expect(payload.isLoggedIn).toBeDefined();

    switch (counter) {
      case 1: {
        expect(payload.isLoggedIn!).toBeFalsy();
        break;
      }
      case 2: {
        expect(payload.isLoggedIn!).toBeTruthy();
        break;
      }
    }
    return {...state, 
      session: {...state.session, 
        isLoggedIn: payload.isLoggedIn! 
      }
    };
  }
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
  loadAuthStateAction(store.dispatch);
  // set logged in state
  isLoggedIn = true;
  loadAuthStateAction(store.dispatch);
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(2);
  expect(requestTester.errorCounter).toEqual(0);
});

it('has saved the correct user in the state', () => {
  let state = <AuthUserState>store.getState().auth;
  expect(state.session.isLoggedIn).toBeTruthy();
});
