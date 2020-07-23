import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUserPayload, RESEND_SIGN_UP_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const resendSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(RESEND_SIGN_UP_CODE_REQ, <AuthUserPayload>{ user }));

export const resendSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    RESEND_SIGN_UP_CODE_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      await csProvider.resendSignUpCode((<AuthUserPayload>action.payload).user);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
