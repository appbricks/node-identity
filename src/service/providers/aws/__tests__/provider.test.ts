import { promisify } from 'util';
import path from 'path';

import fetch from 'node-fetch';
Object.defineProperty(global, 'fetch', {
  value: fetch
});

// const sleep = promisify(setTimeout);
jest.setTimeout(120000);

// these tests are done end-to-end and require
// a pre-confgured cognito user pool accessible 
// over the wire. it is important that the web
// client app is configured to allow 
// USER_PASSWORD_AUTH due to a cryptographic
// issue when running from a local node
// runtime.

// https://github.com/aws-amplify/amplify-js/issues/1181
import 'crypto-js/lib-typedarrays';

import Amplify, { Auth } from 'aws-amplify';
import awsconfig from '../../../../../etc/aws-exports';
Amplify.configure(awsconfig);

// it appears USER_SRP_AUTH still fails when run within 
// tests. so fall back is to do password auth which is 
// not recommendation in prod ready app code. USER_SRP_AUTH
// works fine from the browser.
Auth.configure({
  authenticationFlowType: 'USER_PASSWORD_AUTH'
})

// gmail test account credentials
const gmail = require("gmail-tester");
const GMAIL_CREDS_PATH = '../../../../../etc/gmail-creds.json';
const GMAIL_AUTH_TOKEN_PATH = '../../../../../.gmail-token';

const testEmail = process.env.TEST_EMAIL || 'test.appbricks@gmail.com';
const testPhone = process.env.TEST_PHONE || '+19782950877';

async function lookupCodeFromEmail(subject: string, bodyPattern: RegExp): Promise<string> {
  console.info('Waiting for an email with a verification or authentication code...');

  // pause to allow propagation of verification or 
  // authentication message to test email account
  await sleep(10000);

  let emails = await gmail.check_inbox(
    path.resolve(__dirname, GMAIL_CREDS_PATH),
    path.resolve(__dirname, GMAIL_AUTH_TOKEN_PATH),
    {
      subject: subject,
      wait_time_sec: 5,
      max_wait_time_sec: 60,
      include_body: true
    }
  );
  expect(emails.length).toBeGreaterThan(0);
  const email = emails[0];

  expect(email).toBeDefined();
  expect(email.receiver).toEqual(testEmail);

  let matches = bodyPattern.exec(email.body.html);
  expect(matches).toBeDefined();
  let code = matches![1];
  expect(code).toBeDefined();
  expect(code.length).toBeGreaterThan(0);
  return code;
}

import { LOG_LEVEL_TRACE, setLogLevel, sleep } from '@appbricks/utils';

// set log levels
if (process.env.DEBUG) {
  Amplify.Logger.LOG_LEVEL = 'DEBUG';
  setLogLevel(LOG_LEVEL_TRACE);
}

import User, { UserStatus, VerificationType } from '../../../../model/user';
import Provider from '../provider';

import {
  AUTH_NO_MFA,
  AUTH_MFA_SMS,

  ERROR_NOT_CONFIRMED,
  ERROR_INVALID_CODE,
  ERROR_INVALID_LOGIN,
  ERROR_SETUP_TOTP
} from '../../../constants';

let provider = new Provider(Auth);

it('detects invalid initial session', async () => {
  expect(await provider.validateSession()).toBeFalsy();
});

// the time at which the test account
// is registered. this will be used to
// filter the test gmail email account
// for the verification message
let signUpTime = new Date();
let signUpUserName = 'appbricks-test-user-' + signUpTime.getTime();

it('registers a new user, confirms registration and signs-in', async () => {

  console.info('Signing up new user...');
  let user = new User();
  user.username = signUpUserName;
  user.password = '@ppBr!cks2020';
  user.emailAddress = testEmail;
  user.mobilePhone = testPhone;

  await provider.signUp(user)
    .then(info => {
      expect(info.type).toBe(VerificationType.Email);
      expect(info.destination).toEqual('t***@g***.com');
      expect(info.attrName).toEqual('email');      
      expect(info.isConfirmed).toBeFalsy();
    });

  console.info('Attempting to sign-in and expecting failure as user has not been confirmed...');
  await provider.signIn(signUpUserName, '@ppBr!cks2020')
    .catch(err => expect(err.name).toEqual(ERROR_NOT_CONFIRMED));

  console.info('Attempting to confirm newly registered user with invalid code and expecting error...');
  await provider.confirmSignUpCode(user.username, '999999')
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_CODE));

  let verificationCode1 = await lookupCodeFromEmail(
    'Your verification code for Identity Test Module',
    /^Your email address verification code for Identity Test Module is ([0-9]+).$/);

  console.info('Requesting new sign up code...');
  await provider.resendSignUpCode(user.username)
    .then(info => {
      expect(info.type).toBe(VerificationType.Email);
      expect(info.destination).toEqual('t***@g***.com');
      expect(info.attrName).toEqual('email');      
      expect(info.isConfirmed).toBeFalsy();
    });

  let verificationCode2 = await lookupCodeFromEmail(
    'Your verification code for Identity Test Module',
    /^Your email address verification code for Identity Test Module is ([0-9]+).$/);

  expect(verificationCode2).not.toEqual(verificationCode1);

  console.info(`Confirming newly registered user with code ${verificationCode2}...`);  
  await provider.confirmSignUpCode(user.username, verificationCode2)
    .then(confirm => expect(confirm).toBeTruthy());

  console.info('Signing in with an invalid password and expecting an error...');
  await provider.signIn(signUpUserName, 'invalid')
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_LOGIN));
  
  console.info('Signing in with a valid password...');
  await provider.signIn(signUpUserName, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_NO_MFA));
});

