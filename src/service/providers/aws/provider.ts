import { 
  CognitoUserSession, 
  CognitoUser 
} from 'amazon-cognito-identity-js';
import { AuthClass } from '@aws-amplify/auth/lib-esm/Auth'
import { Auth } from 'aws-amplify';

import { 
  Logger, 
  Error 
} from '@appbricks/utils';

import ProviderInterface from '../../provider';
import User, { 
  UserStatus, 
  VerificationInfo, 
  VerificationType 
} from '../../../model/user';

import {
  AUTH_NO_MFA,
  AUTH_MFA_SMS,
  AUTH_MFA_TOTP,

  ERROR_SIGN_UP,
  ERROR_RESEND_SIGN_UP_CODE,
  ERROR_CONFIRM_SIGN_UP_CODE,
  ERROR_CONFIGURE_MFA,
  ERROR_RESET_PASSWORD,
  ERROR_UPDATE_PASSWORD,
  ERROR_SIGN_IN,
  ERROR_VALIDATE_MFA_CODE,
  ERROR_SIGN_OUT,
  ERROR_SEND_VERIFICATION_CODE_FOR_ATTRIBUTE,
  ERROR_CONFIRM_VERIFICATION_CODE_FOR_ATTRIBUTE,
  ERROR_SETUP_TOTP,
  ERROR_VERIFY_TOTP,
  ERROR_READ_USER,
  ERROR_SAVE_USER,

  ERROR_NOT_VERIFIED,
  ERROR_NOT_CONFIRMED,
  ERROR_INVALID_LOGIN,
  ERROR_INVALID_CODE
  
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
    this.logger = new Logger('AwsIdentityProvider');
    
    this.cognitoSession = undefined;
    this.cognitoUser = undefined;

    this.auth = auth ? auth : Auth;
  }

  /**
   * Sets the current authenticated user
   * 
   * @param {CognitoUser} cognitoUser  Cognito user instance
   */
  _setCognitoUser(cognitoUser?: CognitoUser) {
    this.cognitoUser = cognitoUser;
  }

  /**
   * Returns the username of the underlying 
   * provider's logged in session. If the
   * provider session is logged in then
   * the name will be 'undefined'.
   * 
   * @return the name of the logged in user
   */
  getLoggedInUsername(): string | undefined {
    return this.cognitoUser && this.cognitoUser.getUsername();
  }

  /**
   * Signs up a user
   * 
   * @param {User} user  user object with the sign-up details
   */
  async signUp(user: User): Promise<VerificationInfo> {

    const logger = this.logger;
    const auth = this.auth;

    return new Promise<VerificationInfo>(function (resolve, reject) {
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
          result => {
            logger.trace('successful sign up: ', result);
            let info: VerificationInfo = { isConfirmed: result.userConfirmed };
            if (!result.userConfirmed) {
              info.type = result.codeDeliveryDetails.DeliveryMedium == 'EMAIL' 
                ? VerificationType.Email 
                : result.codeDeliveryDetails.DeliveryMedium == 'SMS' 
                  ? VerificationType.SMS
                  : VerificationType.None;
              
              if (info.type != VerificationType.None) {
                info.timestamp = Date.now();
                info.attrName = result.codeDeliveryDetails.AttributeName;
                info.destination = result.codeDeliveryDetails.Destination;
              }
            }
            resolve(info);
          },
          error => {
            logger.error('unable sign up: ', error);
            reject(new Error(ERROR_SIGN_UP, error));
          }
        ).catch(
          exception => {
            logger.error('unable sign up: ', exception);
            reject(new Error(ERROR_SIGN_UP, exception));
          }
        );
    });
  }

  /**
   * Resend a code to the given user
   * 
   * @param {string} username  the name of the user for whom the
   *                           sign-up code needs to be resent
   */
  async resendSignUpCode(username: string): Promise<VerificationInfo> {

    const logger = this.logger;
    const auth = this.auth;

    return new Promise<VerificationInfo>(function (resolve, reject) {
      auth.resendSignUp(username)
        .then(
          result => {
            logger.trace('successfully resent sign-up confirmation code', result);
            let info: VerificationInfo = { isConfirmed: false };

            // AWS Cognito BUG: type is declared is as string
            // but what is actually returned is an instance of 
            // CodeDeliveryDetails object
            let details: any = (<any>result)['CodeDeliveryDetails'];
            if (details) {
              info.type = details['DeliveryMedium'] == 'EMAIL' 
                ? VerificationType.Email 
                : details['DeliveryMedium'] == 'SMS' 
                  ? VerificationType.SMS
                  : VerificationType.None;
              
              if (info.type != VerificationType.None) {
                info.timestamp = Date.now();
                info.attrName = details['AttributeName'];
                info.destination = details['Destination'];  
              }
            }

            resolve(info);
          },
          error => {
            logger.error('unable send sign-up confirmation code: ', error);
            reject(new Error(ERROR_RESEND_SIGN_UP_CODE, error));
          }
        );
    });
  }

  /**
   * Confirm the registration of a particular user
   * 
   * @param {string} username  the user's whose registration is to be verified
   * @param {string} code      the code that was sent for validation
   */
  async confirmSignUpCode(username: string, code: string): Promise<boolean> {

    const logger = this.logger;
    const auth = this.auth;

    return new Promise<boolean>(function (resolve, reject) {
      auth.confirmSignUp(username, code)
        .then(
          result => {
            logger.trace('successful confirmation: ', result);
            resolve(true);
          },
          error => {
            logger.error('unable verify signup: ', error);

            let message = (error.message || error);
            if (message == 'Invalid verification code provided, please try again.') {
              reject(new Error(ERROR_INVALID_CODE, error));
            } else {
              reject(new Error(ERROR_CONFIRM_SIGN_UP_CODE, error));
            }
          }
        );
    });
  }

  /**
   * Initiates a password reset flow for the given user.
   * 
   * @param {string} username  the user whose password needs to be reset
   */
  async resetPassword(username: string): Promise<void> {
    
    const logger = this.logger;
    const auth = this.auth;

    return new Promise<void>(function (resolve, reject) {
      auth.forgotPassword(username)
        .then(
          () => {
            logger.trace('reset password flow successfully initiated.');
            resolve();
          },
          error => {
            logger.error('password reset error: ', error);

            let message = (error.invalidCredentialsMessage || error.message || error);
            switch (message) {
              case 'Username/client id combination not found.':
                reject(new Error(ERROR_INVALID_LOGIN, error));
                break;
              case 'Cannot reset password for the user as there is no registered/verified email or phone_number':
                reject(new Error(ERROR_NOT_VERIFIED, error));
                break;
              default:
                reject(new Error(ERROR_RESET_PASSWORD, error));
            }
          }
        );
    });
  }

  /**
   * Updates the given user's password validating the change with the given code
   * 
   * @param {string} username  the user whose password is being reset
   * @param {string} password  the new password
   * @param {string} code      the confirmation code for password reset
   */
  async updatePassword(username: string, password: string, code: string): Promise<void> {
    
    const logger = this.logger;
    const auth = this.auth;

    return new Promise<void>(function (resolve, reject) {
      auth.forgotPasswordSubmit(username, code, password)
        .then(
          () => {
            logger.trace('password updated.');
            resolve();
          },
          error => {
            logger.error('unable update password: ', error);
            reject(new Error(ERROR_UPDATE_PASSWORD, error));
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
  async isLoggedIn(username?: string): Promise<boolean> {

    try {
      if (await this.validateSession()) {
        await this.auth.currentAuthenticatedUser().then(user => this.cognitoUser = user)
        this.logger.trace('the cognito session is authenticated: ', this.cognitoSession, this.cognitoUser);
        return !!this.cognitoUser &&
          (!!!username || (this.cognitoUser.getUsername() == username));
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
              case 'SOFTWARE_TOKEN_MFA':
                resolve(AUTH_MFA_TOTP);
              default:
                resolve(AUTH_NO_MFA);
            }
          },
          async error => {
            logger.error('sign in error: ', error);

            setCognitoUser(undefined);
            auth.signOut();

            let message = (error.invalidCredentialsMessage || error.message || error);
            switch (message) {
              case 'User is not confirmed.':
                reject(new Error(ERROR_NOT_CONFIRMED, error));
                break;
              case 'User does not exist.':
              case 'Incorrect username or password.':
                reject(new Error(ERROR_INVALID_LOGIN, error));
                break;
              default:
                reject(new Error(ERROR_SIGN_IN, error));
            }
          }
        )
        .catch(exception => {
          logger.error('sign in exception: ', exception);

          setCognitoUser(undefined);
          auth.signOut();
          reject(new Error(ERROR_SIGN_IN, exception));
        });
    });
  }

  /**
   * Validates the given multi-factor authentication code
   * 
   * @param {string} code  The MFA code to validate
   * @param {number} type  The MFA type (i.e. SMS or TOTP)
   */
  async validateMFACode(code: string, type: number): Promise<boolean> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;
    const setCognitoUser = this._setCognitoUser.bind(this);
    const isLoggedIn = this.isLoggedIn.bind(this);

    return new Promise(function (resolve, reject) {
      auth.confirmSignIn(
        cognitoUser, 
        code,
        type == AUTH_MFA_SMS 
          ? 'SMS_MFA'
          : type == AUTH_MFA_TOTP 
            ? 'SOFTWARE_TOKEN_MFA' 
            : undefined
      )
        .then(
          cognitoUser => {
            logger.trace('confirmed sign in: ', cognitoUser);
            isLoggedIn().then(isLoggedIn => resolve(isLoggedIn));
          },
          error => {
            logger.error('mfa code validation error: ', error);

            setCognitoUser(undefined);
            auth.signOut();

            let message = (error.invalidCredentialsMessage || error.message || error);
            if (message == 'Invalid code or auth state for the user.') {
              reject(new Error(ERROR_INVALID_CODE, error));
            } else {
              reject(new Error(ERROR_VALIDATE_MFA_CODE, error));
            }
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
            reject(new Error(ERROR_SIGN_OUT, error));
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
          result => {
            logger.trace('successfully sent confirmation code ' +
              'to initiate verification of attribute ', attribute, result);

            resolve();
          },
          error => {
            logger.error('error sending confirmation code for attribute: ', attribute, error);
            reject(new Error(ERROR_SEND_VERIFICATION_CODE_FOR_ATTRIBUTE, error));
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
          result => {
            logger.trace('successfully confirmed attribute ', attribute, result);
            resolve();
          },
          error => {
            logger.error('error confirming verification code for attribute: ', attribute, error);

            let message = (error.message || error);
            if (message == 'Invalid verification code provided, please try again.') {
              reject(new Error(ERROR_INVALID_CODE, error));
            } else {
              reject(new Error(ERROR_CONFIRM_VERIFICATION_CODE_FOR_ATTRIBUTE, error));
            }
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
            reject(new Error(ERROR_CONFIGURE_MFA, error));
          }
        );
    });
  }

  /**
   * Setup Time-based One Time Password MFA for the user
   * 
   * @return the secret to be used by a token generator 
   *         app like Google Authenticate app
   */
  setupTOTP(): Promise<string> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;

    return new Promise(function (resolve, reject) {
      auth.setupTOTP(cognitoUser)
        .then(
          secret => {
            logger.trace('successfully setup TOTP: ', secret);
            resolve(secret);
          },
          error => {
            logger.error('error setting up TOTP: ', error);
            reject(new Error(ERROR_SETUP_TOTP, error));
          }
        );
    });
  }

  /**
   * Verifies the TOTP setup by validating a code generated
   * by the token generator app with the current setup
   * 
   * @param code the token to validate the setup with
   */
  verifyTOTP(code: string): Promise<void> {

    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;

    return new Promise(function (resolve, reject) {
      auth.verifyTotpToken(cognitoUser, code)
        .then(
          () => {
            logger.trace('successfully verified TOTP setup');
            resolve();
          },
          error => {
            logger.error('error verifying TOTP setup: ', error);
            reject(new Error(ERROR_SETUP_TOTP, error));
          }
        );
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
    let configureMFA = false;

    [
      'given_name',
      'middle_name',
      'family_name',
      'email',
      'phone_number',
      'custom:preferences'
    ]
      .filter(
        a => !attribNames || attribNames.find(
          name => (name == a)
        )
      )
      .map(a => {

        switch (a) {
          case 'given_name':
            if (user.firstName) {
              attributes = Object.assign(attributes, {
                given_name: user.firstName
              });
            }
            break;
          case 'middle_name':
            if (user.middleName) {
              attributes = Object.assign(attributes, {
                middle_name: user.middleName
              });
            }
            break;
          case 'family_name':
            if (user.familyName) {
              attributes = Object.assign(attributes, {
                family_name: user.familyName
              });  
            }
            break;
          case 'email':
            attributes = Object.assign(attributes, {
              email: user.emailAddress
            });
            break;
          case 'phone_number':
            attributes = Object.assign(attributes, {
              phone_number: user.mobilePhone
            });
            break;
          case 'custom:preferences':
            attributes = Object.assign(attributes, {
              'custom:preferences': JSON.stringify({
                preferredName: user.preferredName,
                enableBiometric: user.enableBiometric,
                enableMFA: user.enableMFA,
                enableTOTP: user.enableTOTP,
                rememberFor24h: user.rememberFor24h
              })
            });

            configureMFA = true;
        }
      });

    const provider = this;
    const logger = this.logger;
    const auth = this.auth;
    const cognitoUser = this.cognitoUser;

    return new Promise<void>(async function (resolve, reject) {

      const updateUserAttributes = () => {
        logger.debug('saving user attributes: ', attributes, user);
        auth.updateUserAttributes(cognitoUser, attributes)
          .then(
            result => {
              logger.trace('successfully saved user attributes: ', result);
              resolve();
            },
            error => {
              reject(new Error(ERROR_SAVE_USER, error));
            }
          )
          .catch(exception => {
            reject(new Error(ERROR_SAVE_USER, exception));
          });
      }

      if (configureMFA) {
        logger.debug('updating user MFA settings: ', user);
        provider.configureMFA(user)
          .then(() => updateUserAttributes())
          .catch(exception => reject(exception));
      } else {
        updateUserAttributes();
      }
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

            user.username = <string>cognitoUser!.getUsername();
            user.status = UserStatus.Confirmed;

            attributes
              .filter(
                a => !attribNames || attribNames.find(
                  name => (name == a.getName())
                )
              )
              .map(a => {

                switch (a.getName()) {
                  case 'given_name':
                    user.firstName = a.getValue();
                    break;
                  case 'middle_name':
                    user.middleName = a.getValue();
                    break;
                  case 'family_name':
                    user.familyName = a.getValue();
                    break;
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
                    user.preferredName = prefs.preferredName;
                    user.enableBiometric = prefs.enableBiometric;
                    user.enableMFA = prefs.enableMFA;
                    user.enableTOTP = prefs.enableTOTP;
                    user.rememberFor24h = prefs.rememberFor24h;
                    break;
                }
              })

            logger.debug('user attributes read from cognito: ', user);
            resolve(user);
          },
          error => {
            reject(new Error(ERROR_READ_USER, error));
          }
        )
        .catch(exception => {
          reject(new Error(ERROR_READ_USER, exception));
        });
    });
  }
}
