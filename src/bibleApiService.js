import axios from 'axios';

export const fetchVerses = async (reference) => {
  try {
    const response = await axios.get(`https://bible-api.com/${reference}`);
    return response.data.verses.map(verse => ({
      verse: verse.verse,
      text: verse.text.trim()
    }));
  } catch (error) {
    console.error(`Error fetching verses for ${reference}:`, error);
    return [];
  }
};