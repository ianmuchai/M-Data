import { useEffect, useState } from 'react';
import { defaultAppConfig, type AppConfig } from '../lib/appConfig';

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(defaultAppConfig);

  useEffect(() => {
    let active = true;

    fetch('/app-config.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : defaultAppConfig))
      .then((payload: Partial<AppConfig>) => {
        if (!active) return;
        setConfig({ ...defaultAppConfig, ...payload });
      })
      .catch(() => {
        if (active) setConfig(defaultAppConfig);
      });

    return () => {
      active = false;
    };
  }, []);

  return config;
}
