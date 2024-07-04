// src/Bible.js
import React, { useState } from 'react';
import { getBooks, getVerses, getBookId } from './apiService';
import './Bible.css';

const Bible = () => {
  const [verses, setVerses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [books, setBooks] = useState([]);
  const [parsedInput, setParsedInput] = useState([]);
  const [inputValue, setInputValue] = useState('Ephesians 6:4/ 1 Peter 3:1-4/ Genesis 1:27/ 1 Corinthians 7/ Matthew 24/ Matthew');

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const parseReference = (reference) => {
    // Updated regex to handle optional chapter and verse
    const match = reference.match(/^(\d?\s?[A-Za-z.]+)(?:\s(\d+))?(?::(\d+)(?:-(\d+))?(?::(\d+))?)?$/);
    if (!match) return null;

    const book = match[1].trim();
    const startChapter = match[2] || null;
    const startVerse = match[3] || null;
    const endChapter = match[4] || startChapter;
    const endVerse = match[5] || match[4] || startVerse;

    return { book, startChapter, startVerse, endChapter, endVerse };
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const references = inputValue.split('/').map(ref => ref.trim());

    let parsedRefs = [];
    let versesList = [];
    let chaptersList = [];
    let booksList = [];

    for (const ref of references) {
      const parsedRef = parseReference(ref);
      if (parsedRef) {
        parsedRefs.push(parsedRef);
        const bookId = getBookId(parsedRef.book);
        if (bookId) {
          console.log(`Fetching verses for ${parsedRef.book} ${parsedRef.startChapter}:${parsedRef.startVerse}-${parsedRef.endVerse}`);
          try {
            if (parsedRef.startChapter && parsedRef.startVerse) {
              const versesData = await getVerses(bookId, parsedRef.startChapter);
              console.log(`Fetched verses for ${parsedRef.book} ${parsedRef.startChapter}:`, versesData);
              const selectedVerses = versesData.slice(parsedRef.startVerse - 1, parsedRef.endVerse).map(verse => verse.text).join(' ');
              const title = parsedRef.startVerse === parsedRef.endVerse
                ? `${parsedRef.book} ${parsedRef.startChapter}:${parsedRef.startVerse}`
                : `${parsedRef.book} ${parsedRef.startChapter}:${parsedRef.startVerse}-${parsedRef.endVerse}`;
              versesList.push({
                title: title,
                text: selectedVerses
              });
            } else if (parsedRef.startChapter) {
              const versesData = await getVerses(bookId, parsedRef.startChapter);
              console.log(`Fetched verses for ${parsedRef.book} ${parsedRef.startChapter}:`, versesData);
              const selectedVerses = versesData.slice(0, 4).map(verse => verse.text).join(' ');
              chaptersList.push({
                title: `Chapter | ${parsedRef.book} ${parsedRef.startChapter}`,
                text: selectedVerses
              });
            } else {
              const versesData = await getVerses(bookId, 1);
              console.log(`Fetched verses for ${parsedRef.book} 1:`, versesData);
              const selectedVerses = versesData.slice(0, 4).map(verse => verse.text).join(' ');
              booksList.push({
                title: `Book | ${parsedRef.book}`,
                text: selectedVerses
              });
            }
          } catch (error) {
            console.error(`Failed to fetch verses for ${parsedRef.book} ${parsedRef.startChapter}:`, error);
          }
        } else {
          console.error(`Book ID not found for ${parsedRef.book}`);
        }
      } else {
        console.error(`Could not parse reference: ${ref}`);
      }
    }
    console.log('Parsed References:', parsedRefs);
    console.log('Verses:', versesList);
    console.log('Chapters:', chaptersList);
    console.log('Books:', booksList);
    setParsedInput(parsedRefs);
    setVerses(versesList);
    setChapters(chaptersList);
    setBooks(booksList);
  };

  return (
    <div className="container">
      <h1>Bible App</h1>
      <div className="input-bar">
        <form onSubmit={handleFormSubmit}>
          <input
            type="text"
            placeholder="Ephesians 6:4/ 1 Peter 3:1-4/ Genesis 1:27/ 1 Corinthians 7/ Matthew 24/ Matthew"
            value={inputValue}
            onChange={handleInputChange}
            className="input"
          />
          <button type="submit" className="button">Get Verses</button>
        </form>
      </div>
      <div className="parsed-container">
        <h2>Parsed Input:</h2>
        <ul>
          {parsedInput.map((ref, index) => (
            <li key={index}>
              Book: {ref.book}, Chapter: {ref.startChapter}, Verse: {ref.startVerse}, End Chapter: {ref.endChapter}, End Verse: {ref.endVerse}
            </li>
          ))}
        </ul>
      </div>
      <div className="verses-container">
        <h2>Verses:</h2>
        {verses.map((verse, index) => (
          <div key={index}>
            <strong>{verse.title}</strong>
            <p className="verse">{verse.text}</p>
          </div>
        ))}
      </div>
      <div className="chapters-container">
        <h2>Chapters:</h2>
        {chapters.map((chapter, index) => (
          <div key={index}>
            <strong>{chapter.title}</strong>
            <p className="verse">{chapter.text}</p>
          </div>
        ))}
      </div>
      <div className="books-container">
        <h2>Books:</h2>
        {books.map((book, index) => (
          <div key={index}>
            <strong>{book.title}</strong>
            <p className="verse">{book.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Bible;
