import React, { useState } from 'react';
import axios from 'axios';
import { books, abbreviationsToFullName } from './booksData';

const BibleQueryAnalyzer = () => {
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState(null);
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
      setResults(processedResults);
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
    data.forEach(item => {
      ['biblereferences', 'bibleverses', 'biblicalconcepts'].forEach(field => {
        if (item[field]) {
          const refs = item[field].split(/[,;/]/).map(ref => ref.trim());
          allReferences.push(...refs);
        }
      });
    });
    console.log('All references extracted:', allReferences);
  
    const standardizedReferences = standardizeReferences(allReferences);
    console.log('Standardized references:', standardizedReferences);
  
    const verseCounts = countVerseOccurrences(standardizedReferences);
    console.log('Verse counts:', verseCounts);
  
    return {
      standardizedReferences,
      verseCounts
    };
  };

  const standardizeReferences = (references) => {
    let currentBook = '';
    return references.map(ref => {
      console.log('Standardizing reference:', ref);
      const parts = ref.trim().split(' ');
      let book = parts[0];
  
      // Check if the reference starts with a number (chapter)
      if (parts.length === 1 || !isNaN(parts[0])) {
        // Use the previous book if no book is specified
        book = currentBook;
      } else {
        // Handle cases where the book name is two words (e.g., "1 Corinthians")
        if (parts.length > 1 && (parts[0].toLowerCase() === '1' || parts[0].toLowerCase() === '2' || parts[0].toLowerCase() === '3')) {
          book = parts[0] + ' ' + parts[1];
          parts.splice(0, 2);
        } else {
          parts.splice(0, 1);
        }
  
        // Use the abbreviationsToFullName object to get the full book name
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

    const [chapter, verseRange] = chapterVerse.split(':');
    if (!verseRange) return;

    // Handle ranges with en dash (–) or hyphen (-)
    if (verseRange.includes('–') || verseRange.includes('-')) {
      const [start, end] = verseRange.split(/[–-]/).map(Number);
      for (let verse = start; verse <= end; verse++) {
        const fullRef = `${book} ${chapter}:${verse}`;
        counts[fullRef] = (counts[fullRef] || 0) + 1;
        console.log('Counted:', fullRef, counts[fullRef]);
      }
    } else {
      counts[ref] = (counts[ref] || 0) + 1;
      console.log('Counted:', ref, counts[ref]);
    }
  });
  return counts;
};

  return (
    <div className="bible-query-analyzer">
      <h2>Bible Query Analyzer</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={handleQuestionChange}
          placeholder="Ask a Bible-related question"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Ask'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results && (
        <div className="results">
          <h3>Standardized References:</h3>
          <ul>
            {results.standardizedReferences.map((ref, index) => (
              <li key={index}>{ref}</li>
            ))}
          </ul>
          <h3>Verse Occurrence Counts:</h3>
          <ul>
            {Object.entries(results.verseCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([verse, count]) => (
                <li key={verse}>{verse}: {count}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BibleQueryAnalyzer;