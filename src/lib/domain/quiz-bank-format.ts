import { LIMITS, type QuizBankFile } from './quiz-bank'

export const QUIZ_BANK_JSON_EXAMPLE = {
  "title": "Nombre descriptivo del banco (usá el nombre de la materia o cátedra)",
  "description": "Una o dos oraciones que cuenten qué temas cubre el banco y para qué sirve (ej: repaso para el primer parcial)",
  "units": [
    {
      "name": "Unidad 1: Nombre de la unidad",
      "questions": [
        {
          "type": "single",
          "question": "¿Cuál de las siguientes afirmaciones describe correctamente el concepto X?",
          "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
          "answer": 1,
          "explanation": "La opción B es correcta porque... Las otras opciones son incorrectas porque..."
        },
        {
          "type": "multiple",
          "question": "¿Cuáles de los siguientes son características del concepto Y?",
          "options": ["Característica A", "Característica B", "Característica C", "Característica D"],
          "answer": [0, 2],
          "explanation": "A y C son correctas porque... B y D son incorrectas porque..."
        },
        {
          "type": "truefalse",
          "question": "El concepto Z implica necesariamente que la condición W se cumple siempre.",
          "answer": false,
          "explanation": "Es falso porque... El caso correcto es..."
        }
      ]
    }
  ]
} satisfies QuizBankFile

export const QUIZ_BANK_JSON_FORMAT = `Formato del banco de preguntas:

${JSON.stringify(QUIZ_BANK_JSON_EXAMPLE, null, 2)}

Reglas de compatibilidad:
- Devolvé únicamente JSON válido, sin bloques Markdown, comentarios ni texto adicional.
- El archivo completo no debe superar 2.097.152 caracteres, incluidos espacios y saltos de línea.
- "title": texto obligatorio de 1 a ${LIMITS.title} caracteres.
- "description": texto opcional de hasta ${LIMITS.description} caracteres.
- "units": entre 1 y ${LIMITS.unitsMax} unidades, cada una con "name" de 1 a ${LIMITS.unitName} caracteres.
- Cada unidad contiene entre 1 y ${LIMITS.questionsPerUnit} preguntas; máximo ${LIMITS.totalQuestions} preguntas en total.
- "question": texto obligatorio de 1 a ${LIMITS.question} caracteres.
- "type": exactamente "single", "multiple" o "truefalse".
- "single": "options" contiene entre 2 y ${LIMITS.optionsMax} textos no vacíos de hasta ${LIMITS.option} caracteres; "answer" es un índice entero desde 0 hasta la última opción.
- "multiple": las mismas reglas de "options"; "answer" es un array no vacío de índices enteros válidos, sin repetir.
- "truefalse": "answer" es true o false, sin comillas; no necesita "options".
- "explanation": texto opcional de hasta ${LIMITS.explanation} caracteres; si se omite, se usa un texto vacío.
- Los campos de texto se recortan para quitar espacios al inicio y al final.`
