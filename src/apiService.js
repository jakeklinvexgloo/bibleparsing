import axios from 'axios';
import { books } from './booksData'; // Importing books data from the new file

const API_URL = 'https://bible-api.com';

export const getBooks = async () => {
  return books;
};

export const getVerses = async (bookId, chapterId) => {
  const url = `${API_URL}/${bookId}+${chapterId}`;
  try {
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url);
    return response.data.verses;
  } catch (error) {
    console.error(`Error fetching verses for ${bookId} ${chapterId}:`, error);
    throw error;
  }
};

export const getBookId = (name) => {
  const book = books.find(book =>
    book.abbreviations.some(abbreviation => abbreviation.toLowerCase().replace(/\s/g, '') === name.toLowerCase().replace(/\s/g, ''))
  );
  return book ? book.id : null;
};

export const askQuestion = async (question) => {
  const url = `http://localhost:5001/proxy/${encodeURIComponent(question)}?field=publisher&value=Christianity%20Today&value=The%20Good%20Book%20Co&value=Ligonier%20Ministries`;
  try {
    console.log(`Request URL: ${url}`);
    const response = await axios.get(url);
    console.log('Response Data:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Response Data:', error.response.data);
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request Data:', error.request);
    } else {
      console.error('Error Message:', error.message);
    }
    throw error;
  }
};

export const cleanResponse = (responses) => {
  const validBooks = books.map(book => book.name);
  const abbreviationMap = new Map();
  books.forEach(book => {
    book.abbreviations.forEach(abbr => abbreviationMap.set(abbr, book.name));
  });

  return responses
    .map(item => item.trim())
    .filter(item => item !== 'NA')
    .map(item => item.split(';').join('/')) // Replacing ";" with "/" unless between numbers
    .map(item => {
      const words = item.split(/(\d+)/).filter(Boolean);
      return words.map(word => abbreviationMap.get(word.trim()) || word).join(' ').replace(/\s*:\s*/g, ':');
    })
    .filter(item => validBooks.some(book => item.includes(book)))
    .join(' / ');
};
