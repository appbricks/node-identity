import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthStatePayload, LOAD_AUTH_STATE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const loadAuthStateAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(LOAD_AUTH_STATE_REQ));

export const loadAuthStateEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    LOAD_AUTH_STATE_REQ, 
    async (action: Action<AuthStatePayload>, state$: StateObservable<State>) => {
      action.payload = <AuthStatePayload>{
        isLoggedIn: await csProvider.isLoggedIn()
      };
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
