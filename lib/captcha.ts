// Generate a simple math captcha
export function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const answer = num1 + num2;
  
  return {
    question: `${num1} + ${num2} = ?`,
    answer: answer.toString(),
  };
}

export function verifyCaptcha(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim() === correctAnswer.trim();
}

