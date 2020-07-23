import { Reducer } from 'redux';
import { Logger, ERROR, Action } from '@appbricks/utils';

import Provider from '../provider';
import User from '../../model/user';

import { AuthUserPayload, SERVICE_RESPONSE_OK } from '../action';
import { AuthUserState } from '../../state/state';

export const requestTesterForUserOnlyRequests = (logger: Logger, reqActionType: string, checkConfirmed = false, code?: string) => {
  return new ServiceRequestTester(logger, reqActionType,
    (counter: number, state, action): AuthUserState => {
      let payload = <AuthUserPayload>action.payload;
      expect(payload.user).toBeDefined();
      if (code) { expect(payload.code).toBeDefined(); }
      expect(action.meta.relatedAction).toBeUndefined();

      switch (counter) {
        case 1: {
          expectTestUserToBeSet(payload.user!);
          if (code) { expect(payload.code!).toEqual(code); }
          break;
        }
        case 2: {
          // test request with errors
          if (code) {
            // request with invalid code
            expect(payload.code!).not.toEqual(code!);
          } else {
            // request with error in user object
            expect(payload.user.username.length).toEqual(0);
          }
        }
      }
      return state;
    },
    (counter, state, action): AuthUserState => {
      expect(counter).toBe(1);
      
      let user = (<AuthUserPayload>action.meta.relatedAction!.payload).user;
      expectTestUserToBeSet(user!, checkConfirmed);
      return {...state, user: user!}
    },
    (counter, state, action): AuthUserState => {
      expect(counter).toEqual(1);

      if (code) {
        // this tester is for a user+code - error created with invalid code
        expect(action.meta.errorPayload!.message).toEqual('Error: invalid code');
        expect((<AuthUserPayload>action.meta.relatedAction!.payload).code!).not.toEqual(code);
      } else {
        // this tester is for a user - error created with empty username
        expect(action.meta.errorPayload!.message).toEqual('Error: zero length username');
        expect((<AuthUserPayload>action.meta.relatedAction!.payload).user!.username.length).toEqual(0);
      }
      return state;
    }
  );
};

export class ServiceRequestTester {

  logger: Logger;
  
  errorCounter: number;
  okCounter: number;
  reqCounter: number;

  matchRelatedAction: boolean;

  reqActionType: string;
  reqActionValidator: ActionValidator;
  okActionValidator: ActionValidator;
  errorActionValidator: ActionValidator;

  constructor(
    logger: Logger,
    reqActionType: string,
    reqActionValidator: ActionValidator,
    okActionValidator: ActionValidator,
    errorActionValidator: ActionValidator = (counter, state, action): AuthUserState => { 
      fail('no errors conditions are being tested');
      return state; 
    },
    matchRelatedAction = true
  ) {
    this.errorCounter = 0;
    this.okCounter = 0;
    this.reqCounter = 0;
    this.matchRelatedAction = matchRelatedAction;

    this.logger = logger;
    this.reqActionType = reqActionType;
    this.reqActionValidator = reqActionValidator;
    this.okActionValidator = okActionValidator;
    this.errorActionValidator = errorActionValidator;
  }

  reducer(): Reducer<AuthUserState, Action> {
    const tester = this;
    
    return (state: AuthUserState = <AuthUserState>{}, action: Action): AuthUserState => {
      tester.logger.trace('Reducer called with action', action.type);
      try {
        switch (action.type) {
          case tester.reqActionType:
            tester.reqCounter++;
            expect(action.meta.relatedAction).toBeUndefined();
            return tester.reqActionValidator(tester.reqCounter, state, action);
          case SERVICE_RESPONSE_OK:
            tester.okCounter++;
            expect(action.meta.relatedAction).toBeDefined();          
            if (this.matchRelatedAction) {
              expect(action.meta.relatedAction!.type).toEqual(tester.reqActionType);
            }
            return tester.okActionValidator(tester.okCounter, state, action);
          case ERROR:
            tester.errorCounter++;
            expect(action.meta.errorPayload).toBeDefined();
            expect(action.meta.relatedAction).toBeDefined();            
            if (this.matchRelatedAction) {
              expect(action.meta.relatedAction!.type).toEqual(tester.reqActionType);
            }
            return tester.errorActionValidator(tester.errorCounter, state, action);
        }
      } catch (err) {
        tester.logger.error('Test reducer failed with', err);
        throw err;
      }
      return state;  
    }
  }
}
type ActionValidator = <A extends Action>(
  counter: number, 
  state: AuthUserState, 
  action: Action
) => AuthUserState;

export const mockProviderCallWithUser = (user: User): Promise<boolean | void> => {
  if (user.username.length > 0) {
    expectTestUserToBeSet(user);
    return Promise.resolve(true);
  } else {
    return Promise.reject(new Error('zero length username'));
  }
}

export const createMockProvider = (): Provider => {
  return <Provider> {
    signUp: (user: User): Promise<boolean> => Promise.reject('unexpected invocation'),
    resendSignUpCode: (user: User): Promise<string> => Promise.reject('unexpected invocation'),
    confirmSignUpCode: (user: User, code: string): Promise<boolean> => Promise.reject('unexpected invocation'),
    configureMFA: (user: User): Promise<void> => Promise.reject('unexpected invocation'),
    resetPassword: (user: User): Promise<void> => Promise.reject('unexpected invocation'),
    updatePassword: (user: User, code: string): Promise<void> => Promise.reject('unexpected invocation'),
    validateSession: (): Promise<boolean> => Promise.reject('unexpected invocation'),
    isLoggedIn: (): Promise<boolean> => Promise.reject('unexpected invocation'),
    signIn: (username: string, password: string): Promise<number> => Promise.reject('unexpected invocation'),
    validateMFACode: (code: string): Promise<boolean> => Promise.reject('unexpected invocation'),
    signOut: (): Promise<void> => Promise.reject('unexpected invocation'),
    sendVerificationCodeForAttribute: (attribute: string): Promise<void> => Promise.reject('unexpected invocation'),
    confirmVerificationCodeForAttribute: (attribute: string, code: string): Promise<void> => Promise.reject('unexpected invocation'),
    readUser: (attribNames?: string[]): Promise<User> => Promise.reject('unexpected invocation'),
    saveUser: (user: User, attribNames?: string[]): Promise<void> => Promise.reject('unexpected invocation'),
  };
}

export const getTestUser = (): User => {

  let user = new User();
  user.username = 'johndoe';
  user.emailAddress = 'johndoe@gmail.com';
  user.mobilePhone = '9999999999';
  user.enableBiometric = true;
  user.enableTOTP = true;
  user.enableMFA = true;  
  return user;
}

export const expectTestUserToBeSet = (user: User | undefined, userConfirmed: boolean = false) => {

  expect(user).toBeDefined();
  expect(user!.username).toEqual('johndoe');
  expect(user!.emailAddress).toEqual('johndoe@gmail.com');
  expect(user!.mobilePhone).toEqual('9999999999');
  expect(user!.isConfirmed()).toEqual(userConfirmed);
  expect(user!.enableBiometric).toEqual(true);
  expect(user!.enableTOTP).toEqual(true);
  expect(user!.enableMFA).toEqual(true);
}
