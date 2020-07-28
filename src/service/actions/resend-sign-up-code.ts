import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUsernamePayload, RESEND_SIGN_UP_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const resendSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, username: string) => 
    dispatch(createAction(RESEND_SIGN_UP_CODE_REQ, <AuthUsernamePayload>{ username }));

export const resendSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    RESEND_SIGN_UP_CODE_REQ, 
    async (action: Action<AuthUsernamePayload>, state$: StateObservable<State>) => {
      await csProvider.resendSignUpCode(action.payload!.username);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
