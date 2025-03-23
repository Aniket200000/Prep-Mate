import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { NextResponse } from "next/server";

// Initialize Gemini AI with API key
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined in the environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey);

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: Request) {
  try {
    const { type, role, level, techstack, amount, userid } = await request.json();
    console.log("🚀 Incoming Request:", { type, role, level, techstack, amount, userid });

    // Ensure all required fields are provided
    if (!type || !role || !level || !techstack || !amount || !userid) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Generate interview questions using Google Gemini AI
    const response = await genAI.getGenerativeModel({ model: "gemini-1.5-pro" }).generateContent(
      `Prepare ${amount} questions for a ${role} interview.
       The candidate's experience level is ${level}.
       The required tech stack includes: ${techstack}.
       The focus should lean towards ${type} questions.
       Return only the questions as a valid JSON array, formatted as follows:
       ["Question 1", "Question 2", "Question 3", ...]`
    );

    const questions = response.response.text();
    console.log("🔍 Raw AI Response:", questions);

    // Ensure AI response is valid JSON
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (error) {
      console.error("❌ AI Response is not valid JSON:", questions);
      return NextResponse.json({ success: false, error: "Invalid AI response format", rawResponse: questions }, { status: 500 });
    }

    console.log("✅ Parsed Questions:", parsedQuestions);

    // Create interview object
    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(","),
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // Store in Firestore
    await db.collection("interviews").add(interview);

    // Return questions in response
    return NextResponse.json(
      { success: true, questions: parsedQuestions },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error generating questions:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, data: "Thank you!" }, { status: 200 });
}
