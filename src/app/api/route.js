import { NextResponse } from "next/server";
import multer from "multer";
import { createReadStream, promises as fs } from "fs";
import path from "path";
import unzipper from "unzipper";
import csvParser from "csv-parser";
import { promisify } from "util";

const upload = multer({ dest: "/tmp/uploads" });
const runMiddleware = promisify(upload.single("file"));

export async function POST(req) {
  try {
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Read file buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const zipPath = path.join("/tmp/uploads", file.name);
    await fs.writeFile(zipPath, fileBuffer);

    const extractPath = path.join("/tmp/uploads", "extracted");
    await fs.mkdir(extractPath, { recursive: true });

    // Unzip the file
    await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: extractPath })).promise();

    // Find the extracted CSV file
    const files = await fs.readdir(extractPath);
    const csvFile = files.find((f) => f.endsWith(".csv"));

    if (!csvFile) {
      return NextResponse.json({ error: "No CSV file found in zip" }, { status: 400 });
    }

    const csvPath = path.join(extractPath, csvFile);

    // Read the CSV file
    let answer = null;
    await new Promise((resolve, reject) => {
      createReadStream(csvPath)
        .pipe(csvParser())
        .on("data", (row) => {
          if (row.answer) answer = row.answer;
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (!answer) {
      return NextResponse.json({ error: "No 'answer' column found in CSV" }, { status: 400 });
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
