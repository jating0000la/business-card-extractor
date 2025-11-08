import { memo, useState } from 'react';
import { formatDate, formatPhoneNumbers, formatEmails } from '../utils/formatters';
import { Eye, Edit, Trash2, ChevronDown, ChevronUp, Building, Phone, Mail, User, Calendar, MapPin } from 'lucide-react';

const CardRow = memo(({ card, onView, onEdit, onDelete, canEdit, canDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors duration-150">
        {/* Contact Info - Wider column */}
        <td className="px-4 py-4 w-1/4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {card.data.name || 'Unknown Name'}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {(typeof card.data.title === 'string' ? card.data.title : 'No title available') || 'No title available'}
              </div>
              {card.data.department && (
                <div className="text-xs text-blue-600 truncate">
                  {typeof card.data.department === 'string' ? card.data.department : JSON.stringify(card.data.department)}
                </div>
              )}
            </div>
          </div>
        </td>
        
        {/* Company - Wider column */}
        <td className="px-4 py-4 w-1/5">
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {card.data.company || 'Unknown Company'}
              </div>
              {card.data.website && (
                <div className="text-xs text-blue-600 truncate">
                  {card.data.website}
                </div>
              )}
            </div>
          </div>
        </td>
        
        {/* Contact Details - Compact */}
        <td className="px-4 py-4 w-1/6">
          <div className="space-y-1">
            {(Array.isArray(card.data.phoneNumbers) ? card.data.phoneNumbers.length > 0 : card.data.phoneNumbers) && (
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span className="text-xs text-gray-900 truncate">
                  {Array.isArray(card.data.phoneNumbers) 
                    ? (typeof card.data.phoneNumbers[0] === 'object' ? card.data.phoneNumbers[0]?.number || card.data.phoneNumbers[0]?.value || 'N/A' : card.data.phoneNumbers[0])
                    : (typeof card.data.phoneNumbers === 'string' ? card.data.phoneNumbers : (typeof card.data.phoneNumbers === 'object' ? card.data.phoneNumbers?.number || card.data.phoneNumbers?.value || 'N/A' : 'N/A'))
                  }
                </span>
              </div>
            )}
            {(Array.isArray(card.data.emails) ? card.data.emails.length > 0 : card.data.emails) && (
              <div className="flex items-center space-x-1">
                <Mail className="h-3 w-3 text-blue-500 flex-shrink-0" />
                <span className="text-xs text-gray-900 truncate">
                  {Array.isArray(card.data.emails) 
                    ? (typeof card.data.emails[0] === 'object' ? card.data.emails[0]?.email || card.data.emails[0]?.value || 'N/A' : card.data.emails[0])
                    : (typeof card.data.emails === 'string' ? card.data.emails : (typeof card.data.emails === 'object' ? card.data.emails?.email || card.data.emails?.value || 'N/A' : 'N/A'))
                  }
                </span>
              </div>
            )}
          </div>
        </td>
        
        {/* Address - Compact */}
        <td className="px-4 py-4 w-1/6">
          <div className="flex items-start space-x-1">
            <MapPin className="h-3 w-3 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-900">
              <div className="truncate">
                {card.data.address ? 
                  (typeof card.data.address === 'string' ? 
                    card.data.address : 
                    (card.data.address.street || card.data.address.city || 'No address')
                  ) : 
                  'No address'
                }
              </div>
              {card.data.address && typeof card.data.address === 'object' && card.data.address.city && card.data.address.street && (
                <div className="text-gray-500 truncate">{card.data.address.city}</div>
              )}
            </div>
          </div>
        </td>
        
        {/* Extracted By - Compact */}
        <td className="px-4 py-4 w-1/8">
          <div className="flex items-center space-x-2">
            <img
              className="h-6 w-6 rounded-full flex-shrink-0"
              src={card.extractedBy?.picture || '/default-avatar.png'}
              alt=""
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(card.extractedBy?.name || 'User')}&background=6366f1&color=fff&size=24`;
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-900 truncate">{card.extractedBy?.name}</div>
              <div className="text-xs text-gray-500 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(card.createdAt, 'short')}
              </div>
            </div>
          </div>
        </td>
        
        {/* Actions - Fixed width */}
        <td className="px-4 py-4 w-32">
          <div className="flex items-center justify-end space-x-2">
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand Details'}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {/* Action Buttons */}
            <button
              onClick={() => onView(card)}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
            {canEdit && (
              <button
                onClick={() => onEdit(card)}
                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                title="Edit Card"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(card)}
                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                title="Delete Card"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
      
      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan="6" className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 mr-1 text-green-500" />
                  Contact Information
                </h4>
                {card.data.phoneNumbers ? (
                  <div className="space-y-1">
                    {Array.isArray(card.data.phoneNumbers) 
                      ? card.data.phoneNumbers.map((phone, index) => (
                          <div key={index} className="text-gray-700">
                            {typeof phone === 'string' 
                              ? phone 
                              : (typeof phone === 'object' ? phone?.number || phone?.value || 'Invalid phone data' : 'Invalid phone data')}
                            {typeof phone === 'object' && phone?.type && (
                              <span className="ml-2 text-xs text-gray-500">({phone.type})</span>
                            )}
                          </div>
                        ))
                      : <div className="text-gray-700">
                          {typeof card.data.phoneNumbers === 'string' 
                            ? card.data.phoneNumbers 
                            : (typeof card.data.phoneNumbers === 'object' ? card.data.phoneNumbers?.number || card.data.phoneNumbers?.value || 'Invalid phone data' : 'Invalid phone data')}
                        </div>
                    }
                  </div>
                ) : (
                  <div className="text-gray-500">No phone numbers</div>
                )}
                {card.data.emails ? (
                  <div className="space-y-1">
                    {Array.isArray(card.data.emails) 
                      ? card.data.emails.map((email, index) => (
                          <div key={index} className="text-blue-600">
                            {typeof email === 'string' 
                              ? email 
                              : (typeof email === 'object' ? email?.email || email?.value || 'Invalid email data' : 'Invalid email data')}
                            {typeof email === 'object' && email?.type && (
                              <span className="ml-2 text-xs text-gray-500">({email.type})</span>
                            )}
                          </div>
                        ))
                      : <div className="text-blue-600">
                          {typeof card.data.emails === 'string' 
                            ? card.data.emails 
                            : (typeof card.data.emails === 'object' ? card.data.emails?.email || card.data.emails?.value || 'Invalid email data' : 'Invalid email data')}
                        </div>
                    }
                  </div>
                ) : (
                  <div className="text-gray-500">No email addresses</div>
                )}
              </div>
              
              {/* Address Information */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <MapPin className="h-4 w-4 mr-1 text-red-500" />
                  Address
                </h4>
                {card.data.address ? (
                  <div className="text-gray-700 space-y-1">
                    {typeof card.data.address === 'string' ? (
                      <div>{card.data.address}</div>
                    ) : (
                      <>
                        {card.data.address.street && <div>{card.data.address.street}</div>}
                        {card.data.address.city && <div>{card.data.address.city}</div>}
                        {card.data.address.state && <div>{card.data.address.state}</div>}
                        {card.data.address.zipCode && <div>{card.data.address.zipCode}</div>}
                        {card.data.address.country && <div>{card.data.address.country}</div>}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No address information</div>
                )}
              </div>
              
              {/* Additional Information */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Building className="h-4 w-4 mr-1 text-blue-500" />
                  Additional Details
                </h4>
                <div className="space-y-1 text-gray-700">
                  {card.data.website && (
                    <div><strong>Website:</strong> <a href={card.data.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{card.data.website}</a></div>
                  )}
                  {card.data.fax && (
                    <div><strong>Fax:</strong> {card.data.fax}</div>
                  )}
                  {card.data.department && (
                    <div><strong>Department:</strong> {card.data.department}</div>
                  )}
                  <div><strong>Processing Time:</strong> {card.processingTime ? `${card.processingTime}ms` : 'N/A'}</div>
                  <div><strong>Confidence:</strong> {card.confidence ? `${(card.confidence * 100).toFixed(1)}%` : 'N/A'}</div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

CardRow.displayName = 'CardRow';

export default CardRow;