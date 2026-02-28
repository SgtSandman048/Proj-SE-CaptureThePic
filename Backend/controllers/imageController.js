// controllers/imageControllers.js

const { validationResult } = require('express-validator');

const { createImageDocument, IMAGE_STATUS, IMAGE_CATEGORIES, sanitizeImage } = require('../models/imageModel');
const {
  createImage,
  getImageById,
  getApprovedImages,
  getSellerImages,
  updateImage,
  incrementStat,
  softDeleteImage,
} = require('../services/imageService');
const { cloudinary, deleteCloudinaryImage } = require('../config/cloudinary');
const { validatePrice } = require('../utils/priceCalculator');
const { sendSuccess, sendError } = require('../utils/apiResponse');
//const logger = require('../utils/logger');

// Upload image
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });


//  GET /api/images
const getImages = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, limit, startAfter } = req.query;

    // 1. Check validation
    if (category && !IMAGE_CATEGORIES.includes(category)) {
      return sendError(res, 400, `Invalid category. Valid options: ${IMAGE_CATEGORIES.join(', ')}`);
    }

    const limitNum = Math.min(parseInt(limit) || 20, 50); // cap at 50

    if (minPrice && isNaN(parseFloat(minPrice))) {
      return sendError(res, 400, 'minPrice must be a number');
    }
    if (maxPrice && isNaN(parseFloat(maxPrice))) {
      return sendError(res, 400, 'maxPrice must be a number');
    }
    if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
      return sendError(res, 400, 'minPrice cannot be greater than maxPrice');
    }

    // 2. Fetch from DB
    const images = await getApprovedImages({
      category: category || null,
      search: search || null,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      limit: limitNum,
      startAfter: startAfter || null,
    });

    // 3. Mapping response
    const responseImages = images.map(({ originalPublicId, watermarkPublicId, searchKeywords, ...img }) => ({
      imageId:      img.imageId,
      imageName:    img.imageName,
      watermarkUrl: img.watermarkUrl,
      price:        img.price,
      category:     img.category,
      tags:         img.tags,
      sellerId:     img.sellerId,
      sellerName:   img.sellerName,
      views:        img.views,
      likes:        img.likes,
      purchases:    img.purchases,
      uploadDate:   img.uploadDate,
      isFeatured:   img.isFeatured,
    }));

    // 4. Increment view count
    //logger.info(`[GET /images] Returned ${responseImages.length} images | filters: ${JSON.stringify({ category, search, minPrice, maxPrice })}`);
    console.log(`[GET /images] Returned ${responseImages.length} images | filters: ${JSON.stringify({ category, search, minPrice, maxPrice })}`);

    return sendSuccess(res, 200, 'Images fetched successfully', {
      images: responseImages,
      count: responseImages.length,
      filters: { category: category || null, search: search || null, minPrice: minPrice || null, maxPrice: maxPrice || null },
      pagination: {
        limit: limitNum,
        nextCursor: responseImages.length === limitNum
          ? responseImages[responseImages.length - 1].imageId
          : null,
      },
    });
  } catch (error) {
    //logger.error('getImages error:', error);
    console.log('getImages error:', error);
    return sendError(res, 500, 'Failed to fetch images');
  }
};

