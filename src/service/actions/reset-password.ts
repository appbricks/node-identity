import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUserPayload, RESET_PASSWORD_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const resetPasswordAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(RESET_PASSWORD_REQ, <AuthUserPayload>{ user }));

export const resetPasswordEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    RESET_PASSWORD_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      await csProvider.resetPassword((<AuthUserPayload>action.payload).user);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
