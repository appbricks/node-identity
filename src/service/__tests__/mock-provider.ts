import Provider from '../provider';
import User from '../../model/user';

export const createMockProvider = (): Provider => {
  return <Provider> {
    signUp: (user: User): Promise<boolean> => Promise.reject('unexpected invocation'),
    resendSignUpCode: (username: string): Promise<string> => Promise.reject('unexpected invocation'),
    confirmSignUpCode: (username: string, code: string): Promise<boolean> => Promise.reject('unexpected invocation'),
    resetPassword: (username: string): Promise<void> => Promise.reject('unexpected invocation'),
    updatePassword: (username: string, password: string, code: string): Promise<void> => Promise.reject('unexpected invocation'),
    validateSession: (): Promise<boolean> => Promise.reject('unexpected invocation'),
    isLoggedIn: (): Promise<boolean> => Promise.reject('unexpected invocation'),
    signIn: (username: string, password: string): Promise<number> => Promise.reject('unexpected invocation'),
    validateMFACode: (code: string): Promise<boolean> => Promise.reject('unexpected invocation'),
    signOut: (): Promise<void> => Promise.reject('unexpected invocation'),
    sendVerificationCodeForAttribute: (attribute: string): Promise<void> => Promise.reject('unexpected invocation'),
    confirmVerificationCodeForAttribute: (attribute: string, code: string): Promise<void> => Promise.reject('unexpected invocation'),
    configureMFA: (user: User): Promise<void> => Promise.reject('unexpected invocation'),
    saveUser: (user: User, attribNames?: string[]): Promise<void> => Promise.reject('unexpected invocation'),
    readUser: (attribNames?: string[]): Promise<User> => Promise.reject('unexpected invocation'),
  };
}