//  POST /api/images/upload
const uploadImage = async (req, res) => {
  let watermarkPublicId = null;
  let originalPublicId  = null;
  try {
    // 1. Check the file
    if (!req.file) {
      return sendError(res, 400, 'No image file provided. Include a file field in multipart/form-data.');
    }

    // 2. Validate text fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // File was already uploaded to Cloudinary
      await deleteCloudinaryImage(req.file.filename).catch(() => {});
      return sendError(res, 422, 'Validation failed', errors.array());
    }

    const { imageName, description, price, category, tags } = req.body;

    // 3. Validate category
    if (!IMAGE_CATEGORIES.includes(category)) {
      await deleteCloudinaryImage(req.file.filename).catch(() => {});
      return sendError(res, 400, `Invalid category. Valid options: ${IMAGE_CATEGORIES.join(', ')}`);
    }

    // 4. Validate price
    const priceNum = parseFloat(price);
    const priceCheck = validatePrice(priceNum);
    if (!priceCheck.valid) {
      await deleteCloudinaryImage(req.file.filename).catch(() => {});
      return sendError(res, 400, priceCheck.reason);
    }

    // 5. Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        if (!Array.isArray(parsedTags)) parsedTags = [];
      } catch {
        parsedTags = [];
      }
    }
    
    // 6. Upload watermarked preview
    const baseName = req.file.originalname.replace(/\.[^/.]+$/, '');
    const buffer   = req.file.buffer;

    console.log(`[UPLOAD] Uploading watermarked preview for "${imageName}"...`);

    const watermarkResult = await uploadToCloudinary(buffer, {
      folder:          'image-store/watermarked',
      public_id:       `wm_${Date.now()}_${baseName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { width: 1200, height: 900, crop: 'limit', quality: 'auto:good' },
        {
          overlay: { font_family: 'Arial', font_size: 55, font_weight: 'bold', text: '© ImageStore' },
          color: '#FFFFFF', opacity: 45, gravity: 'center', angle: -30, y: -20,
        },
        {
          overlay: { font_family: 'Arial', font_size: 45, font_weight: 'bold', text: '© ImageStore' },
          color: '#FFFFFF', opacity: 30, gravity: 'south_east', angle: -30, x: 20, y: 20,
        },
      ],
    });

    watermarkPublicId = watermarkResult.public_id;
    const watermarkUrl = watermarkResult.secure_url;
    console.log(`[UPLOAD] ✅ Watermarked preview uploaded: ${watermarkPublicId}`);

    // 7. Upload original one
    console.log(`[UPLOAD] Uploading original for "${imageName}"...`);

    const originalResult = await uploadToCloudinary(buffer, {
      folder:          'image-store/originals',
      public_id:       `orig_${Date.now()}_${baseName}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'tiff'],
      type:            'private',
    });

    originalPublicId = originalResult.public_id;
    console.log(`[UPLOAD] ✅ Original uploaded (private): ${originalPublicId}`);

    // 8. Build DB document
    const imageDoc = createImageDocument({
      sellerId:          req.user.uid,
      sellerName:        req.user.username,
      imageName,
      description,
      price:             priceNum,
      category,
      tags:              parsedTags,
      watermarkUrl,         
      watermarkPublicId,     
      originalPublicId,                  
      metadata: {
        width:  req.file.width  || null,
        height: req.file.height || null,
        format: req.file.format || null,
        bytes:  req.file.size   || null,
      },
    });

    // 9. Save to DB
    const imageId = await createImage(imageDoc);

    //logger.info(`[UPLOAD] Image "${imageName}" uploaded by ${req.user.username} (${req.user.uid}) → ID: ${imageId}`);
    console.log(`[UPLOAD] Image "${imageName}" uploaded by ${req.user.username} (${req.user.uid}) → ID: ${imageId}`);

    // 10. Return
    return sendSuccess(res, 201, 'Image uploaded successfully. Pending admin review.', {
      message:      'Image uploaded',
      imageId,
      imageName,
      watermarkUrl: req.file.path,
      status:       IMAGE_STATUS.PENDING,
      note:         'Your image will be visible to buyers once approved by an admin.',
    });
  } catch (error) {
    //logger.error('uploadImage error:', error);
    console.error('uploadImage error:', error);
    // Clean up Cloudinary file if something went wrong after upload
    if (watermarkPublicId) {
      await deleteCloudinaryImage(watermarkPublicId).catch(() => {});
    }
    if (originalPublicId) {
      await deleteCloudinaryImage(originalPublicId, 'private').catch(() => {});
    }
    return sendError(res, 500, 'Image upload failed. Please try again.');
  }
};

