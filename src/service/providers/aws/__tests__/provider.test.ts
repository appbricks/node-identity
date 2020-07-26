import { promisify } from 'util';
import path from 'path';

import fetch from 'node-fetch';
Object.defineProperty(global, 'fetch', {
  value: fetch
});

// const sleep = promisify(setTimeout);
jest.setTimeout(60000);

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

import { LOG_LEVEL_TRACE, setLogLevel, sleep } from '@appbricks/utils';
import User from '../../../../model/user';
import Provider from '../provider';

import {
  AUTH_NO_MFA,
  AUTH_MFA_SMS,

  ERROR_NOT_CONFIRMED,
  ERROR_INVALID_CODE,
  ERROR_INVALID_LOGIN
} from '../../../constants';

let provider = new Provider(Auth);

// gmail test account credentials
const gmail = require("gmail-tester");
const GMAIL_CREDS_PATH = '../../../../../etc/gmail-creds.json';
const GMAIL_AUTH_TOKEN_PATH = '../../../../../.gmail-token';

// set log levels
if (process.env.DEBUG) {
  Amplify.Logger.LOG_LEVEL = 'DEBUG';
  setLogLevel(LOG_LEVEL_TRACE);
}

it('detects invalid initial session', async () => {
  expect(await provider.validateSession()).toBeFalsy();
});

// the time at which the test account
// is registered. this will be used to
// filter the test gmail email account
// for the verification message
let signUpTime = new Date();
let signUpUserName = 'appbricks-test-user-' + signUpTime.getTime();
let verificationCode: string;

it('registers a new user, confirms registration and signs-in', async () => {

  console.info('Signing up new user...');
  let user = new User();
  user.username = signUpUserName;
  user.password = '@ppBr!cks2020';
  user.emailAddress = 'test.appbricks@gmail.com';
  user.mobilePhone = '+17165755305';

  await provider.signUp(user)
    .then(userConfirmed => expect(userConfirmed).toBeFalsy());

  // pause to allow propagation of
  // verification email to test email
  // account
  await sleep(10000);

  console.info('Attempting to sign-in and expecting failure as user has not been confirmed...');
  await provider.signIn(signUpUserName, '@ppBr!cks2020')
    .catch(err => expect(err.name).toEqual(ERROR_NOT_CONFIRMED));

  console.info('Waiting for new user verification email...');
  const email = await gmail.check_inbox(
    path.resolve(__dirname, GMAIL_CREDS_PATH),
    path.resolve(__dirname, GMAIL_AUTH_TOKEN_PATH),
    {
      subject: "Your verification code for Identity Test Module",
      wait_time_sec: 10,
      max_wait_time_sec: 60,
      after: signUpTime,
      include_body: true
    }
  );

  expect(email).toBeDefined();
  expect(email.receiver).toEqual('test.appbricks@gmail.com');
  console.info("Verification email with code was found...", email);

  let bodyPattern = /^Your email address verification code for Identity Test Module is ([0-9]+).$/;
  let matches = bodyPattern.exec(email.body.html);
  expect(matches).toBeDefined();
  verificationCode = matches![1];

  console.info('Attempting to confirm newly registered user with invalid code and expecting error...');
  await provider.confirmSignUpCode(user, '999999')
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_CODE));

  console.info('Confirming newly registered user with valid code...');
  expect(verificationCode).toBeDefined();
  expect(verificationCode.length).toBeGreaterThan(0);
  
  await provider.confirmSignUpCode(user, verificationCode)
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

  // pause to allow propagation of
  // SMS to test email account
  await sleep(10000);

  console.info('Waiting for phone number verification text to be forwarded to the test email inbox...');
  const email = await gmail.check_inbox(
    path.resolve(__dirname, GMAIL_CREDS_PATH),
    path.resolve(__dirname, GMAIL_AUTH_TOKEN_PATH),
    {
      subject: "New text message from",
      wait_time_sec: 10,
      max_wait_time_sec: 60,
      after: signUpTime,
      include_body: true
    }
  );

  expect(email).toBeDefined();
  expect(email.receiver).toEqual('test.appbricks@gmail.com');
  console.log("Email with text message!", email);

  let bodyPattern = /Your mobile phone verification code for Identity Test Module is ([0-9]+)/;
  let matches = bodyPattern.exec(email.body.html);
  expect(matches).toBeDefined();
  expect(matches!.length).toBeGreaterThan(0);
  verificationCode = matches![1];

  console.info('Attempting to confirm phone number with invalid verification code and expecting an error...');
  await provider.confirmVerificationCodeForAttribute('phone_number', '0000')
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_CODE));

  console.info('Confirming phone number with valid verification code...');
  await provider.confirmVerificationCodeForAttribute('phone_number', verificationCode);
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
  user.emailAddress = 'test.appbricks@gmail.com';
  user.mobilePhone = '+17165755305';
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
  await provider.validateMFACode('0000')
    .catch(err => expect(err.name).toEqual(ERROR_INVALID_CODE));

  expect(await provider.isLoggedIn()).toBeFalsy();
});

it('signs in using mfa and reads the user\'s attributes', async () => {

  console.info(`Logging in with test user ${testUser}...`);
  await provider.signIn(testUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(AUTH_MFA_SMS));

  // pause to allow propagation of
  // SMS to test email account
  await sleep(10000);

  console.info('Waiting for phone number verification text to be forwarded to the test email inbox...');
  const email = await gmail.check_inbox(
    path.resolve(__dirname, GMAIL_CREDS_PATH),
    path.resolve(__dirname, GMAIL_AUTH_TOKEN_PATH),
    {
      subject: "New text message from",
      wait_time_sec: 10,
      max_wait_time_sec: 60,
      after: signUpTime,
      include_body: true
    }
  );

  expect(email).toBeDefined();
  expect(email.receiver).toEqual('test.appbricks@gmail.com');
  console.log("Email with text message!", email);

  let bodyPattern = /Your SMS authentication code for Identity Test Module is ([0-9]+)/;
  let matches = bodyPattern.exec(email.body.html);
  expect(matches).toBeDefined();
  expect(matches!.length).toBeGreaterThan(0);
  verificationCode = matches![1];

  console.info('Performing MFA authentication with valid code...');
  await provider.validateMFACode(verificationCode);
  expect(await provider.isLoggedIn()).toBeTruthy();

  let user = await provider.readUser();
  expect(user.username).toEqual(testUser);
  expect(user.firstName).toEqual('John');
  expect(user.middleName).toEqual('Kai');
  expect(user.familyName).toEqual('Doe');
  expect(user.emailAddress).toEqual('test.appbricks@gmail.com');
  expect(user.emailAddressVerified).toBeTruthy();
  expect(user.mobilePhone).toEqual('+17165755305');
  expect(user.mobilePhoneVerified).toBeTruthy();
  expect(user.enableMFA).toBeTruthy();
  expect(user.enableTOTP).toBeFalsy();
  expect(user.rememberFor24h).toBeTruthy();

  await provider.signOut();
  expect(await provider.isLoggedIn()).toBeFalsy();
})
