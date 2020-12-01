import { Logger } from '@appbricks/utils';

import { AuthUsernamePayload, AuthVerificationPayload } from '../action';
import { AuthState } from '../state';

import { ServiceRequestTester } from './request-tester';

const createRequestTester = (
  logger: Logger, 
  reqActionType: string, 
  checkConfirmed = false, 
  code?: string) => {

  return new ServiceRequestTester<AuthUsernamePayload & AuthVerificationPayload>(logger, reqActionType,
    (counter: number, state, action): AuthState => {      
      let payload = action.payload!;
      expect(payload.username).toBeDefined();
      if (code) {
        expect(payload.code).toBeDefined();
      }
      return state;
    },
    (counter, state, action): AuthState => {
      let payload = <AuthUsernamePayload>action.meta.relatedAction!.payload!;
      
      expect(payload.username).toEqual('johndoe');
      if (checkConfirmed) {
        expect((<AuthVerificationPayload>action.payload).info.isConfirmed).toBeTruthy();
      }
      return state;
    },
    (counter, state, action): AuthState => {
      let payload = <AuthUsernamePayload>action.meta.relatedAction!.payload;

      if (code) {
        // this test is for error when there is an invalid code
        expect(action.payload!.message).toEqual('invalid code');
        expect(payload.code!).not.toEqual(code);

      } else if (payload.username == 'error') {
        // this test is for error when error is returned by the service
        expect(action.payload!.message).toEqual('invalid username');

      } else {
        logger.trace('unexpected error: ', action);
        fail('Unexpected error encountered');
      }
      return state;
    }
  );
}
export default createRequestTester;
