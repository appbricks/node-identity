import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUserPayload, SIGN_UP_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const signUpAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(SIGN_UP_REQ, <AuthUserPayload>{ user }));

export const signUpEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    SIGN_UP_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      let user = (<AuthUserPayload>action.payload).user;
      user.userConfirmed = await csProvider.signUp(user);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
