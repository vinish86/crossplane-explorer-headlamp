import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Condition } from '../../resources/common';

interface ConditionsTableProps {
  conditions?: Condition[];
}

function statusColor(status: string): 'success' | 'error' | 'default' {
  if (status === 'True') return 'success';
  if (status === 'False') return 'error';
  return 'default';
}

export function ConditionsTable({ conditions }: ConditionsTableProps) {
  if (!conditions || conditions.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No conditions reported.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Type</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Reason</TableCell>
          <TableCell>Message</TableCell>
          <TableCell>Last Transition</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {conditions.map((condition, index) => (
          <TableRow key={index}>
            <TableCell>{condition.type}</TableCell>
            <TableCell>
              <Chip
                label={condition.status}
                size="small"
                color={statusColor(condition.status)}
                variant="filled"
              />
            </TableCell>
            <TableCell>{condition.reason ?? '-'}</TableCell>
            <TableCell sx={{ maxWidth: 400, wordBreak: 'break-word' }}>
              {condition.message ?? '-'}
            </TableCell>
            <TableCell>
              {condition.lastTransitionTime
                ? new Date(condition.lastTransitionTime).toLocaleString()
                : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
