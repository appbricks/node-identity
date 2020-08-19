import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { NOOP, Action, createAction, createFollowUpAction, createErrorAction, serviceEpicFanOut } from '@appbricks/utils';

import Provider from '../provider';
import { AuthMultiFactorAuthPayload, AuthLoggedInPayload, VALIDATE_MFA_CODE_REQ, READ_USER_REQ, SERVICE_RESPONSE_OK } from '../action';
import { AuthUserStateProp } from '../state';

export const validateMFACodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, mfaCode: string) => 
    dispatch(createAction(VALIDATE_MFA_CODE_REQ, <AuthMultiFactorAuthPayload>{ mfaCode }));

export const validateMFACodeEpic = (csProvider: Provider): Epic => {
  
  return serviceEpicFanOut<AuthMultiFactorAuthPayload, AuthUserStateProp>(
    VALIDATE_MFA_CODE_REQ,
    {
      validateMFACode: async (action, state$, callSync) => {      
        if (await csProvider.isLoggedIn()) {
          return createErrorAction(new Error('The current session is already logged in.'), action);
        }
  
        try {
          let payload = action.payload!;
          let isLoggedIn = await csProvider.validateMFACode(payload.mfaCode);
          return createFollowUpAction<AuthLoggedInPayload>(action, SERVICE_RESPONSE_OK, { isLoggedIn });

        } catch (err) {
          return createErrorAction(err, action);
        }
      },
      readUser: async (action, state$, callSync) => {
        // wait for MFA code validation service call to complete
        let dependsAction = await callSync['validateMFACode'];

        // if MFA code validation was successful then 
        // dispatch an action to read the user details
        if (dependsAction.type == SERVICE_RESPONSE_OK
          && dependsAction.payload!.isLoggedIn) {
          
          return createFollowUpAction(dependsAction, READ_USER_REQ);;
        } else {
          return createAction(NOOP);
        }
      }
    }
  );
}
