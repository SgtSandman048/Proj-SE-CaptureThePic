const db = require('../config/firebase');

// [Phase 1: Buyer] อัปโหลดสลิป -> สร้าง Order (Status: Pending)
exports.uploadSlipAndCreateOrder = async (req, res) => {
  try {
    const { buyerId, imageId, totalAmount } = req.body;
    const file = req.file; // สลิปที่อยู่บน Cloudinary แล้ว

    if (!file) return res.status(400).json({ message: "Payment slip is required" });

    const newOrder = {
      buyerId,
      imageId,
      totalAmount: parseFloat(totalAmount),
      slipUrl: file.path,       // URL สลิป
      slipCloudId: file.filename,
      orderStatus: 'Pending',   // รอตรวจสอบ
      orderDate: new Date().toISOString()
    };

    // บันทึกลง Firestore
    const docRef = await db.collection('orders').add(newOrder);

    res.status(201).json({ 
      message: "Slip uploaded, waiting for verification", 
      orderId: docRef.id,
      status: "Pending" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [Phase 2: Admin] ตรวจสอบรายการที่ Pending และกด Approve
exports.approveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) return res.status(404).json({ message: "Order not found" });

    // Update Status เป็น Paid
    await orderRef.update({ 
      orderStatus: 'Paid',
      approvedAt: new Date().toISOString()
    });

    res.status(200).json({ message: "Order approved successfully", orderId, status: "Paid" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [Phase 3: Buyer] ตรวจสอบสถานะและดาวน์โหลด
exports.checkDownloadPermission = async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) return res.status(404).json({ message: "Order not found" });

    const orderData = orderDoc.data();

    if (orderData.orderStatus === 'Paid') {
      // Logic เพิ่มเติม: ไปดึง URL รูปต้นฉบับจาก collection 'images'
      const imageDoc = await db.collection('images').doc(orderData.imageId).get();
      const imageData = imageDoc.data();

      res.status(200).json({ 
        canDownload: true, 
        downloadUrl: imageData.cloudUrl, // ในระบบจริงควรเป็น Signed URL ชั่วคราว
        message: "Download granted" 
      });
    } else {
      res.status(403).json({ 
        canDownload: false, 
        message: "Payment verification pending" 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};