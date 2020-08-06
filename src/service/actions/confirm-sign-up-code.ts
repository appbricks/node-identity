import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import Provider from '../provider';
import { AuthUsernamePayload, CONFIRM_SIGN_UP_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import { AuthUserStateProp } from '../state';

export const confirmSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string, code: string) => 
    dispatch(createAction(CONFIRM_SIGN_UP_CODE_REQ, <AuthUsernamePayload>{ username, code }));

export const confirmSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUsernamePayload, AuthUserStateProp>(
    CONFIRM_SIGN_UP_CODE_REQ, 
    async (action, state$) => {
      let state = state$.value;
      let isConfirmed = await csProvider.confirmSignUpCode(action.payload!.username, action.payload!.code!);
      if (state.auth.user) {
        state.auth.user.setConfirmed(isConfirmed);
      }
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
