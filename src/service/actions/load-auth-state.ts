import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import Provider from '../provider';
import { AuthStatePayload, LOAD_AUTH_STATE_REQ, SERVICE_RESPONSE_OK } from '../action';
import { AuthStateProps } from '../state';

export const loadAuthStateAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(LOAD_AUTH_STATE_REQ));

export const loadAuthStateEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthStatePayload, AuthStateProps>(
    LOAD_AUTH_STATE_REQ, 
    async (action, state$) => {
      action.payload = <AuthStatePayload>{
        isLoggedIn: await csProvider.isLoggedIn()
      };
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
