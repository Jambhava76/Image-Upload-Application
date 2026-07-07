import { InputAdornment, Stack, TextField, Tooltip, Typography, IconButton } from '@mui/material';
import SearchOutlinedIconModule from '@mui/icons-material/SearchOutlined.js';
import RefreshOutlinedIconModule from '@mui/icons-material/RefreshOutlined.js';
import { resolveMuiIcon } from '../utils/muiIcon.js';

const SearchOutlinedIcon = resolveMuiIcon(SearchOutlinedIconModule);
const RefreshOutlinedIcon = resolveMuiIcon(RefreshOutlinedIconModule);

export function SearchToolbar({ search, onSearchChange, onRefresh, loading }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
      <Stack spacing={0.25} sx={{ flex: 1 }}>
        <Typography variant="h2">Gallery</Typography>
        <Typography color="text.secondary" variant="body2">
          Metadata comes from Firestore; images are loaded through signed URLs.
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <Tooltip title="Refresh gallery">
          <span>
            <IconButton aria-label="Refresh gallery" onClick={onRefresh} disabled={loading}>
              <RefreshOutlinedIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
