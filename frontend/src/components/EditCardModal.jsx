import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader } from 'lucide-react';

const EditCardModal = ({ card, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    website: '',
    phoneNumbers: [{ type: 'mobile', number: '' }],
    emails: [{ type: 'work', email: '' }],
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    socials: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card) {
      // Initialize form data with card data
      setFormData({
        name: card.data.name || '',
        title: card.data.title || '',
        company: card.data.company || '',
        website: card.data.website || '',
        phoneNumbers: card.data.phoneNumbers && card.data.phoneNumbers.length > 0 
          ? card.data.phoneNumbers.map(phone => ({
              type: typeof phone === 'object' ? phone.type || 'mobile' : 'mobile',
              number: typeof phone === 'object' ? phone.number || '' : phone || ''
            }))
          : [{ type: 'mobile', number: '' }],
        emails: card.data.emails && card.data.emails.length > 0
          ? card.data.emails.map(email => ({
              type: typeof email === 'object' ? email.type || 'work' : 'work',
              email: typeof email === 'object' ? email.email || '' : email || ''
            }))
          : [{ type: 'work', email: '' }],
        address: {
          street: card.data.address?.street || '',
          city: card.data.address?.city || '',
          state: card.data.address?.state || '',
          country: card.data.address?.country || '',
          zipCode: card.data.address?.zipCode || ''
        },
        socials: card.data.socials || []
      });
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Filter out empty phone numbers and emails
      const cleanedData = {
        ...formData,
        phoneNumbers: formData.phoneNumbers.filter(phone => phone.number.trim()),
        emails: formData.emails.filter(email => email.email.trim()),
        socials: formData.socials.filter(social => social.url || social.username)
      };
      
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error updating card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { type: 'mobile', number: '' }]
    }));
  };

  const removePhoneNumber = (index) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }));
  };

  const updatePhoneNumber = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((phone, i) => 
        i === index ? { ...phone, [field]: value } : phone
      )
    }));
  };

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, { type: 'work', email: '' }]
    }));
  };

  const removeEmail = (index) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };

  const updateEmail = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails.map((email, i) => 
        i === index ? { ...email, [field]: value } : email
      )
    }));
  };

  const addSocial = () => {
    setFormData(prev => ({
      ...prev,
      socials: [...prev.socials, { platform: 'linkedin', url: '', username: '' }]
    }));
  };

  const removeSocial = (index) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== index)
    }));
  };

  const updateSocial = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      socials: prev.socials.map((social, i) => 
        i === index ? { ...social, [field]: value } : social
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Edit Card</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="input"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Contact Information</h4>
              
              {/* Phone Numbers */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Phone Numbers</label>
                  <button
                    type="button"
                    onClick={addPhoneNumber}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Phone
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex space-x-2">
                      <select
                        value={phone.type}
                        onChange={(e) => updatePhoneNumber(index, 'type', e.target.value)}
                        className="input w-24"
                      >
                        <option value="mobile">Mobile</option>
                        <option value="office">Office</option>
                        <option value="home">Home</option>
                        <option value="fax">Fax</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="tel"
                        value={phone.number}
                        onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                        className="input flex-1"
                        placeholder="Phone number"
                      />
                      {formData.phoneNumbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhoneNumber(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Addresses */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Email Addresses</label>
                  <button
                    type="button"
                    onClick={addEmail}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Email
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex space-x-2">
                      <select
                        value={email.type}
                        onChange={(e) => updateEmail(index, 'type', e.target.value)}
                        className="input w-24"
                      >
                        <option value="work">Work</option>
                        <option value="personal">Personal</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="email"
                        value={email.email}
                        onChange={(e) => updateEmail(index, 'email', e.target.value)}
                        className="input flex-1"
                        placeholder="Email address"
                      />
                      {formData.emails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="input"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="input"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="input"
                    placeholder="State/Province"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, country: e.target.value }
                    }))}
                    className="input"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, zipCode: e.target.value }
                    }))}
                    className="input"
                    placeholder="ZIP/Postal code"
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Social Media</h4>
                <button
                  type="button"
                  onClick={addSocial}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Social
                </button>
              </div>
              <div className="space-y-2">
                {formData.socials.map((social, index) => (
                  <div key={index} className="flex space-x-2">
                    <select
                      value={social.platform}
                      onChange={(e) => updateSocial(index, 'platform', e.target.value)}
                      className="input w-32"
                    >
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      type="url"
                      value={social.url}
                      onChange={(e) => updateSocial(index, 'url', e.target.value)}
                      className="input flex-1"
                      placeholder="Profile URL"
                    />
                    <button
                      type="button"
                      onClick={() => removeSocial(index)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {formData.socials.length === 0 && (
                  <p className="text-gray-500 text-sm">No social media profiles added.</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Card'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCardModal;