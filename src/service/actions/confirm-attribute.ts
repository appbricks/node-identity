import * as redux from 'redux';
import { Epic } from 'redux-observable';

import { Action, createAction, createFollowUpAction, serviceEpic } from '@appbricks/utils';

import Provider from '../provider';
import { AuthLoggedInUserAttrPayload, CONFIRM_ATTRIBUTE_REQ, SERVICE_RESPONSE_OK } from '../action';
import { AuthUserStateProp } from '../state';


export const confirmAttributeAction = 
  (dispatch: redux.Dispatch<redux.Action>, attrName: string, code: string) => 
    dispatch(createAction(CONFIRM_ATTRIBUTE_REQ, <AuthLoggedInUserAttrPayload>{ attrName, code }));

export const confirmAttributeEpic = (csProvider: Provider): Epic => {

  return serviceEpic<AuthLoggedInUserAttrPayload, AuthUserStateProp>(
    CONFIRM_ATTRIBUTE_REQ, 
    async (action, state$) => {
      if (!await csProvider.isLoggedIn()) {
        throw Error('No user logged in. You can confirm an attribute only for logged in user.')
      }

      let attrName = action.payload!.attrName;
      let code = action.payload!.code;
      if (attrName && code) {
        await csProvider.confirmVerificationCodeForAttribute(attrName, code);
        return createFollowUpAction(action, SERVICE_RESPONSE_OK);
      } else {
        throw Error('confirmVerificationCodeForAttribute request action does not have an attribute name and code to confirm.');
      }
    }
  );
}
