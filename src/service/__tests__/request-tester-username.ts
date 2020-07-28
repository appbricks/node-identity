import { Logger } from '@appbricks/utils';

import { AuthUserPayload, AuthUsernamePayload } from '../action';
import { AuthUserState } from '../state';

import { ServiceRequestTester } from './request-tester';

const createRequestTester = (
  logger: Logger, 
  reqActionType: string, 
  checkConfirmed = false, 
  code?: string) => {

  return new ServiceRequestTester<AuthUsernamePayload>(logger, reqActionType,
    (counter: number, state, action): AuthUserState => {      
      let payload = action.payload!;
      expect(payload.username).toBeDefined();
      if (code) {
        expect(payload.code).toBeDefined();
      }
      return state;
    },
    (counter, state, action): AuthUserState => {
      let payload = <AuthUsernamePayload>action.meta.relatedAction!.payload!;
      
      expect(payload.username).toEqual('johndoe');
      if (checkConfirmed) {
        let user = state.user;
        expect(user).toBeDefined();
        expect(user!.isConfirmed()).toBeTruthy();
      }
      return state;
    },
    (counter, state, action): AuthUserState => {
      let payload = <AuthUsernamePayload>action.meta.relatedAction!.payload;

      if (code) {
        // this test is for error when there is an invalid code
        expect(action.payload!.message).toEqual('Error: invalid code');
        expect(payload.code!).not.toEqual(code);

      } else if (payload.username == 'error') {
        // this test is for error when error is returned by the service
        expect(action.payload!.message).toEqual('Error: invalid username');

      } else {
        logger.trace('unexpected error: ', action);
        fail('Unexpected error encountered');
      }
      return state;
    }
  );
}
export default createRequestTester;
