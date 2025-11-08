import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { cards as cardsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { 
  Upload, 
  Loader, 
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  MapPin,
  User,
  Calendar,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const CardsWorking = () => {
  console.log('CardsWorking component rendering');
  
  const { user, isAuthenticated, isLoading } = useAuth();
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

  console.log('Auth state:', { isAuthenticated, isLoading, user: user?.name });

  // Fetch cards function
  const fetchCards = async () => {
    console.log('fetchCards called with filters:', filters);
    try {
      setLoading(true);
      console.log('Making API call to cardsAPI.getAll...');
      const response = await cardsAPI.getAll(filters);
      console.log('Cards API response:', response.data);
      
      if (response.data && response.data.data) {
        console.log('Cards data:', response.data.data.cards);
        setCardsList(response.data.data.cards || []);
        setPagination(response.data.data.pagination || {});
      } else {
        console.log('Unexpected response structure:', response.data);
        setCardsList([]);
        setPagination({});
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to load cards');
      setCardsList([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  // Fetch cards when component mounts or filters change
  useEffect(() => {
    if (isAuthenticated) {
      console.log('useEffect triggered, calling fetchCards');
      fetchCards();
    }
  }, [filters, isAuthenticated]);

  // Helper function to safely render phone numbers
  const renderPhoneNumber = (phoneNumbers) => {
    if (!phoneNumbers) return 'No phone';
    
    if (Array.isArray(phoneNumbers)) {
      const first = phoneNumbers[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object') return first?.number || first?.value || 'Invalid phone';
      return 'Invalid phone';
    }
    
    if (typeof phoneNumbers === 'string') return phoneNumbers;
    if (typeof phoneNumbers === 'object') return phoneNumbers?.number || phoneNumbers?.value || 'Invalid phone';
    
    return 'Invalid phone';
  };

  // Helper function to safely render emails
  const renderEmail = (emails) => {
    if (!emails) return 'No email';
    
    if (Array.isArray(emails)) {
      const first = emails[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object') return first?.email || first?.value || 'Invalid email';
      return 'Invalid email';
    }
    
    if (typeof emails === 'string') return emails;
    if (typeof emails === 'object') return emails?.email || emails?.value || 'Invalid email';
    
    return 'Invalid email';
  };

  // Helper function to safely render address
  const renderAddress = (address) => {
    if (!address) return 'No address';
    
    if (typeof address === 'string') return address;
    if (typeof address === 'object') {
      return address.street || address.city || address.state || 'No address';
    }
    
    return 'No address';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Cards</h1>
            <p className="text-gray-600">Manage extracted business card data</p>
          </div>
        </div>

        {/* Simple Upload Area */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Business Card</h3>
            <p className="text-gray-600">Upload functionality will be added back once basic display is working</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cards..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="data.name-asc">Name A-Z</option>
                <option value="data.name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Extracted Cards ({pagination.totalCount || cardsList.length || 0})
            </h3>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <Loader className="h-8 w-8 mx-auto text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading cards...</p>
              </div>
            ) : cardsList.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">
                  {filters.search ? 'No cards found matching your search' : 'No cards uploaded yet'}
                </p>
                <p className="text-sm text-gray-500 mt-2">Upload a business card image to get started</p>
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
                        Address
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
                      <tr key={card._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {card.data?.name || 'Unknown Name'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {card.data?.title || 'No title'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {card.data?.company || 'Unknown Company'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-green-500 mr-2" />
                            <div className="text-sm text-gray-900">
                              {renderPhoneNumber(card.data?.phoneNumbers)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-blue-500 mr-2" />
                            <div className="text-sm text-gray-900">
                              {renderEmail(card.data?.emails)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-red-500 mr-2" />
                            <div className="text-sm text-gray-900">
                              {renderAddress(card.data?.address)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <div className="text-sm text-gray-900">
                              {card.createdAt ? new Date(card.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 p-1">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-amber-600 hover:text-amber-900 p-1">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 p-1">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
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
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!pagination.hasNext}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.currentPage || 1}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages || 1}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
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

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Debug Info:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Cards Count:</strong> {cardsList.length}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Filters:</strong> {JSON.stringify(filters)}</p>
              <p><strong>Pagination:</strong> {JSON.stringify(pagination)}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CardsWorking;