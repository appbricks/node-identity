import * as redux from 'redux';

import User, { VerificationInfo } from '../model/user';

export interface AuthStatePayload {
  isLoggedIn: boolean
  username?: string
};

export interface AuthUserPayload {
  user: User,
};

export interface AuthUsernamePayload {
  username: string,
  password?: string,
  code?: string
};

export interface AuthVerificationPayload {
  info: VerificationInfo
}

export interface AuthSignInPayload {
  username: string,
  password: string,
};

export interface AuthMultiFactorAuthPayload {
  mfaCode: string,
  mfaType: number
};

export interface AuthLoggedInPayload {
  isLoggedIn: boolean
  mfaType?: number,
}

export interface AuthTOTPSecretPayload {
  secret: string
}

export interface AuthLoggedInUserAttrPayload {
  attrName?: string,
  code?: string
};

// Authentication dispatch function props
export interface AuthActionProps {
  authService?: {
    // authentication initialization
    loadAuthState: () => redux.Action

    // registration and configuration
    signUp: (user: User) => redux.Action
    resendSignUpCode: (username?: string) => redux.Action
    confirmSignUpCode: (code: string, username?: string) => redux.Action

    // actions on current user in state
    resetPassword: (username: string) => redux.Action
    updatePassword: (password: string, code: string, username?: string) => redux.Action

    // user authentication
    signIn: (username: string, password: string) => redux.Action
    validateMFACode: (code: string, type: number) => redux.Action
    signOut: () => redux.Action

    // actions on authenticated user
    verifyAttribute: (attrName: string) => redux.Action
    confirmAttribute: (attrName: string, code: string) => redux.Action

    configureMFA: (user: User) => redux.Action
    setupTOTP: () => redux.Action
    verifyTOTP: (code: string) => redux.Action

    saveUser: (user: User) => redux.Action
    readUser: () => redux.Action
  }
}

// User action types

// registration and configuration
export const SIGN_UP_REQ = 'auth/SIGN_UP_REQ';
export const RESEND_SIGN_UP_CODE_REQ = 'auth/RESEND_SIGN_UP_CODE_REQ';
export const CONFIRM_SIGN_UP_CODE_REQ= 'auth/CONFIRM_SIGN_UP_CODE_REQ';

export const RESET_PASSWORD_REQ = 'auth/RESET_PASSWORD_REQ';
export const UPDATE_PASSWORD_REQ = 'auth/UPDATE_PASSWORD_REQ';

// auth context initialization
export const LOAD_AUTH_STATE_REQ = 'auth/LOAD_AUTH_STATE_REQ';

// user authentication
export const SIGN_IN_REQ = 'auth/SIGN_IN_REQ';
export const VALIDATE_MFA_CODE_REQ = 'auth/VALIDATE_MFA_CODE_REQ';
export const SIGN_OUT_REQ = 'auth/SIGN_OUT_REQ';

// actions on authenticated user
export const VERIFY_ATTRIBUTE_REQ = 'auth/VERIFY_ATTRIBUTE_REQ';
export const CONFIRM_ATTRIBUTE_REQ = 'auth/CONFIRM_ATTRIBUTE_REQ';

export const CONFIGURE_MFA_REQ = 'auth/CONFIGURE_MFA_REQ';
export const SETUP_TOTP_REQ = 'auth/SETUP_TOTP_REQ';
export const VERIFY_TOTP_REQ = 'auth/VERIFY_TOTP_REQ';

export const SAVE_USER_REQ = 'auth/SAVE_USER_REQ';

export const READ_USER_REQ = 'auth/READ_USER_REQ';
