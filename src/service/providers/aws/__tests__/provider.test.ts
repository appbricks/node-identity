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

let provider = new Provider(Auth);

// the type of test determines the
// test cases that will be run.
let testType = process.env.TEST_TYPE || ''

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
let signUpUser = 'appbricks-test-user-' + signUpTime.getTime();
let verificationCode: string;

it('registers a new user', async () => {

  let user = new User();
  user.username = signUpUser;
  user.password = '@ppBr!cks2020';
  user.firstName = 'John';
  user.familyName = 'Doe';
  user.emailAddress = 'test.appbricks@gmail.com';
  user.mobilePhone = '+17165755305';

  await provider.signUp(user)
    .then(userConfirmed => expect(userConfirmed).toBeFalsy())  

  // pause to allow propagation of
  // verification email to test email
  // account
  await sleep(10000);
});

it('detects new user is not confirmed during sign-in', async () => {
  await provider.signIn(signUpUser, '@ppBr!cks2020')
    .catch(err => expect(err).toEqual('notConfirmed'));
});

it('receives an email with a verification code', async () => { 

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
  console.log("Email was found!", email);

  let bodyPattern = /^Your email address verification code for Identity Test Module is ([0-9]+).$/;
  let matches = bodyPattern.exec(email.body.html);
  expect(matches).toBeDefined();
  verificationCode = matches![1];
});

it('attempts to confirm newly registered user with invalid code', async () => {
  let user = new User()
  user.username = signUpUser
  await provider.confirmSignUpCode(user, '999999')
    .catch(err => expect(err).toEqual('Invalid verification code provided, please try again.'))
});

it('confirms newly registered user', async () => {

  expect(verificationCode).toBeDefined();
  expect(verificationCode.length).toBeGreaterThan(0);
  
  let user = new User();
  user.username = signUpUser;
  await provider.confirmSignUpCode(user, verificationCode)
    .then(confirm => expect(confirm).toBeTruthy());
});

it('attempts to sign-in with an invalid password', async () => {
  let user = new User();
  await provider.signIn(signUpUser, 'invalid')
    .catch(err => expect(err).toEqual('invalidLogin'));
});

it('successfully signs-in', async () => {
  let user = new User();
  await provider.signIn(signUpUser, '@ppBr!cks2020')
    .then(authType => expect(authType).toEqual(0));
});

it('initiates verification of the new user\'s mobile phone', async () => {
  
  await provider.sendVerificationCodeForAttribute('phone_number');

  // pause to allow propagation of
  // SMS to test email account
  await sleep(10000);
});

it('verifies the code receive for validating the mobile phone', async () => {

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

  let bodyPattern = /Your verification code is ([0-9]+)/;
  let matches = bodyPattern.exec(email.body.html);
  expect(matches).toBeDefined();
  expect(matches!.length).toBeGreaterThan(0);
  verificationCode = matches![1];

  await provider.confirmVerificationCodeForAttribute('phone_number', verificationCode);
})
