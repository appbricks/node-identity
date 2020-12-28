import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  SUCCESS,
  Action, 
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import User from '../../model/user';
import Provider from '../provider';
import { 
  AuthUserPayload, 
  AuthVerificationPayload, 
  SIGN_UP_REQ
} from '../action';
import { AuthStateProps } from '../state';

export const signUpAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(SIGN_UP_REQ, <AuthUserPayload>{ user }));

export const signUpEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUserPayload, AuthStateProps>(
    SIGN_UP_REQ, 
    async (action, state$) => {
      let user = action.payload!.user;
      if (!user.isValid()) {
        throw Error('Insufficient user data provided for sign-up.');
      }

      let info = await csProvider.signUp(user);
      user.setConfirmed(info.isConfirmed);
      return createFollowUpAction<AuthVerificationPayload>(action, SUCCESS, { info });
    }
  );
}
