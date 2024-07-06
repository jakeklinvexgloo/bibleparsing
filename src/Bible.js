import React, { useState } from 'react';
import { getBooks, getVerses, getBookId, askQuestion, cleanResponse, cleanAndDedupedResponse } from './apiService';
import './Bible.css';

const Bible = () => {
  const [verses, setVerses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [books, setBooks] = useState([]);
  const [parsedInput, setParsedInput] = useState([]);
  const [inputValue, setInputValue] = useState('Ephesians 6:4/ 1 Peter 3:1-4/ Genesis 1:27/ 1 Corinthians 7/ Matthew 24/ Matthew');
  const [verseCounts, setVerseCounts] = useState({});
  const [question, setQuestion] = useState('');
  const [apiResponseString, setApiResponseString] = useState('');
  const [cleanedResponseString, setCleanedResponseString] = useState('');
  const [cleanedAndDedupedResponseString, setCleanedAndDedupedResponseString] = useState('');

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
  };

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();
    try {
      console.log(`Submitting question: ${question}`);
      const response = await askQuestion(question);
      console.log('Full API Response:', response);

      // Extracting data from the response
      let biblereferences = [];
      let bibleverses = [];
      let biblicalconcepts = [];

      response.forEach(item => {
        if (item.biblereferences && item.biblereferences.trim() !== "nan") {
          biblereferences.push({ item: item.biblereferences, index: item.index });
        }
        if (item.bibleverses && item.bibleverses.trim() !== "nan") {
          bibleverses.push({ item: item.bibleverses, index: item.index });
        }
        if (item.biblicalconcepts && item.biblicalconcepts.trim() !== "nan") {
          biblicalconcepts.push({ item: item.biblicalconcepts, index: item.index });
        }
      });

      // Log the extracted data
      console.log('Biblereferences:', biblereferences);
      console.log('Bibleverses:', bibleverses);
      console.log('Biblicalconcepts:', biblicalconcepts);

      // Concatenate the extracted data
      const concatenatedString = [...biblereferences, ...bibleverses, ...biblicalconcepts]
        .map(({ item, index }) => `${index}: ${item}`)
        .join(' / ');
      console.log('Concatenated String:', concatenatedString);
      setApiResponseString(concatenatedString);

      // Clean the concatenated string
      const cleanedString = cleanResponse([...biblereferences, ...bibleverses, ...biblicalconcepts]);
      console.log('Cleaned Concatenated String:', cleanedString);
      setCleanedResponseString(cleanedString);

      // Clean and deduped the concatenated string
      const cleanedAndDedupedString = cleanAndDedupedResponse([...biblereferences, ...bibleverses, ...biblicalconcepts]);
      console.log('Cleaned and Deduped Concatenated String:', cleanedAndDedupedString);
      setCleanedAndDedupedResponseString(cleanedAndDedupedString);
    } catch (error) {
      console.error('Error fetching question data:', error);
    }
  };

  const parseReference = (reference) => {
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
    let verseCountMap = {};

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

              for (let verseNumber = parsedRef.startVerse; verseNumber <= parsedRef.endVerse; verseNumber++) {
                const selectedVerse = versesData[verseNumber - 1];
                if (selectedVerse) {
                  versesList.push({
                    title: `${parsedRef.book} ${parsedRef.startChapter}:${verseNumber}`,
                    text: selectedVerse.text
                  });

                  const verseRef = `${parsedRef.book} ${parsedRef.startChapter}:${verseNumber}`;
                  if (!verseCountMap[verseRef]) {
                    verseCountMap[verseRef] = 0;
                  }
                  verseCountMap[verseRef]++;
                }
              }
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

    setParsedInput(parsedRefs);
    setVerses(versesList);
    setChapters(chaptersList);
    setBooks(booksList);
    setVerseCounts(verseCountMap);
  };

  return (
    <div className="container">
      <h1>Bible App</h1>
      <div className="input-bar">
        <form onSubmit={handleQuestionSubmit}>
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={handleQuestionChange}
            className="input"
          />
          <button type="submit" className="button">Ask Question</button>
        </form>
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
            <p>Count: {verseCounts[verse.title] || 0}</p>
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
      <div className="api-response-container">
        <h2>API Response:</h2>
        <p>{apiResponseString}</p>
      </div>
      <div className="cleaned-response-container">
        <h2>Cleaned Response:</h2>
        <p>{cleanedResponseString}</p>
      </div>
      <div className="cleaned-deduped-response-container">
        <h2>Cleaned and Deduped Response:</h2>
        <p>{cleanedAndDedupedResponseString}</p>
      </div>
    </div>
  );
};

export default Bible;
