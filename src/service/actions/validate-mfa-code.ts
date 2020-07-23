import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { State, Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthMultiFactorAuthPayload, VALIDATE_MFA_CODE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const validateMFACodeAction = 
  (dispatch: redux.Dispatch<redux.Action>, mfaCode: string) => 
    dispatch(createAction(VALIDATE_MFA_CODE_REQ, <AuthMultiFactorAuthPayload>{ mfaCode }));

export const validateMFACodeEpic = (csProvider: Provider): Epic => {

  return serviceEpic(VALIDATE_MFA_CODE_REQ, 
    async (action: Action, state$: StateObservable<State>) => {
      if (await csProvider.isLoggedIn()) {
        throw Error('The current session is already logged in.')
      }

      let payload = (<AuthMultiFactorAuthPayload>action.payload);
      payload.isLoggedIn = await csProvider.validateMFACode(payload.mfaCode);
      return createFollowUpAction(action, SERVICE_RESPONSE_OK);
    }
  );
}
