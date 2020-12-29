import User from '../../model/user';

export const getTestUser = (): User => {

  let user = new User();
  user.username = 'johndoe';
  user.firstName = 'John';
  user.middleName = 'Bee'
  user.familyName = 'Doe';
  user.preferredName = 'JD';
  user.emailAddress = 'test.appbricks@gmail.com';
  user.mobilePhone = '9999999999';
  return user;
}

export const expectTestUserToBeSet = (
  user: User | undefined, 
  userConfirmed: boolean = false, 
  mfaEnabled: boolean = false,
  mobilePhoneVerified = false
) => {

  expect(user).toBeDefined();
  expect(user!.username).toEqual('johndoe');
  expect(user!.firstName).toEqual('John');
  expect(user!.middleName).toEqual('Bee');
  expect(user!.familyName).toEqual('Doe');
  expect(user!.preferredName).toEqual('JD');
  expect(user!.emailAddress).toEqual('test.appbricks@gmail.com');
  expect(user!.mobilePhone).toEqual('9999999999');
  expect(user!.mobilePhoneVerified).toBe(mobilePhoneVerified);
  expect(user!.isConfirmed()).toEqual(userConfirmed);
  expect(user!.enableBiometric).toEqual(false);
  expect(user!.enableTOTP).toEqual(false);
  expect(user!.enableMFA).toEqual(mfaEnabled);
}
