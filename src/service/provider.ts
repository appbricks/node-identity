import User from '../model/user';

/**
 * MBaaS Authentication Provider interface
 * 
 * The implementor of this interface would contain 
 * the cloud service provider specific logic.
 */

 export default interface Provider {

  /**
   * Signs up a user
   * 
   * @param {User} user  User object with the sign-up details
   */
  signUp(user: User): Promise<boolean>;

  /**
   * Resend a code to the given user
   * 
   * @param {string} username  the name of the user for whom the
   *                           sign-up code needs to be resent
   */
  resendSignUpCode(username: string): Promise<string>;

  /**
   * Confirm the registration of a particular user
   * 
   * @param {string} username  the user's whose registration is to be verified
   * @param {string} code      the code that was sent for validation
   */
  confirmSignUpCode(username: string, code: string): Promise<boolean>;

  /**
   * Initiates a password reset flow for the given user.
   * 
   * @param {string} username  the user whose password needs to be reset
   */
  resetPassword(username: string): Promise<void>;

  /**
   * Updates the given user's password validating the change with the given code
   * 
   * @param {string} username  the user whose password is being reset
   * @param {string} password  the new password
   * @param {string} code      the confirmation code for password reset
   */
  updatePassword(username: string, password: string, code: string): Promise<void>;

  
  /**
   * 
   * The following methods apply to the currently logged in user
   * 
   */

  /**
   * Validates session is valid and has a logged on user
   */
  validateSession(): Promise<boolean>;

  /**
   * Returns whether the the user in session has completed the login process
   */
  isLoggedIn(): Promise<boolean>;

  /**
   * Signs in the given user
   * 
   * @param {string} username  The username to sign in with
   * @param {string} password  The password to sign in with
   */
  signIn(username: string, password: string): Promise<number>;

  /**
   * Validates the given multi-factor authentication code
   * 
   * @param {string} code  The MFA code to validate
   */
  validateMFACode(code: string): Promise<boolean>;

  /**
   * Signs out the logged in user
   */
  signOut(): Promise<void>;

  /**
   * Config multi-factor authentication for the user
   * 
   * @param {User} User object with MFA preferences
   */
  configureMFA(user: User): Promise<void>;

  /**
   * Sends a verifaction code to validate the given attribute.
   * 
   * @param {User} User  User object with MFA preferences
   */
  sendVerificationCodeForAttribute(attribute: string): Promise<void>;

  /**
   * Verifies the given attribute with the code that was sent to the user
   * 
   * @param {string} attribute 
   * @param {string} code 
   */
  confirmVerificationCodeForAttribute(attribute: string, code: string): Promise<void>;

  /**
   * Reads attributes of logged in user from the AWS Cognito backend.
   * 
   * @param {User} user             User object to populate with attributes read 
   *                                from AWS Cognito
   * @param {string[]} attribNames  List of attributes to read and populate user 
   *                                object with. If this argument is not provided 
   *                                then all attributes will be read
   */
  readUser(attribNames?: string[]): Promise<User>;

  /**
   * Saves the user attributes to the AWS Cognito backend.
   * 
   * @param {User} user             User to persist to the Cognito backend
   * @param {string[]} attribNames  List of attributes to read and populate user 
   *                                object with. If this argument is not provided 
   *                                then all attributes will be read
   */
  saveUser(user: User, attribNames?: string[]): Promise<void>;
}