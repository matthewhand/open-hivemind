import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, CardActions, Button, TextField, Chip, Pagination, CircularProgress } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Book as BookIcon } from '@mui/icons-material';
import { Breadcrumbs } from '../components/DaisyUI';
import useSpecs from '../hooks/useSpecs';

const SpecsPage: React.FC = () => {
  const navigate = useNavigate();
  const { specs, loading, error } = useSpecs();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const filteredSpecs = specs.filter(spec =>
    spec.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spec.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedSpecs = filteredSpecs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleViewSpec = (id: string) => {
    navigate(`/admin/specs/${id}`);
  };

  const breadcrumbItems = [{ label: 'Specifications', href: '/admin/specs', isActive: true }];

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs items={breadcrumbItems} />

      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Specifications
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View, search, and manage persisted specifications
        </Typography>
      </Box>

      {/* Search and Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <TextField
          variant="outlined"
          placeholder="Search specifications..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ width: '40%' }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/specs/create')}
        >
          Create New
        </Button>
      </Box>

      {/* Error Display */}
      {error && (
        <Box sx={{ color: 'error.main', mb: 2 }}>
          {error}
        </Box>
      )}

      {/* Specifications Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredSpecs.length === 0 ? (
        <Card sx={{ bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider', p: 4 }}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <BookIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No specifications found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first specification to get started
            </Typography>
          </Box>
        </Card>
      ) : (
        <>
          <Grid container spacing={3}>
            {paginatedSpecs.map((spec) => (
              <Grid item xs={12} sm={6} md={4} key={spec.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {spec.topic}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {spec.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      ))}
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Author: {spec.author}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {new Date(spec.date).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewSpec(spec.id)}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={Math.ceil(filteredSpecs.length / pageSize)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default SpecsPage;