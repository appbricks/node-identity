import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUsernamePayload, UPDATE_PASSWORD_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const updatePasswordAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, password: string, code: string) => 
    dispatch(createAction(UPDATE_PASSWORD_REQ, <AuthUsernamePayload>{ username, password, code }));

export const updatePasswordEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    UPDATE_PASSWORD_REQ, 
    async (action: Action<AuthUsernamePayload>, state$: StateObservable<State>) => {
      let payload = action.payload!;
      await csProvider.updatePassword(payload.username, payload.password!, payload.code!);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
