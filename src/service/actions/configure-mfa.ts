import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import User from '../../model/user';
import { AuthUserPayload, CONFIGURE_MFA_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const configureMFAAction = 
  (dispatch: redux.Dispatch<redux.Action>, user: User) => 
    dispatch(createAction(CONFIGURE_MFA_REQ, <AuthUserPayload>{ user }));

export const configureMFAEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    CONFIGURE_MFA_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      await csProvider.configureMFA((<AuthUserPayload>action.payload).user!);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
