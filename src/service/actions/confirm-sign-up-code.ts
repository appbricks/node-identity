import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUserPayload, CONFIRM_SIGN_UP_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const confirmSignUpCodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User, code: string) => 
    dispatch(createAction(CONFIRM_SIGN_UP_CODE_REQ, <AuthUserPayload>{ user, code }));

export const confirmSignUpCodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    CONFIRM_SIGN_UP_CODE_REQ, 
    async (action: Action<AuthUserPayload>, state$: StateObservable<State>) => {
      action.payload!.user.userConfirmed = await csProvider.confirmSignUpCode(action.payload!.user, action.payload!.code!);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
