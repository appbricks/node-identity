import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  CONFIRM_ATTRIBUTE_REQ, 
  AuthLoggedInUserAttrPayload 
} from '../../action';
import { ATTRIB_MOBILE_PHONE } from '../../constants';

import { MockProvider } from '../../__tests__/mock-provider';
import { initServiceDispatch } from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('confirm-attribute.test');

// test reducer validates action flows
const mockProvider = new MockProvider();
const actionTester = new ActionTester(logger);
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to sign up a user', async () => {
  
  // expect error as user is not logged in
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(CONFIRM_ATTRIBUTE_REQ, { 
    attrName: ATTRIB_MOBILE_PHONE,  
    code: '67890'
  })
    .error('No user logged in. You can confirm an attribute only for logged in user.');

  dispatch.authService!.confirmAttribute(ATTRIB_MOBILE_PHONE, '67890');
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;

  // expect invalid code errors
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(CONFIRM_ATTRIBUTE_REQ, { 
    attrName: ATTRIB_MOBILE_PHONE,  
    code: '67890'
  })
    .error('invalid code');

  dispatch.authService!.confirmAttribute(ATTRIB_MOBILE_PHONE, '67890');
  await actionTester.done();

  // expect no errors
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(CONFIRM_ATTRIBUTE_REQ, { 
    attrName: ATTRIB_MOBILE_PHONE,  
    code: '12345'
  })
    .success();

  dispatch.authService!.confirmAttribute(ATTRIB_MOBILE_PHONE, '12345');
  await actionTester.done();

  // expect error from provider call as user is empty
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(CONFIRM_ATTRIBUTE_REQ, { 
    attrName: '',  
    code: ''
  })
    .error('confirmVerificationCodeForAttribute request action does not have an attribute name and code to confirm.');

  dispatch.authService!.confirmAttribute('', '');
  await actionTester.done();

  expect(mockProvider.isLoggedInCounter).toEqual(4);
  expect(mockProvider.confirmVerificationCodeForAttributeCounter).toEqual(2);
});
