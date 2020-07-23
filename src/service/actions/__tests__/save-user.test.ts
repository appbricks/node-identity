import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../../state/state';
import { AuthUserPayload, SAVE_USER_REQ } from '../../action';
import { saveUserAction } from '../../actions/save-user'

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
const logger = new Logger('save-user.test');

var isLoggedIn = false;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
mockProvider.saveUser = (user: User, attribNames?: string[]): Promise<void> => {
  expectTestUserToBeSet(user);
  return Promise.resolve();
}

const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester(logger,
  SAVE_USER_REQ,
  (counter, state, action): AuthUserState => {
    let payload = <AuthUserPayload>action.payload;
    expect(payload.user).toBeDefined();
    expectTestUserToBeSet(payload.user!)
    return state;
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    let user = (<AuthUserPayload>action.meta.relatedAction!.payload).user!;
    expectTestUserToBeSet(user);
    return {...state, user};
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);
    expect(action.meta.errorPayload!.message).toEqual('Error: No user logged in. The user needs to be logged in before it can be saved.');
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
  let user = getTestUser();

  // expect error as user is not logged in
  saveUserAction(store.dispatch, user);
  // expect no errors
  isLoggedIn = true;
  saveUserAction(store.dispatch, user);
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(2);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(1);
});

it('has saved the correct user in the state', () => {
  expectTestUserToBeSet(store.getState().auth.user);
});
