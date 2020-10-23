import * as redux from 'redux';
import { Epic } from 'redux-observable';

import {
  NOOP,
  ERROR,
  ErrorPayload,
  Action,
  ActionResult,
  setActionStatus,
  LocalStorage,
  Logger
} from '@appbricks/utils';

import User, { UserStatus, VerificationType } from '../model/user';

import { AUTH_NO_MFA, ATTRIB_EMAIL_ADDRESS, ATTRIB_MOBILE_PHONE } from './constants';
import Provider from './provider';

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
  RESET_PASSWORD_REQ,
  UPDATE_PASSWORD_REQ,
  LOAD_AUTH_STATE_REQ,
  SIGN_IN_REQ,
  VALIDATE_MFA_CODE_REQ,
  SIGN_OUT_REQ,
  VERIFY_ATTRIBUTE_REQ,
  CONFIRM_ATTRIBUTE_REQ,
  CONFIGURE_MFA_REQ,
  SAVE_USER_REQ,
  READ_USER_REQ,
  AuthLoggedInPayload
} from './action';

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
      .add(RESET_PASSWORD_REQ)
      .add(UPDATE_PASSWORD_REQ)
      .add(LOAD_AUTH_STATE_REQ)
      .add(SIGN_IN_REQ)
      .add(VALIDATE_MFA_CODE_REQ)
      .add(SIGN_OUT_REQ)
      .add(VERIFY_ATTRIBUTE_REQ)
      .add(CONFIRM_ATTRIBUTE_REQ)
      .add(CONFIGURE_MFA_REQ)      
      .add(SAVE_USER_REQ)
      .add(READ_USER_REQ);
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

  async finalize() {
    await this.localStore!.flush();
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
            this.logger.trace('Loading saved session from local store:', sessionData);
            state.session.fromJSON(sessionData);
          }
          // retrieve saved user if available
          let userData = this.store().getItem('user');
          if (userData) {
            this.logger.trace('Loading saved user from local store:', userData);
            state.user = new User();
            state.user.fromJSON(userData);

            let userConfirmationData = this.store().getItem('userConfirmation');
            if (userConfirmationData) {
              if (state.user.status != UserStatus.Unconfirmed) {
                this.logger.trace(
                  'Found user confirmation data, but saved user did not have an unconfirmed status:', 
                  userConfirmationData, state.user);

                state.user = undefined;

              } else {
                this.logger.trace('Loading saved user confirmation data from local store:', userConfirmationData);
                state.awaitingUserConfirmation = userConfirmationData;
              }
            }
          }
        }
        if ( !state.user || !state.user.isValid() ||
          (state.session.timestamp > 0 && state.session.isTimedout(state.user)) ) {
          
          this.logger.trace('Invalid saved user session. User session will be reset:', state.session, state.user);
          state = initialAuthState();
        }
        break;
      }

      case SIGN_UP_REQ: {
        // save unregistered user data to store
        let user = (<AuthUserPayload>action.payload!).user;
        user.status = UserStatus.Unregistered;

        state = {
          ...state,
          user
        };
        break;
      }

      case SERVICE_RESPONSE_OK:
        return this.reduceServiceResponse(state, action);

      case ERROR:
        if (action.meta.relatedAction && 
          this.serviceRequests.has(action.meta.relatedAction.type)) {

          this.logger.error(
            'Handling service request error for action: ', 
            action.meta.relatedAction.type);

          return setActionStatus<AuthUserState>(
            state,
            action,
            ActionResult.error
          );
        }
    }

    if (this.serviceRequests.has(action.type)) {

      return setActionStatus<AuthUserState>(
        state,
        action,
        ActionResult.pending
      );
    }
    return state;
  }

  private reduceServiceResponse(
    state: AuthUserState = <AuthUserState>{},
    action: Action<AuthPayloadType | ErrorPayload>
  ): AuthUserState {

    let relatedAction = action.meta.relatedAction!;
    if (this.serviceRequests.has(relatedAction.type)) {
      this.logger.trace('Handling successful service response: ', relatedAction.type);

      switch (relatedAction.type) {
        case LOAD_AUTH_STATE_REQ: {
          let payload = <AuthStatePayload>relatedAction.payload!;
          state.session.timestamp = payload.isLoggedIn! ? Date.now() : -1;

          state = {
            ...state,            
            isLoggedIn: payload.isLoggedIn!
          };
          break;
        }

        case SIGN_UP_REQ: {
          let awaitingUserConfirmation = (<AuthVerificationPayload>action.payload).info;
          if (!awaitingUserConfirmation.isConfirmed) {
            // save sign-up confirmation code request response to local store
            this.store().setItem('userConfirmation', awaitingUserConfirmation);
          }

          state = {
            ...state,
            user: (<AuthUserPayload>relatedAction.payload!).user,
            awaitingUserConfirmation
          };
          break;
        }

        case RESEND_SIGN_UP_CODE_REQ: {
          let awaitingUserConfirmation = (<AuthVerificationPayload>action.payload).info;
          // save confirmation code request response to local store
          this.store().setItem('userConfirmation', awaitingUserConfirmation);

          state = {
            ...state,
            awaitingUserConfirmation
          };
          break;
        }

        case CONFIRM_SIGN_UP_CODE_REQ: {
          if (state.user!.isConfirmed()) {
            let awaitingUserConfirmation = state.awaitingUserConfirmation!;
            if (awaitingUserConfirmation.type == VerificationType.Email) {
              state.user!.emailAddressVerified = true;
            } else if (awaitingUserConfirmation.type == VerificationType.SMS) {
              state.user!.mobilePhoneVerified = true;
            }
            // remove saved confirmation response data from store
            this.store().removeItem('userConfirmation');

            state = {
              ...state,
              awaitingUserConfirmation: undefined
            };
          }
          break;
        }

        case RESET_PASSWORD_REQ: {
          break;  
        }

        case UPDATE_PASSWORD_REQ: {
          break;  
        }
        
        case SIGN_IN_REQ: {
          let payload = <AuthLoggedInPayload>action.payload!;
          if (payload.isLoggedIn) {
            state.session.timestamp = Date.now();
          } else {
            state.session.timestamp = -1;
          }

          state = {
            ...state,
            isLoggedIn: payload.isLoggedIn,
            awaitingMFAConfirmation: payload.isLoggedIn ? AUTH_NO_MFA : payload.mfaType
          };
          break;  
        }

        case VALIDATE_MFA_CODE_REQ: {
          let payload = <AuthLoggedInPayload>action.payload!;
          state.session.timestamp = Date.now();

          state = {
            ...state,
            isLoggedIn: payload.isLoggedIn,
            awaitingMFAConfirmation: undefined
          };
          break;
        }

        case SIGN_OUT_REQ: {

          state.session.timestamp = -1;
          state = {
            ...state,
            isLoggedIn: false,
            user: undefined,
            awaitingUserConfirmation: undefined,
            awaitingMFAConfirmation: undefined
          };
          break;  
        }

        case CONFIRM_ATTRIBUTE_REQ: {
          let payload = <AuthLoggedInUserAttrPayload>relatedAction.payload!;
          let user = state.user!;
          switch (payload.attrName!) {
            case ATTRIB_EMAIL_ADDRESS:
              user.emailAddressVerified = true;
              break;
            case ATTRIB_MOBILE_PHONE:
              user.mobilePhoneVerified = true;
              break;
          }

          state = {
            ...state,
            user
          }; 
          break;  
        }

        case CONFIGURE_MFA_REQ:
        case SAVE_USER_REQ: {
          let payload = <AuthUserPayload>relatedAction.payload!;

          state = {
            ...state,
            user: payload.user!
          };          
          break; 
        }

        case READ_USER_REQ: {
          let payload = <AuthUserPayload>action.payload!;

          state = {
            ...state,
            user: payload.user!
          };          
          break;
        }
      }
    }

    // save auth session and user
    this.store().setItem('session', state.session.toJSON());
    if (state.user) {
      this.store().setItem('user', state.user!.toJSON());
    }

    state = {
      ...state,
      session: state.session
    };
    return setActionStatus<AuthUserState>(
      state,
      action,
      ActionResult.success
    );
  }
}
