import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { Logger } from '@appbricks/utils';

import User from '../model/user';
import { AuthUserStateProp } from '../state/state';
import { AuthActionProps} from './action';

import Provider from './provider';

import { signUpAction, signUpEpic } from './actions/sign-up';
import { resendSignUpCodeAction, resendSignUpCodeEpic } from './actions/resend-sign-up-code';
import { confirmSignUpCodeAction, confirmSignUpCodeEpic } from './actions/confirm-sign-up-code';
import { configureMFAAction, configureMFAEpic } from './actions/configure-mfa';
import { resetPasswordAction, resetPasswordEpic } from './actions/reset-password';
import { updatePasswordAction, updatePasswordEpic } from './actions/update-password';
import { loadAuthStateAction, loadAuthStateEpic } from './actions/load-auth-state';
import { signInAction, signInEpic } from './actions/sign-in';
import { validateMFACodeAction, validateMFACodeEpic } from './actions/validate-mfa-code';
import { signOutAction, signOutEpic } from './actions/sign-out';
import { verifyAttributeAction, verifyAttributeEpic } from './actions/verify-attribute';
import { confirmAttributeAction, confirmAttributeEpic } from './actions/confirm-attribute';
import { readUserAction, readUserEpic } from './actions/read-user';
import { saveUserAction, saveUserEpic } from './actions/save-user';

export default class AuthService {

  logger: Logger;

  csProvider: Provider;

  constructor(provider: Provider) {
    this.logger = new Logger('AuthService');

    this.csProvider = provider;
  }

  epics(): Epic[] {
    const csProvider = this.csProvider;

    return [
      signUpEpic(csProvider),
      resendSignUpCodeEpic(csProvider),
      confirmSignUpCodeEpic(csProvider),
      configureMFAEpic(csProvider),
      resetPasswordEpic(csProvider),
      updatePasswordEpic(csProvider),
      loadAuthStateEpic(csProvider),
      signInEpic(csProvider),
      validateMFACodeEpic(csProvider),
      signOutEpic(csProvider),
      verifyAttributeEpic(csProvider),
      confirmAttributeEpic(csProvider),
      readUserEpic(csProvider),
      saveUserEpic(csProvider)      
    ];
  }
  
  static mapDispatchToProps<C extends AuthUserStateProp>(
    dispatch: redux.Dispatch<redux.Action>, ownProps: C): AuthActionProps {

    return {
      // registration and configuration
      signUp: (user: User) => signUpAction(dispatch, user),

      resendSignUpCode: (user: User) => resendSignUpCodeAction(dispatch, user),
      confirmSignUpCode: (user: User, code: string) => confirmSignUpCodeAction(dispatch, user, code),
      configureMFA: (user: User) => configureMFAAction(dispatch, user),
  
      resetPassword: () => resetPasswordAction(dispatch, ownProps.auth.user),
      updatePassword: (code: string) => updatePasswordAction(dispatch, ownProps.auth.user, code),

      // authentication initialization
      loadAuthState: () => loadAuthStateAction(dispatch),
  
      // user authentication
      signIn: (username: string, password: string) => signInAction(dispatch, username, password),
      validateMFACode: (code: string) => validateMFACodeAction(dispatch, code),
      signOut: () => signOutAction(dispatch),
  
      // actions on authenticated user
      verifyAttribute: (attrName: string) => verifyAttributeAction(dispatch, attrName),
      confirmAttribute: (attrName: string, code: string) => confirmAttributeAction(dispatch, attrName, code),
  
      readUser: () => readUserAction(dispatch),
      saveUser: (user: User) => saveUserAction(dispatch, user)
    };    
  }
}
