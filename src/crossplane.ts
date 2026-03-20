import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { useEffect, useState } from 'react';

export async function isCrossplaneInstalled(): Promise<boolean> {
  try {
    await ApiProxy.request('/apis/pkg.crossplane.io/v1', { method: 'GET' });
    return true;
  } catch {
    return false;
  }
}

export function useCrossplaneInstalled(): boolean | null {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    isCrossplaneInstalled().then(result => setInstalled(result));
  }, []);

  return installed;
}
