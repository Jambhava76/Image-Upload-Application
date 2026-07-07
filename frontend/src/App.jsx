import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import CloudQueueOutlinedIconModule from '@mui/icons-material/CloudQueueOutlined.js';
import { deleteImage, fetchImages } from './api/images.js';
import { DropzoneUploader } from './components/DropzoneUploader.jsx';
import { ImageGallery } from './components/ImageGallery.jsx';
import { MetricStrip } from './components/MetricStrip.jsx';
import { SearchToolbar } from './components/SearchToolbar.jsx';
import { resolveMuiIcon } from './utils/muiIcon.js';

const CloudQueueOutlinedIcon = resolveMuiIcon(CloudQueueOutlinedIconModule);

export default function App() {
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadImages = useCallback(async (term = search) => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchImages(term);
      setImages(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load images from the API.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadImages(search);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadImages, search]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const retry = window.setInterval(() => {
      loadImages(search);
    }, 5000);

    return () => window.clearInterval(retry);
  }, [error, loadImages, search]);

  const handleUploaded = (image) => {
    setNotice(`${image.imageName} is now available in the gallery.`);
    loadImages(search);
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    try {
      await deleteImage(pendingDelete.id);
      setNotice(`${pendingDelete.imageName} was deleted.`);
      setPendingDelete(null);
      await loadImages(search);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to delete image.');
      setPendingDelete(null);
    }
  };

  const latestUpload = useMemo(() => {
    if (images.length === 0) {
      return 'No uploads yet';
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(images[0].uploadedAt));
  }, [images]);

  return (
    <Box className="app-shell">
      <AppBar position="sticky" color="inherit" elevation={0} className="topbar">
        <Toolbar className="topbar-content">
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box className="brand-mark">
              <CloudQueueOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h1">Cloud Image Gallery</Typography>
              <Typography color="text.secondary" variant="body2">
                Cloud Run API · Cloud Storage · Firestore · Signed URLs
              </Typography>
            </Box>
          </Stack>
          <Typography className="latest-upload" color="text.secondary" variant="body2">
            Latest: {latestUpload}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" className="workspace">
        {notice && (
          <Alert severity="success" onClose={() => setNotice('')} className="notice">
            {notice}
          </Alert>
        )}

        <Box className="layout-grid">
          <Box className="left-rail">
            <DropzoneUploader onUploaded={handleUploaded} />
            <MetricStrip images={images} />
          </Box>

          <Stack spacing={2.5} className="gallery-panel">
            <SearchToolbar
              search={search}
              onSearchChange={setSearch}
              onRefresh={() => loadImages(search)}
              loading={loading}
            />
            <ImageGallery images={images} loading={loading} error={error} onDelete={setPendingDelete} />
          </Stack>
        </Box>
      </Container>

      <Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete Image</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete {pendingDelete?.imageName}? This removes the Cloud Storage objects and Firestore metadata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
