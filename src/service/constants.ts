/**
 * Provider common constants
 */

export const AUTH_NO_MFA = 0;
export const AUTH_MFA_SMS = 1;
export const AUTH_MFA_TOTP = 2;

export const USER_LOGGED_OUT = 0;
export const USER_LOGGED_IN = 1;
export const USER_NEEDS_AUTH = 2;

export const ATTRIB_EMAIL_ADDRESS = 'email';
export const ATTRIB_MOBILE_PHONE = 'phone_number';

export const ERROR_SIGN_UP = 'signUpError';
export const ERROR_RESEND_SIGN_UP_CODE = 'resendSignUpCodeError';
export const ERROR_CONFIRM_SIGN_UP_CODE = 'confirmSignUpCodeError';
export const ERROR_CONFIGURE_MFA = 'configureMFAError';
export const ERROR_RESET_PASSWORD = 'resetPasswordError';
export const ERROR_UPDATE_PASSWORD = 'updatePasswordError';
export const ERROR_SIGN_IN = 'signInError';
export const ERROR_VALIDATE_MFA_CODE = 'validateMFACodeError';
export const ERROR_SIGN_OUT = 'signOutError';
export const ERROR_SEND_VERIFICATION_CODE_FOR_ATTRIBUTE = 'sendVerificationCodeForAttributeError';
export const ERROR_CONFIRM_VERIFICATION_CODE_FOR_ATTRIBUTE = 'confirmVerificationCodeForAttributeError';
export const ERROR_SETUP_TOTP = 'setupTOTPError';
export const ERROR_VERIFY_TOTP= 'verifyTOTPError';
export const ERROR_READ_USER = 'readUserError';
export const ERROR_SAVE_USER = 'saveUserError';

export const ERROR_NOT_VERIFIED = 'notVerified';
export const ERROR_NOT_CONFIRMED = 'notConfirmed';
export const ERROR_INVALID_LOGIN = 'invalidLogin';
export const ERROR_INVALID_CODE = 'invalidCode';
