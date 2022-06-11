import * as redux from 'redux';
import { Epic } from 'redux-observable';
import gravatar from 'gravatar';
import axios from 'axios';

import { 
  Logger,
  BROADCAST,
  SUCCESS,
  Action, 
  BroadCastPayload,
  createAction, 
  createFollowUpAction, 
  serviceEpicFanOut 
} from '@appbricks/utils';

import Provider from '../provider';
import { 
  AuthUserPayload, 
  READ_USER_REQ
} from '../action';
import { AuthStateProps } from '../state';

export const readUserAction = 
  (dispatch: redux.Dispatch<redux.Action>) => 
    dispatch(createAction(READ_USER_REQ));

export const readUserEpic = (csProvider: Provider): Epic => {

  return serviceEpicFanOut(
    READ_USER_REQ, 
    {
      readUser: async (action, state$, callSync) => {
        if (!await csProvider.isLoggedIn()) {
          throw Error('No user logged in. The user needs to be logged in before it can be read.')
        }
  
        const user = await csProvider.readUser();
  
        // *** AVATAR retrieval should be moved to the profile module ***
        //
        // determine gravatar image url using the user login/email
        const gravatarUrl = gravatar.url(
          user.emailAddress,
          {
            protocol: 'https',
            default: '404',
            size: '42'
          }
        );
        await axios.get(gravatarUrl)
          .then( () => {
            Logger.trace(
              'readUser', 
              'Found Gravatar profile image for email:', 
              user.emailAddress, 
              gravatarUrl
            );
            user.profilePictureUrl = gravatarUrl;
          })
          .catch(() => {
            Logger.trace(
              'readUser', 
              'Gravatar profile image not found:', 
              user.emailAddress, 
              gravatarUrl
            );
            user.profilePictureUrl = undefined;
          });
        // **************************************************************
        
        return createFollowUpAction<AuthUserPayload>(action, SUCCESS, { user });
      },
      broadCastUserLogin: async (action, state$, callSync) => {
        // wait for read user service call to complete
        let dependsAction = <Action<AuthUserPayload>>await callSync['readUser'];

        return createAction<BroadCastPayload>(BROADCAST, { 
          __typename: 'UserLogin',
          userID: dependsAction.payload?.user.userID
        });
      },
    }
  );
}
