import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import React from 'react';

export function NotInstalledBanner() {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>Crossplane not detected</AlertTitle>
      Crossplane does not appear to be installed on this cluster. The resources below may not be
      available. Install Crossplane to manage composite resources and providers.
    </Alert>
  );
}
