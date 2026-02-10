import { OPENAI_API_KEY } from './config.js';

/**
 * Sử dụng AI (ChatGPT) để giải challenge
 */
async function solveChallengeWithAI(challenge, instructions, accountName = '') {
  try {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
      throw new Error('OpenAI API key chưa được cấu hình');
    }

    const prompt = `Challenge: ${challenge}
Instructions: ${instructions}`;

    const requestBody = {
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: 'You are a math problem solver. Answer ONLY with the number (with 2 decimal places, e.g., 525.00), no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 200
    };

    console.log('\n📤 Gửi request tới OpenAI API...');
    console.log('Model:', requestBody.model);
    console.log('Prompt:', prompt);
    console.log('');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`;
      console.error('❌ Lỗi:', errorMessage);
      console.error('Error data:', JSON.stringify(errorData, null, 2));
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const rawAnswer = data.choices[0]?.message?.content?.trim() || '';

    console.log('📥 Response từ OpenAI:');
    console.log('Raw answer:', rawAnswer);
    console.log('Full response:', JSON.stringify(data, null, 2));
    console.log('');

    // Extract number from answer (remove any non-numeric characters except decimal point)
    const numberMatch = rawAnswer.match(/[\d.]+/);
    if (!numberMatch) {
      throw new Error(`Không thể parse số từ câu trả lời AI: ${rawAnswer}`);
    }

    // Format to 2 decimal places
    const number = parseFloat(numberMatch[0]);
    const formattedAnswer = number.toFixed(2);

    console.log('✅ Kết quả:');
    console.log('  Raw answer:', rawAnswer);
    console.log('  Parsed number:', number);
    console.log('  Formatted answer:', formattedAnswer);
    console.log('');

    return formattedAnswer;
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    throw error;
  }
}

/**
 * Test function
 */
async function testAI() {
  console.log('='.repeat(60));
  console.log('TEST AI SOLVE CHALLENGE');
  console.log('='.repeat(60));
  console.log('');

  // Test case 1: Challenge đơn giản
  console.log('🧪 Test 1: Challenge đơn giản');
  console.log('-'.repeat(60));
  try {
    const challenge1 = "A] lOoObSsT-eRr Um ExErT s^ TwEnTy] SeV-eN NoOoToNs| PeR ClAw~ AnD Lo.b StEr ClAiM s FoUr< ClAwS, HoW MuLtIpLy ToTaL FoRcE?";
    const instructions1 = "Solve the math problem and respond with ONLY the number (with 2 decimal places, e.g., '525.00'). Send your answer to POST /api/v1/verify with the verification_code.";
    
    const answer1 = await solveChallengeWithAI(challenge1, instructions1, 'test_account');
    console.log(`✅ Test 1 PASSED - Answer: ${answer1}`);
  } catch (error) {
    console.log(`❌ Test 1 FAILED - ${error.message}`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');

  // Test case 2: Challenge khác
  console.log('🧪 Test 2: Challenge khác');
  console.log('-'.repeat(60));
  try {
    const challenge2 = "A] lO.oObB sT-ErR lo.bStT eR um] cLaW^ fO-rCe Is ThIrTy ] nEeW/ToOnS, aNd| tHeR eOtHeR cLaW Is FoUrTeEn ~ nEeW\\ToOnS, hOw/ mUcH^ ToTaL fOrCe?";
    const instructions2 = "Solve the math problem and respond with ONLY the number (with 2 decimal places, e.g., '525.00'). Send your answer to POST /api/v1/verify with the verification_code.";
    
    const answer2 = await solveChallengeWithAI(challenge2, instructions2, 'test_account');
    console.log(`✅ Test 2 PASSED - Answer: ${answer2}`);
  } catch (error) {
    console.log(`❌ Test 2 FAILED - ${error.message}`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Test hoàn tất!');
}

// Chạy test
testAI().catch(error => {
  console.error('Lỗi khi chạy test:', error);
  process.exit(1);
});

