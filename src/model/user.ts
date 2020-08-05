/**
 * User Identity
 */

export default class User {

  status: UserStatus;

  username: string;

  firstName?: string;
  middleName?: string;
  familyName?: string;

  emailAddress: string;
  emailAddressVerified: boolean;

  mobilePhone: string;
  mobilePhoneVerified: boolean;

  profilePictureUrl?: string;

  // User authentication attributes
  password: string;
  enableBiometric: boolean;

  enableMFA: boolean;
  enableTOTP: boolean;

  rememberFor24h: boolean;

  constructor(username = '', password = '') {

    this.status = UserStatus.Unknown;
    this.username = username;
    this.password = password;

    this.emailAddress = '';
    this.emailAddressVerified = false;

    this.mobilePhone = '';
    this.mobilePhoneVerified = false;

    this.password = '';
    this.enableBiometric = false;

    // If MFA is enabled then TOTP is disabled 
    // then SMS will be the preferred MFA type
    this.enableMFA = false;
    this.enableTOTP = false;

    this.rememberFor24h = false;
  }

  toJSON(): {
    status: UserStatus
    username: string
    firstName?: string
    middleName?: string
    familyName?: string
    emailAddress: string
    emailAddressVerified: boolean
    mobilePhone: string
    mobilePhoneVerified: boolean 
    profilePictureUrl?: string
    enableBiometric: boolean
    enableMFA: boolean
    enableTOTP: boolean
    rememberFor24h: boolean
  } {
    return {
      status: this.status,
      username: this.username,
      firstName: this.firstName,
      middleName: this.middleName,
      familyName: this.familyName,
      emailAddress: this.emailAddress,
      emailAddressVerified: this.emailAddressVerified,
      mobilePhone: this.mobilePhone,
      mobilePhoneVerified: this.mobilePhoneVerified,
      enableBiometric: this.enableBiometric,
      enableMFA: this.enableMFA,
      enableTOTP: this.enableTOTP,
      rememberFor24h: this.rememberFor24h
    }
  }

  fromJSON(data: {
    status: UserStatus
    username: string
    firstName?: string
    middleName?: string
    familyName?: string
    emailAddress: string
    emailAddressVerified: boolean
    mobilePhone: string
    mobilePhoneVerified: boolean 
    profilePictureUrl?: string
    enableBiometric: boolean
    enableMFA: boolean
    enableTOTP: boolean
    rememberFor24h: boolean
  }) {
    this.status = data.status;
    this.username = data.username;
    this.firstName = data.firstName;
    this.middleName = data.middleName;
    this.familyName = data.familyName;
    this.emailAddress = data.emailAddress;
    this.emailAddressVerified = data.emailAddressVerified;
    this.mobilePhone = data.mobilePhone;
    this.mobilePhoneVerified = data.mobilePhoneVerified;
    this.profilePictureUrl = data.profilePictureUrl;
    this.enableBiometric = data.enableBiometric;
    this.enableMFA = data.enableMFA;
    this.enableTOTP = data.enableTOTP;
    this.rememberFor24h = data.rememberFor24h;
  }

  /**
   * Returns the users name. Which is the full name
   * if available otherwise it will be the username 
   * used to log in with
   */
  name(): string {
    if (this.firstName && this.firstName.length > 0
      && this.familyName && this.familyName.length > 0) {

      if (this.middleName && this.middleName.length > 0) {
        return this.firstName + ' ' + this.middleName + ' ' + this.familyName;
      } else {
        return this.firstName + ' ' + this.familyName;
      }
    } else {
      return this.username;
    }
  }

  /**
   * Returns if this object contains sufficient 
   * data to be considered valid
   */
  isValid(): boolean {
    return (
      this.username !== undefined && this.username.length > 0 &&
      this.firstName !== undefined  && this.firstName.length > 0 &&
      this.familyName !== undefined  && this.familyName.length > 0 &&
      this.emailAddress !== undefined  && this.emailAddress.length > 0 &&
      this.mobilePhone !== undefined  && this.mobilePhone.length > 0
    );
  }

  /**
   * Returns whether this User registration has
   * been confirmed by either email or SMS.
   */
  isConfirmed(): boolean {
    if (this.status == UserStatus.Unknown && 
      this.emailAddressVerified || this.mobilePhoneVerified) {
      
      this.status = UserStatus.Confirmed;
    }
    return (this.status == UserStatus.Confirmed);
  }

  /**
   * Sets the confirmation status for the user.
   * 
   * @param {boolean}  isConfirmed whether the user status should be set to confirmed 
   */
  setConfirmed(isConfirmed: boolean) {
    this.status = isConfirmed ? UserStatus.Confirmed : UserStatus.Unconfirmed;
  }

  /**
   * Returns whether this user's sign-in should
   * be remembered.
   */
  rememberSignIn(): boolean {
    return this.enableBiometric || this.rememberFor24h;
  }

