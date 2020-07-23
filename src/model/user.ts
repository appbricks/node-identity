/*
 * Copyright 2018-2020 AppBricks, Inc. or its affiliates. All Rights Reserved.
 */

const TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * User Identity
 */
export default class User {

  username: string;

  firstName: string;
  familyName: string;

  userConfirmed: boolean;

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

    this.username = username;
    this.password = password;

    this.firstName = '';
    this.familyName = '';

    this.userConfirmed = false;

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

  toJSON() {
    return {
      firstName: this.firstName,
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
    firstName: string
    familyName: string
    address: string
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
    this.firstName = data['firstName'];
    this.familyName = data['familyName'];
    this.emailAddress = data['emailAddress'];
    this.emailAddressVerified = data['emailAddressVerified'];
    this.mobilePhone = data['mobilePhone'];
    this.mobilePhoneVerified = data['mobilePhoneVerified'];
    this.profilePictureUrl = data['profilePictureUrl']
    this.enableBiometric = data['enableBiometric'];
    this.enableMFA = data['enableMFA'];
    this.enableTOTP = data['enableTOTP'];
    this.rememberFor24h = data['rememberFor24h'];
  }

  /**
   * Returns the users name. Which is the full name
   * if available otherwise it will be the username 
   * used to log in with
   */
  name() {
    if (this.firstName && this.firstName.length > 0
      && this.familyName && this.familyName.length > 0) {

      return this.firstName + ' ' + this.familyName;
    } else {
      return this.username;
    }
  }

  /**
   * Returns if this object contains sufficient 
   * data to be considered valid
   */
  isValid() {
    return (
      this.username.length > 0 &&
      this.emailAddress.length > 0 &&
      this.mobilePhone.length > 0
    );
  }

  /**
   * Returns whether this User registration has
   * been confirmed by either email or SMS.
   */
  isConfirmed() {
    if (!this.userConfirmed) {
      this.userConfirmed = this.emailAddressVerified || this.mobilePhoneVerified;
    }
    return this.userConfirmed;
  }

  /**
   * Check if the user has timed out
   * 
   * @param {number} timestamp 
   */
  isTimedout(timestamp: number) {
    return !this.rememberFor24h || (timestamp + TIMEOUT) < Date.now();
  }

  /**
   * Returns whether this user's sign-in should
   * be remembered.
   */
  rememberSignIn() {
    return this.enableBiometric || this.rememberFor24h;
  }

  /**
   * Password validation
   * 
   * @param {string} password  password to check for policy compliance
   */
  validatePassword(password: string) {

    this.password = '';

    if (password.length == 0) {
      return {
        shortMessage: null,
        longMessage: 'The password is required.'
      };
    }

    // Complete match string
    //
    // '^(?=.*[-_()!@#$%^&+*])(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$'

    let lengthCheck = /[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!lengthCheck.test(password)) {
      return {
        shortMessage: 'too short',
        longMessage: 'The password must have a minimum length of 8 characters.'
      };
    }

    let specialCharCheck = /^(?=.*[-_()!@#$%^&+*])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!specialCharCheck.test(password)) {
      return {
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one special character.'
      };
    }

    let lowercaseCharCheck = /^(?=.*[a-z])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!lowercaseCharCheck.test(password)) {
      return {
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one lowercase character.'
      };
    }

    let uppercaseCharCheck = /^(?=.*[A-Z])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!uppercaseCharCheck.test(password)) {
      return {
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one uppercase character.'
      };
    }

    let numberCheck = /^(?=.*[0-9])[-_()!@#$%^&+*a-zA-Z0-9]{8,}$/;
    if (!numberCheck.test(password)) {
      return {
        shortMessage: 'invalid',
        longMessage: 'The password must have at least one number character.'
      };
    }

    this.password = password;
    return null;
  }

  /**
   * Password verification
   * 
   * @param {*} password  password to verify if it matches the instance value
   */
  verifyPassword(password: string) {

    if (password.length == 0) {

      return {
        shortMessage: null,
        longMessage: 'The password is required.'
      }

    } else if (password.length > 0 && password != this.password) {

      return {
        shortMessage: 'not matching',
        longMessage: 'The verification password does not match the first password you entered.'
      };
    }

    return null;
  }

  /**
   * Username validation
   * 
   * @param {string} username  the user's login name
   * @param {boolean} set       updates the property if valid else resets it
   */
  validateUsername(username: string, set = true) {

    if (set) {
      this.username = '';
    }

    if (username.length == 0) {
      return {
        shortMessage: null,
        longMessage: 'The username is required.'
      };
    }

    if (username.length < 3) {
      return {
        shortMessage: 'too short',
        longMessage: 'The username must be at least 3 characters long.'
      };
    }

    if (set) {
      this.username = username;
    }
    return null;
  }

  /**
   * Email address validation and setting
   * 
   * @param {string} emailAddress  email address
   * @param {boolean} set          updates the property if valid else resets it
   */
  validateEmailAddress(emailAddress: string, set = true) {

    if (set) {
      this.emailAddress = '';
    }

    if (emailAddress.length == 0) {
      return {
        shortMessage: null,
        longMessage: 'The email address is required.'
      };
    }

    let emailFormatCheck = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailFormatCheck.test(emailAddress)) {
      return {
        shortMessage: 'invalid',
        longMessage: '"' + emailAddress + '" is not a valid email address.'
      };
    }

    if (set) {
      this.emailAddress = emailAddress;
    }
    return null;
  }

  /**
   * Mobile phone number validation and setting
   * 
   * @param {string} mobilePhone  mobile phone number
   * @param {boolean} set         updates the property if valid else resets it
   */
  validateMobilePhone(mobilePhone: string, set = true) {

    if (set) {
      this.mobilePhone = '';
    }

    if (mobilePhone.length == 0) {
      return {
        shortMessage: null,
        longMessage: 'The mobile phone number is required.'
      };
    }

    let mobilePhoneFormatCheck = /((?:\+|00)[17](?: |\-)?|(?:\+|00)[1-9]\d{0,2}(?: |\-)?|(?:\+|00)1\-\d{3}(?: |\-)?)?(0\d|\([0-9]{3}\)|[1-9]{0,3})(?:((?: |\-)[0-9]{2}){4}|((?:[0-9]{2}){4})|((?: |\-)[0-9]{3}(?: |\-)[0-9]{4})|([0-9]{7}))/;
    if (!mobilePhoneFormatCheck.test(mobilePhone)) {
      return {
        shortMessage: 'invalid',
        longMessage: '"' + mobilePhone + '" is not a valid phone number.'
      };
    }

    if (set) {
      this.mobilePhone = mobilePhone;
    }
    return null;
  }
}
