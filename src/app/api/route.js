import { NextResponse } from "next/server";
import formidable from "formidable";
import { promises as fs } from "fs";
import unzipper from "unzipper";
import csv from "csv-parser";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  const form = formidable({ multiples: true });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) return reject(NextResponse.json({ error: "File upload failed" }, { status: 500 }));

      const question = fields.question[0];
      let answer = "";

      if (files.file) {
        // Extract ZIP and read CSV
        const filePath = files.file[0].filepath;
        const extractedFiles = await extractZip(filePath);
        const csvFile = extractedFiles.find((f) => f.endsWith(".csv"));

        if (csvFile) {
          answer = await readCSV(csvFile);
        }
      } else {
        // Use OpenAI to answer
        const response = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "system", content: "Answer questions from TDS assignments." }, { role: "user", content: question }],
        });
        answer = response.choices[0].message.content;
      }

      resolve(NextResponse.json({ answer }));
    });
  });
}

async function extractZip(zipPath) {
  const extractedFiles = [];
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Parse())
    .on("entry", async (entry) => {
      const fileName = entry.path;
      if (fileName.endsWith(".csv")) {
        const outputPath = `/tmp/${fileName}`;
        extractedFiles.push(outputPath);
        entry.pipe(fs.createWriteStream(outputPath));
      } else {
        entry.autodrain();
      }
    })
    .promise();
  return extractedFiles;
}

async function readCSV(csvPath) {
  return new Promise((resolve) => {
    let result = "";
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        if (row.answer) result = row.answer;
      })
      .on("end", () => resolve(result));
  });
}
