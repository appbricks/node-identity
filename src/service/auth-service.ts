import * as redux from 'redux';
import { Epic } from 'redux-observable';

import {
  ERROR,
  ErrorPayload,
  Action,
  LocalStorage,
  Logger,
  ActionResult
} from '@appbricks/utils';

import Session from '../model/session';
import User, { UserStatus } from '../model/user';
import {
  AuthUserState,
  AuthUserStateProp,
  initialAuthState
} from './state';
import {
  AuthStatePayload,
  AuthUserPayload,
  AuthUsernamePayload,
  AuthVerificationPayload,
  AuthSignInPayload,
  AuthMultiFactorAuthPayload,
  AuthLoggedInUserAttrPayload,
  AuthActionProps,
  SERVICE_RESPONSE_OK,
  SIGN_UP_REQ,
  RESEND_SIGN_UP_CODE_REQ,
  CONFIRM_SIGN_UP_CODE_REQ,
  CONFIGURE_MFA_REQ,
  RESET_PASSWORD_REQ,
  UPDATE_PASSWORD_REQ,
  LOAD_AUTH_STATE_REQ,
  SIGN_IN_REQ,
  VALIDATE_MFA_CODE_REQ,
  SIGN_OUT_REQ,
  VERIFY_ATTRIBUTE_REQ,
  CONFIRM_ATTRIBUTE_REQ,
  READ_USER_REQ,
  SAVE_USER_REQ
} from './action';

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

type AuthPayloadType = 
  AuthStatePayload |
  AuthUserPayload |
  AuthUsernamePayload |
  AuthVerificationPayload |
  AuthSignInPayload |
  AuthMultiFactorAuthPayload |
  AuthLoggedInUserAttrPayload;

export default class AuthService {

  logger: Logger;

  csProvider: Provider;
  localStore?: LocalStorage;

  serviceRequests: Set<string>;

  constructor(provider: Provider) {
    this.logger = new Logger('AuthService');

    this.csProvider = provider;

    this.serviceRequests = new Set();
    this.serviceRequests
      .add(SIGN_UP_REQ)
      .add(RESEND_SIGN_UP_CODE_REQ)
      .add(CONFIRM_SIGN_UP_CODE_REQ)
      .add(CONFIGURE_MFA_REQ)
      .add(RESET_PASSWORD_REQ)
      .add(UPDATE_PASSWORD_REQ)
      .add(LOAD_AUTH_STATE_REQ)
      .add(SIGN_IN_REQ)
      .add(VALIDATE_MFA_CODE_REQ)
      .add(SIGN_OUT_REQ)
      .add(VERIFY_ATTRIBUTE_REQ)
      .add(CONFIRM_ATTRIBUTE_REQ)
      .add(READ_USER_REQ)
      .add(SAVE_USER_REQ);
  }

  static dispatchProps<C extends AuthUserStateProp>(
    dispatch: redux.Dispatch<redux.Action>, ownProps?: C): AuthActionProps {

    return {
      // authentication initialization
      loadAuthState: () =>
        loadAuthStateAction(dispatch),

      // registration and configuration
      signUp: (user: User) =>
        signUpAction(dispatch, user),

      resendSignUpCode: (username?: string) => 
        resendSignUpCodeAction(dispatch, username ? username : ownProps!.auth.user!.username),
      confirmSignUpCode: (code: string, username?: string) =>
        confirmSignUpCodeAction(dispatch, username ? username : ownProps!.auth.user!.username, code),

      resetPassword: (username?: string) =>
        resetPasswordAction(dispatch, username ? username : ownProps!.auth.user!.username),
      updatePassword: (password: string, code: string, username?: string) =>
        updatePasswordAction(dispatch, username ? username : ownProps!.auth.user!.username, password, code),

      // user authentication
      signIn: (username: string, password: string) =>
        signInAction(dispatch, username, password),
      validateMFACode: (code: string) =>
        validateMFACodeAction(dispatch, code),
      signOut: () =>
        signOutAction(dispatch),

      // actions on authenticated user
      verifyAttribute: (attrName: string) =>
        verifyAttributeAction(dispatch, attrName),
      confirmAttribute: (attrName: string, code: string) =>
        confirmAttributeAction(dispatch, attrName, code),

      configureMFA: (user: User) =>
        configureMFAAction(dispatch, user),

      saveUser: (user: User) => saveUserAction(dispatch, user),
      readUser: () => readUserAction(dispatch)
    };
  }

