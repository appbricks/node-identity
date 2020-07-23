import ProviderInterface from '../provider'
import User from '../../model/user'

export default class Provider implements ProviderInterface {

  signUp(user: User): Promise<boolean> {
    return Promise.reject('unexpected invocation');
  }

  resendSignUpCode(user: User): Promise<string> {
    return Promise.reject('unexpected invocation');
  }

  confirmSignUpCode(user: User, code: string): Promise<boolean> {
    return Promise.reject('unexpected invocation');
  }

  configureMFA(user: User): Promise<void> {
    return Promise.reject('unexpected invocation');
  }

  resetPassword(user: User): Promise<void> {
    return Promise.reject('unexpected invocation');
  }

  updatePassword(user: User, code: string): Promise<void> {
    return Promise.reject('unexpected invocation');
  }
  
  validateSession(): Promise<boolean> {
    return Promise.reject('unexpected invocation');
  }

  isLoggedIn(): Promise<boolean> {
    return Promise.reject('unexpected invocation');
  }

  signIn(user: User): Promise<number> {
    return Promise.reject('unexpected invocation');
  }

  validateMFACode(code: string): Promise<boolean> {
    return Promise.reject('unexpected invocation');
  }

  signOut(): Promise<void> {
    return Promise.reject('unexpected invocation');
  }

  sendVerificationCodeForAttribute(attribute: string): Promise<void> {
    return Promise.reject('unexpected invocation');
  }

  confirmVerificationCodeForAttribute(attribute: string, code: string): Promise<void> {
    return Promise.reject('unexpected invocation');
  }

  readUser(attribNames?: string[]): Promise<User> {
    return Promise.reject('unexpected invocation');
  }

  saveUser(user: User, attribNames?: string[]): Promise<void> {
    return Promise.reject('unexpected invocation');
  }
}