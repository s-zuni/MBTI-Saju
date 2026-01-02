const fetch = require('node-fetch');

const OPENAI_API_KEY = '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';

module.exports = async (req, res) => {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { name, gender, birthDate, birthTime, mbti } = req.body;

    if (!name || !gender || !birthDate || !birthTime || !mbti) {
      return res.status(400).json({ error: 'All fields (name, gender, birthDate, birthTime, mbti) are required.' });
    }

    try {
      const systemPrompt = `
        You are an expert consultant specializing in the fusion of MBTI and traditional Korean Saju (Four Pillars of Destiny).
        Your role is to analyze a user's date and time of birth to understand their Saju, and then synthesize these insights with their MBTI profile to provide deep, actionable advice.
        Maintain a friendly yet professional tone. Each section of the analysis should be around 150-200 characters long (including spaces).
      `;

      const userQuery = `
        Please analyze the following user information.
        - Name: ${name}
        - Gender: ${gender}
        - Date of Birth: ${birthDate}
        - Time of Birth: ${birthTime === 'Unknown' ? 'Time unknown' : birthTime}
        - MBTI: ${mbti}

        Provide your analysis in the following 5 sections, formatted as a JSON object.
        1. Saju Analysis (saju): Analyze the energy and characteristics of the user's Saju.
        2. MBTI Analysis (mbti): Describe the key personality traits of the user's MBTI type.
        3. Trait Synthesis (trait): Explain the core tendencies that emerge when the user's Saju and MBTI are combined.
        4. Recommended Jobs (jobs): Suggest suitable career paths based on the synthesized profile and explain why.
        5. Compatibility Match (match): Advise on compatible MBTI types or Saju characteristics for relationships.

        Your response MUST be ONLY the JSON object, with no other text before or after it. The JSON structure should be:
        {
          "saju": "...",
          "mbti": "...",
          "trait": "...",
          "jobs": "...",
          "match": "..."
        }
      `;
      
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo-1106', // This model is good at following JSON instructions
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('OpenAI API Error:', errorBody);
        throw new Error(`OpenAI API request failed with status ${apiResponse.status}`);
      }

      const responseData = await apiResponse.json();
      const content = JSON.parse(responseData.choices[0].message.content);
      
      res.status(200).json(content);

    } catch (error) {
      console.error('Server Error:', error);
      res.status(500).json({ error: 'An error occurred during the analysis.' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};
