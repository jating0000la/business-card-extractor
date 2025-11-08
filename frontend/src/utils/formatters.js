// Utility functions for formatting data
export const formatDate = (dateString, format = 'full') => {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatPhoneNumbers = (phoneNumbers) => {
  if (!phoneNumbers || phoneNumbers.length === 0) return 'N/A';
  return phoneNumbers.map(phone => phone.number).join(', ');
};

export const formatEmails = (emails) => {
  if (!emails || emails.length === 0) return 'N/A';
  return emails.map(email => email.email).join(', ');
};

export const formatSocials = (socials) => {
  if (!socials || socials.length === 0) return [];
  return socials.filter(social => social.url || social.username);
};

export const formatAddress = (address) => {
  if (!address) return 'N/A';
  return address.full || [address.street, address.city, address.state, address.zipCode]
    .filter(Boolean)
    .join(', ') || 'N/A';
};

export const formatConfidence = (confidence) => {
  if (!confidence) return 'Unknown';
  const percentage = Math.round(confidence * 100);
  return `${percentage}%`;
};

export const formatProcessingTime = (time) => {
  if (!time) return 'Unknown';
  if (time < 1000) return `${time}ms`;
  return `${(time / 1000).toFixed(1)}s`;
};

// Debounce function for search
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Generate cache key for API requests
export const generateCacheKey = (params) => {
  return Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
};