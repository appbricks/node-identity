import { Logger } from '@appbricks/utils';

import { AuthUserPayload, AuthVerificationPayload, SIGN_UP_REQ } from '../action';
import { AuthUserState } from '../state';
import User, { VerificationType } from '../../model/user';

import { ServiceRequestTester } from './request-tester';

const createRequestTester = (logger: Logger, reqActionType: string, checkConfirmed = false, checkMFAEnabled = false) => {
  return new ServiceRequestTester<AuthUserPayload>(logger, reqActionType,
    (counter: number, state, action): AuthUserState => {
      
      let payload = action.payload!;
      expect(payload.user).toBeDefined();
      return state;
    },
    (counter, state, action): AuthUserState => {
      expect(counter).toBe(1);

      if (action.meta.relatedAction!.type == SIGN_UP_REQ) {
        expect(action.payload).toBeDefined();
        expect(action.payload).toEqual(<AuthVerificationPayload>{
          info: {
            type: VerificationType.None,
            isConfirmed: true
          }
        })
      }
      
      let user = (<AuthUserPayload>action.meta.relatedAction!.payload).user;
      expectTestUserToBeSet(user!, checkConfirmed, checkMFAEnabled);
      return {...state, user: user!}
    },
    (counter, state, action): AuthUserState => {
      let payload = <AuthUserPayload>action.meta.relatedAction!.payload;
      
      if (payload.user.username == 'error') {
        // this test is for error when error is returned by the service
        expect(action.payload!.message).toEqual('Error: invalid username');

      }  else if (!payload.user.isValid()) {
        // this test is for error when user is invalid
        expect(action.payload!.message).toEqual('Error: Insufficient user data provided for sign-up.');

      } else {
        expect(action.payload!.message).toEqual('Error: No user logged in. The user needs to be logged in before MFA can be configured.');
      }
      return state;
    }
  );
};
export default createRequestTester;

export const getTestUser = (): User => {

  let user = new User();
  user.username = 'johndoe';
  user.firstName = 'John';
  user.familyName = 'Doe';
  user.emailAddress = 'johndoe@gmail.com';
  user.mobilePhone = '9999999999';
  return user;
}

export const expectTestUserToBeSet = (
  user: User | undefined, 
  userConfirmed: boolean = false, 
  mfaEnabled: boolean = false,
  mobilePhoneVerified = false
) => {

  expect(user).toBeDefined();
  expect(user!.username).toEqual('johndoe');
  expect(user!.firstName).toEqual('John');
  expect(user!.familyName).toEqual('Doe');
  expect(user!.emailAddress).toEqual('johndoe@gmail.com');
  expect(user!.mobilePhone).toEqual('9999999999');
  expect(user!.mobilePhoneVerified).toBe(mobilePhoneVerified);
  expect(user!.isConfirmed()).toEqual(userConfirmed);
  expect(user!.enableBiometric).toEqual(false);
  expect(user!.enableTOTP).toEqual(false);
  expect(user!.enableMFA).toEqual(mfaEnabled);
}