  static stateProps<S extends AuthUserStateProp>(state: S): AuthUserStateProp {
    return {
      auth: state.auth
    };
  }

  async init() {
    this.localStore = new LocalStorage('auth');
    await this.localStore.init();
  }

  private store(): LocalStorage {
    if (!this.localStore) {
      throw Error('The AuthService store is undefined. It is possible AuthService.init() was not called.');
    }
    return this.localStore!;
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

  reducer(): redux.Reducer<AuthUserState, Action<AuthPayloadType | ErrorPayload>> {
    return this.reduce.bind(this);
  }

  private reduce(
    state: AuthUserState = initialAuthState(),
    action: Action<AuthPayloadType | ErrorPayload>
  ): AuthUserState {

    switch (action.type) {
      case LOAD_AUTH_STATE_REQ: {
        if (state.session.timestamp == -1) {
          // retrieve saved session if available
          let sessionData = this.store().getItem('session');
          if (sessionData) {
            this.logger.trace('Loading saved session from local store: ', sessionData);
            state.session.fromJSON(sessionData);
          }
          // retrieve saved user if available
          let userData = this.store().getItem('user');
          if (userData) {
            this.logger.trace('Loading saved user from local store: ', userData);
            state.user = new User();
            state.user.fromJSON(userData);
          }
        }
        if ( !state.user ||  !state.user.isValid() ||
          (state.session.timestamp > 0 && state.session.isTimedout(state.user)) ) {
          
          this.logger.trace('Invalid saved user session. User session will be reset: ', state.session, state.user);
          state = initialAuthState();
        }
        break;
      }

      case SIGN_UP_REQ: {
        // save unregistered user data to store
        let user = (<AuthUserPayload>action.payload!).user;
        user.status = UserStatus.Unregistered;
        state.user = user;
        break;
      }

      case SERVICE_RESPONSE_OK:
        return this.reduceServiceResponse(state, action);

      case ERROR:
        break;
    }

    if (this.serviceRequests.has(action.type)) {

      state.actionStatus.result = ActionResult.pending;
      return {
        ...state,
        session: state.session
      };
    }
    return state;
  }

  private reduceServiceResponse(
    state: AuthUserState = <AuthUserState>{},
    action: Action<AuthPayloadType | ErrorPayload>
  ): AuthUserState {

    let relatedAction = action.meta.relatedAction!;
    if (this.serviceRequests.has(relatedAction.type)) {
      this.logger.trace('Handling successfull service response: ', relatedAction.type);
      state.actionStatus.result = ActionResult.success;

      switch (relatedAction.type) {
        case LOAD_AUTH_STATE_REQ: {
          let payload = <AuthStatePayload>relatedAction.payload!;
          state.isLoggedIn =  payload.isLoggedIn!;
          state.session.timestamp = payload.isLoggedIn! ? Date.now() : -1;

          state = {
            ...state,
            session: state.session
          };
          break;
        }

        case SIGN_UP_REQ: {
          let payload = <AuthUserPayload>relatedAction.payload!;
          state.awaitingUserConfirmation = (<AuthVerificationPayload>action.payload).info;

          state = {
            ...state,
            session: state.session,
            user: payload.user
          };

          // save user and session to local store
          this.store().setItem('session', state.session.toJSON());
          this.store().setItem('user', state.user!.toJSON());
          break;
        }

        case RESEND_SIGN_UP_CODE_REQ: {
          state.awaitingUserConfirmation = (<AuthVerificationPayload>action.payload).info;

          state = {
            ...state,
            session: state.session,
          };

          // save user and session to local store
          this.store().setItem('session', state.session.toJSON());
          break;
        }

        case CONFIRM_SIGN_UP_CODE_REQ: {

        }
      }
    }

    return {
      ...state,
      session: state.session
    };
  }
}
