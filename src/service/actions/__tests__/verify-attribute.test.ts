import { combineReducers, createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import { Logger, LOG_LEVEL_TRACE, setLogLevel, reduxLogger, combineEpicsWithGlobalErrorHandler } from '@appbricks/utils';
import AuthService from '../../auth-service';

import { AuthUserState } from '../../state';
import { AuthLoggedInUserAttrPayload, VERIFY_ATTRIBUTE_REQ } from '../../action';
import { ATTRIB_MOBILE_PHONE } from '../../constants';

import { MockProvider } from '../../__tests__/mock-provider';
import { ServiceRequestTester } from '../../__tests__/request-tester';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('verify-attribute.test');

// test reducer validates action flows
const requestTester = new ServiceRequestTester<AuthLoggedInUserAttrPayload>(logger,
  VERIFY_ATTRIBUTE_REQ,
  (counter, state, action): AuthUserState => {
    let payload = action.payload!;
    expect(payload.attrName).toBeDefined();

    switch (counter) {
      case 1:
      case 2: {
        expect(payload.attrName!).toEqual(ATTRIB_MOBILE_PHONE);
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

    expect((<AuthLoggedInUserAttrPayload>action.meta.relatedAction!.payload).attrName!).toEqual(ATTRIB_MOBILE_PHONE);
    return state;
  },
  (counter, state, action): AuthUserState => {

    switch (counter) {
      case 1: {
        expect(action.payload!.message).toEqual('Error: No user logged in. You can validate an attribute only for logged in user.');
        break;
      }
      case 2: {
        expect(action.payload!.message).toEqual('Error: sendVerificationCodeForAttribute request action does not have an attribute name to verify.');
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
const store: any = createStore(
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
  dispatch.verifyAttribute(ATTRIB_MOBILE_PHONE);
  // expect no errors
  mockProvider.loggedIn = true;
  dispatch.verifyAttribute(ATTRIB_MOBILE_PHONE);
  // expect error from provider call as user is empty
  dispatch.verifyAttribute('');
});

it('calls reducer as expected when sign up action is dispatched', () => {
  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.sendVerificationCodeForAttributeCounter).toEqual(1);
  expect(requestTester.reqCounter).toEqual(3);
  expect(requestTester.okCounter).toEqual(1);
  expect(requestTester.errorCounter).toEqual(2);  
});
