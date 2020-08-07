import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import Provider from '../provider';
import { AuthMultiFactorAuthPayload, AuthLoggedInPayload, VALIDATE_MFA_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import { AuthUserStateProp } from '../state';

export const validateMFACodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, mfaCode: string) => 
    dispatch(createAction(VALIDATE_MFA_CODE_REQ, <AuthMultiFactorAuthPayload>{ mfaCode }));

export const validateMFACodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthMultiFactorAuthPayload, AuthUserStateProp>(VALIDATE_MFA_CODE_REQ, 
    async (action, state$) => {
      if (await csProvider.isLoggedIn()) {
        throw Error('The current session is already logged in.')
      }

      let payload = action.payload!;
      let isLoggedIn = await csProvider.validateMFACode(payload.mfaCode);
      return createFollowUpAction<AuthLoggedInPayload>(action, SERVICE_RESPONSE_OK, { isLoggedIn });
    }
  );
}
