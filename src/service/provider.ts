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
   * Resend the signup code to the given user
   * 
   * @param {User} user  User object of user to resend sign-up code to
   */
  resendSignUpCode(user: User): Promise<string>;

  /**
   * Confirm the registration of a particular user
   * 
   * @param {User} user    The user's whose registration is to be verified
   * @param {string} code  The code that was sent for validation
   */
  confirmSignUpCode(user: User, code: string): Promise<boolean>;

  /**
   * Config multi-factor authentication for the user
   * 
   * @param {User} User object with MFA preferences
   */
  configureMFA(user: User): Promise<void>;

  /**
   * Initiates a password reset flow for the given user.
   * 
   * @param {User} user 
   */
  resetPassword(user: User): Promise<void>;

  /**
   * Updates the given user's password validating the change with the given code
   * 
   * @param {User} user 
   * @param {string} code 
   */
  updatePassword(user: User, code: string): Promise<void>;

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
   * @param {User} user  The user to sign in
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