//  GET /api/images/:id
const getImageDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch from DB
    const image = await getImageById(id);

    if (!image) {
      return sendError(res, 404, 'Image not found');
    }

    // 2. Access control
    if (image.status !== IMAGE_STATUS.APPROVED) {
      const isOwner = req.user && req.user.uid === image.sellerId;
      const isAdmin = req.user && req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return sendError(res, 404, 'Image not found');
      }
    }

    // 3. Increment view count (background, non-blocking)
    incrementStat(id, 'views').catch(() => {});

    // 4. Mapping response
    const response = {
      imageId:      image.imageId,
      imageName:    image.imageName,
      description:  image.description,
      price:        image.price,
      category:     image.category,
      tags:         image.tags,
      watermarkUrl: image.watermarkUrl,
      sellerId:     image.sellerId,
      sellerName:   image.sellerName,
      status:       image.status,
      uploadDate:   image.uploadDate,
      metadata:     image.metadata,
      views:        image.views + 1,   
      likes:        image.likes,
      purchases:    image.purchases,
      isFeatured:   image.isFeatured,

      ...(req.user && (req.user.uid === image.sellerId || req.user.role === 'admin')
        ? { adminNote: image.adminNote }
        : {}),
    };

    //logger.info(`[GET /images/${id}] Viewed by ${req.user?.uid || 'guest'}`);
    console.log(`[GET /images/${id}] Viewed by ${req.user?.uid || 'guest'}`);

    return sendSuccess(res, 200, 'Image details fetched', response);
  } catch (error) {
    //logger.error('getImageDetail error:', error);
    console.error('getImageDetail error:', error);
    return sendError(res, 500, 'Failed to fetch image details');
  }
};

//  DELETE /api/images/:id
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch image
    const image = await getImageById(id);

    if (!image) {
      return sendError(res, 404, 'Image not found');
    }

    // 2. Check if already deleted
    if (image.status === IMAGE_STATUS.DELETED) {
      return sendError(res, 404, 'Image not found');
    }

    // 3. Ownership check
    const isOwner = req.user.uid === image.sellerId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendError(res, 403, 'Access denied. You can only delete your own images.');
    }

    // 4. Delete from Cloud
    if (image.watermarkPublicId) {
      await deleteCloudinaryImage(image.watermarkPublicId).catch((e) => {
        //logger.warn(`Could not delete watermark from Cloudinary [${image.watermarkPublicId}]:`, e.message);
        console.warn(`Could not delete watermark from Cloudinary [${image.watermarkPublicId}]:`, e.message);
      });
    }

    if (image.originalPublicId) {
      await deleteCloudinaryImage(image.originalPublicId, 'private').catch((e) => {
        //logger.warn(`Could not delete original from Cloudinary [${image.originalPublicId}]:`, e.message);
        console.warn(`Could not delete original from Cloudinary [${image.originalPublicId}]:`, e.message);
      });
    }

    // 5. Soft-delete in DB
    await softDeleteImage(id);

    //logger.info(`[DELETE /images/${id}] Deleted by ${req.user.username} (${req.user.role})`);
    console.log(`[DELETE /images/${id}] Deleted by ${req.user.username} (${req.user.role})`);

    return sendSuccess(res, 200, 'Image deleted successfully', {
      message: 'Image deleted successfully',
      imageId: id,
    });
  } catch (error) {
    //logger.error('deleteImage error:', error);
    console.error('deleteImage error:', error);
    return sendError(res, 500, 'Failed to delete image');
  }
};

//  GET /api/images/my
const getMyImages = async (req, res) => {
  try {
    const images = await getSellerImages(req.user.uid);

    // Include status and adminNote for seller's own view
    const response = images.map(({ originalPublicId, watermarkPublicId, searchKeywords, ...img }) => img);

    return sendSuccess(res, 200, 'Your images fetched', {
      images: response,
      count:  response.length,
    });
  } catch (error) {
    //logger.error('getMyImages error:', error);
    console.error('getMyImages error:', error);
    return sendError(res, 500, 'Failed to fetch your images');
  }
};

module.exports = { getImages, uploadImage, getImageDetail, deleteImage, getMyImages };