  /**
   * Password validation
   * 
   * @param {string} password  password to check for policy compliance
   */
  validatePassword(password: string): ValidationResult {

    this.password = '';

    if (password.length == 0) {
      return {
        isValid: false,
        longMessage: 'The password is required.'
      };
    }

    // Complete match string
    //
    // '^(?=.*[-_()!@#$%^&+*])(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$'

    let lengthCheck = /[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!lengthCheck.test(password)) {
      return {
        isValid: false,
        shortMessage: 'too short',
        longMessage: 'The password must have a minimum length of 8 characters.'
      };
    }

    let specialCharCheck = /^(?=.*[-_()!@#$%^&+*])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!specialCharCheck.test(password)) {
      return {
        isValid: false,
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one special character.'
      };
    }

    let lowercaseCharCheck = /^(?=.*[a-z])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!lowercaseCharCheck.test(password)) {
      return {
        isValid: false,
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one lowercase character.'
      };
    }

    let uppercaseCharCheck = /^(?=.*[A-Z])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!uppercaseCharCheck.test(password)) {
      return {
        isValid: false,
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one uppercase character.'
      };
    }

    let numberCheck = /^(?=.*[0-9])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!numberCheck.test(password)) {
      return {
        isValid: false,
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one number character.'
      };
    }

    this.password = password;
    return { isValid: true };
  }

  /**
   * Password verification
   * 
   * @param {*} password  password to verify if it matches the instance value
   */
  verifyPassword(password: string): ValidationResult {

    if (password.length == 0) {

      return {
        isValid: false,
        longMessage: 'The password is required.'
      }

    } else if (password.length > 0 && password != this.password) {

      return {
        isValid: false,
        shortMessage: 'not matching',
        longMessage: 'The verification password does not match the first password you entered.'
      };
    }

    return { isValid: true };
  }

  /**
   * Username validation
   * 
   * @param {string} username  the user's login name
   * @param {boolean} set       updates the property if valid else resets it
   */
  validateUsername(username: string, set = true): ValidationResult{

    if (set) {
      this.username = '';
    }

    if (username.length == 0) {
      return {
        isValid: false,
        longMessage: 'The username is required.'
      };
    }

    if (username.length < 3) {
      return {
        isValid: false,
        shortMessage: 'too short',
        longMessage: 'The username must be at least 3 characters long.'
      };
    }

    if (set) {
      this.username = username;
    }
    return { isValid: true };
  }

  /**
   * Email address validation and setting
   * 
   * @param {string} emailAddress  email address
   * @param {boolean} set          updates the property if valid else resets it
   */
  validateEmailAddress(emailAddress: string, set = true): ValidationResult {

    if (set) {
      this.emailAddress = '';
    }

    if (emailAddress.length == 0) {
      return {
        isValid: false,
        longMessage: 'The email address is required.'
      };
    }

    let emailFormatCheck = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailFormatCheck.test(emailAddress)) {
      return {
        isValid: false,
        shortMessage: 'invalid',
        longMessage: '"' + emailAddress + '" is not a valid email address.'
      };
    }

    if (set) {
      this.emailAddress = emailAddress;
    }
    return { isValid: true };
  }

  /**
   * Mobile phone number validation and setting
   * 
   * @param {string} mobilePhone  mobile phone number
   * @param {boolean} set         updates the property if valid else resets it
   */
  validateMobilePhone(mobilePhone: string, set = true): ValidationResult {

    if (set) {
      this.mobilePhone = '';
    }

    if (mobilePhone.length == 0) {
      return {
        isValid: false,
        longMessage: 'The mobile phone number is required.'
      };
    }

    let mobilePhoneFormatCheck = /((?:\+|00)[17](?: |\-)?|(?:\+|00)[1-9]\d{0,2}(?: |\-)?|(?:\+|00)1\-\d{3}(?: |\-)?)?(0\d|\([0-9]{3}\)|[1-9]{0,3})(?:((?: |\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\-)[0-9]{3}(?: |\-)[0-9]{4})|([0-9]{7}))/;
    if (!mobilePhoneFormatCheck.test(mobilePhone)) {
      return {
        isValid: false,
        shortMessage: 'invalid',
        longMessage: '"' + mobilePhone + '" is not a valid phone number.'
      };
    }

    if (set) {
      this.mobilePhone = mobilePhone;
    }
    return { isValid: true };
  }
}

export enum UserStatus {
  Unknown = 0,
  Unregistered,
  Unconfirmed,
  Confirmed
}

export type ValidationResult = {
  isValid: boolean
  shortMessage?: string
  longMessage?: string
}

/**
 * User Verification Info
 */

export enum VerificationType {
  None = 0,
  Email,
  SMS
}

export interface VerificationInfo {
  timestamp?: number,
  type?: VerificationType
  destination?: string
  attrName?: string
  isConfirmed: boolean
}
