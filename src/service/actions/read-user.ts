import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import Provider from '../provider';
import { AuthUserPayload, READ_USER_REQ, SERVICE_RESPONSE_OK } from '../action';
import { AuthUserStateProp } from '../state';

export const readUserAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(READ_USER_REQ));

export const readUserEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthUserPayload, AuthUserStateProp>(
    READ_USER_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. The user needs to be logged in before it can be read.')
      }

      action.payload = <AuthUserPayload>{
        user: await csProvider.readUser()
      };
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
