require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// News Schema
const newsSchema = new mongoose.Schema({
  title: String,
  text: String,
  category: String,
  tone: String,
  url: String,
  date: Date
});

const News = mongoose.model('News', newsSchema);

// Read and parse the JSON file
const newsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'news.json'), 'utf-8'));

// Import data
async function importData() {
  try {
    // Clear existing data
    await News.deleteMany({});
    
    // Insert new data
    await News.insertMany(newsData);
    console.log('Data successfully imported!');
    
    // Close connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

importData(); 