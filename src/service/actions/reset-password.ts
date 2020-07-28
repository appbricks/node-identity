import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthUsernamePayload, RESET_PASSWORD_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const resetPasswordAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string) => 
    dispatch(createAction(RESET_PASSWORD_REQ, <AuthUsernamePayload>{ username }));

export const resetPasswordEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    RESET_PASSWORD_REQ, 
    async (action: Action<AuthUsernamePayload>, state$: StateObservable<State>) => {
      await csProvider.resetPassword(action.payload!.username);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
