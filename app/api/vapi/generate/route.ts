export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    console.log("🚀 Incoming Request:", { type, role, level, techstack, amount, userid });

    // Generate questions using Gemini AI
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, formatted as a JSON array.
    `,
    });

    // Log AI response
    console.log("🔍 Raw AI Response:", questions);

    // Ensure AI response is valid JSON
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(questions);
    } catch (error) {
      console.error("❌ AI Response is not valid JSON:", questions);
      return Response.json({ success: false, error: "Invalid AI response format", rawResponse: questions }, { status: 500 });
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
      createdAt: new Date().toISOString(),
    };

    // Store in Firestore
    await db.collection("interviews").add(interview);

    // Return questions in response
    return Response.json({ success: true, questions: parsedQuestions }, { status: 200 });
  } catch (error) {
    console.error("❌ Error generating questions:", error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : "An unknown error occurred" }, { status: 500 });
  }
}
