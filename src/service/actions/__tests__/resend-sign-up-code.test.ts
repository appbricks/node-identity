import {
  Logger,
  LOG_LEVEL_TRACE,
  setLogLevel,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { 
  RESEND_SIGN_UP_CODE_REQ,
  AuthUsernamePayload,
  AuthVerificationPayload
} from '../../action';

import { initServiceDispatch } from '../../__tests__/mock-provider';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}
const logger = new Logger('reset-password.test');

// test reducer validates action flows
const actionTester = new ActionTester(logger);
// test service dispatcher
const { dispatch, mockProvider } = initServiceDispatch(actionTester);

it('dispatches an action to sign up a user', async () => {

  actionTester.expectAction<AuthUsernamePayload>(RESEND_SIGN_UP_CODE_REQ, { 
    username: 'johndoe'
  })
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

  dispatch.authService!.resendSignUpCode('johndoe');
  await actionTester.done();

  expect(mockProvider.resendSignUpCodeCounter).toEqual(1);
});
