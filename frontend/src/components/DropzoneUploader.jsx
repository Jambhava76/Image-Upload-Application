import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import AddPhotoAlternateOutlinedIconModule from '@mui/icons-material/AddPhotoAlternateOutlined.js';
import CloudUploadOutlinedIconModule from '@mui/icons-material/CloudUploadOutlined.js';
import CloseOutlinedIconModule from '@mui/icons-material/CloseOutlined.js';
import ImageOutlinedIconModule from '@mui/icons-material/ImageOutlined.js';
import { uploadImage } from '../api/images.js';
import { resolveMuiIcon } from '../utils/muiIcon.js';

const AddPhotoAlternateOutlinedIcon = resolveMuiIcon(AddPhotoAlternateOutlinedIconModule);
const CloudUploadOutlinedIcon = resolveMuiIcon(CloudUploadOutlinedIconModule);
const CloseOutlinedIcon = resolveMuiIcon(CloseOutlinedIconModule);
const ImageOutlinedIcon = resolveMuiIcon(ImageOutlinedIconModule);

const maxFileSize = 5 * 1024 * 1024;
const acceptedTypes = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

const readableSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export function DropzoneUploader({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);

    return () => URL.revokeObjectURL(nextPreview);
  }, [file]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setStatus({ type: '', message: '' });
    setProgress(0);

    if (rejectedFiles.length > 0) {
      const reason = rejectedFiles[0].errors[0]?.message || 'Only JPG, PNG, and WEBP images under 5 MB are allowed.';
      setStatus({ type: 'error', message: reason });
      setFile(null);
      return;
    }

    setFile(acceptedFiles[0] || null);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxFiles: 1,
    maxSize: maxFileSize,
    noClick: true,
    noKeyboard: true
  });

  const helperText = useMemo(() => {
    if (file) {
      return `${file.name} · ${readableSize(file.size)}`;
    }

    return 'JPG, PNG, or WEBP up to 5 MB';
  }, [file]);

  const clearFile = () => {
    setFile(null);
    setStatus({ type: '', message: '' });
    setProgress(0);
  };

  const submit = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'Choose an image before uploading.' });
      return;
    }

    setUploading(true);
    setStatus({ type: '', message: '' });
    setProgress(0);

    try {
      const uploaded = await uploadImage(file, setProgress);
      setStatus({ type: 'success', message: `${uploaded.imageName} uploaded successfully.` });
      setFile(null);
      setProgress(0);
      onUploaded?.(uploaded);
    } catch (error) {
      const message = error.response?.data?.error || 'Upload failed. Check the API logs and try again.';
      setStatus({ type: 'error', message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack spacing={2} className="upload-panel">
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box className="section-icon">
          <CloudUploadOutlinedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h2">Upload Image</Typography>
          <Typography color="text.secondary" variant="body2">
            Validate, thumbnail, store, and index in one request.
          </Typography>
        </Box>
      </Stack>

      <Box
        {...getRootProps({
          className: `dropzone ${isDragActive ? 'dropzone-active' : ''} ${file ? 'dropzone-has-file' : ''}`
        })}
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <Box className="preview-frame">
            <img src={previewUrl} alt={file.name} />
          </Box>
        ) : (
          <Box className="dropzone-empty">
            <ImageOutlinedIcon />
            <Typography fontWeight={700}>Drop an image here</Typography>
            <Typography color="text.secondary" variant="body2">
              Preview stays local until you confirm upload.
            </Typography>
          </Box>
        )}
      </Box>

      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {helperText}
        </Typography>
        {uploading && (
          <Box>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              {progress}% uploaded
            </Typography>
          </Box>
        )}
        {status.message && <Alert severity={status.type}>{status.message}</Alert>}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="outlined"
          onClick={open}
          startIcon={<AddPhotoAlternateOutlinedIcon />}
          disabled={uploading}
          fullWidth
        >
          Choose File
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          startIcon={<CloudUploadOutlinedIcon />}
          disabled={!file || uploading}
          fullWidth
        >
          Upload
        </Button>
        {file && (
          <Tooltip title="Clear selected image">
            <Button aria-label="Clear selected image" onClick={clearFile} disabled={uploading} className="icon-action">
              <CloseOutlinedIcon />
            </Button>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
