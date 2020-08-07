import Provider from '../provider';
import User, { VerificationInfo, VerificationType } from '../../model/user';
import { AUTH_NO_MFA } from '../constants';

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

  setConfirmed = false;
  loginMethod = AUTH_NO_MFA;

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
    if (password == '@ppBricks2020') {
      this.loggedIn = (this.loginMethod == AUTH_NO_MFA);
      return Promise.resolve(this.loginMethod);
    }
    this.loggedIn = false;
    return Promise.reject(new Error('invalid password'));
  }

  validateMFACode(code: string): Promise<boolean> {
    this.validateMFACodeCounter++;
    if (code == '12345') {
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
    expect(attribute).toEqual('testAttr');
    return Promise.resolve();
  }

  confirmVerificationCodeForAttribute(attribute: string, code: string): Promise<void> {
    this.confirmVerificationCodeForAttributeCounter++;
    expect(attribute).toEqual('testAttr');
    if (code == '12345') {
      return Promise.resolve();
    }
    return Promise.reject(new Error('invalid code'));
  }

  configureMFA(user: User): Promise<void> {
    this.configureMFACounter++;
    if (user.username == 'error') {
      return Promise.reject(new Error('invalid username'));
    }
    expectTestUserToBeSet(user);
    return Promise.resolve();
  }

  saveUser(user: User, attribNames?: string[]): Promise<void> {
    this.saveUserCounter++;
    expectTestUserToBeSet(user);
    return Promise.resolve();
  }

  readUser(attribNames?: string[]): Promise<User> {
    this.readUserCounter++;
    const user = getTestUser();
    user.emailAddressVerified = true;
    return Promise.resolve(user);
  }
}