import { CognitoUserSession, CognitoUser } from 'amazon-cognito-identity-js';
import { AuthClass } from '@aws-amplify/auth/lib-esm/Auth'
import { Auth } from 'aws-amplify';

import { Logger } from '@appbricks/utils';

import ProviderInterface from '../../provider'
import User from '../../../model/user'

import {
  AUTH_NO_MFA,
  AUTH_MFA_SMS,
  AUTH_MFA_TOTP
} from '../../constants'

/**
 * AWS Cognito authentication provider. 
 */
export default class Provider implements ProviderInterface {

  private logger: Logger;

  private cognitoSession?: CognitoUserSession;
  private cognitoUser?: CognitoUser;

  private auth!: AuthClass;

  constructor(auth: AuthClass | undefined) {
    this.logger = new Logger('AwsProvider');
    
    this.cognitoSession = undefined;
    this.cognitoUser = undefined;

    this.auth = auth ? auth : Auth;
  }

  /**
   * Sets the current authenticated user
   * 
   * @param {CognitoUser} cognitoUser  Cognitor user instance
   */
  _setCognitoUser(cognitoUser?: CognitoUser) {
    this.cognitoUser = cognitoUser;
  }

  /**
   * Signs up a user
   * 
   * @param {User} user  User object with the sign-up details
   */
  async signUp(user: User): Promise<boolean> {

    const logger = this.logger;
    const auth = this.auth;

    return new Promise<boolean>(function (resolve, reject) {
      auth.signUp({
        username: user.username,
        password: user.password,
        attributes: {
          email: user.emailAddress,
          phone_number: user.mobilePhone,
          'custom:preferences': JSON.stringify({
            enableBiometric: user.enableBiometric,
            enableMFA: user.enableMFA,
            enableTOTP: user.enableTOTP,
            rememberFor24h: user.rememberFor24h
          })
        }
      })
        .then(
          data => {
            logger.trace('successful sign up: ', data);
            resolve(data.userConfirmed);
          },
          error => {
            logger.error('unable sign up: ', error);
            reject(error.message || error);
          }
        ).catch(
          exception => {
            logger.error('unable sign up: ', exception);
            reject(exception.message || exception);
          }
        );
    });
  }

  /**
   * Resend a code to the given user
   * 
   * @param {User} user 
   */
  async resendSignUpCode(user: User): Promise<string> {

    const logger = this.logger;
    const auth = this.auth;

    return new Promise<string>(function (resolve, reject) {
      auth.resendSignUp(user.username)
        .then(
          data => {
            logger.trace('successfully resent sign-up confirmation code');
            resolve(data);
          },
          error => {
            logger.error('unable send sign-up confirmation code: ', error);
            reject(error.message || error);
          }
        );
    });
  }

  /**
   * Confirm the registration of a particular user
   * 
   * @param {User} user    The user's whose registration is to be verified
   * @param {string} code  The code that was sent for validation
   */
  async confirmSignUpCode(user: User, code: string): Promise<boolean> {

    const logger = this.logger;
    const auth = this.auth;

    return new Promise<boolean>(function (resolve, reject) {
      auth.confirmSignUp(user.username, code)
        .then(
          data => {
            user.mobilePhoneVerified = true;

            logger.trace('successful confirmation: ', data);
            resolve(true);
          },
          error => {
            logger.error('unable verify signup: ', error);
            reject(error.message || error);
          }
        );
    });
  }

  /**
   * Config multi-factor authentication for the user
   * 
   * @param {User} User object with MFA preferences
   */
  async configureMFA(user: User): Promise<void> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;

    let mfaMethod: 'TOTP' | 'SMS' | 'NOMFA' = user.enableMFA
      ? (user.enableTOTP ? 'TOTP' : 'SMS')
      : 'NOMFA';

