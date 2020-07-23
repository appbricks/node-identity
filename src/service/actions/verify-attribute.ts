import * as redux from 'redux';
import { Epic, StateObservable } from 'redux-observable';

import { createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import { AuthUserState } from '../../state/state';
import { AuthLoggedInUserAttrAction, VERIFY_ATTRIBUTE_REQ, SERVICE_RESPONSE_OK } from '../action';
import Provider from '../provider';

export const verifyAttributeAction = 
  (dispatch: redux.Dispatch<redux.Action>, attrName: string) => 
    dispatch(createAction(VERIFY_ATTRIBUTE_REQ, {attrName}));

export const verifyAttributeEpic = (csProvider: Provider): Epic => {

  return serviceEpic(
    VERIFY_ATTRIBUTE_REQ, 
    async (action: AuthLoggedInUserAttrAction, state$: StateObservable<AuthUserState>) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. You can validate an attribute only for logged in user.')
      }

      let attrName = action.payload.attrName;
      if (attrName) {
        await csProvider.sendVerificationCodeForAttribute(attrName);
        return createFollowUpAction(action, SERVICE_RESPONSE_OK);
      } else {
        throw Error('sendVerificationCodeForAttribute request action does not have an attribute name to verify.');
      }
    }
  );
}
