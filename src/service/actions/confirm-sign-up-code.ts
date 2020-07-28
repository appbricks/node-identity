import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthUsernamePayload, CONFIRM_SIGN_UP_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';
import { AuthUserStateProp } from '../state';

export const confirmSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, code: string) => 
    dispatch(createAction(CONFIRM_SIGN_UP_CODE_REQ, <AuthUsernamePayload>{ username, code }));

export const confirmSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    CONFIRM_SIGN_UP_CODE_REQ, 
    async (action: Action<AuthUsernamePayload>, state$: StateObservable<State>) => {
      let state = <AuthUserStateProp>state$.value;
      let isConfirmed = await csProvider.confirmSignUpCode(action.payload!.username, action.payload!.code!);
      if (state.auth.user) {
        state.auth.user.setConfirmed(isConfirmed);
      }
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
