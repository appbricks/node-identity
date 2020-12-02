import * as redux from 'redux';
import { Epic } from 'redux-observable';

import {
  NOOP,
  ERROR,
  RESET_STATUS,
  ErrorPayload,
  ResetStatusPayload,
  Action,
  ActionResult,
  setActionStatus,
  resetActionStatus,
  LocalStorage,
  Logger
} from '@appbricks/utils';

import Session from '../model/session';
import User, { UserStatus, VerificationType } from '../model/user';

import { AUTH_NO_MFA, ATTRIB_EMAIL_ADDRESS, ATTRIB_MOBILE_PHONE } from './constants';
import Provider from './provider';

import {
  AuthState,
  AuthStateProps,
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

type AuthPayload = 
  AuthStatePayload |
  AuthUserPayload |
  AuthUsernamePayload |
  AuthVerificationPayload |
  AuthSignInPayload |
  AuthMultiFactorAuthPayload |
  AuthLoggedInUserAttrPayload | 
  ErrorPayload | 
  ResetStatusPayload;

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

  static dispatchProps<C extends AuthStateProps>(
    dispatch: redux.Dispatch<redux.Action>, ownProps?: C): AuthActionProps {

    return {
      authService: {
        // authentication initialization
        loadAuthState: () =>
          loadAuthStateAction(dispatch),

        // registration and configuration
        signUp: (user: User) =>
          signUpAction(dispatch, user),

        resendSignUpCode: (username?: string) => 
          resendSignUpCodeAction(dispatch, username ? username : ownProps!.auth!.user!.username),
        confirmSignUpCode: (code: string, username?: string) =>
          confirmSignUpCodeAction(dispatch, username ? username : ownProps!.auth!.user!.username, code),

        resetPassword: (username?: string) =>
          resetPasswordAction(dispatch, username ? username : ownProps!.auth!.user!.username),
        updatePassword: (password: string, code: string, username?: string) =>
          updatePasswordAction(dispatch, username ? username : ownProps!.auth!.user!.username, password, code),

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
      }
    };
  }

  static stateProps<S extends AuthStateProps, C extends AuthStateProps>(
    state: S, ownProps?: C): AuthStateProps {

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

  reducer(): redux.Reducer<AuthState, Action<AuthPayload>> {
    return this.reduce.bind(this);
  }

  private reduce(
    state: AuthState = initialAuthState(),
    action: Action<AuthPayload>
  ): AuthState {

    if (state.isLoggedIn) {
      // ensure activity timestamp is refreshed for 
      // all actions regardless of target reducer 
      // when logged in
      const session = Object.assign(new Session(), state.session);
      session.updateActivityTimestamp();
      state = {
        ...state,
        session
      };
    }

    switch (action.type) {
      case LOAD_AUTH_STATE_REQ: {
        if (state.session.isValid()) 
          // NOOP if auth session valid
          return state;

        else {
          // rehydrate a new session
          state = initialAuthState();

          // retrieve saved session if available
          let sessionData = this.store().getItem('session');
          if (sessionData) {
            this.logger.trace('Loading saved session from local store:', sessionData);
            state.session.fromJSON(sessionData);

            // retrieve saved user if available
            let userData = this.store().getItem('user');
            if (userData) {
              this.logger.trace('Loading saved user from local store:', userData);
              const user = new User();
              user.fromJSON(userData);

              if (user.isValid()) {
                let userConfirmationData = this.store().getItem('userConfirmation');
                if (userConfirmationData) {
                  if (user.status != UserStatus.Unconfirmed) {
                    this.logger.trace(
                      'Found user confirmation data, but saved user did not have an unconfirmed status:', 
                      userConfirmationData, user);
    
                  } else {
                    this.logger.trace(
                      'Setting last known user and confirmation data from local store to state:', 
                      userConfirmationData, user);
    
                    state.user = user;
                    state.awaitingUserConfirmation = userConfirmationData;
                  }
                } else if (!state.session.isTimedout(user)) {
                  this.logger.trace(
                    'Setting last logged in user to state:', 
                    user);

                  state.user = user;
                } else {
                  this.logger.trace(
                    'Saved user has timedout:', 
                    user);
                }
              }
            }            
          }          
        }
        break;
      }

      case SIGN_UP_REQ: {
        let user = Object.assign(new User(), (<AuthUserPayload>action.payload!).user);
        user.status = UserStatus.Unregistered;

        state = {
          ...state,
          user
        };
        break;
      }

      case RESEND_SIGN_UP_CODE_REQ: {
        state = {
          ...state,
          awaitingUserConfirmation: undefined
        };
        break;
      }

      case SIGN_IN_REQ: {
        const user = new User();
        user.username = (<AuthSignInPayload>action.payload!).username;
        
        state = {
          ...state,
          isLoggedIn: false,
          user: user,
          awaitingMFAConfirmation: undefined
        };
        break;
      }

      case SERVICE_RESPONSE_OK:
        return this.reduceServiceResponse(state, action);

      case ERROR:
        const relatedAction = action.meta.relatedAction;
        if (relatedAction && 
          this.serviceRequests.has(relatedAction.type)) {

          this.logger.error(
            'Handling service request error for action: ', 
            relatedAction.type);

          return setActionStatus<AuthState>(
            state,
            relatedAction,
            ActionResult.error,
            {
              error: action.payload
            }
          );
        }
        break;
      
      case RESET_STATUS:
        const actionStatusMetaType = (<ResetStatusPayload>action.payload)
          .actionStatus.actionType
        
        if (this.serviceRequests.has(actionStatusMetaType)) {
          return resetActionStatus(state);
        }
    }

    if (this.serviceRequests.has(action.type)) {

      return setActionStatus<AuthState>(
        state,
        action,
        ActionResult.pending
      );
    }
    return state;
  }

  private reduceServiceResponse(
    state: AuthState = <AuthState>{},
    action: Action<AuthPayload>
  ): AuthState {

    let relatedAction = action.meta.relatedAction!;
    if (this.serviceRequests.has(relatedAction.type)) {
      this.logger.trace('Handling successful service response: ', relatedAction.type);

      switch (relatedAction.type) {
        case LOAD_AUTH_STATE_REQ: {
          const session = Object.assign(new Session(), state.session);
          session.reset();

          let payload = <AuthStatePayload>action.payload!;
          if (payload.isLoggedIn) {

            if (state.user && 
              state.user.status == UserStatus.Confirmed &&
              state.user.username == payload.username) {
              
              session.updateActivityTimestamp();

              state = {
                ...state,
                session,
                isLoggedIn: true
              };

              this.logger.trace(
                'Logged in user session rehydrated:', 
                state.session, state.user);

            } else {
              // session is logged in but user 
              // in state is not confirmed or does 
              // not match logged in username
              this.logger.trace(
                'Invalid login state detected. User session will be reset:', 
                payload, state.user);

                state = {
                  ...state,
                  session,
                  isLoggedIn: false,
                  user: undefined
                };
            }

          } else {
            // reset session activity 
            session.reset();

            state = {
              ...state,
              session,
              isLoggedIn: false
            }
          }
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
            user: Object.assign(new User(), (<AuthUserPayload>relatedAction.payload!).user),
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
          if (state.user) {
            const user = Object.assign(new User(), state.user);
            
            if ((<AuthVerificationPayload>action.payload).info.isConfirmed) {              
              user.setConfirmed(true);
  
              let awaitingUserConfirmation = state.awaitingUserConfirmation!;
              if (awaitingUserConfirmation.type == VerificationType.Email) {
                user.emailAddressVerified = true;
              } else if (awaitingUserConfirmation.type == VerificationType.SMS) {
                user.mobilePhoneVerified = true;
              }
              // remove saved confirmation response data from store
              this.store().removeItem('userConfirmation');
  
              state = {
                ...state,
                user,
                awaitingUserConfirmation: undefined
              };

            } else {
              user.setConfirmed(false);
              state = {
                ...state,
                user
              };
            }
          } else {
            this.logger.error(
              'Received successful user confirmed service response, but user instance was not found in state.'
            );
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
          const session = Object.assign(new Session(), state.session);

          let payload = <AuthLoggedInPayload>action.payload!;
          if (payload.isLoggedIn) {
            session.updateActivityTimestamp();
          } else {
            session.reset();
          }

          state = {
            ...state,
            session,
            isLoggedIn: payload.isLoggedIn,
            awaitingMFAConfirmation: payload.isLoggedIn ? AUTH_NO_MFA : payload.mfaType
          };
          break;  
        }

        case VALIDATE_MFA_CODE_REQ: {
          const session = Object.assign(new Session(), state.session);
          session.updateActivityTimestamp();

          let payload = <AuthLoggedInPayload>action.payload!;

          state = {
            ...state,
            session,
            isLoggedIn: payload.isLoggedIn,
            awaitingMFAConfirmation: undefined
          };
          break;
        }

        case SIGN_OUT_REQ: {

          const session = Object.assign(new Session(), state.session);
          session.reset();
          
          state = {
            ...state,
            session,
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
    } else {
      this.store().removeItem('user');
    }

    state = {
      ...state,
      session: state.session
    };
    return setActionStatus<AuthState>(
      state,
      action.meta.relatedAction!,
      ActionResult.success
    );
  }
}
