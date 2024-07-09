import React, { useState } from 'react';
import axios from 'axios';
import { books, abbreviationsToFullName } from './booksData';
import { fetchVerses } from './bibleApiService';
import './BibleQueryAnalyzer.css';

const BibleQueryAnalyzer = () => {
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState(null);
  const [topVerses, setTopVerses] = useState([]);
  const [rawResponses, setRawResponses] = useState('');
  const [parsedReferences, setParsedReferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuestionChange = (e) => {
    setQuestion(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('Submitting question:', question);
    try {
      const encodedQuestion = encodeURIComponent(question);
      const apiUrl = `/api/all/${encodedQuestion}?field=publisher&value=Christianity%20Today&value=The%20Good%20Book%20Co&value=Ligonier%20Ministries`;
      
      console.log('Sending API request to:', apiUrl);
      const response = await axios.get(apiUrl);
      console.log('API response received:', JSON.stringify(response.data, null, 2));
      
      const processedResults = processApiResponse(response.data);
      console.log('Processed results:', JSON.stringify(processedResults, null, 2));
      setResults(processedResults.results);
      setRawResponses(processedResults.rawResponses);
      setParsedReferences(processedResults.parsedReferences);

      const top5Verses = await getTop5VerseswithContent(processedResults.results.verseCounts);
      console.log('Top 5 verses:', JSON.stringify(top5Verses, null, 2));
      setTopVerses(top5Verses);
    } catch (err) {
      console.error('Error details:', err);
      setError('Failed to fetch results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const processApiResponse = (data) => {
    console.log('Processing API response:', JSON.stringify(data, null, 2));
    let allReferences = [];
    let rawResponses = [];
    data.forEach(item => {
      ['biblereferences', 'bibleverses', 'biblicalconcepts'].forEach(field => {
        if (item[field] && item[field].toLowerCase() !== 'na' && item[field].toLowerCase() !== 'nan') {
          const refs = item[field].split(/[,;/]/).map(ref => ref.trim());
          console.log(`Extracted references from ${field}:`, refs);
          allReferences.push(...refs.map(ref => ({ raw: ref, field })));
          rawResponses.push(`${field}: ${item[field]}`);
        }
      });
    });
    console.log('All references extracted:', JSON.stringify(allReferences, null, 2));
  
    const parsedReferences = parseReferences(allReferences);
    console.log('Parsed references:', JSON.stringify(parsedReferences, null, 2));

    const standardizedReferences = standardizeReferences(parsedReferences.map(pr => pr.parsed));
    console.log('Standardized references:', JSON.stringify(standardizedReferences, null, 2));
  
    const verseCounts = countVerseOccurrences(standardizedReferences);
    console.log('Verse counts:', JSON.stringify(verseCounts, null, 2));
  
    return {
      results: {
        standardizedReferences,
        verseCounts
      },
      rawResponses: rawResponses.join('\n'),
      parsedReferences
    };
  };

  const parseReferences = (references) => {
    console.log('Parsing references:', JSON.stringify(references, null, 2));
    return references.flatMap(({ raw, field }) => {
      const parts = raw.split(/[-–]/);
      if (parts.length === 1) {
        const parsed = standardizeBookName(raw);
        console.log(`Parsed single reference: ${raw} -> ${parsed}`);
        return [{ raw, parsed, field }];
      }
  
      const [start, end] = parts;
      const [book, startChapter, startVerse] = splitBookChapterVerse(start.trim());
      const [, endChapter, endVerse] = splitBookChapterVerse(end.trim());
  
      if (!book) {
        console.error('Invalid reference:', raw);
        return [];
      }
  
      if (!endVerse && !endChapter) {
        const parsed = standardizeBookName(start.trim());
        console.log(`Parsed range reference without end: ${raw} -> ${parsed}`);
        return [{ raw, parsed, field }];
      }
  
      const fullBookName = getFullBookName(book);
      const result = [];
      const startVerseNum = startVerse ? parseInt(startVerse) : 1;
      const endVerseNum = endVerse ? parseInt(endVerse) : (startVerse ? startVerseNum : null);
  
      if (endVerseNum !== null) {
        for (let verse = startVerseNum; verse <= endVerseNum; verse++) {
          const parsed = `${fullBookName} ${startChapter}:${verse}`;
          result.push({ raw, parsed, field });
        }
      } else {
        // If no verse range, just use the standardized book and chapter
        const parsed = `${fullBookName} ${startChapter}`;
        result.push({ raw, parsed, field });
      }
  
      console.log(`Parsed range reference: ${raw} -> ${JSON.stringify(result, null, 2)}`);
      return result;
    });
  };

  const splitBookChapterVerse = (reference) => {
    console.log('Splitting reference:', reference);
    if (!reference || typeof reference !== 'string') {
      console.error('Invalid reference:', reference);
      return ['', '', ''];
    }
  
    const parts = reference.trim().split(' ');
    let book, chapter, verse;
  
    if (parts.length >= 3 && (parts[0] === '1' || parts[0] === '2' || parts[0] === '3')) {
      book = `${parts[0]} ${parts[1]}`;
      [chapter, verse] = parts.slice(2).join(' ').split(':');
    } else if (parts.length >= 2) {
      book = parts[0];
      [chapter, verse] = parts.slice(1).join(' ').split(':');
    } else {
      book = parts[0] || '';
      chapter = '';
      verse = '';
    }
  
    // Don't treat chapter as verse if verse is not specified
    if (!verse && chapter) {
      // Keep chapter as is, don't convert to verse
      verse = '';
    }
  
    console.log('Split result:', { book, chapter, verse });
    return [book, chapter || '', verse || ''];
  };
  


  const standardizeBookName = (reference) => {
    console.log('Standardizing book name:', reference);
    const [book, chapter, verse] = splitBookChapterVerse(reference);
    const fullBookName = getFullBookName(book);
    const result = verse ? `${fullBookName} ${chapter}:${verse}` : `${fullBookName} ${chapter}`;
    console.log('Standardized book name:', result);
    return result;
  };

  const getFullBookName = (book) => {
    console.log('Getting full book name for:', book);
    const lowercaseBook = book.toLowerCase();
    const result = abbreviationsToFullName[lowercaseBook] || book;
    console.log('Full book name:', result);
    return result;
  };

  const standardizeReferences = (references) => {
    console.log('Standardizing references:', JSON.stringify(references, null, 2));
    return references.map(ref => {
      console.log('Standardizing reference:', ref);
      const [book, chapter, verse] = splitBookChapterVerse(ref);
      const fullBookName = getFullBookName(book);
      const standardized = verse ? `${fullBookName} ${chapter}:${verse}` : `${fullBookName} ${chapter}`;
      console.log('Standardized to:', standardized);
      return standardized;
    });
  };

  const countVerseOccurrences = (references) => {
    console.log('Counting verse occurrences for:', JSON.stringify(references, null, 2));
    const counts = {};
    references.forEach(ref => {
      console.log('Processing reference:', ref);
      const [book, chapter, verse] = splitBookChapterVerse(ref);

      if (!verse) {
        console.log('Skipping reference without verse:', ref);
        return;
      }

      const fullRef = `${book} ${chapter}:${verse}`;
      counts[fullRef] = (counts[fullRef] || 0) + 1;
      console.log('Counted:', fullRef, counts[fullRef]);
    });
    console.log('Final verse counts:', JSON.stringify(counts, null, 2));
    return counts;
  };

  const getTop5VerseswithContent = async (verseCounts) => {
    console.log('Getting top 5 verses with content. Verse counts:', JSON.stringify(verseCounts, null, 2));
    const sortedVerses = Object.entries(verseCounts)
      .sort(([, a], [, b]) => b - a);

    const results = [];
    let index = 0;
    while (results.length < 5 && index < sortedVerses.length) {
      const [verse, count] = sortedVerses[index];
      const [book, chapter, verseNumber] = splitBookChapterVerse(verse);
      
      if (!verseNumber) {
        console.log('Skipping reference without verse number:', verse);
        index++;
        continue;
      }

      const startVerse = parseInt(verseNumber);
      const endVerse = startVerse + 3;
      
      const reference = `${book} ${chapter}:${startVerse}-${endVerse}`;
      console.log('Fetching verses for reference:', reference);
      
      try {
        const verses = await fetchVerses(reference);
        console.log('Fetched verses:', JSON.stringify(verses, null, 2));
        if (verses && verses.length > 0) {
          const { abbreviation, number } = getBookAbbreviation(book);
          results.push({ 
            reference, 
            count, 
            verses,
            book: {
              full: book,
              abbreviation,
              number
            }
          });
          console.log('Added to results:', JSON.stringify(results[results.length - 1], null, 2));
        }
      } catch (error) {
        console.error(`Error fetching verses for ${reference}:`, error);
      }
      
      index++;
    }

    console.log('Final top 5 verses with content:', JSON.stringify(results, null, 2));
    return results;
  };

  const getBookAbbreviation = (fullBookName) => {
    console.log('Getting book abbreviation for:', fullBookName);
    const bookInfo = books.find(book => book.name.toLowerCase() === fullBookName.toLowerCase());
    if (bookInfo) {
      const number = fullBookName.match(/^(\d+)\s/);
      let bookNameWithoutNumber = fullBookName.replace(/^\d+\s/, '');
      
      // Get or create a two-letter abbreviation
      let abbreviation = bookInfo.abbreviations.find(abbr => abbr.length === 2 && !abbr.match(/^\d/));
      if (!abbreviation) {
        abbreviation = createTwoCharAbbreviation(bookNameWithoutNumber);
      }
  
      let result = {
        abbreviation: abbreviation.replace('.', ''), // Remove any trailing period
        number: number ? number[1] : null
      };
      
      console.log('Book abbreviation result:', JSON.stringify(result, null, 2));
      return result;
    }
    console.log('No book abbreviation found');
    return { abbreviation: '', number: null };
  };
  
  const createTwoCharAbbreviation = (bookName) => {
    const words = bookName.split(' ');
    if (words.length === 1) {
      return bookName.slice(0, 2);
    } else {
      return words[0][0] + words[1][0];
    }
  };

  return (
    <div className="bible-query-analyzer">
      <h1 className="title">Bible Query Analyzer</h1>
      <form onSubmit={handleSubmit} className="query-form">
        <input
          type="text"
          value={question}
          onChange={handleQuestionChange}
          placeholder="Ask a Bible-related question"
          className="query-input"
        />
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {results && results.verseCounts && Object.keys(results.verseCounts).length > 0 && (
        <div className="results-container">
          <h2 className="section-title">Verse Occurrence Counts</h2>
          <ul className="verse-counts">
            {Object.entries(results.verseCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([verse, count]) => (
                <li key={verse} className="verse-count-item">
                  <span className="verse">{verse}</span>
                  <span className="count">{count}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {topVerses.length > 0 && (
        <div className="top-verses-container">
          <h2 className="section-title">Top 5 Verses with Content</h2>
          {topVerses.map((item, index) => (
  <div key={index} className="verse-item">
    <h3 className="verse-reference">
      {item.reference} <span className="mention-count">(Mentioned {item.count} times)</span>
    </h3>
    <p className="book-info">
      {item.book.number 
        ? `Number: ${item.book.number} Book: ${item.book.abbreviation}`
        : `Book: ${item.book.abbreviation}`
      }
    </p>
    {item.verses.map((verse, vIndex) => (
      <p key={vIndex} className="verse-content">
        <strong className="verse-number">{verse.verse}</strong> {verse.text}
      </p>
    ))}
  </div>
))}
        </div>
      )}

      {parsedReferences.length > 0 && (
        <div className="parsed-references-container">
          <h2 className="section-title">Parsed References</h2>
          <table className="parsed-references-table">
            <thead>
              <tr>
                <th>Raw Input</th>
                <th>Parsed Reference</th>
                <th>Field</th>
              </tr>
            </thead>
            <tbody>
              {parsedReferences.map((ref, index) => (
                <tr key={index} className="parsed-reference-item">
                  <td>{ref.raw}</td>
                  <td>{ref.parsed}</td>
                  <td>{ref.field}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {rawResponses && (
      <div className="raw-responses-container">
        <h2 className="section-title">Raw Concatenated Responses</h2>
        <pre className="raw-responses">{rawResponses}</pre>
      </div>
    )}

    <div className="debug-info">
      <h2 className="section-title">Debug Information</h2>
      <h3>Parsed References:</h3>
      <pre>{JSON.stringify(parsedReferences, null, 2)}</pre>
      <h3>Results:</h3>
      <pre>{JSON.stringify(results, null, 2)}</pre>
      <h3>Top Verses:</h3>
      <pre>{JSON.stringify(topVerses, null, 2)}</pre>
    </div>
  </div>
);
};

export default BibleQueryAnalyzer;