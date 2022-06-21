/**
 * User Identity
 */

export default class User {

  status: UserStatus;

  userID: string;
  username: string;

  firstName?: string;
  middleName?: string;
  familyName?: string;
  preferredName?: string;

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
    
    this.userID = '';

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
    userID: string
    username: string
    firstName?: string
    middleName?: string
    familyName?: string
    preferredName?: string
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
    // if at one of email or mobile phone 
    // is verified then user is confirmed
    if (this.status == UserStatus.Unknown && 
      (this.emailAddressVerified || this.mobilePhoneVerified)) {
      
      this.status = UserStatus.Confirmed;
    }

    return {
      status: this.status,
      userID: this.userID,
      username: this.username,
      firstName: this.firstName,
      middleName: this.middleName,
      familyName: this.familyName,
      preferredName: this.preferredName,
      emailAddress: this.emailAddress,
      emailAddressVerified: this.emailAddressVerified,
      mobilePhone: this.mobilePhone,
      mobilePhoneVerified: this.mobilePhoneVerified,
      profilePictureUrl: this.profilePictureUrl,
      enableBiometric: this.enableBiometric,
      enableMFA: this.enableMFA,
      enableTOTP: this.enableTOTP,
      rememberFor24h: this.rememberFor24h
    }
  }

  fromJSON(data: {
    status: UserStatus
    userID: string
    username: string
    firstName?: string
    middleName?: string
    familyName?: string
    preferredName?: string
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
    // if at one of email or mobile phone 
    // is verified then user is confirmed
    if (data.status == UserStatus.Unknown && 
      (data.emailAddressVerified || data.mobilePhoneVerified)) {
      
      this.status = UserStatus.Confirmed;
    } else {
      this.status = data.status;
    }

    this.userID = data.userID;
    this.username = data.username;
    this.firstName = data.firstName;
    this.middleName = data.middleName;
    this.familyName = data.familyName;
    this.preferredName = data.preferredName;
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
      this.emailAddress !== undefined  && this.emailAddress.length > 0 &&
      this.mobilePhone !== undefined  && this.mobilePhone.length > 0
    );
  }

  /**
   * Returns whether this User registration has
   * been confirmed by either email or SMS.
   */
  isConfirmed(): boolean {
    
    return (
      this.status == UserStatus.Confirmed || 
      (this.status == UserStatus.Unknown && 
        (this.emailAddressVerified || this.mobilePhoneVerified))
    );
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
}

export enum UserStatus {
  Unknown = 0,
  Unregistered,
  Unconfirmed,
  Confirmed
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
