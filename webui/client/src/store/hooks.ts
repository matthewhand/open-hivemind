import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for specific slices
export const useAuth = () => {
  const auth = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  return { auth, dispatch };
};

export const useDashboard = () => {
  const dashboard = useAppSelector(state => state.dashboard);
  const dispatch = useAppDispatch();
  return { dashboard, dispatch };
};

export const useConfig = () => {
  const config = useAppSelector(state => state.config);
  const dispatch = useAppDispatch();
  return { config, dispatch };
};

export const useUI = () => {
  const ui = useAppSelector(state => state.ui);
  const dispatch = useAppDispatch();
  return { ui, dispatch };
};

export const usePerformance = () => {
  const performance = useAppSelector(state => state.performance);
  const dispatch = useAppDispatch();
  return { performance, dispatch };
};

export const useWebSocket = () => {
  const websocket = useAppSelector(state => state.websocket);
  const dispatch = useAppDispatch();
  return { websocket, dispatch };
};

export const useError = () => {
  const error = useAppSelector(state => state.error);
  const dispatch = useAppDispatch();
  return { error, dispatch };
};