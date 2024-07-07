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
    .map(({ item, index }) => ({
      item: item.trim(),
      index
    }))
    .filter(({ item }) => item !== 'NA')
    .map(({ item, index }) => ({
      item: item.split(';').join('/'), // Replacing ";" with "/" unless between numbers
      index
    }))
    .map(({ item, index }) => {
      const words = item.split(/(\d+)/).filter(Boolean);
      const cleanedItem = words.map(word => abbreviationMap.get(word.trim()) || word).join(' ').replace(/\s*:\s*/g, ':').replace(/\s*-\s*/g, '-');
      return { item: cleanedItem, index };
    })
    .filter(({ item }) => validBooks.some(book => item.includes(book)))
    .map(({ item, index }) => `${index}: ${item}`)
    .join(' / ');
};

export const cleanAndDedupedResponse = (responses) => {
  const validBooks = books.map(book => book.name);
  const abbreviationMap = new Map();
  books.forEach(book => {
    book.abbreviations.forEach(abbr => abbreviationMap.set(abbr, book.name));
  });

  const seen = new Map();
  return responses
    .map(({ item, index }) => ({
      item: item.trim(),
      index
    }))
    .filter(({ item }) => item !== 'NA')
    .map(({ item, index }) => ({
      item: item.split(';').join('/'), // Replacing ";" with "/" unless between numbers
      index
    }))
    .map(({ item, index }) => {
      const words = item.split(/(\d+)/).filter(Boolean);
      const cleanedItem = words.map(word => abbreviationMap.get(word.trim()) || word).join(' ').replace(/\s*:\s*/g, ':').replace(/\s*-\s*/g, '-');
      return { item: cleanedItem, index };
    })
    .filter(({ item }) => validBooks.some(book => item.includes(book)))
    .filter(({ item, index }) => {
      const seenKey = `${index}:${item}`;
      if (seen.has(seenKey)) return false;
      seen.set(seenKey, true);
      return true;
    })
    .map(({ item, index }) => `${index}: ${item}`)
    .join(' / ');
};

export const separateVerses = (verses) => {
  const separated = [];

  verses.forEach(verse => {
    console.log('Processing verse:', verse);
    const [index, ref] = verse.split(': ');
    if (!ref) return;

    const [book, chapterVerses] = ref.split(' ');
    const chapterVersesList = chapterVerses.split(/[,;]/).map(cv => cv.trim());

    chapterVersesList.forEach(chapterVerse => {
      if (chapterVerse.includes('-')) {
        const [start, end] = chapterVerse.split('-').map(Number);
        const chapter = book.split(' ')[1];
        for (let i = start; i <= end; i++) {
          separated.push(`${book} ${chapter}:${i}`);
        }
      } else {
        separated.push(`${book} ${chapterVerse}`);
      }
    });
  });

  console.log('Separated verses:', separated);
  return separated;
};
