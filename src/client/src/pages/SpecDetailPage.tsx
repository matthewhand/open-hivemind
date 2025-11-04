import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Card, CardContent, Chip, Divider, Menu, MenuItem } from '@mui/material';
import { ArrowBack as BackIcon, GetApp as ExportIcon } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Breadcrumbs } from '../components/DaisyUI';
import useSpec from '../hooks/useSpec';

const SpecDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { spec, loading, error } = useSpec(id);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (format: 'md' | 'json' | 'yaml') => {
    if (!spec) return;

    let content = '';
    let mimeType = '';
    let filename = '';

    switch (format) {
      case 'md':
        content = spec.content;
        mimeType = 'text/markdown';
        filename = `${spec.topic}.md`;
        break;
      case 'json':
        content = JSON.stringify(spec, null, 2);
        mimeType = 'application/json';
        filename = `${spec.topic}.json`;
        break;
      case 'yaml':
        // Basic JSON to YAML conversion
        content = `
topic: ${spec.topic}
author: ${spec.author}
date: ${spec.date}
tags:
${spec.tags.map(tag => `  - ${tag}`).join('\n')}
content: |
${spec.content.replace(/^/gm, '  ')}
        `.trim();
        mimeType = 'application/x-yaml';
        filename = `${spec.topic}.yaml`;
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleExportClose();
  };

  const breadcrumbItems = [
    { label: 'Specifications', href: '/admin/specs' },
    { label: spec?.topic || '...', href: `/admin/specs/${id}`, isActive: true }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!spec) {
    return <Typography>Specification not found.</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />

      <Box sx={{ mt: 2, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {spec.topic}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => window.history.back()}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ExportIcon />}
            onClick={handleExportClick}
          >
            Export
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleExportClose}
          >
            <MenuItem onClick={() => handleExport('md')}>Markdown</MenuItem>
            <MenuItem onClick={() => handleExport('json')}>JSON</MenuItem>
            <MenuItem onClick={() => handleExport('yaml')}>YAML</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Metadata */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Metadata
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Author: {spec.author}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Date: {new Date(spec.date).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {spec.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ my: 4 }} />

      {/* Markdown Content */}
      <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
        <ReactMarkdown>{spec.content}</ReactMarkdown>
      </Box>

      {/* Version History */}
      {spec.versionHistory && spec.versionHistory.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Version History
              </Typography>
              {spec.versionHistory.map((version, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1">
                    Version {version.version}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(version.date).toLocaleString()} by {version.author}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {version.changes}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default SpecDetailPage;