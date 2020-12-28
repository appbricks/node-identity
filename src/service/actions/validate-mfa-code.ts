import * as redux from 'redux';
import { Epic } from 'redux-observable';

import {
  SUCCESS, 
  NOOP, 
  Action, 
  createAction, 
  createFollowUpAction, 
  createErrorAction, 
  serviceEpicFanOut 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthMultiFactorAuthPayload, 
  AuthLoggedInPayload, 
  VALIDATE_MFA_CODE_REQ, 
  READ_USER_REQ 
} from '../action';
import { AuthStateProps } from '../state';

export const validateMFACodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, mfaCode: string, mfaType: number) => 
    dispatch(createAction(VALIDATE_MFA_CODE_REQ, <AuthMultiFactorAuthPayload>{ mfaCode, mfaType }));

export const validateMFACodeEpic = (csProvider: Provider): Epic => {
  
  return serviceEpicFanOut<AuthMultiFactorAuthPayload, AuthStateProps>(
    VALIDATE_MFA_CODE_REQ,
    {
      validateMFACode: async (action, state$, callSync) => {      
        if (await csProvider.isLoggedIn()) {
          return createErrorAction(new Error('The current session is already logged in.'), action);
        }
  
        try {
          let payload = action.payload!;
          let isLoggedIn = await csProvider.validateMFACode(payload.mfaCode, payload.mfaType);
          return createFollowUpAction<AuthLoggedInPayload>(action, SUCCESS, { 
            isLoggedIn, 
            mfaType: payload.mfaType
          });

        } catch (err) {
          return createErrorAction(err, action);
        }
      },
      readUser: async (action, state$, callSync) => {
        // wait for MFA code validation service call to complete
        let dependsAction = await callSync['validateMFACode'];

        // if MFA code validation was successful then 
        // dispatch an action to read the user details
        if (dependsAction.type == SUCCESS
          && dependsAction.payload!.isLoggedIn) {
          
          return createFollowUpAction(dependsAction, READ_USER_REQ);;
        } else {
          return createAction(NOOP);
        }
      }
    }
  );
}