// test user to use for rest of the tests
let testUser = process.env.TEST_USER || signUpUserName

it('initiates verification of the new user\'s mobile phone', async () => {

  console.info(`Logging in with test user ${testUser}...`);
  await provider.signIn(testUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_NO_MFA));

  console.info('Initiating phone number verification...')
  await provider.sendVerificationCodeForAttribute('phone_number');

  let verificationCode = await lookupCodeFromEmail(
    'New text message from',
    /Your mobile phone verification code for Identity Test Module is ([0-9]+)/);

  console.info('Attempting to confirm phone number with invalid verification code and expecting an error...');
  await provider.confirmVerificationCodeForAttribute('phone_number', '0000')
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_CODE));

  console.info(`Confirming phone number with verification code ${verificationCode}...`);
  await provider.confirmVerificationCodeForAttribute('phone_number', verificationCode);
});

it('sets up and verifies user\'s totp settings', async () => {

  console.info(`Logging in with test user ${testUser}...`);
  await provider.signIn(testUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_NO_MFA));

  // configure TOTP
  const secret = await provider.setupTOTP();
  expect(secret).toBeDefined();
  expect(secret.length).toBeGreaterThan(0);
  // we cannot verify the code without setting 
  // up the secret in google authenticator so 
  // expect and error on an invalid code
  await provider.verifyTOTP('123456')
    .catch(err => expect(err.name).toEqual(ERROR_SETUP_TOTP));
});

it('configures user\'s mfa settings and saves additional attributes', async () => {

  console.info(`Logging in with test user ${testUser}...`);
  await provider.signIn(testUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_NO_MFA));

  let user = new User();
  user.username = testUser;
  user.firstName = 'John';
  user.middleName = 'Kai';
  user.familyName = 'Doe';
  user.preferredName = 'JD';
  user.emailAddress = testEmail;
  user.mobilePhone = testPhone;
  user.enableMFA = true;
  user.enableTOTP = false;
  user.rememberFor24h = true;

  await provider.saveUser(user);
});

it('attempts to sign in using mfa with invalid code', async () => {

  console.info(`Logging in with test user ${testUser}...`);
  await provider.signIn(testUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_MFA_SMS));

  console.info('Attempting MFA authentication with invalid code and expecting an error...');
  await provider.validateMFACode('0000', AUTH_MFA_SMS)
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_CODE));

  expect(await provider.isLoggedIn()).toBeFalsy();
});

it('signs in using mfa and reads the user\'s attributes', async () => {

  console.info(`Logging in with test user ${testUser}...`);
  await provider.signIn(testUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_MFA_SMS));

  let authCode = await lookupCodeFromEmail(
    'New text message from',
    /Your SMS authentication code for Identity Test Module is ([0-9]+)/);

  console.info(`Performing MFA authentication with valid code ${authCode}...`);
  await provider.validateMFACode(authCode, AUTH_MFA_SMS);
  expect(await provider.isLoggedIn()).toBeTruthy();

  let user = await provider.readUser();
  expect(user.status).toEqual(UserStatus.Confirmed);
  expect(user.username).toEqual(testUser);
  expect(user.firstName).toEqual('John');
  expect(user.middleName).toEqual('Kai');
  expect(user.familyName).toEqual('Doe');
  expect(user.preferredName).toEqual('JD');
  expect(user.emailAddress).toEqual(testEmail);
  expect(user.emailAddressVerified).toBeTruthy();
  expect(user.mobilePhone).toEqual(testPhone);
  expect(user.mobilePhoneVerified).toBeTruthy();
  expect(user.enableMFA).toBeTruthy();
  expect(user.enableTOTP).toBeFalsy();
  expect(user.rememberFor24h).toBeTruthy();

  await provider.signOut();
  expect(await provider.isLoggedIn()).toBeFalsy();
});

it('does a password reset and signs-in using the new password', async () => {

  console.info('Initiating a password reset flow...');
  await provider.resetPassword(testUser);

  let resetCode = await lookupCodeFromEmail(
    'Your verification code for Identity Test Module',
    /^Your email address verification code for Identity Test Module is ([0-9]+).$/);

  console.info(`Updating user with new password using confirmation code ${resetCode}...`);
  await provider.updatePassword(testUser, '@ppBricks1!2@', resetCode);

  console.info(`Logging in test user ${testUser} with new password...`);
  await provider.signIn(testUser, '@ppBricks1!2@')
    .then(authType => expect(authType).toEqual(AUTH_MFA_SMS));

  let authCode = await lookupCodeFromEmail(
    'New text message from',
    /Your SMS authentication code for Identity Test Module is ([0-9]+)/);

  console.info(`Performing MFA authentication with code ${authCode}...`);
  await provider.validateMFACode(authCode, AUTH_MFA_SMS);
  expect(await provider.isLoggedIn()).toBeTruthy();
});
