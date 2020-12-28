import { 
  combineReducers, 
  createStore, 
  applyMiddleware
} from 'redux';
import { createEpicMiddleware } from 'redux-observable';

import {
  combineEpicsWithGlobalErrorHandler,
  LOG_LEVEL_TRACE,
  setLogLevel,
  reduxLogger,
} from '@appbricks/utils';
import { ActionTester } from '@appbricks/test-utils';

import { AuthActionProps } from '../../action';
import { MockProvider } from '../../__tests__/mock-provider';
import AuthService from '../../auth-service';

// set log levels
if (process.env.DEBUG) {
  setLogLevel(LOG_LEVEL_TRACE);
}

export const initServiceDispatch = (
  mockProvider: MockProvider,
  actionTester: ActionTester
): AuthActionProps => {

  const rootReducer = combineReducers({
    auth: actionTester.reducer()
  })
  
  const epicMiddleware = createEpicMiddleware();
  store = createStore(
    rootReducer,
    applyMiddleware(reduxLogger, epicMiddleware)
  );
  
  const authService = new AuthService(mockProvider)
  const rootEpic = combineEpicsWithGlobalErrorHandler(authService.epics())
  epicMiddleware.run(rootEpic);

  return AuthService.dispatchProps(store.dispatch as any);
}

export var store: any | undefined = undefined;
