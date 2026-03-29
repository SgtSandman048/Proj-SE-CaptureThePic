// models/imageModel.js
const { FieldValue } = require('../config/firebase');

const IMAGE_STATUS = Object.freeze({
  PENDING:  'pending',    // Awaiting admin review
  APPROVED: 'approved',   // Purchasable
  REJECTED: 'rejected',   // Admin rejected
  INACTIVE: 'inactive',   // Hidden by seller
  DELETED:  'deleted',    // Soft-deleted
});

const IMAGE_CATEGORIES = [
  'nature',
  'architecture',
  'people',
  'animals',
  'technology',
  'food',
  'travel',
  'abstract',
  'fashion',
  'sports',
  'other',
  'illustration'
];

const createImageDocument = ({
  sellerId,
  sellerName,
  imageName,
  description = '',
  price,
  category,
  tags = [],
  watermarkUrl,
  watermarkPublicId,
  originalPublicId,
  metadata = {},
}) => ({
  sellerId,
  sellerName,
  imageName: imageName.trim(),
  description: description.trim(),
  price,
  category,
  tags: tags.map((t) => t.toLowerCase().trim()).filter(Boolean),

  // Cloud ID
  watermarkUrl,                   
  watermarkPublicId,              
  originalPublicId,               

  // Metadata
  metadata: {
    width:  metadata.width  || null,
    height: metadata.height || null,
    format: metadata.format || null,
    bytes:  metadata.bytes  || null,
  },

  // Status
  status: IMAGE_STATUS.PENDING,   
  adminNote: null,                 
  isFeatured: false,               

  // Engagement stats
  views: 0,
  purchases: 0,
  likes: 0,

  // Timestamps
  uploadDate: FieldValue.serverTimestamp(), 
  updatedAt:  FieldValue.serverTimestamp(),
  approvedAt: null,
});


// Build public-safe image
const sanitizeImage = (imageDoc) => {
  const { originalPublicId, watermarkPublicId, ...safe } = imageDoc;
  return safe;
};

module.exports = { IMAGE_STATUS, IMAGE_CATEGORIES, createImageDocument, sanitizeImage };