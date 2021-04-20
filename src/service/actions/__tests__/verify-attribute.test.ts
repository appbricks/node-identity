import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  VERIFY_ATTRIBUTE_REQ,
  AuthLoggedInUserAttrPayload 
} from '../../action';
import { ATTRIB_MOBILE_PHONE } from '../../constants';

import { initServiceDispatch } from '../../__tests__/mock-provider';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('verify-attribute.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher
const { dispatch, mockProvider } = initServiceDispatch(actionTester);

it('dispatches an action to sign up a user', async () => {

  // expect error as user is not logged in
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(VERIFY_ATTRIBUTE_REQ, { 
    attrName: ATTRIB_MOBILE_PHONE
  })
    .error('No user logged in. You can validate an attribute only for logged in user.');

  dispatch.authService!.verifyAttribute(ATTRIB_MOBILE_PHONE);
  await actionTester.done();

  // set logged in state to true
  mockProvider.loggedIn = true;

  // expect no attribute error
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(VERIFY_ATTRIBUTE_REQ, { 
    attrName: ''
  })
    .error('sendVerificationCodeForAttribute request action does not have an attribute name to verify.');

  dispatch.authService!.verifyAttribute('');
  await actionTester.done();

  // expect no errors
  actionTester.expectAction<AuthLoggedInUserAttrPayload>(VERIFY_ATTRIBUTE_REQ, { 
    attrName: ATTRIB_MOBILE_PHONE
  })
    .success();

  dispatch.authService!.verifyAttribute(ATTRIB_MOBILE_PHONE);
  await actionTester.done();

  expect(mockProvider.isLoggedInCounter).toEqual(3);
  expect(mockProvider.sendVerificationCodeForAttributeCounter).toEqual(1);
});
