import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthStatePayload, SIGN_OUT_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const signOutAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(SIGN_OUT_REQ));

export const signOutEpic = (csProvider: Provider): Epic => {

  return serviceEpic(SIGN_OUT_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      if (await csProvider.isLoggedIn()) {
        await csProvider.signOut();
      }
      (<AuthStatePayload>action.payload).isLoggedIn = false;
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
