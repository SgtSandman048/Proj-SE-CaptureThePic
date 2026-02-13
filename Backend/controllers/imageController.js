// controllers/imageControllers.js

const db = require('../config/firebase');

// [Seller] อัปโหลดรูปภาพเพื่อขาย
exports.uploadImage = async (req, res) => {
  try {
    const { sellerId, imageName, description, price, category } = req.body;
    const file = req.file; // ได้จาก Cloudinary Middleware

    if (!file) return res.status(400).json({ message: "Image file is required" });

    const newImage = {
      sellerId,
      imageName,
      description,
      price: parseFloat(price),
      category,
      cloudUrl: file.path,      // URL รูปภาพ
      cloudId: file.filename,   // ID รูปใน Cloud
      status: 'Active',
      uploadDate: new Date().toISOString()
    };

    const docRef = await db.collection('images').add(newImage);

    res.status(201).json({ 
      message: "Image uploaded successfully", 
      imageId: docRef.id, 
      data: newImage 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [Buyer/Public] ดึงรายการรูปภาพทั้งหมด
exports.getAllImages = async (req, res) => {
  try {
    const snapshot = await db.collection('images').where('status', '==', 'Active').get();
    const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};