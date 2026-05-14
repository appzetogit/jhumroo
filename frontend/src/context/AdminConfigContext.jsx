import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getDefaultAdminConfig } from '../data/adminDefaultConfig';
import {
  onAdminConfigUpdate,
  readAdminConfig,
  resetAdminConfig,
  writeAdminConfig,
} from '../utils/adminConfigStorage';

const AdminConfigContext = createContext({
  config: getDefaultAdminConfig(),
  setConfig: () => {},
  resetConfig: () => {},
});

export const AdminConfigProvider = ({ children }) => {
  const [config, setConfigState] = useState(() => readAdminConfig());

  useEffect(() => {
    writeAdminConfig(config);
  }, [config]);

  useEffect(() => onAdminConfigUpdate((nextConfig) => {
    setConfigState(nextConfig);
  }), []);

  const setConfig = (nextConfig) => {
    setConfigState((currentConfig) =>
      typeof nextConfig === 'function' ? nextConfig(currentConfig) : nextConfig,
    );
  };

  const resetConfigState = () => {
    const defaults = resetAdminConfig();
    setConfigState(defaults);
  };

  const value = useMemo(
    () => ({
      config,
      setConfig,
      resetConfig: resetConfigState,
    }),
    [config],
  );

  return <AdminConfigContext.Provider value={value}>{children}</AdminConfigContext.Provider>;
};

export const useAdminConfig = () => useContext(AdminConfigContext);
