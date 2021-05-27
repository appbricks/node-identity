import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { 
  SUCCESS,
  NOOP,
  RESET_STATE,
  Action,
  createAction, 
  createFollowUpAction, 
  serviceEpicFanOut 
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

  return serviceEpicFanOut<AuthStatePayload, AuthStateProps>(
    SIGN_OUT_REQ, 
    {
      signOut: async (action, state$) => {
        if (await csProvider.isLoggedIn()) {
          await csProvider.signOut();
        }
              
        return createFollowUpAction<AuthStatePayload>(action, SUCCESS, {
          isLoggedIn: false
        });
      },
      resetState: async (action, state$, callSync) => {
        // wait for sign-out service call to complete
        let dependsAction = await callSync['signOut'];

        if (dependsAction.type == SUCCESS) {
          return createAction(RESET_STATE);
        } else {
          return createAction(NOOP);
        }
      }
    }
  );
}
