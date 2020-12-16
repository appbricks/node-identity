import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';

import AuthService from '../../auth-service';

import { AuthState } from '../../state';
import { AuthLoggedInUserAttrPayload, CONFIRM_ATTRIBUTE_REQ } from '../../action';
import { ATTRIB_MOBILE_PHONE } from '../../constants';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('confirm-attribute.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthLoggedInUserAttrPayload>(logger,
  CONFIRM_ATTRIBUTE_REQ,
  (counter, state, action): AuthState => {
    let payload = action.payload!;
    expect(payload.attrName).toBeDefined();
    expect(payload.code).toBeDefined();

    switch (counter) {
      case 1:
      case 2: {
        expect(payload.attrName!).toEqual(ATTRIB_MOBILE_PHONE);
        expect(payload.code!).toEqual('12345');
        break;
      }
      case 3: {
        expect(payload.attrName!.length).toEqual(0);
      }
    }
    return state;
  },
  (counter, state, action): AuthState => {
    expect(counter).toBe(1);

    let payload = <AuthLoggedInUserAttrPayload>action.meta.relatedAction!.payload;
    expect(payload.attrName!).toEqual(ATTRIB_MOBILE_PHONE);
    expect(payload.code!).toEqual('12345');

    return state;
  },
  (counter, state, action): AuthState => {

    switch (counter) {
      case 1: {
        expect(action.payload!.message).toEqual('No user logged in. You can confirm an attribute only for logged in user.');
        break;
      }
      case 2: {
        expect(action.payload!.message).toEqual('confirmVerificationCodeForAttribute request action does not have an attribute name and code to confirm.');
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

const mockProvider = new MockProvider();
const authService = new AuthService(mockProvider)
const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
epicMiddleware.run(rootEpic);

const dispatch = AuthService.dispatchProps(store.dispatch)

it('dispatches an action to sign up a user', async () => {
  // expect error as user is not logged in
  dispatch.authService!.confirmAttribute(ATTRIB_MOBILE_PHONE, '12345');
  // expect no errors
  mockProvider.loggedIn = true;
  dispatch.authService!.confirmAttribute(ATTRIB_MOBILE_PHONE, '12345');
  // expect error from provider call as user is empty
  dispatch.authService!.confirmAttribute('', '');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.confirmVerificationCodeForAttributeCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);  
});
