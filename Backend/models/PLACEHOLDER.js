class Image {
  constructor(data) {
    this.title = data.title;
    this.description = data.description;
    this.cloudinaryUrl = data.cloudinaryUrl; // จาก Class Diagram
    this.publicId = data.publicId;
    this.price = data.price;
    this.sellerId = data.sellerId;
    this.uploadDate = new Date();
    // สถานะเริ่มต้นตาม State Diagram: Draft/Upload -> Pending review
    this.status = 'Pending review'; 
  }
}
module.exports = ImageModel;