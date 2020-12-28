import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  SUCCESS,
  Action,
  createAction, 
  createFollowUpAction, 
  serviceEpic 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthStatePayload, 
  SIGN_OUT_REQ 
} from '../action';
import { AuthStateProps } from '../state';

export const signOutAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(SIGN_OUT_REQ));

export const signOutEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthStatePayload, AuthStateProps>(SIGN_OUT_REQ, 
    async (action, state$) => {
      if (await csProvider.isLoggedIn()) {
        await csProvider.signOut();
      }
            
      return createFollowUpAction<AuthStatePayload>(action, SUCCESS, {
        isLoggedIn: false
      });
    }
  );
}
