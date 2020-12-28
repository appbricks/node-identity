import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  SIGN_UP_REQ,
  AuthUserPayload,
  AuthVerificationPayload
} from '../../action';

import { 
  MockProvider,
  getTestUser
} from '../../__tests__/mock-provider';
import { initServiceDispatch }  from './initialize-test';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('sign-up.test');

// test reducer validates action flows
const mockProvider = new MockProvider();
const actionTester = new ActionTester(logger);
// test service dispatcher
const dispatch = initServiceDispatch(mockProvider, actionTester);

it('dispatches an action to sign up a user', async () => {
  
  let user = getTestUser();
  user.username = ''

  // user validation error
  actionTester.expectAction<AuthUserPayload>(SIGN_UP_REQ, { user })
    .error('Insufficient user data provided for sign-up.');

  dispatch.authService!.signUp(user);
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  // provider error
  user.username = 'error'

  actionTester.expectAction<AuthUserPayload>(SIGN_UP_REQ, { user })
    .error('invalid username');

  dispatch.authService!.signUp(user);
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  // no errors
  user.username = 'johndoe'

  actionTester.expectAction<AuthUserPayload>(SIGN_UP_REQ, { user })
    .success<AuthVerificationPayload>(undefined,
      (counter, state, action): any => {
        const info = action.payload!.info;
        expect(info.type).toEqual(1);
        expect(info.destination).toEqual('test.appbricks@gmail.com');
        expect(info.attrName).toEqual('email');
        expect(info.isConfirmed).toBeFalsy();
        return state;
      }
    );

  dispatch.authService!.signUp(user);
  await actionTester.done();
  expect(actionTester.hasErrors).toBeFalsy();

  expect(mockProvider.signUpCounter).toEqual(2);
});
