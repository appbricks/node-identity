import Provider from '../provider';
import User, { VerificationInfo, VerificationType } from '../../model/user';

import { AUTH_NO_MFA, AUTH_MFA_SMS, ATTRIB_MOBILE_PHONE } from '../constants';

import { getTestUser, expectTestUserToBeSet } from './request-tester-user';

export class MockProvider implements Provider {

  loggedIn = false;

  signUpCounter = 0;
  resendSignUpCodeCounter = 0;
  confirmSignUpCodeCounter = 0;
  resetPasswordCounter = 0;
  updatePasswordCounter = 0;
  validateSessionCounter = 0;
  isLoggedInCounter = 0;
  signInCounter = 0;
  validateMFACodeCounter = 0;
  signOutCounter = 0;
  sendVerificationCodeForAttributeCounter = 0;
  confirmVerificationCodeForAttributeCounter = 0;
  configureMFACounter = 0;
  saveUserCounter = 0;
  readUserCounter = 0;

  password = '@ppBricks2020';

  setConfirmed = false;
  loginMethod = AUTH_NO_MFA;

  user: User;

  constructor(userConfirmed = false) {
    this.user = getTestUser();
    this.user.setConfirmed(userConfirmed);
  }

  signUp(user: User): Promise<VerificationInfo> {
    this.signUpCounter++;
    if (user.username == 'error') {
      return Promise.reject(new Error('invalid username'));
    }
    expectTestUserToBeSet(user);
    
    if (this.setConfirmed) {
      return Promise.resolve(<VerificationInfo>{
        type: VerificationType.None,
        isConfirmed: true
      });
    } else {
      return Promise.resolve(<VerificationInfo>{
        timestamp: Date.now(),
        type: VerificationType.Email,
        destination: 'johndoe@gmail.com',
        attrName: 'email',
        isConfirmed: false
      });
    }
  }

  resendSignUpCode(username: string): Promise<VerificationInfo> {
    this.resendSignUpCodeCounter++;
    expect(username).toEqual('johndoe');
    return Promise.resolve(<VerificationInfo>{
      timestamp: Date.now(),
      type: VerificationType.Email,
      destination: 'johndoe@gmail.com',
      attrName: 'email',
      isConfirmed: false
    });
  }

  confirmSignUpCode(username: string, code: string): Promise<boolean> {
    this.confirmSignUpCodeCounter++;
    expect(username).toEqual('johndoe');
    if (code == '12345') {
      this.user.setConfirmed(true);
      this.user.emailAddressVerified = true;
      return Promise.resolve(true);
    } else {
      return Promise.reject(new Error('invalid code'));
    }
  }

  resetPassword(username: string): Promise<void> {
    expect(username).toEqual('johndoe');
    this.resetPasswordCounter++;
    return Promise.resolve();
  }

  updatePassword(username: string, password: string, code: string): Promise<void> {
    this.updatePasswordCounter++;
    expect(username).toEqual('johndoe');
    expect(password).toEqual('password');
    if (code == '12345') {
      this.password = password;
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('invalid code'));
    }
  }

  validateSession(): Promise<boolean> {
    return Promise.reject('unexpected invocation');
  }

  isLoggedIn(): Promise<boolean> {
    this.isLoggedInCounter++;
    return Promise.resolve(this.loggedIn);
  }

  signIn(username: string, password: string): Promise<number> {
    this.signInCounter++;
    expect(username).toEqual('johndoe');
    if (password == this.password) {
      this.loggedIn = (this.loginMethod == AUTH_NO_MFA);
      return Promise.resolve(this.loginMethod);
    }
    this.loggedIn = false;
    return Promise.reject(new Error('invalid password'));
  }

  validateMFACode(code: string): Promise<boolean> {
    this.validateMFACodeCounter++;
    if (code == '12345') {
      this.loggedIn = true;
      return Promise.resolve(true);
    }
    return Promise.reject(new Error('invalid code'));
  }

  signOut(): Promise<void> {
    this.signOutCounter++;
    this.loggedIn = false;
    return Promise.resolve();    
  }

  sendVerificationCodeForAttribute(attribute: string): Promise<void> {
    this.sendVerificationCodeForAttributeCounter++;
    expect(attribute).toEqual(ATTRIB_MOBILE_PHONE);
    return Promise.resolve();
  }

  confirmVerificationCodeForAttribute(attribute: string, code: string): Promise<void> {
    this.confirmVerificationCodeForAttributeCounter++;
    expect(attribute).toEqual(ATTRIB_MOBILE_PHONE);
    if (code == '12345') {
      this.user.mobilePhoneVerified = true;
      return Promise.resolve();
    }
    return Promise.reject(new Error('invalid code'));
  }

  configureMFA(user: User): Promise<void> {
    this.configureMFACounter++;
    if (user.username == 'error') {
      return Promise.reject(new Error('invalid username'));
    }
    expectTestUserToBeSet(user, true, true);
    if (user.enableMFA) {
      this.loginMethod = AUTH_MFA_SMS;
    }
    return Promise.resolve();
  }

  saveUser(user: User, attribNames?: string[]): Promise<void> {
    this.saveUserCounter++;
    expect(user).toBeDefined();
    expect(user!.username).toEqual('johndoe');
    expect(user!.firstName).toEqual('John');
    expect(user!.familyName).toEqual('Doe');
    expect(user!.emailAddress).toEqual('johndoe@gmail.com');
    expect(user!.mobilePhone).toEqual('9999999999');
    this.user = user;
    return Promise.resolve();
  }

  readUser(attribNames?: string[]): Promise<User> {
    this.readUserCounter++;
    return Promise.resolve(this.user);
  }
}