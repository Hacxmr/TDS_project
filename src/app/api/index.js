import formidable from "formidable";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Error parsing request" });
    }

    const question = fields.question?.[0];

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // If a file is attached, extract content
    if (files.file) {
      const filePath = files.file[0].filepath;
      const fileExt = path.extname(files.file[0].originalFilename);

      if (fileExt === ".zip") {
        // Extract the ZIP and read CSV (Add extraction logic)
      } else if (fileExt === ".csv") {
        const csvData = fs.readFileSync(filePath, "utf8");
        // Process CSV data here (Extract answer column)
      }
    }

    // Call OpenAI API to generate an answer
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: question }],
    });

    const answer = response.choices[0].message.content.trim();

    return res.json({ answer });
  });
}
