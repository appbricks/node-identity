import * as redux from 'redux';

import { Action } from '@appbricks/utils';

import User from '../model/user';

export interface AuthUserPayload {
  user: User,
  code?: string
};

export interface AuthStatePayload {
  isLoggedIn?: boolean
};

export interface AuthSignInPayload {
  username: string,
  password: string,
  mfaType?: number,
  isLoggedIn?: boolean
};

export interface AuthMultiFactorAuthPayload {
  mfaCode: string,
  isLoggedIn?: boolean
};

export interface AuthLoggedInUserAttrPayload {
  attrName?: string,
  code?: string
};

// Authentication dispatch function props
export interface AuthActionProps {
  // registration and configuration
  signUp: (user: User) => redux.Action
  resendSignUpCode: (user: User) => redux.Action
  confirmSignUpCode: (user: User, code: string) => redux.Action
  configureMFA: (user: User) => redux.Action

  // actions on current user in state
  resetPassword: () => redux.Action
  updatePassword: (code: string) => redux.Action

  // authentication initialization
  loadAuthState: () => redux.Action

  // user authentication
  signIn: (username: string, password: string) => redux.Action
  validateMFACode: (code: string) => redux.Action
  signOut: () => redux.Action

  // actions on authenticated user
  verifyAttribute: (attrName: string) => redux.Action
  confirmAttribute: (attrName: string, code: string) => redux.Action

  readUser: () => redux.Action
  saveUser: (user: User) => redux.Action
}

// User action types

export const SERVICE_RESPONSE_OK = 'ids_SERVICE_RESPONSE_OK';

// registration and configuration
export const SIGN_UP_REQ = 'ids_SIGN_UP_REQ';
export const RESEND_SIGN_UP_CODE_REQ = 'ids_RESEND_SIGN_UP_CODE_REQ';
export const CONFIRM_SIGN_UP_CODE_REQ= 'ids_CONFIRM_SIGN_UP_CODE_REQ';
export const CONFIGURE_MFA_REQ = 'ids_CONFIGURE_MFA_REQ';

export const RESET_PASSWORD_REQ = 'ids_RESET_PASSWORD_REQ';
export const UPDATE_PASSWORD_REQ = 'ids_UPDATE_PASSWORD_REQ';

// auth context initialization
export const LOAD_AUTH_STATE_REQ = 'ids_LOAD_AUTH_STATE_REQ';

// user authentication
export const SIGN_IN_REQ = 'ids_SIGN_IN_REQ';
export const VALIDATE_MFA_CODE_REQ = 'ids_VALIDATE_MFA_CODE_REQ';
export const SIGN_OUT_REQ = 'ids_SIGN_OUT_REQ';

// actions on authenticated user
export const VERIFY_ATTRIBUTE_REQ = 'ids_VERIFY_ATTRIBUTE_REQ';
export const CONFIRM_ATTRIBUTE_REQ = 'ids_CONFIRM_ATTRIBUTE_REQ';

export const READ_USER_REQ = 'ids_READ_USER_REQ';
export const SAVE_USER_REQ = 'ids_SAVE_USER_REQ';
