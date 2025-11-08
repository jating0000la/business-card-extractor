import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Layout from '../components/Layout';
import CardRow from '../components/CardRow';
import EditCardModal from '../components/EditCardModal';
import { cards as cardsAPI } from '../utils/api';
import { formatDate, formatPhoneNumbers, formatEmails, debounce } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { 
  Upload, 
  Camera, 
  X, 
  Loader, 
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

// Lazy load Webcam component (reduces initial bundle size)
const Webcam = lazy(() => import('react-webcam'));

const Cards = () => {
  const { user } = useAuth();
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'camera'
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cardsList, setCardsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef(null);
  
  // Modal states
  const [selectedCard, setSelectedCard] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const webcamRef = useCallback((webcam) => {
    if (webcam) {
      webcamRef.current = webcam;
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [filters]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await cardsAPI.getAll(filters);
      setCardsList(response.data.data.cards);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      toast.error('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (file) => {
    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await cardsAPI.process(formData);
      
      toast.success('Card processed successfully!');
      
      // Refresh the cards list
      await fetchCards();
      
      return response.data.data;
    } catch (error) {
      console.error('Card processing failed:', error);
      const message = error.response?.data?.error || 'Failed to process card';
      toast.error(message);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      await processImage(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  const capturePhoto = useCallback(async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
      
      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'captured-card.jpg', { type: 'image/jpeg' });
      
      setShowCamera(false);
      await processImage(file);
    }
  }, []);

  // Memoized debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchTerm) => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 300),
    []
  );

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const search = formData.get('search');
    debouncedSearch(search);
  }, [debouncedSearch]);

  const handlePageChange = useCallback((newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  }, []);

  // Memoized handlers for card actions
  const handleViewCard = useCallback((card) => {
    setSelectedCard(card);
    setShowViewModal(true);
  }, []);

  const handleEditCard = useCallback((card) => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can edit cards');
      return;
    }
    setSelectedCard(card);
    setShowEditModal(true);
  }, [user]);

  const handleDeleteCard = useCallback((card) => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can delete cards');
      return;
    }
    setSelectedCard(card);
    setShowDeleteDialog(true);
  }, [user]);

  const confirmDelete = useCallback(async () => {
    if (!selectedCard) return;
    
    try {
      setIsDeleting(true);
      await cardsAPI.delete(selectedCard._id);
      toast.success('Card deleted successfully!');
      
      // Refresh the cards list
      await fetchCards();
      
      // Close the dialog
      setShowDeleteDialog(false);
      setSelectedCard(null);
    } catch (error) {
      console.error('Failed to delete card:', error);
      const message = error.response?.data?.error || 'Failed to delete card';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedCard, fetchCards]);

  const handleEditSubmit = useCallback(async (updatedData) => {
    if (!selectedCard) return;
    
    try {
      await cardsAPI.update(selectedCard._id, updatedData);
      toast.success('Card updated successfully!');
      
      // Refresh the cards list
      await fetchCards();
      
      // Close the modal
      setShowEditModal(false);
      setSelectedCard(null);
    } catch (error) {
      console.error('Failed to update card:', error);
      const message = error.response?.data?.error || 'Failed to update card';
      toast.error(message);
    }
  }, [selectedCard, fetchCards]);

  // Export handlers
  const handleExport = useCallback(async (format) => {
    try {
      setIsExporting(true);
      setShowExportMenu(false);
      
      const filename = `business-cards-${new Date().toISOString().split('T')[0]}`;
      const response = await cardsAPI.export(format, filename);
      
      // Create blob and download file
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename with proper extension
      const extensions = { csv: 'csv', xlsx: 'xlsx', json: 'json' };
      link.download = `${filename}.${extensions[format]}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Cards exported as ${format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      const message = error.response?.data?.error || 'Failed to export cards';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Memoized computed values
  const canEditCards = useMemo(() => {
    // Only admins can edit cards
    return user && user.role === 'admin';
  }, [user]);

  const canDeleteCards = useMemo(() => {
    // Only admins can delete cards
    return user && user.role === 'admin';
  }, [user]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Cards</h1>
            <p className="text-gray-600">Upload or capture business cards to extract data</p>
          </div>
          
          {/* Upload Mode Toggle */}
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button
              onClick={() => setUploadMode('file')}
              className={`btn ${uploadMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </button>
            <button
              onClick={() => {
                setUploadMode('camera');
                setShowCamera(true);
              }}
              className={`btn ${uploadMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </button>
          </div>
        </div>

        {/* Upload Area */}
        {uploadMode === 'file' && (
          <div className="card">
            <div className="card-body">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragActive 
                    ? 'border-primary-400 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input {...getInputProps()} />
                
                {isProcessing ? (
                  <div className="space-y-2">
                    <Loader className="h-12 w-12 mx-auto text-primary-600 animate-spin" />
                    <p className="text-lg font-medium text-gray-900">Processing card...</p>
                    <p className="text-gray-600">This may take a few seconds</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {isDragActive ? 'Drop the file here' : 'Drop a business card image here'}
                      </p>
                      <p className="text-gray-600">or click to select a file</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Capture Business Card</h3>
                <button
                  onClick={() => setShowCamera(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader className="h-8 w-8 animate-spin text-white" /></div>}>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{
                        facingMode: { ideal: 'environment' } // Use back camera on mobile
                      }}
                    />
                  </Suspense>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={capturePhoto}
                    disabled={isProcessing}
                    className="flex-1 btn-primary"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Capture
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCamera(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="card">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <form onSubmit={handleSearch} className="flex-1 flex space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    name="search"
                    type="text"
                    placeholder="Search cards by name, company, or email..."
                    className="input pl-10"
                    defaultValue={filters.search}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Search
                </button>
              </form>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
                  }}
                  className="input w-auto"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="data.name-asc">Name A-Z</option>
                  <option value="data.name-desc">Name Z-A</option>
                  <option value="data.company-asc">Company A-Z</option>
                  <option value="data.company-desc">Company Z-A</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Extracted Cards ({pagination.totalCount || 0})
              </h3>
              
              {cardsList.length > 0 && (
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={isExporting}
                    className="btn-secondary flex items-center"
                  >
                    {isExporting ? (
                      <>
                        <Loader className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </>
                    )}
                  </button>
                  
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleExport('csv')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Export as CSV
                        </button>
                        <button
                          onClick={() => handleExport('xlsx')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Export as Excel
                        </button>
                        <button
                          onClick={() => handleExport('json')}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Export as JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="card-body p-0">
            {loading ? (
              <div className="p-6 text-center">
                <Loader className="h-8 w-8 mx-auto text-primary-600 animate-spin" />
                <p className="mt-2 text-gray-600">Loading cards...</p>
              </div>
            ) : cardsList.length === 0 ? (
              <div className="p-6 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-2 text-gray-600">
                  {filters.search ? 'No cards found matching your search' : 'No cards uploaded yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Extracted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cardsList.map((card) => (
                      <CardRow
                        key={card._id}
                        card={card}
                        onView={handleViewCard}
                        onEdit={handleEditCard}
                        onDelete={handleDeleteCard}
                        canEdit={canEditCards}
                        canDelete={canDeleteCards}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Card Modal */}
      {showViewModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Card Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-gray-900">{selectedCard.data.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <p className="mt-1 text-gray-900">{selectedCard.data.title || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <p className="mt-1 text-gray-900">{selectedCard.data.company || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Website</label>
                      <p className="mt-1 text-gray-900">
                        {selectedCard.data.website ? (
                          <a href={selectedCard.data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {selectedCard.data.website}
                          </a>
                        ) : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Contact Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Numbers</label>
                      <div className="mt-1 space-y-1">
                        {selectedCard.data.phoneNumbers && selectedCard.data.phoneNumbers.length > 0 ? (
                          selectedCard.data.phoneNumbers.map((phone, index) => (
                            <p key={index} className="text-gray-900">
                              {typeof phone === 'object' ? phone.number : phone}
                              {typeof phone === 'object' && phone.type && (
                                <span className="ml-2 text-xs text-gray-500">({phone.type})</span>
                              )}
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-500">Not provided</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email Addresses</label>
                      <div className="mt-1 space-y-1">
                        {selectedCard.data.emails && selectedCard.data.emails.length > 0 ? (
                          selectedCard.data.emails.map((email, index) => (
                            <p key={index} className="text-gray-900">
                              {typeof email === 'object' ? email.email : email}
                              {typeof email === 'object' && email.type && (
                                <span className="ml-2 text-xs text-gray-500">({email.type})</span>
                              )}
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-500">Not provided</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-gray-900">
                        {selectedCard.data.address ? (
                          typeof selectedCard.data.address === 'string' ? 
                            selectedCard.data.address : 
                            [
                              selectedCard.data.address.street,
                              selectedCard.data.address.city,
                              selectedCard.data.address.state,
                              selectedCard.data.address.country,
                              selectedCard.data.address.zipCode
                            ].filter(Boolean).join(', ')
                        ) : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Media & Additional Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Social Media</h4>
                  <div className="space-y-3">
                    {selectedCard.data.socials && selectedCard.data.socials.length > 0 ? (
                      selectedCard.data.socials.map((social, index) => (
                        <div key={index}>
                          <label className="block text-sm font-medium text-gray-700 capitalize">{social.platform}</label>
                          <p className="mt-1 text-gray-900">
                            {social.url ? (
                              <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {social.url}
                              </a>
                            ) : social.username}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No social media information</p>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Processing Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confidence Score</label>
                      <p className="mt-1 text-gray-900">{selectedCard.confidence ? `${(selectedCard.confidence * 100).toFixed(1)}%` : 'Not available'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">AI Provider</label>
                      <p className="mt-1 text-gray-900">{selectedCard.aiProvider || 'Not available'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Processing Time</label>
                      <p className="mt-1 text-gray-900">{selectedCard.processingTime ? `${selectedCard.processingTime}ms` : 'Not available'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Extracted By</label>
                      <p className="mt-1 text-gray-900">{selectedCard.extractedBy?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created</label>
                      <p className="mt-1 text-gray-900">{formatDate(selectedCard.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {showEditModal && selectedCard && (
        <EditCardModal
          card={selectedCard}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Delete Card</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete the card for <strong>{selectedCard.data.name || 'this contact'}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Cards;