    return new Promise<void>(function (resolve, reject) {
      auth.setPreferredMFA(cognitoUser, mfaMethod)
        .then(
          () => {
            logger.trace('successful update of MFA method.');
            resolve();
          },
          error => {
            logger.error('unable to configure MFA method: ', mfaMethod, error);
            reject(error.message || error);
          }
        );
    });
  }

  /**
   * Initiates a password reset flow for the given user.
   * 
   * @param {User} user 
   */
  async resetPassword(user: User): Promise<void> {
    
    const logger = this.logger;
    const auth = this.auth;

    return new Promise<void>(function (resolve, reject) {
      auth.forgotPassword(user.username)
        .then(
          () => {
            resolve();
          },
          error => {
            logger.error('password reset error: ', error);

            let message = (error.invalidCredentialsMessage || error.message || error);
            switch (message) {
              case 'Username/client id combination not found.':
                message = 'invalidLogin';
                break;
              case 'Cannot reset password for the user as there is no registered/verified email or phone_number':
                message = 'notVerified';
                break;
            }

            reject(message);
          }
        );
    });
  }

  /**
   * Updates the given user's password validating the change with the given code
   * 
   * @param {User} user 
   * @param {string} code 
   */
  async updatePassword(user: User, code: string): Promise<void> {
    
    const logger = this.logger;
    const auth = this.auth;

    return new Promise<void>(function (resolve, reject) {
      auth.forgotPasswordSubmit(user.username, code, user.password)
        .then(
          () => {
            resolve();
          },
          error => {
            logger.error('unable update password: ', error);
            reject(error.message || error);
          }
        );
    });
  }


  /**
   * 
   * The following methods apply to the currently logged in user
   * 
   */

  /**
   * Validates session is valid and has a logged on user
   */
  async validateSession(): Promise<boolean> {

    try {
      this.cognitoSession = await this.auth.currentSession();
      if (this.cognitoSession) {
        return this.cognitoSession.isValid();
      }

    } catch (exception) {
      this.logger.warn('validating current auth session: ', exception);
    }
    return false;
  }

  /**
   * Returns whether the the user in session has completed the login process
   */
  async isLoggedIn(): Promise<boolean> {

    try {
      if (await this.validateSession()) {
        await this.auth.currentAuthenticatedUser().then(user => this.cognitoUser = user)
        this.logger.trace('the cognito session is authenticated: ', this.cognitoSession, this.cognitoUser);
        return true;
      }

    } catch (exception) {
      this.logger.warn('authentication validation returned an error: ', exception);
    }
    return false;
  }

  /**
   * Signs in the given user
   * 
   * @param {string} username  The username to sign in with
   * @param {string} password  The password to sign in with
   */
  async signIn(username: string, password: string): Promise<number> {

    const logger = this.logger;
    const auth = this.auth;
    const setCognitoUser = this._setCognitoUser.bind(this);

    return new Promise(function (resolve, reject) {

      auth.signIn(username, password)
        .then(
          async cognitoUser => {
            logger.trace('successful sign in: ', cognitoUser);
            setCognitoUser(cognitoUser);

            switch (cognitoUser.challengeName) {
              case 'SMS_MFA':
                resolve(AUTH_MFA_SMS);
              default:
                resolve(AUTH_NO_MFA);
            }
          },
          async error => {
            logger.error('sign in error: ', error);

            let message = (error.invalidCredentialsMessage || error.message || error);
            switch (message) {
              case 'User is not confirmed.':
                message = 'notConfirmed';
                break;
              case 'User does not exist.':
              case 'Incorrect username or password.':
                message = 'invalidLogin';
                break;
            }

            setCognitoUser(undefined);
            auth.signOut();
            reject(message);
          }
        )
        .catch(exception => {

          setCognitoUser(undefined);
          auth.signOut();
          reject(exception);
        });
    });
  }

  /**
   * Validates the given multi-factor authentication code
   * 
   * @param {string} code  The MFA code to validate
   */
  async validateMFACode(code: string): Promise<boolean> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;
    const setCognitoUser = this._setCognitoUser.bind(this);
    const isLoggedIn = this.isLoggedIn.bind(this);

    return new Promise(function (resolve, reject) {
      auth.confirmSignIn(cognitoUser, code)
        .then(
          cognitoUser => {
            logger.trace('confirmed sign in: ', cognitoUser);
            isLoggedIn().then(isLoggedIn => resolve(isLoggedIn));
          },
          error => {
            logger.error('mfa code validation error: ', error);

            let message = (error.invalidCredentialsMessage || error.message || error);
            if (message == 'Invalid code or auth state for the user.') {
              message = 'invalidCode';
            }

            setCognitoUser(undefined);
            auth.signOut();
            reject(message);
          }
        );
    });
  }

  /**
   * Signs out the logged in user
   */
  async signOut(): Promise<void> {

    const logger = this.logger;
    const auth = this.auth;

    this._setCognitoUser(undefined);
    return new Promise(function (resolve, reject) {
      auth.signOut()
        .then(
          () => {
            logger.trace('successful sign-out.');
            resolve();
          },
          error => {
            logger.error('unable sign-out: ', error);
            reject(error.message || error);
          }
        );
    });
  }

  /**
   * Sends a verifaction code to validate the given attribute.
   * 
   * @param {User} User  User object with MFA preferences
   */
  async sendVerificationCodeForAttribute(attribute: string): Promise<void> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;

    return new Promise(function (resolve, reject) {
      auth.verifyUserAttribute(cognitoUser, attribute)
        .then(
          data => {
            logger.trace('successfully sent confirmation code ' +
              'to initiate verification of attribute ', attribute);

            resolve();
          },
          error => {
            logger.error('error sending confirmation code for attribute: ', attribute, error);
            reject(error.message || error);
          }
        );
    });
  }

  /**
   * Verifies the given attribute with the code that was sent to the user
   * 
   * @param {string} attribute 
   * @param {string} code 
   */
  async confirmVerificationCodeForAttribute(attribute: string, code: string): Promise<void> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;

    return new Promise(function (resolve, reject) {
      auth.verifyUserAttributeSubmit(cognitoUser, attribute, code)
        .then(
          data => {
            logger.trace('successfully confirmed attribute ', attribute);
            resolve();
          },
          error => {
            logger.error('error confirming verification code for attribute: ', attribute, error);
            reject(error.message || error);
          }
        );
    });
  }

  /**
   * Reads attributes of logged in user from the AWS Cognito backend.
   * 
   * @param {User} user             User object to populate with attributes read 
   *                                from AWS Cognito
   * @param {string[]} attribNames  List of attributes to read and populate user 
   *                                object with. If this argument is not provided 
   *                                then all attributes will be read
   */
  async readUser(attribNames?: string[]): Promise<User> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;
    const user = new User();

    return new Promise<User>(function (resolve, reject) {

      auth.userAttributes(cognitoUser)
        .then(
          attributes => {
            logger.debug('reading attributes', attribNames,
              ' from user attributes:', attributes);

            attributes
              .filter(
                a => !attribNames || attribNames.find(
                  name => (name == a.getName())
                )
              )
              .map(a => {

                switch (a.getName()) {
                  case 'email':
                    user.emailAddress = a.getValue();
                    break;
                  case 'phone_number':
                    user.mobilePhone = a.getValue();
                    break;
                  case 'email_verified':
                    user.emailAddressVerified = (a.getValue() == 'true');
                    break;
                  case 'phone_number_verified':
                    user.mobilePhoneVerified = (a.getValue() == 'true');
                    break;
                  case 'custom:preferences':
                    let prefs = JSON.parse(a.getValue());
                    user.enableBiometric = prefs.enableBiometric;
                    user.enableMFA = prefs.enableMFA;
                    user.enableTOTP = prefs.enableTOTP;
                    user.rememberFor24h = prefs.rememberFor24h;
                    break;
                }
              })

            logger.debug('read user: ', user);
            resolve(user);
          },
          error => {
            reject(error);
          }
        )
        .catch(exception => {
          reject(exception);
        });
    });
  }

  /**
   * Saves the user attributes to the AWS Cognito backend.
   * 
   * @param {User} user             User to persist to the Cognito backend
   * @param {string[]} attribNames  List of attributes to read and populate user 
   *                                object with. If this argument is not provided 
   *                                then all attributes will be read
   */
  async saveUser(user: User, attribNames?: string[]): Promise<void> {

    let attributes = {};

    [
      'email',
      'email_verified',
      'phone_number',
      'phone_number_verified',
      'custom:preferences'
    ]
      .filter(
        a => !attribNames || attribNames.find(
          name => (name == a)
        )
      )
      .map(a => {

        switch (a) {
          case 'email':
            attributes = Object.assign(attributes, {
              email: user.emailAddress
            });
            break;
          case 'phone_number':
            attributes = Object.assign(attributes, {
              email_verified: user.emailAddressVerified
            });
            break;
          case 'email_verified':
            attributes = Object.assign(attributes, {
              phone_number: user.mobilePhone
            });
            break;
          case 'phone_number_verified':
            attributes = Object.assign(attributes, {
              phone_number_verified: user.mobilePhoneVerified
            });
            break;
          case 'custom:preferences':
            attributes = Object.assign(attributes, {
              'custom:preferences': JSON.stringify({
                enableBiometric: user.enableBiometric,
                enableMFA: user.enableMFA,
                enableTOTP: user.enableTOTP,
                rememberFor24h: user.rememberFor24h
              })
            });

            this.configureMFA(user);
            break;
        }
      });

    this.logger.debug('saving user attributes: ', attributes);
    await this.auth.updateUserAttributes(this.cognitoUser, attributes);
  }
}
