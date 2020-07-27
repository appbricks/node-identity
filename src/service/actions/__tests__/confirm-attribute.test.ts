import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';

import User from '../../../model/user';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthLoggedInUserAttrPayload, CONFIRM_ATTRIBUTE_REQ } from '../../action';
import { confirmAttributeAction } from '../../actions/confirm-attribute'

import { createMockProvider, ServiceRequestTester } from '../../__tests__/test-helpers';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('confirm-attribute.test');

var isLoggedIn = false;
const mockProvider = createMockProvider();
mockProvider.isLoggedIn = (): Promise<boolean> => {
  return Promise.resolve(isLoggedIn);
}
mockProvider.confirmVerificationCodeForAttribute = (attribute: string, code: string): Promise<void> => {
  expect(attribute).toEqual('testAttr');
  expect(code).toEqual('12345');
  return Promise.resolve();
}
const authService = new AuthService(mockProvider)

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthLoggedInUserAttrPayload>(logger,
  CONFIRM_ATTRIBUTE_REQ,
  (counter, state, action): AuthUserState => {
    let payload = action.payload!;
    expect(payload.attrName).toBeDefined();
    expect(payload.code).toBeDefined();

    switch (counter) {
      case 1:
      case 2: {
        expect(payload.attrName!).toEqual('testAttr');
        expect(payload.code!).toEqual('12345');
        break;
      }
      case 3: {
        expect(payload.attrName!.length).toEqual(0);
      }
    }
    return state;
  },
  (counter, state, action): AuthUserState => {
    expect(counter).toBe(1);

    let payload = <AuthLoggedInUserAttrPayload>action.meta.relatedAction!.payload;
    expect(payload.attrName!).toEqual('testAttr');
    expect(payload.code!).toEqual('12345');

    return state;
  },
  (counter, state, action): AuthUserState => {

    switch (counter) {
      case 1: {
        expect(action.payload!.message).toEqual('Error: No user logged in. You can confirm an attribute only for logged in user.');
        break;
      }
      case 2: {
        expect(action.payload!.message).toEqual('Error: confirmVerificationCodeForAttribute request action does not have an attribute name and code to confirm.');
        expect((<AuthLoggedInUserAttrPayload>action.meta.relatedAction!.payload).attrName!.length).toEqual(0);
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
let store: any = createStore(
  rootReducer, 
  applyMiddleware(reduxLogger, epicMiddleware)
);

const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

it('dispatches an action to sign up a user', async () => {
  // expect error as user is not logged in
  confirmAttributeAction(store.dispatch, 'testAttr', '12345');
  // expect no errors
  isLoggedIn = true;
  confirmAttributeAction(store.dispatch, 'testAttr', '12345');
  // expect error from provider call as user is empty
  confirmAttributeAction(store.dispatch, '', '');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);  
});
