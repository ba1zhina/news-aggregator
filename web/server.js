require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Routes
app.get('/api/news', async (req, res) => {
  try {
    const { categories, tones } = req.query;
    let query = {};

    if (categories) {
      query.category = { $in: categories.split(',') };
    }

    if (tones) {
      query.tone = { $in: tones.split(',') };
    }

    let news = await News.find(query).sort({ date: -1 });

    // Custom sorting if multiple tones are selected
    if (tones && tones.split(',').length > 1) {
      const toneOrder = { positive: 0, neutral: 1, negative: 2 };
      news = news.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);
    }

    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await News.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 