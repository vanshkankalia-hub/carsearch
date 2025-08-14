import React, { useState } from 'react';

const App = () => {
  const [carQuery, setCarQuery] = useState('');
  const [ratings, setRatings] = useState(null);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [loadingProsCons, setLoadingProsCons] = useState(false);
  const [error, setError] = useState(null);
  const [carDescription, setCarDescription] = useState(null);
  const [prosAndCons, setProsAndCons] = useState(null);

  const callGeminiApi = async (prompt, generationConfig = {}) => {
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig };

    let result = null;
    let retries = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (retries < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonResponse = await response.json();
        const content = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (content) {
          result = generationConfig.responseMimeType === "application/json"
            ? JSON.parse(content)
            : content;
          break;
        } else {
          throw new Error('Invalid API response structure or empty content.');
        }
      } catch (e) {
        console.error(`Attempt ${retries + 1} failed:`, e);
        retries++;
        if (retries < maxRetries) {
          const delay = initialDelay * Math.pow(2, retries - 1);
          await new Promise(res => setTimeout(res, delay));
        } else {
          throw new Error('Failed to fetch data after multiple retries.');
        }
      }
    }
    return result;
  };

  const fetchCarRatings = async () => {
    if (!carQuery) {
      setError('Please enter a car model to search.');
      return;
    }
    setLoadingRatings(true);
    setError(null);
    setRatings(null);
    setCarDescription(null);
    setProsAndCons(null);

    const prompt = `Provide car ratings for the ${carQuery} in a JSON object. The JSON should have a "make", "model", and "year" string. It should also have a "ratings" array. Each object in the "ratings" array should have a "source" string (e.g., "Euro NCAP", "IIHS", "J.D. Power"), a "type" string (e.g., "Safety", "Reliability"), and a "score" string (e.g., "5 Stars", "Good", "85/100"). Make up realistic but varied scores and sources.`;

    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          "make": { "type": "STRING" },
          "model": { "type": "STRING" },
          "year": { "type": "STRING" },
          "ratings": {
            "type": "ARRAY",
            "items": {
              type: "OBJECT",
              properties: {
                "source": { "type": "STRING" },
                "type": { "type": "STRING" },
                "score": { "type": "STRING" }
              }
            }
          }
        }
      }
    };

    try {
      const result = await callGeminiApi(prompt, generationConfig);
      if (result?.ratings?.length > 0) {
        setRatings(result);
      } else {
        setError('No ratings found for that car model.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRatings(false);
    }
  };

  const fetchCarDescription = async () => {
    setLoadingDescription(true);
    const prompt = `Write a brief, interesting summary (about 3-4 sentences) about the history and key features of the ${carQuery}.`;
    try {
      const result = await callGeminiApi(prompt);
      setCarDescription(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDescription(false);
    }
  };

  const fetchProsAndCons = async () => {
    setLoadingProsCons(true);
    const prompt = `Generate a JSON object with two arrays, "pros" and "cons", for the ${carQuery}. Each array should contain 3-5 strings describing the strengths and weaknesses of the car.`;
    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          "pros": {
            "type": "ARRAY",
            "items": { "type": "STRING" }
          },
          "cons": {
            "type": "ARRAY",
            "items": { "type": "STRING" }
          }
        }
      }
    };

    try {
      const result = await callGeminiApi(prompt, generationConfig);
      setProsAndCons(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingProsCons(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      fetchCarRatings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <header className="py-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-400">Global Car Ratings</h1>
          <p className="mt-2 text-lg text-gray-300">
            Find ratings for your favorite cars from around the world.
          </p>
        </header>

        <main className="w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
            <input
              type="text"
              value={carQuery}
              onChange={(e) => setCarQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a car model (e.g., 'Tesla Model 3')"
              className="w-full sm:w-2/3 md:w-1/2 p-3 text-lg bg-gray-800 text-gray-100 rounded-xl border-2 border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={fetchCarRatings}
              className="w-full sm:w-auto px-6 py-3 text-lg font-semibold bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors duration-200"
              disabled={loadingRatings}
            >
              {loadingRatings ? 'Searching...' : 'Search'}
            </button>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-800 text-white rounded-xl text-center shadow-lg">
              <p>{error}</p>
            </div>
          )}

          {ratings && (
            <div className="mt-8 bg-gray-800 p-6 rounded-3xl shadow-2xl">
              <h2 className="text-3xl font-bold mb-4 text-center text-blue-400">
                {ratings.year} {ratings.make} {ratings.model}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ratings.ratings.map((rating, index) => (
                  <div key={index} className="bg-gray-700 p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-200">
                    <h3 className="text-xl font-bold text-gray-200 mb-2">{rating.source}</h3>
                    <p className="text-lg text-gray-300"><span className="font-semibold text-blue-300">Type:</span> {rating.type}</p>
                    <p className="text-lg text-gray-300"><span className="font-semibold text-blue-300">Score:</span> {rating.score}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t-2 border-gray-700 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={fetchCarDescription}
                  className="w-full sm:w-auto px-6 py-3 text-lg font-semibold bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-colors duration-200"
                  disabled={loadingDescription}
                >
                  {loadingDescription ? 'Generating...' : '✨ Generate Description'}
                </button>
                <button
                  onClick={fetchProsAndCons}
                  className="w-full sm:w-auto px-6 py-3 text-lg font-semibold bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-colors duration-200"
                  disabled={loadingProsCons}
                >
                  {loadingProsCons ? 'Generating...' : '✨ Generate Pros & Cons'}
                </button>
              </div>

              {carDescription && (
                <div className="mt-8 p-6 bg-gray-700 rounded-2xl shadow-xl">
                  <h3 className="text-2xl font-bold text-blue-300 mb-2">Car Description</h3>
                  <p className="text-gray-200">{carDescription}</p>
                </div>
              )}

              {prosAndCons && (
                <div className="mt-8 p-6 bg-gray-700 rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-green-400 mb-2">Pros</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {prosAndCons.pros.map((pro, index) => (
                        <li key={index} className="text-gray-200">{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-400 mb-2">Cons</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {prosAndCons.cons.map((con, index) => (
                        <li key={index} className="text-gray-200">{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Data is for demonstration purposes and is generated by an AI model.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
