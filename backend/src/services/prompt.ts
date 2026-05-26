import type { AssignmentInput } from '../types/assignment';
import { QUESTION_TYPE_LABELS } from '../types/assignment';

export function buildPrompt(input: AssignmentInput): {
  system: string;
  user: string;
} {
  const totalQuestions = input.questionTypes.reduce((s, q) => s + q.count, 0);
  const totalMarks = input.questionTypes.reduce(
    (s, q) => s + q.count * q.marksPerQuestion,
    0
  );

  const typeBreakdown = input.questionTypes
    .map(
      (q) =>
        `- ${q.count} × ${QUESTION_TYPE_LABELS[q.type]} (${q.marksPerQuestion} mark${q.marksPerQuestion === 1 ? '' : 's'} each)`
    )
    .join('\n');

  const teacherSalutation = input.teacherName
    ? `Certainly, ${input.teacherName}!`
    : 'Here is your customized question paper.';

  const system = `You are an expert exam paper designer. Your job is to generate a well-structured question paper as STRICT JSON only — no markdown, no commentary, no code fences. The JSON must conform exactly to the schema below.

JSON SCHEMA:
{
  "title": string,
  "subject": string | null,
  "gradeLevel": string | null,
  "dueDate": string,                // ISO date string, echo back from input
  "totalMarks": number,             // sum of all question marks
  "timeAllowedMinutes": number,     // recommend a sensible duration
  "introMessage": string,           // ONE friendly sentence addressed to the teacher, e.g. "${teacherSalutation} Here is your customized question paper on …"
  "sections": [
    {
      "id": "A" | "B" | "C" | ...,
      "title": string,              // e.g. "Section A — Multiple Choice Questions"
      "instruction": string,        // e.g. "Attempt all questions. Each question carries 1 mark."
      "questions": [
        {
          "id": string,             // e.g. "A1", "A2"
          "text": string,           // the actual question (no difficulty prefix; difficulty lives in the field below)
          "type": "mcq" | "short_answer" | "long_answer" | "true_false" | "fill_blank" | "diagram_graph" | "numerical",
          "difficulty": "easy" | "moderate" | "challenging",
          "marks": number,
          "options": string[] | null,    // EXACTLY 4 options for mcq, null otherwise
          "answer": string | null        // model answer / correct option, can be multi-line for long answers
        }
      ]
    }
  ]
}

RULES:
1. Group questions by type into sections labelled A, B, C…
2. Mix difficulty within each section: roughly 40% easy, 40% moderate, 20% challenging — unless the teacher's instructions say otherwise.
3. Marks per question MUST match the requested spec exactly.
4. Each question must be self-contained and answerable.
5. For MCQ: provide exactly 4 plausible options and indicate the correct one in "answer".
6. For diagram_graph questions: phrase them so the student is asked to draw/label, since we cannot embed images. Provide a textual answer description.
7. For numerical problems: include any required formulas in the answer.
8. Do NOT prefix question text with the difficulty (e.g., do NOT write "[Easy] Define …"). The renderer will add the badge from the difficulty field.
9. Respond with RAW JSON only. No preamble. No \`\`\`. No trailing text.`;

  const user = `Create a question paper with the following specifications:

Title: ${input.title}
${input.subject ? `Subject: ${input.subject}` : ''}
${input.gradeLevel ? `Grade / Level: ${input.gradeLevel}` : ''}
${input.schoolName ? `School: ${input.schoolName}` : ''}
${input.teacherName ? `Teacher: ${input.teacherName}` : ''}
Due Date: ${input.dueDate}
Total Questions: ${totalQuestions}
Total Marks: ${totalMarks}

Question breakdown:
${typeBreakdown}

${input.additionalInstructions ? `Additional instructions from the teacher:\n${input.additionalInstructions}` : ''}

${input.sourceText ? `Generate questions grounded in the following reference material:\n---\n${input.sourceText.slice(0, 8000)}\n---` : ''}

Return the JSON now.`;

  return { system, user };
}
