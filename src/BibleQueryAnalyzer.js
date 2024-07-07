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
      console.log('API response received:', response.data);
      
      const processedResults = processApiResponse(response.data);
      console.log('Processed results:', processedResults);
      setResults(processedResults.results);
      setRawResponses(processedResults.rawResponses);
      setParsedReferences(processedResults.parsedReferences);

      const top5Verses = await getTop5VerseswithContent(processedResults.results.verseCounts);
      setTopVerses(top5Verses);
    } catch (err) {
      console.error('Error details:', err);
      setError('Failed to fetch results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const processApiResponse = (data) => {
    console.log('Processing API response:', data);
    let allReferences = [];
    let rawResponses = [];
    data.forEach(item => {
      ['biblereferences', 'bibleverses', 'biblicalconcepts'].forEach(field => {
        if (item[field] && item[field].toLowerCase() !== 'na' && item[field].toLowerCase() !== 'nan') {
          const refs = item[field].split(/[,;/]/).map(ref => ref.trim());
          allReferences.push(...refs.map(ref => ({ raw: ref, field })));
          rawResponses.push(`${field}: ${item[field]}`);
        }
      });
    });
    console.log('All references extracted:', allReferences);
  
    const parsedReferences = parseReferences(allReferences);
    console.log('Parsed references:', parsedReferences);

    const standardizedReferences = standardizeReferences(parsedReferences.map(pr => pr.parsed));
    console.log('Standardized references:', standardizedReferences);
  
    const verseCounts = countVerseOccurrences(standardizedReferences);
    console.log('Verse counts:', verseCounts);
  
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
    return references.flatMap(({ raw, field }) => {
      const parts = raw.split(/[-–]/);
      if (parts.length === 1) return [{ raw, parsed: standardizeBookName(raw), field }];

      const [start, end] = parts;
      const [book, startChapter, startVerse] = start.trim().split(/\s+|:/);
      const [endChapter, endVerse] = end.trim().split(':');

      if (!endVerse) {
        // Range is within the same chapter
        return [{ raw, parsed: standardizeBookName(start.trim()), field }];
      }

      const fullBookName = getFullBookName(book);
      const result = [];
      for (let verse = parseInt(startVerse); verse <= parseInt(endVerse); verse++) {
        const parsed = `${fullBookName} ${startChapter}:${verse}`;
        result.push({ raw, parsed, field });
      }
      return result;
    });
  };

  const standardizeBookName = (reference) => {
    const parts = reference.trim().split(' ');
    let book = parts[0];
    if (parts.length > 1 && (parts[0].toLowerCase() === '1' || parts[0].toLowerCase() === '2' || parts[0].toLowerCase() === '3')) {
      book = parts[0] + ' ' + parts[1];
      parts.splice(0, 2);
    } else {
      parts.splice(0, 1);
    }
    const fullBookName = getFullBookName(book);
    return [fullBookName, ...parts].join(' ');
  };

  const getFullBookName = (book) => {
    const lowercaseBook = book.toLowerCase();
    return abbreviationsToFullName[lowercaseBook] || book;
  };

  const standardizeReferences = (references) => {
    let currentBook = '';
    return references.map(ref => {
      console.log('Standardizing reference:', ref);
      const parts = ref.trim().split(' ');
      let book = parts[0];
  
      if (parts.length === 1 || !isNaN(parts[0])) {
        book = currentBook;
      } else {
        if (parts.length > 1 && (parts[0].toLowerCase() === '1' || parts[0].toLowerCase() === '2' || parts[0].toLowerCase() === '3')) {
          book = parts[0] + ' ' + parts[1];
          parts.splice(0, 2);
        } else {
          parts.splice(0, 1);
        }
  
        const lowercaseBook = book.toLowerCase();
        if (abbreviationsToFullName[lowercaseBook]) {
          book = abbreviationsToFullName[lowercaseBook];
        }
  
        currentBook = book;
      }
  
      const standardized = [book, ...parts].join(' ');
      console.log('Standardized to:', standardized);
      return standardized;
    });
  };

  const countVerseOccurrences = (references) => {
    const counts = {};
    references.forEach(ref => {
      console.log('Counting occurrence for:', ref);
      const [book, ...rest] = ref.split(' ');
      const chapterVerse = rest.join(' ');
      if (!chapterVerse) return;

      const [chapter, verse] = chapterVerse.split(':');
      if (!verse) return;

      const fullRef = `${book} ${chapter}:${verse}`;
      counts[fullRef] = (counts[fullRef] || 0) + 1;
      console.log('Counted:', fullRef, counts[fullRef]);
    });
    return counts;
  };

  const getTop5VerseswithContent = async (verseCounts) => {
    const sortedVerses = Object.entries(verseCounts)
      .sort(([, a], [, b]) => b - a);

    const results = [];
    let index = 0;
    while (results.length < 5 && index < sortedVerses.length) {
      const [verse, count] = sortedVerses[index];
      const [book, chapterVerse] = verse.split(' ');
      const [chapter, verseNumber] = chapterVerse.split(':');
      
      if (isNaN(parseInt(verseNumber))) {
        index++;
        continue;
      }

      const startVerse = parseInt(verseNumber);
      const endVerse = startVerse + 3;
      
      const reference = `${book} ${chapter}:${startVerse}-${endVerse}`;
      
      try {
        const verses = await fetchVerses(reference);
        if (verses && verses.length > 0) {
          results.push({ reference, count, verses });
        }
      } catch (error) {
        console.error(`Error fetching verses for ${reference}:`, error);
      }
      
      index++;
    }

    return results;
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

      {results && (
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
    </div>
  );
};

export default BibleQueryAnalyzer;